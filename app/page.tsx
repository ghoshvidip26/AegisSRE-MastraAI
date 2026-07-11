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
    <div className="flex h-screen w-full overflow-hidden dark">
      {/* Left Sidebar — Incidents & Health */}
      <Sidebar />

      {/* Center — Chat Interface */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border px-6 py-3 bg-card">
          <div>
            <h2 className="text-sm font-semibold">Incident Response</h2>
            <p className="text-xs text-muted-foreground">INC-001 · Redis connection pool exhausted</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-medium text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
              P1 Active
            </span>
          </div>
        </header>

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
  )
}

export default CommandCenter
