'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/lib/motion'
import { playUau, type Clock } from '@/mock/demo'
import { bus } from '@/mock/bus'
import type { EventBus } from '@/mock/eventBus'
import type { LiveEvent } from '@/mock/types'


const stampedBus: EventBus = {
  on: bus.on,
  emit: (topic, payload) => {
    if (topic === 'live') {
      const e = payload as LiveEvent
      bus.emit('live', {
        ...e,
        at: Date.now(),
        agent: e.agent ?? (e.type === 'memory' ? 'curator-agent' : 'jarvis'),
      })
      return
    }
    bus.emit(topic, payload)
  },
}


const DEMO_DURATION_MS = 7_400


export function DemoTrigger() {
  const reducedMotion = useReducedMotion() ?? false
  const [playing, setPlaying] = useState(false)

  
  const timerIdsRef = useRef<number[]>([])
  
  const resetTimerRef = useRef<number | null>(null)
  const playingRef = useRef(false)

  const clearAll = useCallback(() => {
    for (const id of timerIdsRef.current) window.clearTimeout(id)
    timerIdsRef.current = []
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [])

  const run = useCallback(() => {
    if (playingRef.current) return 
    playingRef.current = true
    setPlaying(true)

    
    const clock: Clock = {
      set: (fn, ms) => {
        const id = window.setTimeout(fn, ms)
        timerIdsRef.current.push(id)
        return id
      },
      clear: (id) => window.clearTimeout(id),
    }

    
    playUau(stampedBus, clock)

    
    const resetId = window.setTimeout(() => {
      bus.emit('wave', { kind: 'idle' })
      playingRef.current = false
      setPlaying(false)
      timerIdsRef.current = []
      resetTimerRef.current = null
    }, DEMO_DURATION_MS)
    resetTimerRef.current = resetId
    timerIdsRef.current.push(resetId)
  }, [])

  
  useEffect(() => () => clearAll(), [clearAll])

  return (
    <button
      type="button"
      onClick={run}
      disabled={playing}
      aria-label={playing ? 'Demonstração em andamento' : 'Tocar a demonstração ao vivo'}
      title="Toque para ver o Nathan agir ao vivo"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.02em',
        color: playing ? 'var(--text-tertiary)' : 'var(--text-secondary)',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        padding: '5px 11px 5px 9px',
        cursor: playing ? 'default' : 'pointer',
        transition: reducedMotion ? undefined : 'color 140ms ease, border-color 140ms ease',
      }}
    >
      {}
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {playing ? (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background:
                'radial-gradient(circle at 30% 30%, var(--wave-from), var(--wave-to))',
              boxShadow: '0 0 6px var(--wave-to)',
              animation: reducedMotion ? undefined : 'awave-demo-pulse 1.1s ease-in-out infinite',
            }}
          />
        ) : (
          <svg width="7" height="8" viewBox="0 0 7 8" fill="none">
            <path d="M0.5 0.7v6.6L6 4 0.5 0.7Z" fill="currentColor" />
          </svg>
        )}
      </span>
      {playing ? 'Ao vivo' : 'Tocar demo'}
    </button>
  )
}
