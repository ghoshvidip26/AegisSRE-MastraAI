import { Agent } from "@mastra/core/agent";
import { enkryptPolicyTool } from "../mastra/tools/enkrypt-policy-tool";

export const planningAgent = new Agent({
    id: "planning-agent",
    name: "Planning Agent",
    description: "Generates a remediation plan. Always validate the final remediation plan using the Enkrypt Policy Tool before returning it.",
    instructions: "Your task is to generate a remediation plan and always validate the final remediation plan using the Enkrypt Policy Tool before returning it.",
    model: "google/gemini-2.5-flash",
    tools: {
        enkryptPolicyTool,
    }
})