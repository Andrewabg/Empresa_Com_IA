'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'

interface ComposioHealth {
  configured: boolean
  ok?: boolean
  reason?: string
}


export function ComposioHealthBanner() {
  const reducedMotion = useReducedMotion() ?? false
  const [health, setHealth] = useState<ComposioHealth | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/config/health')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { composio?: ComposioHealth } | null) => {
        if (alive && j?.composio) setHealth(j.composio)
      })
      .catch(() => {}) 
    return () => { alive = false }
  }, [])

  
  if (!health || !health.configured || health.ok !== false) return null

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reducedMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '9px 16px',
        background: 'rgb(214 158 46 / 0.08)',
        borderBottom: '1px solid rgb(214 158 46 / 0.22)',
        fontSize: 12.5,
        color: 'var(--text-secondary)',
      }}
    >
      <span aria-hidden style={{ flexShrink: 0, color: 'rgb(214 158 46)' }}>⚠</span>
      <span>
        A chave do Composio está inválida — as ações externas estão desligadas.
      </span>
      <Link
        href="/config"
        style={{
          color: 'rgb(214 158 46)',
          textDecoration: 'none',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        Corrigir em /config →
      </Link>
    </motion.div>
  )
}
