'use client'

import '@/app/globals.css'
import { useEffect, useState } from 'react'
import { DefaultChatTransport, ToolUIPart } from 'ai'
import { useChat } from '@ai-sdk/react'
import { Sun, Moon } from 'lucide-react'

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
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(systemPrefersDark ? 'dark' : 'light')
    }
  }, [])

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

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
      <div className="flex h-screen w-full overflow-hidden relative transition-colors duration-300 bg-background text-foreground">
        {/* Background ambient blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 dark:bg-primary/5 blur-[120px] pointer-events-none animate-pulse-slow z-0" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/10 dark:bg-secondary/5 blur-[130px] pointer-events-none animate-pulse-slow-delay z-0" />
        <div className="absolute top-[30%] left-[40%] w-[40%] h-[40%] rounded-full bg-tertiary/10 dark:bg-tertiary/5 blur-[140px] pointer-events-none animate-pulse-slow-delay-more z-0" />

        <div className="flex h-full w-full overflow-hidden p-6 gap-6 relative z-10">
          {/* Left Sidebar — Incidents & Health */}
          <Sidebar />

          {/* Center — Chat Interface */}
          <main className="flex flex-1 flex-col min-w-0 glass-panel rounded-2xl overflow-hidden shadow-2xl bg-card/10 border-border/40">
            {/* Top bar */}
            <IncidentHeader theme={theme} toggleTheme={toggleTheme} />

            {/* Chat area */}
            <div className="flex flex-1 flex-col overflow-hidden px-6 py-4 bg-background/20">
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
      </div>
    </IncidentContextProvider>
  )
}

function IncidentHeader({ theme, toggleTheme }: { theme: 'light' | 'dark'; toggleTheme: () => void }) {
  const { activeIncident, workflowState } = useIncidentContext()

  const isWorking = Object.values(workflowState).some(s => s === 'running')
  const isResolved = workflowState.verify === 'completed'

  return (
    <header className="flex items-center justify-between border-b border-border/40 px-6 py-3 bg-card/20 backdrop-blur-md">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Incident Response</h2>
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
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isResolved && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-2.5 py-1 text-[11px] font-medium text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              Resolved
            </span>
          )}
          {isWorking && !isResolved && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Analyzing
            </span>
          )}
          {activeIncident && !isWorking && !isResolved && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
              {activeIncident.severity} Active
            </span>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-border/40 bg-card/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
      </div>
    </header>
  )
}

export default CommandCenter
