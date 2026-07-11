import { Agent } from "@mastra/core/agent";
import { logTool } from "../tools/log-tool";
import { metricsTool } from "../tools/metrics-tool";

export const diagnosisAgent = new Agent({
    id: "execution-agent",
    name: "Execution Agent",
    description: "Executes and gives final output.",
    instructions: "Your task is to execute instructions & give final output.",
    model: "google/gemini-2.5-flash",
    tools: {
        logTool, metricsTool
    }
})