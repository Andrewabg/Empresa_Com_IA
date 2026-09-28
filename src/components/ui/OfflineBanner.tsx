'use client'

import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'

interface OfflineBannerProps {
  
  label?: string
  
  urgent?: boolean
}


export function OfflineBanner({ label = 'Ao vivo pausado — reconectando…', urgent = false }: OfflineBannerProps) {
  const reducedMotion = useReducedMotion() ?? false

  return (
    <motion.div
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
      initial={reducedMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '9px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border-hairline)',
        fontSize: 12.5,
        color: 'var(--text-secondary)',
      }}
    >
      {}
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--text-tertiary)',
          flexShrink: 0,
          animation: reducedMotion ? undefined : 'awave-reconnect 1.6s ease-in-out infinite',
        }}
      />
      <span>{label}</span>
    </motion.div>
  )
}
