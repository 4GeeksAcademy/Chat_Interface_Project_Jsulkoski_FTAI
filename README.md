# Chat_Interface_Project_Jsulkoski_FTAI
Building a Chat Interface with a Real AI API

## Setup

Create a `.env.local` file in the project root and add your Groq API key:

```env
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key
```

The key is read only by the server-side API route; do not reference it in client components. Restart the development server after adding it.

Run the app with `pnpm dev`.

The chat uses Groq's `qwen/qwen3.8-27b` model.

## Known limitations

- Conversations are stored only in this browser's `localStorage`; they are not synced between devices or backed by an account.
- Token counts come from Groq, but displayed dollar costs are estimates based on fixed rates and may not match current Groq pricing or billing.
