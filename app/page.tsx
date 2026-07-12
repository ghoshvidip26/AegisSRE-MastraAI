'use client'

import '@/app/globals.css'
import { useEffect, useState } from 'react'
import { DefaultChatTransport, ToolUIPart } from 'ai'
import { useChat } from '@ai-sdk/react'

import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input'

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation'

import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message'
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool'

import { Sidebar } from '@/components/dashboard/sidebar'
import { ContextPanel } from '@/components/dashboard/context-panel'
import { IncidentContextProvider, useIncidentContext } from '@/components/dashboard/incident-context'

function CommandCenter() {
  const [input, setInput] = useState<string>('')

  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  })

  useEffect(() => {
    const fetchMessages = async () => {
      const res = await fetch('/api/chat')
      const data = await res.json()
      setMessages([...data])
    }
    fetchMessages()
  }, [setMessages])

  const handleSubmit = async () => {
    if (!input.trim()) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <IncidentContextProvider messages={messages}>
      <div className="flex h-screen w-full overflow-hidden dark">
        {/* Left Sidebar — Incidents & Health */}
        <Sidebar />

        {/* Center — Chat Interface */}
        <main className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <IncidentHeader />

          {/* Chat area */}
          <div className="flex flex-1 flex-col overflow-hidden px-6 py-4">
            <Conversation className="flex-1 overflow-hidden">
              <ConversationContent>
                {messages.map(message => (
                  <div key={message.id}>
                    {message.parts?.map((part, i) => {
                      if (part.type === 'text') {
                        return (
                          <Message key={`${message.id}-${i}`} from={message.role}>
                            <MessageContent>
                              <MessageResponse>{part.text}</MessageResponse>
                            </MessageContent>
                          </Message>
                        )
                      }

                      if (part.type?.startsWith('tool-')) {
                        return (
                          <Tool key={`${message.id}-${i}`}>
                            <ToolHeader
                              type={(part as ToolUIPart).type}
                              state={(part as ToolUIPart).state || 'output-available'}
                              className="cursor-pointer"
                            />
                            <ToolContent>
                              <ToolInput input={(part as ToolUIPart).input || {}} />
                              <ToolOutput
                                output={(part as ToolUIPart).output}
                                errorText={(part as ToolUIPart).errorText}
                              />
                            </ToolContent>
                          </Tool>
                        )
                      }

                      return null
                    })}
                  </div>
                ))}
                <ConversationScrollButton />
              </ConversationContent>
            </Conversation>

            {/* Input */}
            <PromptInput onSubmit={handleSubmit} className="mt-4">
              <PromptInputBody>
                <PromptInputTextarea
                  onChange={e => setInput(e.target.value)}
                  value={input}
                  placeholder="Describe an incident or ask about system health..."
                  disabled={status !== 'ready'}
                />
              </PromptInputBody>
            </PromptInput>
          </div>
        </main>

        {/* Right Panel — Context: Metrics, Logs, Workflow */}
        <ContextPanel />
      </div>
    </IncidentContextProvider>
  )
}

function IncidentHeader() {
  const { activeIncident, workflowState } = useIncidentContext()

  const isWorking = Object.values(workflowState).some(s => s === 'running')
  const isResolved = workflowState.verify === 'completed'

  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3 bg-card">
      <div>
        <h2 className="text-sm font-semibold">Incident Response</h2>
        {activeIncident ? (
          <p className="text-xs text-muted-foreground">
            {activeIncident.id} · {activeIncident.title}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ready — describe an incident to begin
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isResolved && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-1 text-[11px] font-medium text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Resolved
          </span>
        )}
        {isWorking && !isResolved && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-1 text-[11px] font-medium text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Analyzing
          </span>
        )}
        {activeIncident && !isWorking && !isResolved && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-medium text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
            {activeIncident.severity} Active
          </span>
        )}
      </div>
    </header>
  )
}

export default CommandCenter
