'use client'


import { memo, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { CrewMember } from '@/data/crew'
import { hrefParaSala, salaMarkKey } from '@/lib/conversas/salaHref'
import { salasVisiveis } from '@/lib/conversas/salas'

interface RoomSwitcherProps {
  crew: CrewMember[]
  activeId: string
  
  onAdjustStyle?: () => void
}

export const RoomSwitcher = memo(function RoomSwitcher({ crew, activeId, onAdjustStyle }: RoomSwitcherProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  
  
  
  
  const [lembradas, setLembradas] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!open || typeof window === 'undefined') return
    const next: Record<string, string> = {}
    for (const m of crew) {
      try {
        const v = sessionStorage.getItem(salaMarkKey(m.slug))
        if (v) next[m.slug] = v
      } catch {  }
    }
    setLembradas(next)
  }, [open, crew])

  
  
  
  const ordered = salasVisiveis(crew, activeId)
  const active = ordered.find((m) => m.slug === activeId) ?? ordered[0]

  
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!active) return null

  return (
    <div ref={rootRef} style={{ position: 'absolute', top: 16, left: 16, zIndex: 5 }}>
      {}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Trocar de sala — atual: ${active.name}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px 6px 12px',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 999,
          color: 'var(--text-primary)',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          boxShadow: '0 1px 10px rgba(0,0,0,0.3)',
        }}
      >
        <Dot lit={active.status === 'active'} />
        <span style={{ whiteSpace: 'nowrap' }}>{active.name}</span>
        <Chevron open={open} />
      </button>

      {}
      {open && (
        <ul
          role="listbox"
          className="awave-scroll-fantasma"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: 230,
            maxHeight: 360,
            overflowY: 'auto',
            listStyle: 'none',
            margin: 0,
            padding: 6,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
          }}
        >
          {ordered.map((m) => {
            const isActive = m.slug === activeId
            return (
              <li key={m.slug}>
                <Link
                  href={hrefParaSala(m.slug, lembradas[m.slug])}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    background: isActive ? 'var(--surface)' : 'transparent',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '20%',
                        bottom: '20%',
                        width: 2.5,
                        borderRadius: 3,
                        background: 'linear-gradient(to bottom, var(--wave-from), var(--wave-to))',
                      }}
                    />
                  )}
                  <Dot lit={m.status === 'active'} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 540 : 430,
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {m.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-tertiary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {m.role}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}

          {}
          {onAdjustStyle && (
            <li>
              <div aria-hidden style={{ height: 1, background: 'var(--border-hairline)', margin: '6px 8px' }} />
              <button
                type="button"
                onClick={() => { setOpen(false); onAdjustStyle() }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <GearIcon />
                <span style={{ whiteSpace: 'nowrap' }}>Ajustar como o assistente fala</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
})


function Dot({ lit }: { lit: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        flexShrink: 0,
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: lit ? 'var(--wave-from)' : 'var(--text-tertiary)',
        boxShadow: lit ? '0 0 6px var(--wave-from)' : 'none',
        opacity: lit ? 1 : 0.45,
      }}
    />
  )
}


function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, color: 'var(--text-tertiary)' }}>
      <path d="M2 4.5h6.5M12.5 4.5H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10.5" cy="4.5" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 11.5h2.5M8.5 11.5H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="6.5" cy="11.5" r="1.8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}


function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{
        flexShrink: 0,
        color: 'var(--text-tertiary)',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 160ms ease',
      }}
    >
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
