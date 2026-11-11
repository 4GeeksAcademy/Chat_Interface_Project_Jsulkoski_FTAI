import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  CONTEXT_WINDOW,
  conversationCost,
  conversationTotals,
  formatNumber,
  type Conversation,
  type ResponseStats,
} from '@/lib/chat-data'

type StatsPanelProps = {
  conversation: Conversation
  conversations: Conversation[]
  lastStats?: ResponseStats
  open: boolean
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-3.5 mb-3 rounded-[10px] border border-[#26292e] bg-[#1c1f23] p-3">
      <h3 className="mb-2 text-xs font-medium text-[#8b9099]">{title}</h3>
      {children}
    </section>
  )
}

// The bar is visually scaled 20x so small conversations remain visible against a 128k window.
const meterWidth = (tokens: number) =>
  tokens ? `${Math.min(100, Math.max(0.6, (tokens / CONTEXT_WINDOW) * 100 * 20))}%` : '0%'

export function StatsPanel({ conversation, conversations, lastStats, open }: StatsPanelProps) {
  const { input, output } = conversationTotals(conversation)
  const used = conversation.usage?.totalTokens ?? input + output
  const recent = conversation.messages.slice(-24)
  const maxTokens = Math.max(1, ...recent.map((m) => m.tokens))

  const allTotals = conversations.reduce(
    (totals, conversation) => {
      const current = conversationTotals(conversation)
      return { input: totals.input + current.input, output: totals.output + current.output }
    },
    { input: 0, output: 0 },
  )
  const allTokens = conversations.reduce(
    (sum, conversation) =>
      sum + (conversation.usage?.totalTokens ?? conversationTotals(conversation).input + conversationTotals(conversation).output),
    0,
  )
  const allCost = conversations.reduce((sum, c) => sum + conversationCost(c), 0)

  return (
    <aside
      id="stats-panel"
      aria-label="Token usage"
      className={cn(
        'fixed inset-y-0 right-0 z-20 w-[min(300px,86vw)] overflow-y-auto border-l border-[#26292e] bg-[#15171a] pb-4 transition-transform motion-reduce:transition-none lg:static lg:w-auto lg:translate-x-0',
        open ? 'translate-x-0' : 'translate-x-[105%]',
      )}
    >
      <div className="px-3.5 pt-3.5 pb-2.5">
        <h2 className="text-xs font-medium tracking-wider text-[#8b9099] uppercase">Token usage</h2>
      </div>

      <Card title="Context window">
        <p className="font-mono text-[26px] leading-tight font-semibold tabular-nums">
          {formatNumber(used)}
        </p>
        <p className="font-mono text-xs text-[#8b9099] tabular-nums">
          {`of ${formatNumber(CONTEXT_WINDOW)} tokens · ${((used / CONTEXT_WINDOW) * 100).toFixed(2)}%`}
        </p>
        <div
          role="img"
          aria-label={`${formatNumber(input)} input and ${formatNumber(output)} output tokens used of ${formatNumber(CONTEXT_WINDOW)}`}
          className="mt-2.5 mb-1.5 flex h-2 overflow-hidden rounded-full bg-[#0e0f11]"
        >
          <span className="h-full bg-[#e8e9eb] transition-[width]" style={{ width: meterWidth(input) }} />
          <span className="h-full bg-[#f5a524] transition-[width]" style={{ width: meterWidth(output) }} />
        </div>
        <div className="flex gap-3.5 text-xs text-[#8b9099]">
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-xs bg-[#e8e9eb]" aria-hidden="true" />
            Input
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2 rounded-xs bg-[#f5a524]" aria-hidden="true" />
            Output
          </span>
        </div>
      </Card>

      <Card title="This conversation">
        <dl className="grid grid-cols-2 gap-2.5">
          {[
            ['Input', formatNumber(input)],
            ['Output', formatNumber(output)],
            ['Messages', String(conversation.messages.length)],
            ['Est. cost', `$${conversationCost(conversation).toFixed(4)}`],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-[#8b9099]">{label}</dt>
              <dd className="font-mono text-base font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="Tokens per message">
        {recent.length === 0 ? (
          <p className="grid h-20 place-items-center text-xs text-[#8b9099]">No messages yet</p>
        ) : (
          <div role="img" aria-label="Token count per message" className="mt-1.5 flex h-20 items-end gap-1">
            {recent.map((m) => (
              <div
                key={m.id}
                title={`${m.role}: ${m.tokens} tokens`}
                className={cn(
                  'min-w-1 flex-1 rounded-t-[3px]',
                  m.role === 'assistant' ? 'bg-[#f5a524]' : 'bg-[#e8e9eb]/85',
                )}
                style={{ height: `${Math.max(4, (m.tokens / maxTokens) * 100)}%` }}
              />
            ))}
          </div>
        )}
      </Card>

      <Card title="Last response">
        <table className="w-full font-mono text-xs tabular-nums">
          <tbody className="[&_tr+tr_td]:border-t [&_tr+tr_td]:border-[#26292e] [&_td]:py-1.5 [&_td:last-child]:text-right">
            <tr>
              <td>Model</td>
              <td>{lastStats?.model ?? '—'}</td>
            </tr>
            <tr>
              <td>Output tokens</td>
              <td>{lastStats ? formatNumber(lastStats.tokens) : '—'}</td>
            </tr>
            <tr>
              <td>Duration</td>
              <td>{lastStats ? `${(lastStats.ms / 1000).toFixed(2)}s` : '—'}</td>
            </tr>
            <tr>
              <td>Throughput</td>
              <td>
                {lastStats ? `${(lastStats.tokens / (lastStats.ms / 1000)).toFixed(1)} tok/s` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="All conversations">
        <p className="font-mono text-[26px] leading-tight font-semibold tabular-nums">
          {formatNumber(allTokens)}
        </p>
        <p className="font-mono text-xs text-[#8b9099] tabular-nums">
          {`Prompt ${formatNumber(allTotals.input)} · Completion ${formatNumber(allTotals.output)}`}
        </p>
        <p className="font-mono text-xs text-[#8b9099] tabular-nums">
          {`$${allCost.toFixed(4)} across ${conversations.length} chats`}
        </p>
      </Card>
    </aside>
  )
}
