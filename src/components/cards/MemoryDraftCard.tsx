
'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import { LIMITE_LINHAS_RECOLHIDO, linhasEstimadas, precisaDobrar, rascunhoAlterado, validarRascunho } from '@/lib/memory-draft-view'
import { textoDoIgnorado } from '@/lib/memory/motivoDoCurador'
import type { MemoryDraft } from '@/server/agent/wireTypes'

type DraftState = 'pending' | 'saving' | 'saved' | 'pending_approval' | 'ignored' | 'discarded' | 'error' | 'needs_config'


const campoBase = {
  width: '100%',
  boxSizing: 'border-box' as const,
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)',
  padding: '8px 10px',
  outline: 'none',
}


export function MemoryDraftCard({ draft }: { draft: MemoryDraft }) {
  const reducedMotion = useReducedMotion()
  const noAnim = reducedMotion ?? false
  const [state, setState] = useState<DraftState>('pending')
  const [expandido, setExpandido] = useState(false)
  const [editando, setEditando] = useState(false)
  const [título, setTítulo] = useState(draft.título)
  const [conteúdo, setConteúdo] = useState(draft.conteúdo)
  
  const [motivoIgnorado, setMotivoIgnorado] = useState<string | null>(null)
  const savingRef = useRef(false)

  const dobrável = useMemo(() => precisaDobrar(conteúdo), [conteúdo])
  const recolhido = dobrável && !expandido
  const validação = validarRascunho({ título, conteúdo })
  const alterado = rascunhoAlterado(draft, { título, conteúdo })
  const ativo = state === 'pending' || state === 'saving'
  const linhasTextarea = Math.min(20, Math.max(6, linhasEstimadas(conteúdo) + 1))

  async function onRegister() {
    if (savingRef.current) return
    if (!validarRascunho({ título, conteúdo }).ok) return
    savingRef.current = true
    setState('saving')
    try {
      const res = await fetch('/api/memory/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ título, conteúdo, tipo: draft.tipo, tags: draft.tags }),
      })
      const data = (await res.json().catch(() => null)) as
        | { status?: string; needsConfig?: boolean; motivo?: string }
        | null
      if (data && data.needsConfig) {
        setState('needs_config')
        return
      }
      if (!res.ok || !data) {
        setState('error')
        return
      }
      if (data.status === 'committed') setState('saved')
      else if (data.status === 'pending_approval') setState('pending_approval')
      else {
        
        
        setMotivoIgnorado(typeof data.motivo === 'string' ? data.motivo : null)
        setState('ignored')
      }
    } catch {
      setState('error')
    } finally {
      savingRef.current = false
    }
  }

  function cancelarEdição() {
    setTítulo(draft.título)
    setConteúdo(draft.conteúdo)
    setEditando(false)
  }

  return (
    <motion.article
      aria-label={`Rascunho de memória: ${draft.título}`}
      initial={noAnim ? false : { opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springPreset}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px 13px 17px',
        boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.03)',
      }}
    >
      {}
      <span
        aria-hidden
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
          background: 'linear-gradient(to bottom, var(--wave-from), var(--wave-to))',
          opacity: 0.75,
        }}
      />

      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span
          aria-hidden
          style={{
            display: 'grid', placeItems: 'center', width: 22, height: 22, flexShrink: 0,
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', color: 'var(--text-secondary)',
          }}
        >
          <MemóriaGlyph />
        </span>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Rascunho de memória
        </span>
        {alterado && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>· editado</span>
        )}
        {}
        {ativo && !editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            title="Editar o rascunho antes de registrar"
            aria-label="Editar o rascunho antes de registrar"
            style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 9px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)',
              background: 'transparent', color: 'var(--text-secondary)', fontSize: 11.5,
              fontFamily: 'var(--font-ui)', cursor: 'pointer',
            }}
          >
            <LápisGlyph />
            Editar
          </button>
        )}
      </header>

      {editando ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={título}
            onChange={(e) => setTítulo(e.target.value)}
            aria-label="Título da memória"
            placeholder="Título da memória"
            style={{ ...campoBase, fontSize: 14, fontWeight: 600 }}
          />
          <textarea
            value={conteúdo}
            onChange={(e) => setConteúdo(e.target.value)}
            aria-label="Conteúdo da memória"
            placeholder="O que deve ser lembrado"
            rows={linhasTextarea}
            style={{ ...campoBase, fontSize: 13, lineHeight: 1.5, resize: 'vertical', minHeight: 96 }}
          />
          <button
            type="button"
            onClick={cancelarEdição}
            style={{
              alignSelf: 'flex-start', padding: '4px 0', border: 'none', background: 'transparent',
              color: 'var(--text-tertiary)', fontSize: 12, fontFamily: 'var(--font-ui)',
              cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Desfazer edição
          </button>
        </div>
      ) : (
        <>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.01em', color: 'var(--text-primary)', margin: '0 0 5px' }}>
            {título}
          </h3>
          <p
            style={{
              fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              ...(recolhido
                ? { display: '-webkit-box', WebkitLineClamp: LIMITE_LINHAS_RECOLHIDO, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }
                : null),
            }}
          >
            {conteúdo}
          </p>
          {dobrável && (
            <button
              type="button"
              onClick={() => setExpandido((v) => !v)}
              aria-expanded={expandido}
              style={{
                marginTop: 6, padding: 0, border: 'none', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-ui)',
                cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              {expandido ? 'Ver menos' : 'Ver tudo'}
            </button>
          )}
        </>
      )}

      {}
      <footer style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--border-hairline)' }}>
        {ativo && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onRegister}
              disabled={state === 'saving' || !validação.ok}
              style={{
                flex: '0 0 auto', padding: '7px 16px', borderRadius: 'var(--radius-md)', border: 'none',
                background: 'var(--text-primary)', color: 'var(--bg-base)', fontSize: 12.5, fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                cursor: state === 'saving' || !validação.ok ? 'default' : 'pointer',
                opacity: state === 'saving' || !validação.ok ? 0.6 : 1,
              }}
            >
              {state === 'saving' ? 'Registrando…' : 'Registrar'}
            </button>
            <button
              type="button"
              onClick={() => setState('discarded')}
              disabled={state === 'saving'}
              style={{
                flex: '0 0 auto', padding: '7px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)',
                background: 'transparent', color: 'var(--text-tertiary)', fontSize: 12.5, fontFamily: 'var(--font-ui)', cursor: 'pointer',
              }}
            >
              Descartar
            </button>
            {!validação.ok && <StatusLine tone="muted">{validação.motivo}</StatusLine>}
          </div>
        )}
        {state === 'saved' && <StatusLine tone="ok">Memória registrada ✓</StatusLine>}
        {state === 'ignored' && <StatusLine tone="muted">{textoDoIgnorado(motivoIgnorado)}</StatusLine>}
        {state === 'discarded' && <StatusLine tone="muted">Rascunho descartado.</StatusLine>}
        {state === 'pending_approval' && (
          <StatusLine tone="ok">
            Enviado para aprovação — confirme em{' '}
            <Link href="/aprovacoes" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>/aprovacoes</Link>.
          </StatusLine>
        )}
        {state === 'needs_config' && (
          <StatusLine tone="muted">
            Configuração incompleta — conclua em{' '}
            <Link href="/config" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>/config</Link>.
          </StatusLine>
        )}
        {state === 'error' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <StatusLine tone="muted">Não consegui registrar agora.</StatusLine>
            <button
              type="button"
              onClick={onRegister}
              style={{ padding: '5px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-ui)', cursor: 'pointer' }}
            >
              Tentar de novo
            </button>
          </div>
        )}
      </footer>
    </motion.article>
  )
}

function StatusLine({ tone, children }: { tone: 'ok' | 'muted'; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 12, color: tone === 'ok' ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
      {children}
    </span>
  )
}


function MemóriaGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="3" cy="4" r="1.3" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="13" cy="5" r="1.3" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="11" cy="13" r="1.3" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4.1 4.8 6.4 6.9M11.7 6 10 6.8M9.6 9.6l1 2.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  )
}


function LápisGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10.5 2.5l3 3-7 7-3.5.5.5-3.5 7-7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
