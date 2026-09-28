'use client'



import { motion, useReducedMotion } from 'motion/react'
import { COPY_SALA } from '@/lib/entrega/copy'
import { fraseDoProgresso, progressoDaEntrega } from '@/lib/entrega/progresso'
import type { Entrega } from '@/lib/entrega/types'

export function SumarioEntrega({ entrega, acao }: { entrega: Entrega; acao?: React.ReactNode }) {
  const reduced = useReducedMotion()
  const progresso = progressoDaEntrega(entrega.itens)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{entrega.nome}</span>
          {entrega.bigIdea && (
            <span
              style={{
                fontSize: 12.5, lineHeight: 1.5, fontStyle: 'italic', color: 'var(--text-secondary)',
                borderLeft: '2px solid var(--border-hairline)', paddingLeft: 9,
              }}
            >
              {entrega.bigIdea}
            </span>
          )}
        </div>
        <a
          href={`/api/entregas/${entrega.id}/export`}
          title={COPY_SALA.baixarPacoteAjuda}
          style={{
            flexShrink: 0, fontSize: 12.5, color: 'var(--text-secondary)', textDecoration: 'none',
            border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
            padding: '6px 11px', background: 'var(--surface-elevated)',
          }}
        >
          {COPY_SALA.baixarPacote}
        </a>
        {acao}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          role="progressbar"
          aria-valuenow={progresso.porcento}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso da entrega ${entrega.nome}`}
          style={{
            flex: 1, height: 6, borderRadius: 999, overflow: 'hidden',
            background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)',
          }}
        >
          <motion.div
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${progresso.porcento}%` }}
            transition={reduced ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))' }}
          />
        </div>
        <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
          {fraseDoProgresso(progresso)}
        </span>
      </div>
    </div>
  )
}
