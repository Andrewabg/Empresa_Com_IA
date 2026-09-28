
'use client'

import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion, springPreset } from '@/lib/motion'
import {
  ROTULO_DAS_LEITURAS, ROTULO_DOS_CRUZAMENTOS, ROTULO_DO_FIRME, TITULO_DO_CARD, textoDasLinhas,
  type InvestigacaoResumo,
} from '@/lib/trafego/graph/comoCheguei'


export function ComoChegueiCard({ resumo }: { resumo: InvestigacaoResumo }) {
  const reducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const temCaminho = resumo.leituras.length > 0 || resumo.cruzamentos.length > 0 || resumo.firme.length > 0
  if (!temCaminho) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <motion.button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        whileHover={{ color: 'var(--text-secondary)', borderColor: 'var(--text-tertiary)' }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          alignSelf: 'flex-start',
          padding: '5px 10px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
          background: 'transparent',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 11.5,
          cursor: 'pointer',
          transition: 'color 140ms ease, border-color 140ms ease',
        }}
      >
        <TrilhaGlyph />
        <span>{TITULO_DO_CARD}</span>
        {resumo.contador && (
          <span
            style={{
              fontSize: 10.5,
              letterSpacing: '0.08em',
              opacity: 0.75,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {resumo.contador}
          </span>
        )}
        <Chevron open={open} reducedMotion={reducedMotion ?? false} />
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={reducedMotion ? { duration: 0 } : springPreset}
            style={{ display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}
          >
            <Secao titulo={ROTULO_DAS_LEITURAS}>
              {resumo.leituras.map((l, i) => (
                <Linha key={`l-${i}`} texto={l.porque} meta={textoDasLinhas(l.linhas)} />
              ))}
            </Secao>
            <Secao titulo={ROTULO_DOS_CRUZAMENTOS}>
              {resumo.cruzamentos.map((c, i) => (
                <Linha key={`c-${i}`} texto={c.porque} />
              ))}
            </Secao>
            <Secao titulo={ROTULO_DO_FIRME}>
              {resumo.firme.map((f, i) => (
                <Linha key={`f-${i}`} texto={f} />
              ))}
            </Secao>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


function Secao({ titulo, children }: { titulo: string; children: ReactNode[] }) {
  if (!children.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        style={{
          fontSize: 10.5,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {titulo}
      </span>
      <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </ul>
    </div>
  )
}


function Linha({ texto, meta }: { texto: string; meta?: string }) {
  return (
    <li
      role="listitem"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '6px 10px',
        borderLeft: '2px solid var(--border-hairline)',
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.35 }}>{texto}</span>
      {meta && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.35,
            whiteSpace: 'nowrap',
          }}
        >
          {meta}
        </span>
      )}
    </li>
  )
}


function TrilhaGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 12.5c2.5 0 2.5-3.5 5-3.5s2.5-3.5 5-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="3" cy="12.5" r="1.3" fill="currentColor" />
      <circle cx="13" cy="5.5" r="1.3" fill="currentColor" />
    </svg>
  )
}


function Chevron({ open, reducedMotion }: { open: boolean; reducedMotion: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: reducedMotion ? undefined : 'transform 160ms ease' }}
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
