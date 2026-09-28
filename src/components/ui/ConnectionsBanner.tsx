'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion'
import { guiaDoToolkit } from '@/lib/guiaDoToolkit'

interface Report { pendingRequired: string[]; toolkits: { slug: string; name: string; requiredBy: string[] }[] }


export function ConnectionsBanner() {
  const reducedMotion = useReducedMotion() ?? false
  const [report, setReport] = useState<Report | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/config/connections')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: Report | null) => { if (alive && j) setReport(j) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!report || !report.pendingRequired.length) return null
  const first = report.toolkits.find((t) => report.pendingRequired.includes(t.slug))
  const who = first?.requiredBy[0]
  const label = first
    ? `${who ? `${who} precisa de ` : 'Falta conectar '}${first.name}${report.pendingRequired.length > 1 ? ` +${report.pendingRequired.length - 1}` : ''}`
    : 'Há ferramentas pendentes de ativação'
  const guia = guiaDoToolkit(first?.slug)

  return (
    <motion.div role="status" aria-live="polite"
      initial={reducedMotion ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        padding: '9px 16px', background: 'rgb(214 158 46 / 0.08)',
        borderBottom: '1px solid rgb(214 158 46 / 0.22)', fontSize: 12.5, color: 'var(--text-secondary)' }}>
      <span aria-hidden style={{ flexShrink: 0, color: 'rgb(214 158 46)' }}>⚠</span>
      <span>{label}: ative para liberar as ações.</span>
      <Link href="/config" style={{ color: 'rgb(214 158 46)', textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>
        Ativar em /config →
      </Link>
      {}
      {guia && (
        <a
          href={guia}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--text-secondary)', textDecoration: 'underline', whiteSpace: 'nowrap' }}
        >
          Como conectar
        </a>
      )}
    </motion.div>
  )
}
