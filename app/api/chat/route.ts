import { handleChatStream } from '@mastra/ai-sdk'
import { toAISdkV5Messages } from '@mastra/ai-sdk/ui'
import { createUIMessageStreamResponse } from 'ai'
import { mastra } from '@/src/mastra'
import { NextResponse } from 'next/server'

const THREAD_ID = 'aegis-sre-session'
const RESOURCE_ID = 'incident-chat'
type UIMessageStreamResponseOptions = Parameters<typeof createUIMessageStreamResponse>[0]

export async function POST(req: Request) {
    const params = await req.json()
    const stream = await handleChatStream({
        mastra,
        agentId: 'coordinator-agent',
        params: {
            ...params,
            memory: {
                ...params.memory,
                thread: THREAD_ID,
                resource: RESOURCE_ID,
            },
        },
    })
    return createUIMessageStreamResponse({
        stream: stream as unknown as UIMessageStreamResponseOptions['stream'],
    })
}

export async function GET() {
    const memory = await mastra.getAgentById('coordinator-agent').getMemory()
    let response = null

    try {
        response = await memory?.recall({
            threadId: THREAD_ID,
            resourceId: RESOURCE_ID,
        })
    } catch {
        console.log('No previous messages found.')
    }

    const uiMessages = toAISdkV5Messages(response?.messages || [])

    return NextResponse.json(uiMessages)
}

export async function DELETE() {
    const memory = await mastra.getAgentById('coordinator-agent').getMemory()
    try {
        if (memory) {
            const response = await memory.recall({
                threadId: THREAD_ID,
                resourceId: RESOURCE_ID,
            })
            const messageIds = (response?.messages || []).map((msg: any) => msg.id)
            if (messageIds.length > 0) {
                await memory.deleteMessages(messageIds)
            }
        }
    } catch (e) {
        console.error('Failed to clear Mastra memory:', e)
    }

    const { incidentStore } = await import('@/lib/incidents/incident-store')
    incidentStore.clear()

    return NextResponse.json({ success: true })
}
