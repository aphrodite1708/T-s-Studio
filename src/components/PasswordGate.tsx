import { useState } from 'react'
import { useApp } from '../context/AppContext'

const PASSWORD = 'letscreate'

export default function PasswordGate() {
  const { unlock, setUserName } = useApp()
  const [step, setStep] = useState<'password' | 'name'>('password')
  const [pw, setPw] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.trim().toLowerCase() === PASSWORD) {
      setError('')
      setStep('name')
    } else {
      setError('Wrong password. Try again.')
      setPw('')
    }
  }

  const submitName = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setUserName(n)
    unlock()
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-logo">
          <span className="gate-t">T</span>
          <span className="gate-apostrophe">'s</span>
        </div>
        <p className="gate-sub">Studio</p>

        {step === 'password' ? (
          <form className="gate-form" onSubmit={submitPassword}>
            <p className="gate-hint">Enter the password to step in.</p>
            <input
              type="password"
              placeholder="Password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
              className="gate-input"
            />
            {error && <p className="gate-error">{error}</p>}
            <button type="submit" className="gate-btn" disabled={!pw.trim()}>
              Enter
            </button>
          </form>
        ) : (
          <form className="gate-form" onSubmit={submitName}>
            <p className="gate-hint">What should we call you?</p>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="gate-input"
              maxLength={30}
            />
            <button type="submit" className="gate-btn" disabled={!name.trim()}>
              Let's go
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
