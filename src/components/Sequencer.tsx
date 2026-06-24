import { useState, useRef, useEffect, useCallback } from 'react'

const STEPS = 16

type TrackId = 'kick' | 'snare' | 'hihat' | 'bass' | 'synth' | 'voice'

interface Track {
  id: TrackId
  name: string
  emoji: string
  steps: boolean[]
  volume: number
  muted: boolean
}

const INITIAL_TRACKS: Track[] = [
  { id: 'kick',  name: 'Kick',     emoji: '🥁', steps: Array(STEPS).fill(false), volume: 0.8, muted: false },
  { id: 'snare', name: 'Snare',    emoji: '🪘', steps: Array(STEPS).fill(false), volume: 0.7, muted: false },
  { id: 'hihat', name: 'Hi-Hat',   emoji: '🎩', steps: Array(STEPS).fill(false), volume: 0.5, muted: false },
  { id: 'bass',  name: 'Bass',     emoji: '🎸', steps: Array(STEPS).fill(false), volume: 0.6, muted: false },
  { id: 'synth', name: 'Synth',    emoji: '🎹', steps: Array(STEPS).fill(false), volume: 0.5, muted: false },
  { id: 'voice', name: 'My Voice', emoji: '🎙️', steps: Array(STEPS).fill(false), volume: 0.8, muted: false },
]

// ── Synthesis (pure functions, outside component) ──────────────────────────

function synthKick(ctx: AudioContext, t: number, vol: number) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.4)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  osc.connect(g); g.connect(ctx.destination)
  osc.start(t); osc.stop(t + 0.4)
}

