/// <reference types="node" />
export const config = { runtime: 'edge' }

const GEMINI_MODEL = 'gemini-2.0-flash'

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI not configured — add GEMINI_API_KEY to Vercel env vars.' }), {
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
    beat: `You are a beat pattern generator for T's Studio, a beginner-friendly music app.
When a user describes a music style, artist, or mood, respond with ONLY a raw JSON object — no markdown, no code fences, no explanation. Just the JSON.

Use this exact format:
{
  "bpm": <number 60-180>,
  "name": "<short catchy style name, e.g. 'Drake Vibes' or 'Afrobeats Energy'>",
  "pattern": {
    "kick":  [<16 values, each 0 or 1>],
    "snare": [<16 values, each 0 or 1>],
    "hihat": [<16 values, each 0 or 1>],
    "bass":  [<16 values, each 0 or 1>],
    "synth": [<16 values, each 0 or 1>]
  }
}

Style guides:
- Drake / R&B / love song: 78-88 BPM, trap hi-hats (busy 16ths with gaps), kick on 1 and syncopated, snare on 3, minimal synth
- Afrobeats: 100-112 BPM, syncopated kick, snare on 2 and 4 with extras, busy hi-hat, active bass
- Lo-fi hip-hop: 75-85 BPM, simple boom-bap kick/snare, light hi-hat, warm bass, sparse synth
- Trap / Hip-hop: 130-145 BPM, 808-style kick (steps 1 and 9), snare on 5 and 13, rapid hi-hats
- Pop: 100-120 BPM, four-on-the-floor kick (1,5,9,13), snare on 5 and 13, steady hi-hat
- Electronic / EDM: 125-135 BPM, kick every 4 steps, offbeat hi-hats, synth on off-beats
- Gospel / Soul: 88-100 BPM, swung feel, snare on 5 and 13, warm bass, synth chords`,

    lyrics: `You are a lyric writing coach and creative partner inside T's Studio, a music creation app.
Help users brainstorm, write, and refine song lyrics. You can:
- Write full verses, choruses, or bridges based on their theme or mood
- Suggest rhyme schemes and lyric ideas
- Help them refine existing lines
- Brainstorm concepts, metaphors, and storytelling angles

Be creative, emotionally attuned, and adaptive to their style. If they give you a genre or artist reference, match that energy and writing style. Always offer at least one version of the lyrics they can use immediately, then offer to adjust.`,
  }

  const system = systemPrompts[body.mode] ?? systemPrompts.music

  const contents = [
    ...(body.history ?? []).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })),
    { role: 'user', parts: [{ text: body.prompt }] },
  ]

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: res.status })
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}
