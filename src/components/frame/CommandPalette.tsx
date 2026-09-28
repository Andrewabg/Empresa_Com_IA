'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { NAV_ITEMS, filterNavItems, filtrarItensPorPapel } from '@/lib/nav'
import type { Papel } from '@/lib/equipe'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  
  active?: ReadonlySet<string> | null
  
  papel: Papel | null | undefined
}

export function CommandPalette({ open, onOpenChange, active, papel }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = filtrarItensPorPapel(active ? filterNavItems(NAV_ITEMS, active) : NAV_ITEMS, papel)
  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description.toLowerCase().includes(query.toLowerCase())
      )
    : items

  
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  
  useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, filtered.length - 1)))
  }, [filtered.length])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[selectedIndex]
      if (item) {
        router.push(item.href)
        onOpenChange(false)
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgb(0 0 0 / 0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
          }}
        />
        <Dialog.Content
          onKeyDown={handleKeyDown}
          onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus() }}
          style={{
            position: 'fixed',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: 520,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 24px 80px rgb(0 0 0 / 0.5)',
            zIndex: 101,
            overflow: 'hidden',
          }}
          aria-describedby={undefined}
        >
          <VisuallyHidden asChild>
            <Dialog.Title>Command Palette</Dialog.Title>
          </VisuallyHidden>

          {}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-hairline)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden style={{ flexShrink: 0, color: 'var(--text-tertiary)' }}>
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ir para…"
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'var(--font-ui)',
              }}
            />
            <kbd
              style={{
                fontFamily: 'inherit',
                fontSize: 11,
                background: 'var(--surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 4,
                padding: '2px 6px',
                color: 'var(--text-tertiary)',
                flexShrink: 0,
              }}
            >
              Esc
            </kbd>
          </div>

          {}
          <ul
            role="listbox"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: '8px',
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            {filtered.length === 0 && (
              <li
                style={{
                  padding: '12px 10px',
                  color: 'var(--text-tertiary)',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                Nenhum resultado para "{query}"
              </li>
            )}
            {filtered.map((item, idx) => (
              <li
                key={item.href}
                role="option"
                aria-selected={idx === selectedIndex}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  router.push(item.href)
                  onOpenChange(false)
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: idx === selectedIndex ? 'var(--surface)' : 'transparent',
                  transition: 'background 80ms ease',
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {item.description}
                </span>
              </li>
            ))}
          </ul>

          {}
          <div
            style={{
              display: 'flex',
              gap: 16,
              padding: '10px 16px',
              borderTop: '1px solid var(--border-hairline)',
              color: 'var(--text-tertiary)',
              fontSize: 11,
            }}
          >
            <span><kbd style={{ fontFamily:'inherit', background:'var(--surface)', border:'1px solid var(--border-hairline)', borderRadius:3, padding:'1px 4px' }}>↑↓</kbd> navegar</span>
            <span><kbd style={{ fontFamily:'inherit', background:'var(--surface)', border:'1px solid var(--border-hairline)', borderRadius:3, padding:'1px 4px' }}>↵</kbd> abrir</span>
            <span><kbd style={{ fontFamily:'inherit', background:'var(--surface)', border:'1px solid var(--border-hairline)', borderRadius:3, padding:'1px 4px' }}>Esc</kbd> fechar</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
