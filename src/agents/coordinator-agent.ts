import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { logTool } from "../tools/log-tool";
import { metricsTool } from "../tools/metrics-tool";
import { delegateDiagnosisTool, delegatePlanningTool, delegateVerificationTool } from "../tools/delegate-tool";

export const coordinatorAgent = new Agent({
    id: "coordinator-agent",
    name: "Coordinator Agent",
    description: "Main entry point for the Aegis SRE system. Routes user input to specialist agents via delegation tools.",
    instructions: `You are the Aegis SRE Coordinator — the main entry point for incident response.

Your workflow for handling incidents:
1. GATHER DATA: When a user reports an incident, use the log-tool and metrics-tool to pull relevant data
2. DIAGNOSE: Delegate to the Diagnosis Agent using delegate-diagnosis with the gathered logs and metrics
3. PLAN: Once you have a diagnosis, delegate to the Planning Agent using delegate-planning
4. VERIFY: After remediation, delegate to the Verification Agent using delegate-verification

For general questions or status checks, answer directly using your SRE expertise.

Important guidelines:
- Always gather logs AND metrics before diagnosing
- Present the diagnosis clearly to the user before planning
- Explain the remediation plan and its risk level before executing
- After verification, summarize the full incident response

Keep responses concise and actionable. You're talking to on-call engineers who need answers fast.`,
    model: "google/gemini-2.5-flash",
    tools: {
        logTool,
        metricsTool,
        delegateDiagnosisTool,
        delegatePlanningTool,
        delegateVerificationTool,
    },
    memory: new Memory(),
})