function synthSnare(ctx: AudioContext, t: number, vol: number) {
  const size = Math.floor(ctx.sampleRate * 0.18)
  const buf = ctx.createBuffer(1, size, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const filt = ctx.createBiquadFilter()
  filt.type = 'bandpass'; filt.frequency.value = 1200
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  src.connect(filt); filt.connect(g); g.connect(ctx.destination)
  src.start(t); src.stop(t + 0.18)
  const osc = ctx.createOscillator()
  osc.type = 'triangle'; osc.frequency.value = 200
  const og = ctx.createGain()
  og.gain.setValueAtTime(vol * 0.3, t)
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
  osc.connect(og); og.connect(ctx.destination)
  osc.start(t); osc.stop(t + 0.08)
}

function synthHihat(ctx: AudioContext, t: number, vol: number) {
  const size = Math.floor(ctx.sampleRate * 0.05)
  const buf = ctx.createBuffer(1, size, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const filt = ctx.createBiquadFilter()
  filt.type = 'highpass'; filt.frequency.value = 8000
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol * 0.35, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
  src.connect(filt); filt.connect(g); g.connect(ctx.destination)
  src.start(t); src.stop(t + 0.05)
}

function synthBass(ctx: AudioContext, t: number, vol: number) {
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'; osc.frequency.value = 80
  const filt = ctx.createBiquadFilter()
  filt.type = 'lowpass'; filt.frequency.value = 300
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
  osc.connect(filt); filt.connect(g); g.connect(ctx.destination)
  osc.start(t); osc.stop(t + 0.35)
}

function synthSynth(ctx: AudioContext, t: number, vol: number) {
  const osc = ctx.createOscillator()
  osc.type = 'square'; osc.frequency.value = 330
  const filt = ctx.createBiquadFilter()
  filt.type = 'lowpass'; filt.frequency.value = 1500
  const g = ctx.createGain()
  g.gain.setValueAtTime(vol * 0.35, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  osc.connect(filt); filt.connect(g); g.connect(ctx.destination)
  osc.start(t); osc.stop(t + 0.22)
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Sequencer() {
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS)
  const [bpm, setBpm] = useState(120)
  const [playing, setPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [beatName, setBeatName] = useState('')
  const [aiError, setAiError] = useState('')

  const audioCtxRef = useRef<AudioContext | null>(null)
  const schedulerRef = useRef<number | null>(null)
  const currentStepRef = useRef(0)
  const nextStepTimeRef = useRef(0)
  const tracksRef = useRef(tracks)
  const bpmRef = useRef(bpm)
  const voiceBufferRef = useRef<AudioBuffer | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  useEffect(() => { tracksRef.current = tracks }, [tracks])
  useEffect(() => { bpmRef.current = bpm }, [bpm])

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }, [])

  const scheduleStep = useCallback((step: number, time: number) => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    for (const track of tracksRef.current) {
      if (!track.steps[step] || track.muted) continue
      const v = track.volume
      switch (track.id) {
        case 'kick':  synthKick(ctx, time, v); break
        case 'snare': synthSnare(ctx, time, v); break
        case 'hihat': synthHihat(ctx, time, v); break
        case 'bass':  synthBass(ctx, time, v); break
        case 'synth': synthSynth(ctx, time, v); break
        case 'voice': {
          const buf = voiceBufferRef.current
          if (!buf) break
          const src = ctx.createBufferSource()
          src.buffer = buf
          const g = ctx.createGain()
          g.gain.value = v
          src.connect(g); g.connect(ctx.destination)
          src.start(time)
          break
        }
      }
    }
  }, [])

  const stopScheduler = useCallback(() => {
    if (schedulerRef.current !== null) {
      clearInterval(schedulerRef.current)
      schedulerRef.current = null
    }
    setCurrentStep(-1)
    currentStepRef.current = 0
  }, [])

  const startScheduler = useCallback(() => {
    const ctx = getCtx()
    currentStepRef.current = 0
    nextStepTimeRef.current = ctx.currentTime + 0.05

    const tick = () => {
      const stepDur = 60 / bpmRef.current / 4
      while (nextStepTimeRef.current < ctx.currentTime + 0.12) {
        const step = currentStepRef.current
        setCurrentStep(step)
        scheduleStep(step, nextStepTimeRef.current)
        currentStepRef.current = (step + 1) % STEPS
        nextStepTimeRef.current += stepDur
      }
    }

    tick()
    schedulerRef.current = window.setInterval(tick, 25)
  }, [getCtx, scheduleStep])

  useEffect(() => () => stopScheduler(), [stopScheduler])

  const generateBeat = async () => {
    if (!aiPrompt.trim() || generating) return
    setGenerating(true)
    setAiError('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'beat', prompt: aiPrompt.trim() }),
      })
      const data = await res.json()
      const raw: string = data.text ?? ''

      // Extract JSON — handle markdown fences or bare JSON
      let parsed: { bpm?: number; name?: string; pattern?: Record<string, number[]> }
      try {
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
        parsed = JSON.parse(fenced ? fenced[1].trim() : raw.match(/\{[\s\S]*\}/)![0])
      } catch {
        setAiError("Couldn't read the beat — try rephrasing your idea.")
        return
      }

      if (parsed.bpm) setBpm(Math.min(200, Math.max(60, parsed.bpm)))
      if (parsed.name) setBeatName(parsed.name)
      if (parsed.pattern) {
        setTracks(prev => prev.map(t => ({
          ...t,
          steps: parsed.pattern![t.id]?.map((v: number) => v === 1) ?? t.steps,
        })))
      }

      // Restart playback with new pattern
      stopScheduler()
      setPlaying(false)
      setTimeout(() => {
        startScheduler()
        setPlaying(true)
      }, 60)
    } catch {
      setAiError('Something went wrong — check your connection and try again.')
    } finally {
      setGenerating(false)
    }
  }

  const togglePlay = () => {
    if (playing) {
      stopScheduler()
      setPlaying(false)
    } else {
      startScheduler()
      setPlaying(true)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordedChunksRef.current = []
      const mr = new MediaRecorder(stream)
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
        const ab = await blob.arrayBuffer()
        const ctx = getCtx()
        const audioBuf = await ctx.decodeAudioData(ab)
        voiceBufferRef.current = audioBuf
        setHasRecording(true)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
    } catch {
      alert('Microphone access denied. Please allow microphone access in your browser.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    setIsRecording(false)
  }

  const toggleStep = (id: TrackId, i: number) => {
    setTracks(prev => prev.map(t =>
      t.id === id ? { ...t, steps: t.steps.map((s, j) => j === i ? !s : s) } : t
    ))
  }

  const setVolume = (id: TrackId, v: number) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, volume: v } : t))
  }

  const toggleMute = (id: TrackId) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, muted: !t.muted } : t))
  }

  const clearAll = () => {
    if (playing) { stopScheduler(); setPlaying(false) }
    setTracks(INITIAL_TRACKS.map(t => ({ ...t, steps: Array(STEPS).fill(false) })))
  }

  return (
    <div className="seq-root">

      {/* AI prompt */}
      <form className="seq-ai-row" onSubmit={(e) => { e.preventDefault(); generateBeat() }}>
        <input
          className="seq-ai-input"
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
          placeholder='Describe your beat… e.g. "Drake love song" or "upbeat Afrobeats"'
          disabled={generating}
        />
        <button type="submit" className="seq-ai-btn" disabled={!aiPrompt.trim() || generating}>
          {generating ? '⟳ Creating…' : '✨ Generate'}
        </button>
      </form>
      {beatName && <div className="seq-beat-name">🎵 {beatName}</div>}
      {aiError && <div className="seq-ai-error">{aiError}</div>}

      {/* Transport bar */}
      <div className="seq-transport">
        <button className={'seq-play-btn' + (playing ? ' is-playing' : '')} onClick={togglePlay}>
          {playing ? '⏹ Stop' : '▶ Play'}
        </button>
        <div className="seq-bpm-ctrl">
          <span className="seq-lbl">BPM</span>
          <input type="range" min={60} max={200} value={bpm}
            className="seq-range" onChange={e => setBpm(Number(e.target.value))} />
          <span className="seq-bpm-num">{bpm}</span>
        </div>
        <button className="seq-clear-btn" onClick={clearAll}>↺ Clear</button>
      </div>

      {/* Grid */}
      <div className="seq-grid-scroll">
        <div className="seq-grid">

          {/* Step number header */}
          <div className="seq-row seq-hdr-row">
            <div className="seq-track-label" />
            {Array.from({ length: STEPS }, (_, i) => (
              <div key={i} className={'seq-hdr-cell' + (i % 4 === 0 ? ' is-beat' : '')}>
                {i % 4 === 0 ? i / 4 + 1 : ''}
              </div>
            ))}
            <div className="seq-vol-label" />
          </div>

          {/* Track rows */}
          {tracks.map(track => (
            <div key={track.id} className={'seq-row' + (track.muted ? ' is-muted' : '')}>

              {/* Label */}
              <div className="seq-track-label">
                <button className="seq-emoji-btn" onClick={() => toggleMute(track.id)}
                  title={track.muted ? 'Unmute' : 'Mute'}>
                  {track.muted ? '🔇' : track.emoji}
                </button>
                <div className="seq-name-col">
                  <span className="seq-track-name">{track.name}</span>
                  {track.id === 'voice' && (
                    <button
                      className={'seq-rec-mini' + (isRecording ? ' is-rec' : '') + (hasRecording ? ' has-rec' : '')}
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? '⏹' : hasRecording ? '✓ Done' : 'REC'}
                    </button>
                  )}
                </div>
              </div>

              {/* Steps */}
              {track.steps.map((on, i) => (
                <button
                  key={i}
                  className={[
                    'seq-step',
                    `seq-${track.id}`,
                    on ? 'is-on' : '',
                    i === currentStep ? 'is-current' : '',
                    i % 4 === 0 ? 'is-beat-marker' : '',
                    track.id === 'voice' && !hasRecording ? 'is-disabled' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    if (track.id === 'voice' && !hasRecording) return
                    toggleStep(track.id, i)
                  }}
                />
              ))}

              {/* Volume */}
              <div className="seq-vol-col">
                <input type="range" min={0} max={1} step={0.05}
                  value={track.volume}
                  className="seq-vol-slider"
                  title="Volume"
                  onChange={e => setVolume(track.id, Number(e.target.value))} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voice rec status */}
      {!hasRecording && (
        <div className="seq-voice-hint">
          🎙️ Hit <strong>REC</strong> next to "My Voice" to record a sound and add it to your beat
        </div>
      )}

      <div className="seq-footer-hint">
        Click squares to toggle · Click emoji to mute a track · Drag sliders to adjust volume
      </div>
    </div>
  )
}
