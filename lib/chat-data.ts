export type Role = 'user' | 'assistant'

export type Message = {
  id: string
  role: Role
  content: string
  tokens: number
}

export type Conversation = {
  id: number
  title: string
  updated: number
  messages: Message[]
  usage?: TokenUsage
}

export type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type ResponseStats = {
  tokens: number
  ms: number
  model: string
}

export const CONTEXT_WINDOW = 128_000
export const PRICE_PER_INPUT_TOKEN = 2.5 / 1e6
export const PRICE_PER_OUTPUT_TOKEN = 10 / 1e6

export function estimateTokens(text: string) {
  const trimmed = text.trim()
  return trimmed ? Math.max(1, Math.ceil(trimmed.length / 4)) : 0
}

export function formatNumber(n: number) {
  return n.toLocaleString('en-US')
}

export function conversationTotals(conversation: Conversation) {
  if (conversation.usage) {
    return {
      input: conversation.usage.promptTokens,
      output: conversation.usage.completionTokens,
    }
  }

  return conversation.messages.reduce(
    (acc, m) => {
      if (m.role === 'user') acc.input += m.tokens
      else acc.output += m.tokens
      return acc
    },
    { input: 0, output: 0 },
  )
}

export function conversationCost(conversation: Conversation) {
  const { input, output } = conversationTotals(conversation)
  return input * PRICE_PER_INPUT_TOKEN + output * PRICE_PER_OUTPUT_TOKEN
}

export function relativeTime(timestamp: number, now = Date.now()) {
  const seconds = (now - timestamp) / 1000
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

let messageCounter = 0
export function makeMessage(role: Role, content: string): Message {
  messageCounter += 1
  return { id: `m${messageCounter}`, role, content, tokens: estimateTokens(content) }
}
