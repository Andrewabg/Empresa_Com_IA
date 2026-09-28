'use client'

import { motion } from 'motion/react'
import { springPreset } from '@/lib/motion'


export function WizardProgress({ index, total }: { index: number; total: number }) {
  return (
    <div role="presentation" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i <= index
        const current = i === index
        return (
          <motion.span
            key={i}
            aria-hidden
            animate={{ width: current ? 26 : 6, opacity: active ? 1 : 0.35 }}
            transition={springPreset}
            style={{
              height: 6,
              borderRadius: 3,
              background: current
                ? 'linear-gradient(120deg, var(--wave-from), var(--wave-to))'
                : active
                  ? 'color-mix(in srgb, var(--wave-to) 55%, transparent)'
                  : 'var(--text-tertiary)',
            }}
          />
        )
      })}
      <span
        style={{
          marginLeft: 6,
          fontSize: 11,
          color: 'var(--text-tertiary)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {index + 1} de {total}
      </span>
    </div>
  )
}
