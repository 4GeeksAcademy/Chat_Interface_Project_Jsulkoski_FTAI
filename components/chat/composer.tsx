'use client'

import { useState, type Ref } from 'react'
import { estimateTokens, formatNumber } from '@/lib/chat-data'

type ComposerProps = {
  ref?: Ref<HTMLTextAreaElement>
  disabled: boolean
  onSend: (text: string) => void
}

export function Composer({ ref, disabled, onSend }: ComposerProps) {
  const [value, setValue] = useState('')
  const draftTokens = estimateTokens(value)
  const canSend = draftTokens > 0 && !disabled

  function submit() {
    if (!canSend) return
    onSend(value)
    setValue('')
  }

  return (
    <div className="px-4 pt-3 pb-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="mx-auto max-w-[720px] rounded-xl border border-[#26292e] bg-[#15171a] p-2.5 focus-within:border-[#f5a524]"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          ref={ref}
          rows={1}
          value={value}
          placeholder="Send a message…"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              e.preventDefault()
              submit()
            }
          }}
          className="field-sizing-content max-h-45 min-h-11 w-full resize-none bg-transparent text-[#e8e9eb] outline-none placeholder:text-[#8b9099]"
        />
        <div className="flex items-center justify-between gap-2.5 text-xs text-[#8b9099]">
          <span className="font-mono tabular-nums">{`≈ ${formatNumber(draftTokens)} tokens`}</span>
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-lg bg-[#f5a524] px-3.5 py-1.5 font-semibold text-[#1a1203] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
