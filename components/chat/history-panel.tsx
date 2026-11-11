'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  conversationTotals,
  formatNumber,
  relativeTime,
  type Conversation,
} from '@/lib/chat-data'

const DAY = 86_400_000

type HistoryPanelProps = {
  conversations: Conversation[]
  activeId: number
  open: boolean
  disabled: boolean
  onSelect: (id: number) => void
  onNew: () => void
}

export function HistoryPanel({
  conversations,
  activeId,
  open,
  disabled,
  onSelect,
  onNew,
}: HistoryPanelProps) {
  const [query, setQuery] = useState('')
  const now = Date.now()

  const filtered = conversations
    .filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.updated - a.updated)

  const groups = [
    { label: 'Today', items: filtered.filter((c) => now - c.updated < DAY) },
    { label: 'Earlier', items: filtered.filter((c) => now - c.updated >= DAY) },
  ].filter((g) => g.items.length > 0)

  return (
    <aside
      id="history-panel"
      aria-label="Message history"
      className={cn(
        'fixed inset-y-0 left-0 z-20 flex w-[min(300px,86vw)] flex-col border-r border-[#26292e] bg-[#15171a] transition-transform motion-reduce:transition-none lg:static lg:w-auto lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-[105%]',
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3.5 pt-3.5 pb-2.5">
        <h2 className="text-xs font-medium tracking-wider text-[#8b9099] uppercase">History</h2>
        <button
          type="button"
          onClick={onNew}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5a524] px-2.5 py-1.5 text-[13px] font-semibold text-[#1a1203] disabled:opacity-50"
        >
          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          New chat
        </button>
      </div>

      <div className="px-3.5 pb-2.5">
        <label htmlFor="conversation-search" className="sr-only">
          Search conversations
        </label>
        <input
          id="conversation-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations"
          autoComplete="off"
          className="w-full rounded-lg border border-[#26292e] bg-[#1c1f23] px-2.5 py-2 text-[#e8e9eb] placeholder:text-[#8b9099] focus:outline-2 focus:-outline-offset-1 focus:outline-[#f5a524]"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 && <p className="px-2.5 pt-2.5 text-xs text-[#8b9099]">No matches</p>}
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pt-2.5 pb-1 text-[11px] tracking-wider text-[#8b9099] uppercase">
              {group.label}
            </p>
            <ul className="flex flex-col">
              {group.items.map((c) => {
                const totals = conversationTotals(c)
                const isActive = c.id === activeId
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={cn(
                        'flex w-full flex-col gap-0.5 rounded-lg border border-transparent px-2.5 py-2 text-left hover:bg-[#1c1f23]',
                        isActive && 'border-[#26292e] bg-[#1c1f23]',
                      )}
                    >
                      <span className="flex items-center gap-2 truncate font-medium">
                        {isActive && (
                          <span className="size-1.5 shrink-0 rounded-full bg-[#f5a524]" aria-hidden="true" />
                        )}
                        <span className="truncate">{c.title}</span>
                      </span>
                      <span className="flex justify-between text-xs text-[#8b9099]">
                        <span>
                          {relativeTime(c.updated, now)} {'·'} {c.messages.length} msgs
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatNumber(totals.input + totals.output)} tok
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
