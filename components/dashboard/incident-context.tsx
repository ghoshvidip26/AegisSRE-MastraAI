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
        if (typeof part === 'object' && part !== null && 'type' in part) {
          const partObj = part as Record<string, any>
          const type = (partObj.type as string) || ''
          
          // Determine the tool name if this is a tool execution part
          let toolName = ''
          if (type === 'tool-invocation' && partObj.toolInvocation) {
            toolName = partObj.toolInvocation.toolName || ''
          } else if (type === 'tool-call' || type === 'tool-result') {
            toolName = partObj.toolName || ''
          } else if (type.startsWith('tool-')) {
            const suffix = type.split('-').slice(1).join('-')
            toolName = suffix === 'call' || suffix === 'result' ? (partObj.toolName || '') : suffix
          }

          // If we found a tool name, parse its output/result
          if (toolName) {
            const toolInvocation = partObj.toolInvocation || {}
            const output = partObj.output || partObj.result || toolInvocation.result || toolInvocation.output

            if (toolName === 'metricsTool' || toolName === 'metrics-tool') {
              if (output) {
                const metricsObj = output as Record<string, any>
                metrics = {
                  cpu: Number(metricsObj.cpu ?? 0),
                  memory: Number(metricsObj.memory ?? 0),
                  errorRate: Number(metricsObj.errorRate ?? metricsObj.error_rate ?? 0),
                  latency: Number(metricsObj.latency ?? 0),
                }
                if (workflowState.diagnose === 'pending') {
                  workflowState.diagnose = 'running'
                }
              }
            }

            if (toolName === 'logTool' || toolName === 'log-tool') {
              if (output && typeof output === 'object') {
                const logsObj = output as { logs?: string }
                if (logsObj.logs) {
                  const parsedLogs = parseLogString(logsObj.logs)
                  logs.push(...parsedLogs)
                }
              }
              if (workflowState.diagnose === 'pending') {
                workflowState.diagnose = 'running'
              }
            }

            if (
              toolName === 'enkryptPolicyTool' ||
              toolName === 'enkrypt-policy-validator' ||
              toolName === 'enkrypt-policy-tool'
            ) {
              workflowState.plan = 'completed'
              workflowState.execute = 'running'
            }

            if (toolName === 'delegateDiagnosisTool' || toolName === 'delegate-diagnosis') {
              if (workflowState.diagnose === 'pending') {
                workflowState.diagnose = 'running'
              }
              if (output) {
                workflowState.diagnose = 'completed'
                workflowState.plan = 'running'
              }
            }

            if (toolName === 'delegatePlanningTool' || toolName === 'delegate-planning') {
              if (workflowState.plan === 'pending' || workflowState.plan === 'running') {
                workflowState.plan = 'running'
              }
              if (output) {
                workflowState.plan = 'completed'
                workflowState.execute = 'running'
              }
            }

            if (toolName === 'delegateVerificationTool' || toolName === 'delegate-verification') {
              workflowState.execute = 'completed'
              if (workflowState.verify === 'pending') {
                workflowState.verify = 'running'
              }
              if (output) {
                workflowState.verify = 'completed'
              }
            }
          }
        }
      }

      // Infer workflow state from assistant messages
      if (message.role === 'assistant') {
        for (const part of message.parts) {
          if (typeof part === 'object' && 'type' in part && part.type === 'text') {
            const text = (part as { text: string }).text.toLowerCase()

            // Try to extract metrics if outputted as a JSON block in the text response
            try {
              const rawText = (part as { text: string }).text
              const jsonMatch = rawText.match(/\{[\s\S]*?\}/)
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                if (parsed && typeof parsed === 'object' && 'cpu' in parsed) {
                  metrics = {
                    cpu: Number(parsed.cpu ?? 0),
                    memory: Number(parsed.memory ?? 0),
                    errorRate: Number(parsed.errorRate ?? parsed.error_rate ?? 0),
                    latency: Number(parsed.latency ?? 0),
                  }
                  if (workflowState.diagnose === 'pending') {
                    workflowState.diagnose = 'running'
                  }
                }
              }
            } catch (e) {
              // Ignore JSON parse error
            }

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
