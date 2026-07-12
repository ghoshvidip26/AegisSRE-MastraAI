import { incidentStore } from "@/lib/incidents/incident-store";
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const coordinatorStep = createStep({
    id: "coordinator",
    description: "Initialize the incident workflow",
    inputSchema: z.object({
        incidentDescription: z.string(),
        incidentId: z.string().optional(),
        service: z.string().optional()
    }),
    outputSchema: z.object({
        incidentDescription: z.string(),
        incidentId: z.string(),
        service: z.string()
    }),
    execute: async ({ inputData }) => {
        const incidentId = inputData.incidentId ?? `INC-${Date.now()}`;
        const service = inputData.service ?? "unknown";

        incidentStore.update(incidentId, {
            status: "TRIAGING",
        });

        return {
            incidentDescription: inputData.incidentDescription,
            incidentId,
            service,
        };
    },
});

const diagnoseStep = createStep({
    id: "diagnose",
    description: "Analyze the incident to determine root cause",
    inputSchema: z.object({
        incidentDescription: z.string(),
        incidentId: z.string(),
        service: z.string(),
    }),
    outputSchema: z.object({
        incidentId: z.string(),
        rootCause: z.string(),
        severity: z.string(),
        confidence: z.number(),
        affectedService: z.string(),
        recommendation: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
        const agent = mastra.getAgent("diagnosisAgent");
        const result = await agent.generate(
            `Analyze this incident and return JSON with rootCause, severity, confidence, affectedService, and recommendation:\n\n${inputData.incidentDescription}`,
            { maxRetries: 0 }
        );
        try {
            const parsed = JSON.parse(result.text);
            incidentStore.update(inputData.incidentId, {
                severity: parsed.severity,
                status: "DIAGNOSING",
            });
            return { ...parsed, incidentId: inputData.incidentId };
        } catch {
            return {
                incidentId: inputData.incidentId,
                rootCause: result.text,
                severity: "unknown",
                confidence: 0.5,
                affectedService: inputData.service || "unknown",
                recommendation: "Manual investigation needed",
            };
        }
    },
});

const planStep = createStep({
    id: "plan-remediation",
    description: "Generate a remediation plan based on diagnosis",
    inputSchema: z.object({
        incidentId: z.string(),
        rootCause: z.string(),
        severity: z.string(),
        confidence: z.number(),
        affectedService: z.string(),
        recommendation: z.string(),
    }),
    outputSchema: z.object({
        incidentId: z.string(),
        plan: z.string(),
        steps: z.array(z.string()),
        approved: z.boolean(),
        risk: z.string(),
    }),
    execute: async ({ inputData, mastra }) => {
        const agent = mastra.getAgent("planningAgent");
        const result = await agent.generate(
            `Generate a remediation plan for this diagnosis. Validate it against safety policies before returning.

Root Cause: ${inputData.rootCause}
Severity: ${inputData.severity}
Affected Service: ${inputData.affectedService}
Recommendation: ${inputData.recommendation}

Return JSON with: plan (summary), steps (array of commands/actions), approved (boolean), risk (low/medium/high)`
        );
        try {
            incidentStore.update(inputData.incidentId, {
                status: "PLANNING",
            });
            const parsed = JSON.parse(result.text);
            return {
                incidentId: inputData.incidentId,
                ...parsed,
            };
        } catch {
            return {
                incidentId: inputData.incidentId,
                plan: result.text,
                steps: [],
                approved: false,
                risk: "unknown",
            };
        }
    },
});

const executeStep = createStep({
    id: "execute-remediation",
    description: "Execute the approved remediation plan",
    inputSchema: z.object({
        incidentId: z.string(),
        plan: z.string(),
        steps: z.array(z.string()),
        approved: z.boolean(),
        risk: z.string(),
    }),
    outputSchema: z.object({
        incidentId: z.string(),
        overallStatus: z.string(),
        summary: z.string(),
        executedSteps: z.array(z.string()),
    }),
    execute: async ({ inputData, mastra }) => {
        if (!inputData.approved) {
            return {
                incidentId: inputData.incidentId,
                overallStatus: "blocked",
                summary: "Remediation plan was not approved by policy validation.",
                executedSteps: [],
            };
        }

        incidentStore.update(inputData.incidentId, {
            status: "EXECUTING",
        });

        const agent = mastra.getAgent("executionAgent");
        const result = await agent.generate(
            `Execute this remediation plan and report results:

Plan: ${inputData.plan}
Steps: ${inputData.steps.join("\n")}

Return JSON with: overallStatus, summary, executedSteps`
        );
        try {
            const parsed = JSON.parse(result.text);
            return {
                incidentId: inputData.incidentId,
                ...parsed,
            };
        } catch {
            return {
                incidentId: inputData.incidentId,
                overallStatus: "completed",
                summary: result.text,
                executedSteps: inputData.steps,
            };
        }
    },
});

const verifyStep = createStep({
    id: "verify-remediation",
    description: "Verify the remediation was successful",
    inputSchema: z.object({
        incidentId: z.string(),
        overallStatus: z.string(),
        summary: z.string(),
        executedSteps: z.array(z.string()),
    }),
    outputSchema: z.object({
        resolved: z.boolean(),
        recommendation: z.string(),
        evidence: z.array(z.string()),
    }),
    execute: async ({ inputData, mastra }) => {
        if (inputData.overallStatus === "blocked") {
            incidentStore.update(inputData.incidentId, {
                status: "FAILED",
            });
            return {
                resolved: false,
                recommendation: "escalate",
                evidence: ["Remediation was blocked by policy validation"],
            };
        }

        const agent = mastra.getAgent("verificationAgent");
        const result = await agent.generate(
            `Verify if this remediation was successful:

Status: ${inputData.overallStatus}
Summary: ${inputData.summary}
Steps Executed: ${inputData.executedSteps.join("\n")}

Check metrics and logs. Return JSON with: resolved (boolean), recommendation (close_incident | escalate | rollback), evidence (array of observations)`
        );
        try {
            const parsed = JSON.parse(result.text);
            if (parsed.resolved) {
                incidentStore.update(inputData.incidentId, {
                    status: "RESOLVED",
                });
            } else {
                incidentStore.update(inputData.incidentId, {
                    status: "FAILED",
                });
            }
            return {
                resolved: parsed.resolved ?? false,
                recommendation: parsed.recommendation ?? "escalate",
                evidence: parsed.evidence ?? [],
            };
        } catch {
            incidentStore.update(inputData.incidentId, {
                status: "FAILED",
            });
            return {
                resolved: false,
                recommendation: "escalate",
                evidence: [result.text],
            };
        }
    },
});

export const incidentWorkflow = createWorkflow({
    id: "incident-workflow",
    description: "End-to-end incident response: diagnose → plan → execute → verify",
    inputSchema: z.object({
        incidentDescription: z.string(),
        incidentId: z.string().optional(),
        service: z.string().optional(),
    }),
    outputSchema: z.object({
        resolved: z.boolean(),
        recommendation: z.string(),
        evidence: z.array(z.string()),
    }),
})
    .then(coordinatorStep)
    .then(diagnoseStep)
    .then(planStep)
    .then(executeStep)
    .then(verifyStep)
    .commit();
