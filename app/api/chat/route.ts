import { NextResponse } from 'next/server'

const MODEL = 'openai/gpt-oss-20b'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type GroqResponse = {
  choices?: { message?: { content?: unknown } }[]
  usage?: {
    prompt_tokens?: unknown
    completion_tokens?: unknown
    total_tokens?: unknown
  }
  model?: unknown
  error?: { message?: unknown }
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Record<string, unknown>
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string'
  )
}

export async function POST(request: Request) {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Groq is not configured. Add NEXT_PUBLIC_GROQ_API_KEY to .env.local and restart the app.' },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'The request body must be valid JSON.' }, { status: 400 })
  }

  const messages =
    typeof body === 'object' && body !== null && 'messages' in body
      ? (body as { messages?: unknown }).messages
      : undefined
  if (!Array.isArray(messages) || messages.length === 0 || !messages.every(isChatMessage)) {
    return NextResponse.json({ error: 'Send at least one valid chat message.' }, { status: 400 })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_completion_tokens: 512,
        reasoning_effort: 'low',
      }),
    })
    const data = (await response.json().catch(() => null)) as GroqResponse | null

    if (!response.ok) {
      const message =
        typeof data?.error?.message === 'string'
          ? `Groq request failed: ${data.error.message}`
          : 'Groq could not complete the request. Please try again.'
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const content = data?.choices?.[0]?.message?.content
    const usage = data?.usage
    if (
      typeof content !== 'string' ||
      typeof usage?.prompt_tokens !== 'number' ||
      typeof usage.completion_tokens !== 'number' ||
      typeof usage.total_tokens !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Groq returned an incomplete response. Please try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      content,
      model: typeof data?.model === 'string' ? data.model : MODEL,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Unable to reach Groq right now. Check your connection and try again.' },
      { status: 502 },
    )
  }
}