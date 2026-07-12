import { NextRequest, NextResponse} from "next/server";
import { incidentStore } from "@/lib/incidents/incident-store";
import { mastra } from '@/src/mastra';
import { withRetry } from "@/lib/utils/retry";

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
 * If all retries fail, marks the incident as FAILED with a reason.
 */
async function processIncidentAsync(
    incidentId: string,
    incident: { id: string; service: string; severity?: string; title: string; message: string }
) {
    const workflow = mastra.getWorkflow("incidentWorkflow");

    try {
        const { attempts } = await withRetry(
            async () => {
                const run = await workflow.createRun();
                const result = await run.start({
                    inputData: {
                        incidentDescription: `Title: ${incident.title}\nMessage: ${incident.message}`,
                        incidentId: incident.id,
                        service: incident.service
                    }
                });
                if (result.status === 'failed') {
                    console.error("Workflow failed:", result.error);
                    throw new Error(result.error?.message || "Workflow failed");
                }
                return result;
            },
            {
                maxAttempts: 3,
                initialDelay: 2000,   // Start with 2s (Gemini rate limits usually need a few seconds)
                backoffMultiplier: 2,
                maxDelay: 15000,
            }
        );

        if (attempts > 1) {
            console.log(`[incident] ${incidentId} processed after ${attempts} attempts`);
        }

        incidentStore.update(incidentId, { retryCount: attempts });
    } catch (error) {
        console.error(`[incident] ${incidentId} FAILED after retries:`, error);
        const reason = error instanceof Error ? error.message : "Unknown error during workflow processing";

        incidentStore.update(incidentId, {
            status: "FAILED",
            failureReason: reason,
        });
    }
}

export async function GET(){
    return NextResponse.json({
        incident: incidentStore.getAll()
    })
}