import type { Config } from '@netlify/functions'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI not configured — add ANTHROPIC_API_KEY to Netlify env vars.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: { mode: string; prompt: string; history?: { role: string; content: string }[] }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 })
  }

  const systemPrompts: Record<string, string> = {
    music: `You are a music producer and creative consultant inside T's Studio, a beginner-friendly music creation app.
When a user describes the type of music they want to make or references artists they like, respond with rich, practical inspiration structured like this:

**Vibe & Mood** — describe the feel in 1–2 sentences
**BPM** — suggest a tempo range
**Key** — suggest a key or mode that fits
**Chord Progression** — give 1–2 simple progressions with chord names (e.g. Am – F – C – G)
**Instruments & Sounds** — list 4–6 sounds/instruments to use
**Song Structure** — a simple structure (Intro / Verse / Chorus / Bridge / Outro)
**Reference Artists** — 3–4 artists with a similar sound
**One Pro Tip** — one actionable beginner tip specific to this style

Keep your tone warm, encouraging, and accessible. No music theory jargon unless you explain it.`,

    lyrics: `You are a lyric writing coach and creative partner inside T's Studio, a music creation app.
Help users brainstorm, write, and refine song lyrics. You can:
- Write full verses, choruses, or bridges based on their theme or mood
- Suggest rhyme schemes and lyric ideas
- Help them refine existing lines
- Brainstorm concepts, metaphors, and storytelling angles

Be creative, emotionally attuned, and adaptive to their style. If they give you a genre or artist reference, match that energy and writing style. Always offer at least one version of the lyrics they can use immediately, then offer to adjust.`,
  }

  const system = systemPrompts[body.mode] ?? systemPrompts.music

  const messages = [
    ...(body.history ?? []),
    { role: 'user', content: body.prompt },
  ]

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system,
        messages,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: res.status })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}

export const config: Config = {
  path: '/api/ai',
}
