'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/motion'
import type { MockBriefing } from '@/mock/types'

interface BriefingProps {
  briefing: MockBriefing
  
  charDelay?: number
}


export function Briefing({ briefing, charDelay = 14 }: BriefingProps) {
  const reducedMotion = useReducedMotion()
  const fullText = briefing.body

  
  
  const [revealed, setRevealed] = useState(() => (reducedMotion ? fullText.length : 0))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(fullText.length)
      return
    }
    setRevealed(0)
    let i = 0
    function step() {
      i += 1
      setRevealed(i)
      if (i < fullText.length) {
        timerRef.current = setTimeout(step, charDelay)
      }
    }
    timerRef.current = setTimeout(step, charDelay)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [fullText, charDelay, reducedMotion])

  const done = revealed >= fullText.length
  const shown = fullText.slice(0, revealed)

  return (
    <section aria-label="Briefing do dia">
      <p
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          margin: 0,
          marginBottom: 10,
        }}
      >
        Briefing do dia · {formatDate(briefing.date)}
      </p>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 3vw, 38px)',
          fontWeight: 600,
          lineHeight: 1.02,
          letterSpacing: '-0.035em',
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: 14,
        }}
      >
        {briefing.greeting}
      </h1>

      {}
      <div style={{ position: 'relative', paddingLeft: 22, maxWidth: 860 }}>
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 3,
            borderRadius: 3,
            background: 'linear-gradient(180deg, var(--wave-from), var(--wave-to))',
            boxShadow: '0 0 16px -2px rgba(124,92,255,0.5)',
          }}
        />
        <p
          aria-label={fullText}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(15px, 1.2vw, 17.5px)',
            lineHeight: 1.62,
            letterSpacing: '0.002em',
            color: '#C8CBD2',
            margin: 0,
            minHeight: '1.62em',
          }}
        >
          <span aria-hidden>{shown}</span>
          {!done && (
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: '0.55ch',
                height: '1.05em',
                marginLeft: 1,
                borderRadius: 2,
                transform: 'translateY(3px)',
                background: 'linear-gradient(to bottom, var(--wave-from), var(--wave-to))',
                animation: 'awave-caret 1.1s steps(1) infinite',
              }}
            >
              {}
              &#8203;
            </span>
          )}
        </p>
      </div>

      <style>{`
        @keyframes awave-caret {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
      `}</style>
    </section>
  )
}


function formatDate(iso: string): string {
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ]
  const parts = iso.split('-')
  if (parts.length < 3) return iso
  const dia = parseInt(parts[2], 10)
  const mes = meses[parseInt(parts[1], 10) - 1] ?? ''
  if (Number.isNaN(dia) || !mes) return iso
  return `${dia} de ${mes}`
}
