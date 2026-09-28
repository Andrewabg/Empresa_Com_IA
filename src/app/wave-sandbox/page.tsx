'use client'



import { useEffect, useRef, useState } from 'react'
import { Wave } from '@/components/wave/Wave'
import { useWave } from '@/components/wave/useWave'

export default function WaveSandboxPage() {
  const wave = useWave()
  const [amp, setAmp] = useState(0)
  const pulseId = useRef(0)

  
  const setListening = wave.setListening
  useEffect(() => { setListening(amp) }, [amp, setListening])

  const sendPulse = () => {
    pulseId.current += 1
    wave.pulse({ id: `p${pulseId.current}`, t: performance.now() })
  }

  const burst = () => {
    
    for (let i = 0; i < 8; i++) {
      pulseId.current += 1
      const id = pulseId.current
      setTimeout(() => wave.pulse({ id: `b${id}`, t: performance.now() }), i * 15)
    }
  }

  const reset = () => {
    setAmp(0)
    wave.setListening(0)
    wave.setThinking(false)
  }

  const btn: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-hairline)',
    background: 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    fontSize: 13,
    cursor: 'pointer',
  }

  const label: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        padding: '48px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 40,
        maxWidth: 960,
        margin: '0 auto',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, margin: 0 }}>
          Onda — sandbox
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
          Estado atual: <strong style={{ color: 'var(--text-primary)' }}>{wave.state}</strong> ·
          amplitude {wave.amplitude.toFixed(2)} · ripples {wave.ripples.length}
        </p>
      </header>

      {}
      <section
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 28px',
        }}
      >
        <Wave scale="hero" state={wave.state} amplitude={wave.amplitude} ripples={wave.ripples} />
      </section>

      {}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={label}>Voz (setListening)</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={amp}
            onChange={(e) => setAmp(Number(e.target.value))}
            style={{ accentColor: 'var(--wave-from)', width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={btn} onClick={sendPulse}>
            Pulse
          </button>
          <button style={btn} onClick={burst}>
            Burst ×8
          </button>
          <button style={btn} onClick={() => wave.setThinking(true)}>
            Thinking on
          </button>
          <button style={btn} onClick={() => wave.setThinking(false)}>
            Thinking off
          </button>
          <button style={btn} onClick={reset}>
            Idle / reset
          </button>
        </div>
      </section>

      {}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span style={label}>As três escalas</span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span style={{ ...label, textTransform: 'none' }}>micro (rail)</span>
          <div
            style={{
              width: 160,
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 10px',
            }}
          >
            <Wave scale="micro" state={wave.state} amplitude={wave.amplitude} ripples={wave.ripples} />
          </div>

          <span style={{ ...label, textTransform: 'none' }}>inline (card)</span>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
            }}
          >
            <Wave scale="inline" state={wave.state} amplitude={wave.amplitude} ripples={wave.ripples} />
          </div>
        </div>
      </section>
    </main>
  )
}
