'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { formatNumber, type Message } from '@/lib/chat-data'

const SUGGESTIONS = ['Summarize a long article', 'Help me name a project', 'Explain rate limiting']

type MessageListProps = {
  messages: Message[]
  isLoading: boolean
  onSuggestion: (text: string) => void
}

export function MessageList({ messages, isLoading, onSuggestion }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-5">
        <div className="max-w-sm text-center text-[#8b9099]">
          <h2 className="mb-1.5 text-lg font-semibold text-[#e8e9eb]">Start a conversation</h2>
          <p>Messages and token usage will appear here as you chat.</p>
          <div className="mt-3.5 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestion(s)}
                className="rounded-full border border-[#26292e] bg-[#15171a] px-3 py-1.5 text-[13px] text-[#e8e9eb] hover:border-[#f5a524]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      aria-live="polite"
      className="flex flex-1 flex-col gap-4.5 overflow-y-auto px-4 py-5"
    >
      {messages.map((m) => {
        const isUser = m.role === 'user'
        return (
          <article key={m.id} className="mx-auto flex w-full max-w-[720px] flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-[#8b9099]">
              <span className="font-semibold text-[#e8e9eb]">{isUser ? 'You' : 'Assistant'}</span>
              <span
                className={cn(
                  'ml-auto rounded-md border px-1.5 font-mono text-[11px] tabular-nums',
                  isUser ? 'border-[#26292e]' : 'border-[#f5a524]/40 text-[#f5a524]',
                )}
              >
                {formatNumber(m.tokens)} tok
              </span>
            </div>
            <div
              className={cn(
                'leading-relaxed break-words whitespace-pre-wrap',
                isUser && 'rounded-[10px] border border-[#26292e] bg-[#1c1f23] px-3 py-2.5',
              )}
            >
              {m.content}
            </div>
          </article>
        )
      })}
      {isLoading && (
        <p role="status" className="mx-auto w-full max-w-[720px] text-xs text-[#8b9099]">
          Assistant is thinking…
        </p>
      )}
    </div>
  )
}
