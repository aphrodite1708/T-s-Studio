import { useState, useRef, useEffect } from 'react'
import Sequencer from '../components/Sequencer'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const GENRE_CHIPS = ['Lo-fi', 'Afrobeats', 'R&B', 'Pop', 'Hip-hop', 'Soul', 'Electronic', 'Jazz', 'Gospel', 'Drill']
const MOOD_CHIPS = ['Chill', 'Hype', 'Romantic', 'Dark', 'Feel-good', 'Melancholy']

type Tab = 'ai' | 'beat'

export default function MusicMaker() {
  const [tab, setTab] = useState<Tab>('ai')
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
        body: JSON.stringify({ mode: 'music', prompt, history: messages }),
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

  const chipSend = (chip: string) => {
    const text = messages.length === 0 ? `I want to make ${chip} music` : chip
    send(text)
  }

  return (
    <div className="maker-root">
      {/* Tab bar */}
      <div className="maker-tabs">
        <button
          className={'maker-tab' + (tab === 'ai' ? ' is-active' : '')}
          onClick={() => setTab('ai')}
        >
          🤖 AI Blueprint
        </button>
        <button
          className={'maker-tab' + (tab === 'beat' ? ' is-active' : '')}
          onClick={() => setTab('beat')}
        >
          🎛️ Beat Maker
        </button>
      </div>

      {tab === 'ai' ? (
        <div className="studio-page">
          <div className="studio-sidebar">
            <h3 className="sidebar-title">Quick picks</h3>
            <p className="sidebar-label">Genres</p>
            <div className="chip-group">
              {GENRE_CHIPS.map((c) => (
                <button key={c} className="chip" onClick={() => chipSend(c)} disabled={loading}>{c}</button>
              ))}
            </div>
            <p className="sidebar-label" style={{ marginTop: '1.25rem' }}>Moods</p>
            <div className="chip-group">
              {MOOD_CHIPS.map((c) => (
                <button key={c} className="chip chip-mood" onClick={() => chipSend(c)} disabled={loading}>{c}</button>
              ))}
            </div>
            <div className="sidebar-tip">
              <span>💡</span>
              <span>Try: "Something like Drake but with a jazz piano" or "Upbeat Afrobeats for a love song"</span>
            </div>
          </div>

          <div className="studio-chat">
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-empty">
                  <div className="chat-empty-icon">🎛️</div>
                  <h2>What kind of music do you want to make?</h2>
                  <p>Describe your vibe, drop an artist name, or pick a genre. AI will build your sound blueprint.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`bubble bubble-${m.role}`}>
                  {m.role === 'assistant' ? <MarkdownBubble text={m.content} /> : <p>{m.content}</p>}
                </div>
              ))}
              {loading && (
                <div className="bubble bubble-assistant bubble-loading">
                  <span /><span /><span />
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); send(input) }}>
              <input
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your sound or drop an artist reference…"
                disabled={loading}
              />
              <button className="chat-send" type="submit" disabled={loading || !input.trim()}>↑</button>
            </form>
          </div>
        </div>
      ) : (
        <Sequencer />
      )}
    </div>
  )
}

function MarkdownBubble({ text }: { text: string }) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />')
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />
}
