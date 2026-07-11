import { createTool } from "@mastra/core/tools"
import { z } from 'zod'

export const logTool = createTool({
    id: "log-tool",
    description: "Read logs for an incident",
    inputSchema: z.object({
        incidentId: z.string(),
    }),
    execute: async ({ }) => {
        return {
            logs: `
Redis connection timeout
Pool exhausted
Timeout after 30s
`,
        };
    }
})