import { createTool } from "@mastra/core/tools"
import { z } from 'zod'
import { incidentStore } from "@/lib/incidents/incident-store";

export const logTool = createTool({
    id: "log-tool",
    description: "Read logs for an incident. Provide the incident ID to retrieve associated log entries.",
    inputSchema: z.object({
        incidentId: z.string().describe("The incident ID (e.g. INC-1234567890)"),
    }),
    execute: async (inputData) => {
        const incident = incidentStore.get(inputData.incidentId);

        if (!incident) {
            return {
                logs: `No incident found with ID: ${inputData.incidentId}`,
            };
        }

        // If the incident has structured logs, format them
        if (incident.logs && incident.logs.length > 0) {
            const formatted = incident.logs
                .map(l => `[${l.timestamp}] ${l.level}: ${l.message}`)
                .join('\n');
            return { logs: formatted };
        }

        // Fall back to the incident message as log context
        return {
            logs: incident.message,
        };
    }
})
