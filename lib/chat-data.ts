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
}

export type ResponseStats = {
  tokens: number
  ms: number
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

const HOUR = 3_600_000

export function createSeedConversations(now: number): Conversation[] {
  return [
    {
      id: 1,
      title: 'Explain vector embeddings',
      updated: now - 0.3 * HOUR,
      messages: [
        makeMessage('user', 'Can you explain vector embeddings in simple terms?'),
        makeMessage(
          'assistant',
          'An embedding turns a piece of text into a list of numbers, a point in a high-dimensional space. Texts with similar meaning land close together, so you can find related content by measuring distance between points instead of matching exact words.\n\nTypical uses: semantic search, recommendations, clustering, and retrieval for RAG pipelines.',
        ),
        makeMessage('user', 'How many dimensions do they usually have?'),
        makeMessage(
          'assistant',
          'Common sizes range from 384 to 3,072 dimensions. Larger vectors can capture more nuance but cost more to store and compare. Many teams start around 768–1,536 and only go bigger if retrieval quality demands it.',
        ),
      ],
    },
    {
      id: 2,
      title: 'Refactor a React reducer',
      updated: now - 5 * HOUR,
      messages: [
        makeMessage('user', 'My reducer has a giant switch statement. How should I split it up?'),
        makeMessage(
          'assistant',
          'Group actions by the slice of state they touch, write one small reducer per slice, then compose them. Keep each case pure and move derived values into selectors so the reducer only stores source data.',
        ),
      ],
    },
    {
      id: 3,
      title: 'Trip packing checklist',
      updated: now - 28 * HOUR,
      messages: [
        makeMessage('user', 'Make me a packing list for a 4-day hiking trip.'),
        makeMessage(
          'assistant',
          'Essentials: layered clothing, rain shell, broken-in boots, 2L water capacity plus filter, headlamp, first-aid kit, map and offline navigation, sun protection, and high-calorie snacks. Add a lightweight stove if you plan to cook.',
        ),
      ],
    },
    {
      id: 4,
      title: 'SQL window functions',
      updated: now - 96 * HOUR,
      messages: [
        makeMessage('user', 'When should I use ROW_NUMBER vs RANK?'),
        makeMessage(
          'assistant',
          'ROW_NUMBER always gives unique sequential numbers, even for ties. RANK gives ties the same number and then skips ahead. Use ROW_NUMBER for deduplication or pagination, and RANK when ties should share a position.',
        ),
      ],
    },
  ]
}

export const SAMPLE_REPLIES = [
  'Good question. The short answer is that it depends on your constraints, but a practical starting point is to keep things simple, measure, and only add complexity where the data shows a real bottleneck.\n\nIf you share more detail about your setup, I can suggest something more specific.',
  'Here is one way to think about it: break the problem into inputs, transformations, and outputs. Once each stage is explicit, it becomes much easier to test, reason about cost, and swap parts out later.',
  'A few points worth considering:\n\n1. Start with the clearest version that works.\n2. Track the metrics that matter to you, such as latency, cost, and accuracy.\n3. Iterate in small steps so regressions are easy to spot.',
]
