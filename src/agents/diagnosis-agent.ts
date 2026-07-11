import { Agent } from "@mastra/core/agent";
import { diagnosisPrompt } from "../prompts/diagnosis-prompt";
import { logTool } from "../tools/log-tool";
import { metricsTool } from "../tools/metrics-tool";

export const diagnosisAgent = new Agent({
    id: "diagnosis-agent",
    name: "Diagnosis Agent",
    description: "Analyzes production incidents and identifies the probable root cause.",
    instructions: diagnosisPrompt,
    model: "google/gemini-2.5-flash",
    tools: {
        logTool, metricsTool
    }
})