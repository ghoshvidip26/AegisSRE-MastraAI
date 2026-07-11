import { Agent } from "@mastra/core/agent";
import { logTool } from "../tools/log-tool";
import { metricsTool } from "../tools/metrics-tool";

export const coordinatorAgent = new Agent({
    id: "coordinator-agent",
    name: "Coordinator Agent",
    description: "Coordinates the user input with other agents.",
    instructions: "You are the main entry point for the system. Your job is to take user input and delegate it to the correct agent.",
    model: "google/gemini-2.5-flash",
    tools: {
        logTool, metricsTool
    }
})