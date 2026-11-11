'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, Menu, Trash2 } from 'lucide-react'
import {
  makeMessage,
  type Conversation,
  type ResponseStats,
  type TokenUsage,
} from '@/lib/chat-data'
import { HistoryPanel } from './history-panel'
import { MessageList } from './message-list'
import { Composer } from './composer'
import { StatsPanel } from './stats-panel'

type Drawer = 'history' | 'stats' | null

const STORAGE_KEY = 'groq-chat-session'
const MODEL = 'openai/gpt-oss-20b'

type PersistedSession = {
  conversations: Conversation[]
  activeId: number
  lastStats: Record<number, ResponseStats>
}

type ChatApiResponse = {
  content?: unknown
  error?: unknown
  model?: unknown
  usage?: {
    promptTokens?: unknown
    completionTokens?: unknown
    totalTokens?: unknown
  }
}

function emptyUsage(): TokenUsage {
  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
}

function emptyConversation(id: number, updated = Date.now()): Conversation {
  return { id, title: 'New conversation', updated, messages: [], usage: emptyUsage() }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isConversation(value: unknown): value is Conversation {
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.title !== 'string') {
    return false
  }
  if (
    typeof value.updated !== 'number' ||
    !Array.isArray(value.messages) ||
    !value.messages.every(
      (message) =>
        isRecord(message) &&
        typeof message.id === 'string' &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        typeof message.tokens === 'number',
    )
  ) {
    return false
  }
  const usage = value.usage
  return (
    usage === undefined ||
    (isRecord(usage) &&
      typeof usage.promptTokens === 'number' &&
      typeof usage.completionTokens === 'number' &&
      typeof usage.totalTokens === 'number')
  )
}

function isPersistedSession(value: unknown): value is PersistedSession {
  if (
    !isRecord(value) ||
    typeof value.activeId !== 'number' ||
    !Array.isArray(value.conversations) ||
    !value.conversations.every(isConversation) ||
    !isRecord(value.lastStats)
  ) {
    return false
  }
  return Object.values(value.lastStats).every(
    (stats) =>
      isRecord(stats) &&
      typeof stats.tokens === 'number' &&
      typeof stats.ms === 'number' &&
      typeof stats.model === 'string',
  )
}

export function ChatApp({ initialNow }: { initialNow: number }) {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    [emptyConversation(1, initialNow)],
  )
  const [activeId, setActiveId] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastStats, setLastStats] = useState<Record<number, ResponseStats>>({})
  const [drawer, setDrawer] = useState<Drawer>(null)
  const [storageReady, setStorageReady] = useState(false)
  const nextId = useRef(2)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const skipNextPersist = useRef(false)

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (isPersistedSession(parsed)) {
          const restored = parsed.conversations.length
            ? parsed.conversations
            : [emptyConversation(1, initialNow)]
          setConversations(restored)
          setActiveId(
            restored.some((conversation) => conversation.id === parsed.activeId)
              ? parsed.activeId
              : restored[0].id,
          )
          setLastStats(parsed.lastStats)
          nextId.current = Math.max(0, ...restored.map((conversation) => conversation.id)) + 1
        } else {
          setError('Saved chat data is invalid and could not be restored.')
        }
      }
    } catch {
      setError('Saved chat data could not be loaded from this browser.')
    } finally {
      setStorageReady(true)
    }
  }, [initialNow])

  useEffect(() => {
    if (!storageReady) return
    if (skipNextPersist.current) {
      skipNextPersist.current = false
      return
    }
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ conversations, activeId, lastStats }),
      )
    } catch {
      setError('Chat data could not be saved in this browser.')
    }
  }, [activeId, conversations, lastStats, storageReady])

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
    if (isLoading) return
    setActiveId(id)
    setDrawer(null)
  }

  function newConversation() {
    if (isLoading) return
    const empty = conversations.find((c) => c.messages.length === 0)
    if (empty) {
      setActiveId(empty.id)
    } else {
      const id = nextId.current++
      setConversations((cs) => [...cs, emptyConversation(id)])
      setActiveId(id)
    }
    setDrawer(null)
    composerRef.current?.focus()
  }

  function clearConversation() {
    if (isLoading) return
    const fresh = emptyConversation(nextId.current++)
    skipNextPersist.current = true
    setConversations([fresh])
    setActiveId(fresh.id)
    setLastStats({})
    setError(null)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      setError('Chat data could not be cleared from this browser.')
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isLoading || !storageReady) return

    const conversationId = active.id
    const userMessage = makeMessage('user', trimmed)
    updateConversation(conversationId, (c) => ({
      ...c,
      title:
        c.messages.length === 0
          ? trimmed.length > 36
            ? `${trimmed.slice(0, 36)}…`
            : trimmed
          : c.title,
      updated: Date.now(),
      messages: [...c.messages, userMessage],
    }))
    const start = performance.now()
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...active.messages, userMessage].map(({ role, content }) => ({ role, content })),
        }),
      })
      const result = (await response.json().catch(() => null)) as ChatApiResponse | null
      if (!response.ok) {
        throw new Error(
          typeof result?.error === 'string'
            ? result.error
            : 'The chat request failed. Please try again.',
        )
      }

        const content = result?.content
        const promptTokens = result?.usage?.promptTokens
        const completionTokens = result?.usage?.completionTokens
        const totalTokens = result?.usage?.totalTokens
      if (
          typeof content !== 'string' ||
          typeof promptTokens !== 'number' ||
          typeof completionTokens !== 'number' ||
          typeof totalTokens !== 'number'
      ) {
        throw new Error('The model returned an incomplete response. Please try again.')
      }

      const model = typeof result?.model === 'string' ? result.model : MODEL
      const duration = performance.now() - start
      const assistantMessage = {
          ...makeMessage('assistant', content),
          tokens: completionTokens,
      }
      updateConversation(conversationId, (conversation) => {
        const previous = conversation.usage ?? emptyUsage()
        return {
          ...conversation,
          updated: Date.now(),
          messages: [...conversation.messages, assistantMessage],
          usage: {
            promptTokens: previous.promptTokens + promptTokens,
            completionTokens: previous.completionTokens + completionTokens,
            totalTokens: previous.totalTokens + totalTokens,
          },
        }
      })
      setLastStats((stats) => ({
        ...stats,
        [conversationId]: { tokens: completionTokens, ms: duration, model },
      }))
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while contacting the model. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid h-dvh min-h-[560px] grid-cols-1 bg-[#0e0f11] text-sm text-[#e8e9eb] lg:grid-cols-[260px_minmax(0,1fr)_280px]">
      <HistoryPanel
        conversations={conversations}
        activeId={active.id}
        open={drawer === 'history'}
        disabled={isLoading || !storageReady}
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
            {lastStats[active.id]?.model ?? MODEL}
          </span>
          <button
            type="button"
            onClick={clearConversation}
            disabled={isLoading}
            aria-label="Clear conversation"
            title="Clear conversation"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-[#26292e] bg-[#1c1f23] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
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

        {error && (
          <p role="alert" className="border-b border-red-900/70 bg-red-950/40 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        <MessageList
          messages={active.messages}
          isLoading={isLoading}
          onSuggestion={sendMessage}
        />
        <Composer ref={composerRef} disabled={isLoading || !storageReady} onSend={sendMessage} />
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
