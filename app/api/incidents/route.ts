import { NextRequest, NextResponse} from "next/server";
import { incidentStore } from "@/lib/incidents/incident-store";
import { mastra } from '@/src/mastra';
import { withRetry, isRateLimitError } from "@/lib/utils/retry";
import { fallbackModel } from "@/src/models/fallback";

/**
 * Infer severity from incident content when not explicitly provided.
 * Uses keyword matching on the title and message to assign a priority level.
 */
function inferSeverity(incident: { title?: string; message?: string; service?: string }): "P1" | "P2" | "P3" | "P4" {
    const text = `${incident.title ?? ''} ${incident.message ?? ''}`.toLowerCase();

    // P1: Complete outage / connection failures / data loss
    if (
        text.includes('connection refused') ||
        text.includes('connection failed') ||
        text.includes('outage') ||
        text.includes('down') ||
        text.includes('unreachable') ||
        text.includes('data loss') ||
        text.includes('crash')
    ) {
        return 'P1';
    }

    // P2: Degraded performance / elevated errors
    if (
        text.includes('timeout') ||
        text.includes('error rate') ||
        text.includes('degraded') ||
        text.includes('high latency') ||
        text.includes('memory leak') ||
        text.includes('pool exhausted')
    ) {
        return 'P2';
    }

    // P3: Warnings / non-critical issues
    if (
        text.includes('warning') ||
        text.includes('retry') ||
        text.includes('slow') ||
        text.includes('disk space')
    ) {
        return 'P3';
    }

    // P4: Informational / low impact
    return 'P4';
}

export async function POST(req: NextRequest) {
    const incident = await req.json();
    console.log("New incident received");

    const createdIncident = incidentStore.create({
        service: incident.service,
        severity: incident.severity ?? inferSeverity(incident),
        title: incident.title,
        message: incident.message,
        logs: incident.logs ?? [],
        status: "OPEN",
    });

    // Fire off the agent processing with retry — don't block the response
    processIncidentAsync(createdIncident.id, createdIncident);

    return NextResponse.json({
        success: true,
        incident: createdIncident,
    });
}

/**
 * Process the incident asynchronously with retry logic.
 * If primary model rate-limits, falls back to local Ollama.
 * If everything fails, marks the incident as FAILED with a reason.
 */
async function processIncidentAsync(
    incidentId: string,
    incident: { id: string; service: string; severity?: string; title: string; message: string }
) {
    const workflow = mastra.getWorkflow("incidentWorkflow");

    const workflowInput = {
        incidentDescription: `Title: ${incident.title}\nMessage: ${incident.message}`,
        incidentId: incident.id,
        service: incident.service,
    };

    try {
        // Try primary model (Gemini Flash) with retries
        const { attempts } = await withRetry(
            async () => {
                const run = await workflow.createRun();
                const result = await run.start({ inputData: workflowInput });
                if (result.status === 'failed') {
                    throw new Error(result.error?.message || "Workflow failed");
                }
                return result;
            },
            {
                maxAttempts: 2,
                initialDelay: 2000,
                backoffMultiplier: 2,
                maxDelay: 10000,
            }
        );

        if (attempts > 1) {
            console.log(`[incident] ${incidentId} processed after ${attempts} attempts on primary model`);
        }

        incidentStore.update(incidentId, { retryCount: attempts });
    } catch (primaryError) {
        // If rate-limited, fall back to local Ollama (gemma3:1b) in tool-free mode
        if (isRateLimitError(primaryError)) {
            console.log(`[incident] ${incidentId} primary model rate-limited. Falling back to Ollama (gemma3:1b, tool-free)...`);

            try {
                // gemma3:1b doesn't support tool calling, so we use toolChoice: "none"
                // and do a direct text-based triage instead of the full agent workflow
                const diagnosisAgent = mastra.getAgent("diagnosisAgent");
                const result = await diagnosisAgent.generate(
                    `You are a senior SRE. Analyze this incident and return ONLY a JSON object with these fields:
- rootCause: string (what caused the incident)
- severity: string (P1/P2/P3/P4)
- confidence: number (0-1)
- affectedService: string
- recommendation: string (immediate action to take)

Incident Title: ${incident.title}
Incident Message: ${incident.message}
Service: ${incident.service}

Return ONLY valid JSON, no markdown, no explanation.`,
                    { model: fallbackModel, toolChoice: "none" }
                );

                console.log(`[incident] ${incidentId} processed via tool-free triage (gemma3:1b)`);

                // Try to parse and update the incident with diagnosis
                try {
                    const parsed = JSON.parse(result.text);
                    incidentStore.update(incidentId, {
                        status: "DIAGNOSED",
                        retryCount: 3,
                    });
                    console.log(`[incident] ${incidentId} diagnosis: ${JSON.stringify(parsed)}`);
                } catch {
                    // Even if JSON parse fails, we got a text response — still better than FAILED
                    incidentStore.update(incidentId, {
                        status: "DIAGNOSED",
                        retryCount: 3,
                    });
                    console.log(`[incident] ${incidentId} raw diagnosis: ${result.text}`);
                }
            } catch (fallbackError) {
                const reason = `Primary model rate-limited. Fallback (gemma3:1b tool-free) also failed: ${fallbackError instanceof Error ? fallbackError.message : "unknown"}`;
                console.error(`[incident] ${incidentId} FAILED: ${reason}`);

                incidentStore.update(incidentId, {
                    status: "FAILED",
                    failureReason: reason,
                });
            }
        } else {
            const reason = primaryError instanceof Error ? primaryError.message : "Unknown error during workflow processing";
            console.error(`[incident] ${incidentId} FAILED: ${reason}`);

            incidentStore.update(incidentId, {
                status: "FAILED",
                failureReason: reason,
            });
        }
    }
}

export async function GET(){
    return NextResponse.json({
        incident: incidentStore.getAll()
    })
}