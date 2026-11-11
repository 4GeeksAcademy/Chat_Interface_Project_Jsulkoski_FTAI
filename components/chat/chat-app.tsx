'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, Menu } from 'lucide-react'
import {
  SAMPLE_REPLIES,
  createSeedConversations,
  estimateTokens,
  makeMessage,
  type Conversation,
  type ResponseStats,
} from '@/lib/chat-data'
import { HistoryPanel } from './history-panel'
import { MessageList } from './message-list'
import { Composer } from './composer'
import { StatsPanel } from './stats-panel'

type Drawer = 'history' | 'stats' | null

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function ChatApp({ initialNow }: { initialNow: number }) {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    createSeedConversations(initialNow),
  )
  const [activeId, setActiveId] = useState(1)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [lastStats, setLastStats] = useState<Record<number, ResponseStats>>({})
  const [drawer, setDrawer] = useState<Drawer>(null)
  const nextId = useRef(5)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
  const isStreaming = streamingId !== null

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function updateConversation(id: number, update: (c: Conversation) => Conversation) {
    setConversations((cs) => cs.map((c) => (c.id === id ? update(c) : c)))
  }

  function selectConversation(id: number) {
    if (isStreaming) return
    setActiveId(id)
    setDrawer(null)
  }

  function newConversation() {
    if (isStreaming) return
    const empty = conversations.find((c) => c.messages.length === 0)
    if (empty) {
      setActiveId(empty.id)
    } else {
      const id = nextId.current++
      setConversations((cs) => [
        ...cs,
        { id, title: 'New conversation', updated: Date.now(), messages: [] },
      ])
      setActiveId(id)
    }
    setDrawer(null)
    composerRef.current?.focus()
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    const conversationId = active.id
    const reply = makeMessage('assistant', '')
    updateConversation(conversationId, (c) => ({
      ...c,
      title:
        c.messages.length === 0
          ? trimmed.length > 36
            ? `${trimmed.slice(0, 36)}…`
            : trimmed
          : c.title,
      updated: Date.now(),
      messages: [...c.messages, makeMessage('user', trimmed), reply],
    }))
    setStreamingId(reply.id)

    // Replace this simulated stream with your real model call (e.g. AI SDK useChat).
    const full = SAMPLE_REPLIES[Math.floor(Math.random() * SAMPLE_REPLIES.length)]
    const start = performance.now()
    let content = ''
    for (const part of full.split(/(\s+)/)) {
      await sleep(18 + Math.random() * 30)
      content += part
      const snapshot = content
      updateConversation(conversationId, (c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === reply.id ? { ...m, content: snapshot, tokens: estimateTokens(snapshot) } : m,
        ),
      }))
    }

    setLastStats((s) => ({
      ...s,
      [conversationId]: { tokens: estimateTokens(full), ms: performance.now() - start },
    }))
    updateConversation(conversationId, (c) => ({ ...c, updated: Date.now() }))
    setStreamingId(null)
  }

  return (
    <div className="grid h-dvh min-h-[560px] grid-cols-1 bg-[#0e0f11] text-sm text-[#e8e9eb] lg:grid-cols-[260px_minmax(0,1fr)_280px]">
      <HistoryPanel
        conversations={conversations}
        activeId={active.id}
        open={drawer === 'history'}
        disabled={isStreaming}
        onSelect={selectConversation}
        onNew={newConversation}
      />

      <main className="flex min-h-0 min-w-0 flex-col">
        <header className="flex items-center gap-2.5 border-b border-[#26292e] px-4 py-3">
          <button
            type="button"
            onClick={() => setDrawer('history')}
            aria-label="Open history"
            aria-controls="history-panel"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-[#26292e] bg-[#1c1f23] lg:hidden"
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>
          <h1 className="flex-1 truncate text-[15px] font-semibold">{active.title}</h1>
          <span className="hidden rounded-full border border-[#26292e] px-2.5 py-0.5 font-mono text-xs text-[#8b9099] sm:inline">
            {'model-x · 128k ctx'}
          </span>
          <button
            type="button"
            onClick={() => setDrawer('stats')}
            aria-label="Open token usage"
            aria-controls="stats-panel"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-[#26292e] bg-[#1c1f23] lg:hidden"
          >
            <BarChart3 className="size-4" aria-hidden="true" />
          </button>
        </header>

        <MessageList
          messages={active.messages}
          streamingId={streamingId}
          onSuggestion={sendMessage}
        />
        <Composer ref={composerRef} disabled={isStreaming} onSend={sendMessage} />
      </main>

      <StatsPanel
        conversation={active}
        conversations={conversations}
        lastStats={lastStats[active.id]}
        open={drawer === 'stats'}
      />

      {drawer && (
        <div
          aria-hidden="true"
          onClick={() => setDrawer(null)}
          className="fixed inset-0 z-10 bg-black/50 lg:hidden"
        />
      )}
    </div>
  )
}
