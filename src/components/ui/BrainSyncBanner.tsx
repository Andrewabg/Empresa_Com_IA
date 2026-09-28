'use client'

import Link from 'next/link'
import { oracaoDoMotivoSalvo } from '@/lib/cerebro/inacessivel'


export function BrainSyncBanner({ motivo }: { motivo?: string | null }) {
  const oracao = oracaoDoMotivoSalvo(motivo)
  return (
    <div
      role="status"
      aria-live="polite"
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
        {oracao
          ? `Seu Segundo Cérebro não está sincronizando: ${oracao}.`
          : 'Seu Segundo Cérebro não está sincronizando com o GitHub.'}
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
        Reconectar em Configurações →
      </Link>
    </div>
  )
}
