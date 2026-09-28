'use client'


import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { dataRelativa } from '@/lib/conversas/dataRelativa'
import { partesSnippet } from '@/lib/conversas/snippet'
import { agruparPorTempo } from '@/lib/conversas/agrupar'
import type { ThreadItem } from '@/lib/conversas/thread'


interface HistoryDrawerProps {
  open: boolean
  onClose: () => void
  agentId: string
  activeConversationId: string | null
  initialThreads: ThreadItem[]
  onNova: () => void
  onSelect: (id: string) => void
}


function rotulo(t: ThreadItem): string {
  const titulo = t.title?.trim()
  if (titulo) return titulo
  const prev = t.preview?.trim()
  if (prev) return prev
  return 'Conversa'
}

export function HistoryDrawer({
  open,
  onClose,
  agentId,
  activeConversationId,
  initialThreads,
  onNova,
  onSelect,
}: HistoryDrawerProps) {
  const [query, setQuery] = useState('')
  
  const [threads, setThreads] = useState<ThreadItem[]>(initialThreads)
  
  const [nowIso, setNowIso] = useState(() => new Date().toISOString())

  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const lastGoodRef = useRef<ThreadItem[]>(initialThreads)
  const abortRef = useRef<AbortController | null>(null)
  const renameAbortRef = useRef<AbortController | null>(null)

  
  
  useEffect(() => {
    if (!open) {
      setEditingId(null)
      setDraftTitle('')
      renameAbortRef.current?.abort()
      return
    }
    setNowIso(new Date().toISOString())
    setThreads(initialThreads)
    lastGoodRef.current = initialThreads
    setQuery('')
    const raf = requestAnimationFrame(() => inputRef.current?.focus())

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    fetch(`/api/conversations?agent=${encodeURIComponent(agentId)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: { threads?: ThreadItem[] }) => {
        const next = Array.isArray(data.threads) ? data.threads : []
        lastGoodRef.current = next
        setThreads(next)
      })
      .catch((e) => {
        if ((e as { name?: string }).name === 'AbortError') return
        
      })

    return () => {
      cancelAnimationFrame(raf)
      ctrl.abort()
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !editingId) onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, editingId])

  
  useEffect(() => {
    if (!open) return
    const termo = query.trim()
    if (!termo) {
      abortRef.current?.abort()
      abortRef.current = null
      setThreads(lastGoodRef.current)
      return
    }
    const timer = window.setTimeout(() => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      fetch(`/api/conversations?agent=${encodeURIComponent(agentId)}&q=${encodeURIComponent(termo)}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
        .then((data: { threads?: ThreadItem[] }) => {
          const next = Array.isArray(data.threads) ? data.threads : []
          lastGoodRef.current = next
          setThreads(next)
        })
        .catch((e) => {
          if ((e as { name?: string }).name === 'AbortError') return
          setThreads(lastGoodRef.current)
        })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query, open, agentId])

  useEffect(() => () => { abortRef.current?.abort(); renameAbortRef.current?.abort() }, [])

  const startEdit = useCallback((thread: ThreadItem) => {
    renameAbortRef.current?.abort()
    setEditingId(thread.id)
    setDraftTitle(thread.title?.trim() ?? '')
  }, [])

  const commitEdit = useCallback((id: string) => {
    const trimmed = draftTitle.trim()
    if (!trimmed) {
      setEditingId(null)
      setDraftTitle('')
      return
    }
    setEditingId(null)
    setDraftTitle('')

    renameAbortRef.current?.abort()
    const ctrl = new AbortController()
    renameAbortRef.current = ctrl

    fetch(`/api/conversations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(() => {
        const applyTitle = (list: ThreadItem[]) =>
          list.map((t) => (t.id === id ? { ...t, title: trimmed } : t))
        setThreads((prev) => applyTitle(prev))
        lastGoodRef.current = applyTitle(lastGoodRef.current)
      })
      .catch((e) => {
        if ((e as { name?: string }).name === 'AbortError') return
      })
  }, [draftTitle])

  const cancelEdit = useCallback(() => {
    renameAbortRef.current?.abort()
    setEditingId(null)
    setDraftTitle('')
  }, [])

  const emBusca = query.trim().length > 0

  
  const renderRow = (t: ThreadItem) => (
    <ThreadRow
      key={t.id}
      thread={t}
      active={t.id === activeConversationId}
      nowIso={nowIso}
      onSelect={onSelect}
      editing={editingId === t.id}
      draftTitle={editingId === t.id ? draftTitle : ''}
      onDraftChange={setDraftTitle}
      onStartEdit={startEdit}
      onCommitEdit={commitEdit}
      onCancelEdit={cancelEdit}
    />
  )

  const grupos = emBusca ? [] : agruparPorTempo(threads, nowIso)

  return (
    <AnimatePresence>
      {open && (
        <>
          {}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          />
          <motion.aside
            ref={rootRef}
            role="dialog"
            aria-modal="true"
            aria-label="Histórico de conversas"
            initial={{ x: -20, opacity: 0.4 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 312,
              maxWidth: '86vw',
              zIndex: 41,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--surface-elevated)',
              borderRight: '1px solid var(--border-hairline)',
              boxShadow: '8px 0 40px rgba(0,0,0,0.5)',
            }}
          >
            {}
            <div
              style={{
                flexShrink: 0,
                padding: '14px 14px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 11,
                borderBottom: '1px solid var(--border-hairline)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Conversas
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar histórico"
                  title="Fechar"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 26,
                    height: 26,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <CloseGlyph />
                </button>
              </div>

              <button
                type="button"
                onClick={onNova}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid transparent',
                  background:
                    'linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 13.5,
                  fontWeight: 540,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <PlusGlyph />
                <span>Nova conversa</span>
              </button>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span
                  aria-hidden
                  style={{ position: 'absolute', left: 10, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}
                >
                  <SearchGlyph />
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar nas conversas…"
                  aria-label="Buscar nas conversas"
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 30px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-hairline)',
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-ui)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {}
            <ul
              className="awave-scroll-fantasma"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                listStyle: 'none',
                margin: 0,
                padding: '6px 6px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {threads.length === 0 ? (
                <li style={{ padding: '18px 12px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
                  {emBusca ? 'Nada encontrado para essa busca.' : 'Nenhuma conversa por aqui ainda.'}
                </li>
              ) : emBusca ? (
                threads.map(renderRow)
              ) : (
                grupos.map((g) => (
                  <li key={g.label} style={{ listStyle: 'none' }}>
                    <div
                      style={{
                        padding: '12px 10px 5px',
                        fontSize: 10.5,
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {g.label}
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {g.itens.map(renderRow)}
                    </ul>
                  </li>
                ))
              )}
            </ul>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}


function ThreadRow({
  thread,
  active,
  nowIso,
  onSelect,
  editing,
  draftTitle,
  onDraftChange,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
}: {
  thread: ThreadItem
  active: boolean
  nowIso: string
  onSelect: (id: string) => void
  editing: boolean
  draftTitle: string
  onDraftChange: (v: string) => void
  onStartEdit: (t: ThreadItem) => void
  onCommitEdit: (id: string) => void
  onCancelEdit: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)
  
  
  const skipBlurRef = useRef(false)
  const label = rotulo(thread)
  const partes = thread.snippet ? partesSnippet(thread.snippet) : null

  useEffect(() => {
    if (editing) {
      const el = editInputRef.current
      if (el) { el.focus(); el.select() }
    }
  }, [editing])

  const bgColor = active ? 'var(--surface)' : hovered ? 'var(--surface)' : 'transparent'

  return (
    <li>
      <div
        role="listitem"
        aria-current={active ? 'true' : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'stretch',
          width: '100%',
          borderRadius: 'var(--radius-sm)',
          background: bgColor,
          transition: 'background 120ms ease',
        }}
      >
        {active && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              top: '22%',
              bottom: '22%',
              width: 2.5,
              borderRadius: 3,
              background: 'linear-gradient(to bottom, var(--wave-from), var(--wave-to))',
            }}
          />
        )}

        <button
          type="button"
          onClick={() => { if (!editing) onSelect(thread.id) }}
          tabIndex={editing ? -1 : 0}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: '8px 10px',
            paddingRight: hovered || editing ? 34 : 10,
            border: 'none',
            background: 'transparent',
            cursor: editing ? 'default' : 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            {editing ? (
              <input
                ref={editInputRef}
                type="text"
                value={draftTitle}
                onChange={(e) => { e.stopPropagation(); onDraftChange(e.target.value) }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    skipBlurRef.current = true
                    onCommitEdit(thread.id)
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    skipBlurRef.current = true
                    onCancelEdit()
                  }
                }}
                onBlur={() => {
                  if (skipBlurRef.current) { skipBlurRef.current = false; return }
                  onCommitEdit(thread.id)
                }}
                aria-label="Renomear conversa"
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  fontWeight: active ? 540 : 450,
                  fontFamily: 'var(--font-ui)',
                  color: 'var(--text-primary)',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1px 5px',
                  outline: 'none',
                }}
              />
            ) : (
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  fontWeight: active ? 540 : 450,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
              </span>
            )}
            {!editing && (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 10.5,
                  color: 'var(--text-tertiary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {dataRelativa(thread.updated_at, nowIso)}
              </span>
            )}
          </span>

          {}
          {!editing && partes && partes.length > 0 && (
            <span
              style={{
                fontSize: 11.5,
                lineHeight: 1.45,
                color: 'var(--text-tertiary)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {partes.map((p, i) => (
                <span
                  key={i}
                  style={p.hit ? { fontWeight: 600, color: 'var(--text-secondary)' } : { color: 'var(--text-tertiary)' }}
                >
                  {p.text}
                </span>
              ))}
            </span>
          )}
        </button>

        {}
        {(hovered || editing) && (
          <button
            type="button"
            aria-label="Renomear conversa"
            onClick={(e) => { e.stopPropagation(); if (!editing) onStartEdit(thread) }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              border: 'none',
              background: 'transparent',
              borderRadius: 'var(--radius-sm)',
              cursor: editing ? 'default' : 'pointer',
              color: editing ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              flexShrink: 0,
              padding: 0,
            }}
            onMouseEnter={(e) => { if (!editing) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)' }}
            onMouseLeave={(e) => { if (!editing) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)' }}
          >
            <PencilGlyph />
          </button>
        )}
      </div>
    </li>
  )
}


function PlusGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M7 2v10M2 7h10" stroke="url(#hist-plus-grad)" strokeWidth="1.6" strokeLinecap="round" />
      <defs>
        <linearGradient id="hist-plus-grad" x1="0" y1="0" x2="14" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--wave-from)" />
          <stop offset="1" stopColor="var(--wave-to)" />
        </linearGradient>
      </defs>
    </svg>
  )
}


function SearchGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden style={{ color: 'var(--text-tertiary)' }}>
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.2 9.2 12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}


function CloseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ display: 'block', color: 'currentColor' }}>
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}


function PencilGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden style={{ display: 'block' }}>
      <path
        d="M9.5 2.5 11.5 4.5 5 11H3V9L9.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 4 10 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  )
}
