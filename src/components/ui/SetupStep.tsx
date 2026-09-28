'use client'

import { motion } from 'motion/react'
import { springPreset, useReducedMotion } from '@/lib/motion'


export interface SetupStepProps {
  
  index: string
  kicker: string
  title: string
  subtitle?: string
  
  direction?: number
  children: React.ReactNode
}

export function SetupStep({
  index,
  kicker,
  title,
  subtitle,
  direction = 1,
  children,
}: SetupStepProps) {
  const reduced = useReducedMotion() ?? false
  const dx = direction >= 0 ? 28 : -28

  return (
    <motion.section
      
      initial={reduced ? false : { opacity: 0, x: dx }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: -dx }}
      transition={reduced ? { duration: 0 } : springPreset}
      style={{
        width: '100%',
        maxWidth: 560,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
      aria-label={title}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          <span
            
            style={{
              fontFamily: 'var(--font-display)',
              backgroundImage: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              fontWeight: 600,
            }}
          >
            {index}
          </span>
          {kicker}
        </span>

        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {title}
        </h2>

        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
              maxWidth: 460,
            }}
          >
            {subtitle}
          </p>
        )}
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </motion.section>
  )
}
