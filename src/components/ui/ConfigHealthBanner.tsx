'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import { escutarConfigMudou } from '@/lib/configEvents'

interface ConfigStatus {
  openai_api_key: boolean
  github_token: boolean
  github_repo: boolean
}


export function ConfigHealthBanner() {
  const reducedMotion = useReducedMotion() ?? false
  const [missing, setMissing] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    const checar = () => {
      fetch('/api/config')
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { status?: ConfigStatus } | null) => {
          if (!alive || !j?.status) return
          const { openai_api_key, github_token, github_repo } = j.status
          setMissing(!(openai_api_key && github_token && github_repo))
        })
        .catch(() => {}) 
    }
    checar()
    const pararDeEscutar = escutarConfigMudou(checar)
    return () => { alive = false; pararDeEscutar() }
  }, [])

  
  if (!missing) return null

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
        Faltam chaves essenciais para a empresa funcionar.
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
        Abrir configuração →
      </Link>
    </motion.div>
  )
}
