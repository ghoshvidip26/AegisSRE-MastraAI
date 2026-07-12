import { createTool } from "@mastra/core/tools"
import { z } from 'zod'

/**
 * Metrics Tool — simulates Prometheus metric reads.
 *
 * Phase-aware behaviour for realistic demo flow:
 * - First call per service  → "incident" metrics (high CPU, high latency)
 * - Subsequent calls        → "post-remediation" metrics (recovered values)
 *
 * This ensures the verification agent correctly reports "resolved: true"
 * after the execution phase completes.
 */

// Track how many times metrics have been read per service in this process session
const callCount: Record<string, number> = {}

// Incident-state metrics (what the LLM sees on first pull — triggers diagnosis)
const incidentMetrics = {
  cpu: 99,
  memory: 78,
  errorRate: 22.0,
  latency: 1800,
  activeConnections: 500,
  connectionPoolUsed: "500/500",
  status: "degraded",
}

// Post-remediation metrics (what the verification agent sees — shows recovery)
const recoveredMetrics = {
  cpu: 28,
  memory: 52,
  errorRate: 0.4,
  latency: 145,
  activeConnections: 85,
  connectionPoolUsed: "85/200",
  status: "healthy",
}

export const metricsTool = createTool({
    id: "metrics-tool",
    description: "Read current Prometheus metrics for a service (CPU, memory, error rate, latency, connection pool stats).",
    inputSchema: z.object({
        service: z.string().describe("The name of the service to query metrics for"),
    }),
    execute: async (inputData) => {
        const { service } = inputData
        const key = service.toLowerCase().trim()

        // Initialise counter
        if (!callCount[key]) callCount[key] = 0
        callCount[key]++

        // First call → incident metrics (for diagnosis)
        // Second call onwards → recovered metrics (for verification)
        if (callCount[key] === 1) {
            return {
                ...incidentMetrics,
                service,
                phase: "incident",
                timestamp: new Date().toISOString(),
                note: "Pre-remediation snapshot — incident active.",
            }
        }

        // Add slight randomness to make it feel live
        const jitter = () => Math.floor(Math.random() * 6) - 3
        return {
            cpu: Math.max(18, recoveredMetrics.cpu + jitter()),
            memory: Math.max(40, recoveredMetrics.memory + jitter()),
            errorRate: Math.max(0, +(recoveredMetrics.errorRate + Math.random() * 0.2).toFixed(2)),
            latency: Math.max(100, recoveredMetrics.latency + jitter() * 5),
            activeConnections: Math.max(60, recoveredMetrics.activeConnections + jitter() * 2),
            connectionPoolUsed: recoveredMetrics.connectionPoolUsed,
            status: "healthy",
            service,
            phase: "post-remediation",
            timestamp: new Date().toISOString(),
            note: "Post-remediation snapshot — service recovered.",
        }
    }
})