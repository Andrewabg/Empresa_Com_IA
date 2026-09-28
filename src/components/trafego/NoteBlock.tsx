'use client'





import type { ReactNode } from 'react'
import { BlocoCard, BlocoVazio } from './BlocoCard'

export interface NoteBlocoConfig {
  
  text?: string
}


function renderInline(text: string, keyBase: string): ReactNode[] {
  return text.split(/\*\*/).map((chunk, i) =>
    i % 2 === 1 ? (
      <strong key={`${keyBase}-${i}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
        {chunk}
      </strong>
    ) : (
      <span key={`${keyBase}-${i}`}>{chunk}</span>
    ),
  )
}


function renderLightMarkdown(text: string): ReactNode[] {
  const paras = text.trim().split(/\n{2,}/)
  return paras.map((para, p) => {
    const lines = para.split('\n')
    return (
      <p key={p} style={{ margin: p === 0 ? 0 : '10px 0 0', fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
        {lines.map((line, l) => (
          <span key={l}>
            {renderInline(line, `${p}-${l}`)}
            {l < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    )
  })
}

export function NoteBlock({
  bloco,
}: {
  bloco: { config: Record<string, unknown>; annotation: string | null }
}) {
  const cfg = (bloco.config ?? {}) as Partial<NoteBlocoConfig>
  const text = (typeof cfg.text === 'string' && cfg.text.trim() !== '' ? cfg.text : bloco.annotation) ?? ''

  return (
    <BlocoCard type="note">
      {text.trim() === '' ? (
        <BlocoVazio>Sem nota.</BlocoVazio>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              width: 3,
              alignSelf: 'stretch',
              borderRadius: 2,
              background: 'linear-gradient(180deg, var(--wave-from), var(--wave-to))',
            }}
          />
          <div style={{ minWidth: 0 }}>
            {renderLightMarkdown(text)}
            <span
              style={{
                display: 'block',
                marginTop: 10,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              — Rui
            </span>
          </div>
        </div>
      )}
    </BlocoCard>
  )
}
