import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SECTION_CHIPS = ['Write a verse', 'Write a chorus', 'Write a bridge', 'Write an intro', 'Write an outro']
const THEME_CHIPS = ['Love', 'Heartbreak', 'Success', 'Struggle', 'Growth', 'Celebration', 'Nostalgia', 'Ambition']

export default function LyricsWriter() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const prompt = text.trim()
    if (!prompt || loading) return
    setInput('')

    const next: Message[] = [...messages, { role: 'user', content: prompt }]
    setMessages(next)
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'lyrics',
          prompt,
          history: messages,
        }),
      })
      const data = await res.json()
      const reply = data.text ?? data.error ?? 'Something went wrong.'
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Network error — please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  const chipSend = (chip: string) => send(chip)

  return (
    <div className="studio-page">
      <div className="studio-sidebar">
        <h3 className="sidebar-title">Song sections</h3>
        <div className="chip-group chip-group-col">
          {SECTION_CHIPS.map((c) => (
            <button key={c} className="chip chip-section" onClick={() => chipSend(c)} disabled={loading}>
              {c}
            </button>
          ))}
        </div>
        <p className="sidebar-label" style={{ marginTop: '1.25rem' }}>Themes</p>
        <div className="chip-group">
          {THEME_CHIPS.map((c) => (
            <button key={c} className="chip" onClick={() => chipSend(`Write lyrics about ${c.toLowerCase()}`)} disabled={loading}>
              {c}
            </button>
          ))}
        </div>
        <div className="sidebar-tip">
          <span>💡</span>
          <span>Try: "Write a verse about missing home, in the style of SZA" or "Give me a catchy chorus for an upbeat love song"</span>
        </div>
      </div>

      <div className="studio-chat">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">✍️</div>
              <h2>What's your song about?</h2>
              <p>Tell AI your theme, mood, or reference artist. It'll write verses, choruses, or a full draft — then keep refining with you.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`bubble bubble-${m.role}`}>
              {m.role === 'assistant' ? (
                <LyricsBubble text={m.content} />
              ) : (
                <p>{m.content}</p>
              )}
            </div>
          ))}
          {loading && (
            <div className="bubble bubble-assistant bubble-loading">
              <span /><span /><span />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="chat-input-row"
          onSubmit={(e) => { e.preventDefault(); send(input) }}
        >
          <input
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your song, theme, or ask for a specific section…"
            disabled={loading}
          />
          <button className="chat-send" type="submit" disabled={loading || !input.trim()}>
            ↑
          </button>
        </form>
      </div>
    </div>
  )
}

function LyricsBubble({ text }: { text: string }) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
  return <div className="md lyrics-md" dangerouslySetInnerHTML={{ __html: html }} />
}
