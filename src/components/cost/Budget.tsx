'use client'

import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import { pct, fmtUsd } from '@/lib/chart'

interface BudgetProps {
  spentUsd: number
  budgetUsd: number
}


export function Budget({ spentUsd, budgetUsd }: BudgetProps) {
  const reduced = useReducedMotion() ?? false
  const spent = pct(spentUsd, budgetUsd)

  
  if (!(budgetUsd > 0)) {
    return (
      <section aria-label="Limite mensal">
        <p
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Limite mensal
        </p>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Sem limite definido — a empresa não pausa por custo.
        </p>
        <p style={{ margin: 0, marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
          Defina um teto mensal em Config → Custo se quiser uma parada dura de proteção.
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Orçamento mensal">
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Orçamento do mês
        </p>
        <span
          style={{
            fontSize: 12.5,
            color: 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(spent.value)}% usado
        </span>
      </div>

      {}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={budgetUsd}
        aria-valuenow={spentUsd}
        aria-label={`${Math.round(spent.value)}% do orçamento usado, parada dura em US$ ${fmtUsd(budgetUsd)}`}
        style={{
          position: 'relative',
          height: 10,
          borderRadius: 999,
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-hairline)',
          overflow: 'hidden',
        }}
      >
        {}
        <motion.div
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${spent.clamped}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.7, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: 999,
            background: spent.over ? 'var(--reject)' : 'var(--text-secondary)',
          }}
        />
      </div>

      {}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 12,
        }}
      >
        <span
          style={{
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          US$ {fmtUsd(spentUsd)} de US$ {fmtUsd(budgetUsd)}
        </span>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 12,
            color: 'var(--text-tertiary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <HardStopGlyph />
          parada dura em US$ {fmtUsd(budgetUsd)}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          marginTop: 10,
          fontSize: 12,
          lineHeight: 1.5,
          color: 'var(--text-tertiary)',
        }}
      >
        Ao atingir o limite, a empresa pausa os gastos automaticamente — sem
        surpresa no fim do mês.
      </p>
    </section>
  )
}


function HardStopGlyph() {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" fill="none" aria-hidden>
      <path d="M9 1.5V11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M1.5 6.5H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
