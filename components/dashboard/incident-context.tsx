'use client'

import { createContext, useContext, useMemo } from 'react'
import type { UIMessage } from 'ai'

// Types for extracted data from tool calls
export type MetricsData = {
  cpu: number
  memory: number
  errorRate: number
  latency: number
}

export type LogEntry = {
  timestamp: string
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
  message: string
}

export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed'

export type WorkflowState = {
  diagnose: WorkflowStepStatus
  plan: WorkflowStepStatus
  execute: WorkflowStepStatus
  verify: WorkflowStepStatus
}

export type IncidentContextValue = {
  metrics: MetricsData | null
  logs: LogEntry[]
  workflowState: WorkflowState
  activeIncident: {
    id: string
    title: string
    severity: string
  } | null
}

const defaultWorkflowState: WorkflowState = {
  diagnose: 'pending',
  plan: 'pending',
  execute: 'pending',
  verify: 'pending',
}

const IncidentContext = createContext<IncidentContextValue>({
  metrics: null,
  logs: [],
  workflowState: defaultWorkflowState,
  activeIncident: null,
})

export function useIncidentContext() {
  return useContext(IncidentContext)
}

/**
 * Extracts real-time data from chat messages by parsing tool call outputs.
 * This bridges the agent's tool executions to the dashboard panels.
 */
export function IncidentContextProvider({
  messages,
  children,
}: {
  messages: UIMessage[]
  children: React.ReactNode
}) {
  const contextValue = useMemo(() => {
    let metrics: MetricsData | null = null
    const logs: LogEntry[] = []
    const workflowState: WorkflowState = { ...defaultWorkflowState }
    let activeIncident: IncidentContextValue['activeIncident'] = null

    // Walk through all messages and extract tool outputs
    for (const message of messages) {
      if (!message.parts) continue

      for (const part of message.parts) {
        // Check for tool parts with output
        if (typeof part === 'object' && 'type' in part) {
          const partType = part.type as string

          // Extract metrics from metrics-tool calls
          if (partType === 'tool-metrics-tool' || partType === 'dynamic-tool') {
            const toolPart = part as { type: string; toolName?: string; output?: unknown; state?: string }
            const isMetricsTool = partType === 'tool-metrics-tool' || toolPart.toolName === 'metrics-tool'

            if (isMetricsTool && toolPart.state === 'output-available' && toolPart.output) {
              const output = toolPart.output as Record<string, unknown>
              metrics = {
                cpu: (output.cpu as number) ?? 0,
                memory: (output.memory as number) ?? 0,
                errorRate: (output.errorRate as number) ?? 0,
                latency: (output.latency as number) ?? 0,
              }
              // Once metrics are fetched, diagnosis is at least running
              if (workflowState.diagnose === 'pending') {
                workflowState.diagnose = 'running'
              }
            }
          }

          // Extract logs from log-tool calls
          if (partType === 'tool-log-tool' || partType === 'dynamic-tool') {
            const toolPart = part as { type: string; toolName?: string; output?: unknown; state?: string }
            const isLogTool = partType === 'tool-log-tool' || toolPart.toolName === 'log-tool'

            if (isLogTool && toolPart.state === 'output-available' && toolPart.output) {
              const output = toolPart.output as { logs?: string }
              if (output.logs) {
                const parsedLogs = parseLogString(output.logs)
                logs.push(...parsedLogs)
              }
              if (workflowState.diagnose === 'pending') {
                workflowState.diagnose = 'running'
              }
            }
          }

          // Extract enkrypt policy validation results
          if (partType === 'tool-enkrypt-policy-validator' || partType === 'dynamic-tool') {
            const toolPart = part as { type: string; toolName?: string; output?: unknown; state?: string }
            const isPolicyTool = partType === 'tool-enkrypt-policy-validator' || toolPart.toolName === 'enkrypt-policy-validator'

            if (isPolicyTool && toolPart.state === 'output-available') {
              workflowState.plan = 'completed'
              workflowState.execute = 'running'
            }
          }
        }
      }

      // Infer workflow state from assistant messages
      if (message.role === 'assistant') {
        for (const part of message.parts) {
          if (typeof part === 'object' && 'type' in part && part.type === 'text') {
            const text = (part as { text: string }).text.toLowerCase()

            // Infer diagnosis completion
            if (text.includes('root cause') || text.includes('rootcause') || text.includes('diagnosis')) {
              if (workflowState.diagnose === 'running' || workflowState.diagnose === 'pending') {
                workflowState.diagnose = 'completed'
                workflowState.plan = 'running'
              }
            }

            // Infer plan completion
            if (text.includes('remediation plan') || text.includes('plan:')) {
              if (workflowState.plan === 'running') {
                workflowState.plan = 'completed'
              }
            }

            // Infer execution
            if (text.includes('executing') || text.includes('applied') || text.includes('restarted')) {
              if (workflowState.execute !== 'completed') {
                workflowState.execute = 'running'
              }
            }

            // Infer verification
            if (text.includes('verified') || text.includes('resolved') || text.includes('healthy')) {
              workflowState.execute = 'completed'
              workflowState.verify = 'completed'
            }

            // Try to extract incident info from user message
            if (text.includes('p1') || text.includes('critical')) {
              activeIncident = {
                id: 'INC-LIVE',
                title: extractIncidentTitle(text),
                severity: 'P1',
              }
            } else if (text.includes('p2') || text.includes('high')) {
              activeIncident = {
                id: 'INC-LIVE',
                title: extractIncidentTitle(text),
                severity: 'P2',
              }
            }
          }
        }
      }

      // Try to extract incident context from user messages
      if (message.role === 'user' && !activeIncident) {
        for (const part of message.parts) {
          if (typeof part === 'object' && 'type' in part && part.type === 'text') {
            const text = (part as { text: string }).text
            if (text.length > 20) {
              activeIncident = {
                id: 'INC-LIVE',
                title: text.slice(0, 60) + (text.length > 60 ? '...' : ''),
                severity: 'Investigating',
              }
            }
          }
        }
      }
    }

    return { metrics, logs, workflowState, activeIncident }
  }, [messages])

  return (
    <IncidentContext.Provider value={contextValue}>
      {children}
    </IncidentContext.Provider>
  )
}

function parseLogString(logStr: string): LogEntry[] {
  const lines = logStr.trim().split('\n').filter(Boolean)
  const now = new Date()

  return lines.map((line, i) => {
    let level: LogEntry['level'] = 'INFO'
    const lower = line.toLowerCase()
    if (lower.includes('error') || lower.includes('timeout') || lower.includes('exhausted')) {
      level = 'ERROR'
    } else if (lower.includes('warn') || lower.includes('retry')) {
      level = 'WARN'
    } else if (lower.includes('debug')) {
      level = 'DEBUG'
    }

    const ts = new Date(now.getTime() - (lines.length - i) * 2000)
    const timestamp = ts.toLocaleTimeString('en-US', { hour12: false })

    return { timestamp, level, message: line.trim() }
  })
}

function extractIncidentTitle(text: string): string {
  // Try to get first meaningful sentence
  const sentences = text.split(/[.!?\n]/).filter(s => s.trim().length > 5)
  if (sentences.length > 0) {
    const title = sentences[0].trim()
    return title.length > 60 ? title.slice(0, 57) + '...' : title
  }
  return 'Active Incident'
}
