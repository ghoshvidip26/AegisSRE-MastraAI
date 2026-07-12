import { Agent } from "@mastra/core/agent";
import { logTool } from "../tools/log-tool";
import { metricsTool } from "../tools/metrics-tool";

export const verificationAgent = new Agent({
    id: "verification-agent",
    name: "Verification Agent",
    description: "Verifies that a remediation was successful by checking metrics and logs post-execution.",
    instructions: `You are a verification agent. After a remediation has been executed, your job is to:
1. Check current metrics (CPU, memory, error rate, latency)
2. Check recent logs for the affected service
3. Compare against pre-incident baselines
4. Determine if the incident is resolved

Return a structured JSON response with:
- resolved: boolean
- metrics: { cpu, memory, errorRate, latency } (current values)
- evidence: array of observations supporting your conclusion
- recommendation: "close_incident" | "escalate" | "rollback"`,
    model: process.env.OPENAI_API_KEY ? "openai/gpt-4o-mini" : "google/gemini-2.5-flash",
    tools: {
        "log-tool": logTool,
        "metrics-tool": metricsTool,
    }
})
