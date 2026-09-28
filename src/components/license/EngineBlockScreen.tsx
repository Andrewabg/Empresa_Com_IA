'use client'











import { useState } from 'react'
import { describeEngineBlock, type EngineBlockCopy } from '@/lib/license-copy'
import type { EngineBlockReason } from '@/lib/license-state'

export function EngineBlockScreen({ reason }: { reason: EngineBlockReason }) {
  const copy: EngineBlockCopy = describeEngineBlock(reason)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function revalidate() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revalidate: true }),
      })
      if (!res.ok) {
        setErr('Não foi possível validar agora. Tente novamente em instantes.')
        setBusy(false)
        return
      }
      
      window.location.reload()
    } catch {
      setErr('Sem conexão. Verifique a internet e tente de novo.')
      setBusy(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-base, #0A0B0D)',
        color: 'var(--text-primary, #ECEDEF)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: 'var(--surface, #131418)',
          border: '1px solid var(--border-hairline, rgba(255,255,255,0.07))',
          borderRadius: 16,
          padding: '32px 28px',
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            width: 44,
            height: 44,
            margin: '0 auto 20px',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'color-mix(in oklab, var(--reject, #E5634D) 16%, transparent)',
            color: 'var(--reject, #E5634D)',
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          {reason === 'hard' ? '⛔' : '⚠'}
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 10px' }}>{copy.title}</h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            margin: 0,
            color: 'var(--text-secondary, #A9ACB4)',
          }}
        >
          {copy.body}
        </p>

        {copy.canRevalidate && (
          <button
            type="button"
            onClick={revalidate}
            disabled={busy}
            style={{
              marginTop: 24,
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.6 : 1,
              fontSize: 14,
              fontWeight: 600,
              color: '#0A0B0D',
              background: 'var(--approve, #3FB984)',
            }}
          >
            {busy ? 'Validando…' : 'Revalidar agora'}
          </button>
        )}

        {err && (
          <p style={{ marginTop: 14, fontSize: 13, color: 'var(--reject, #E5634D)' }}>{err}</p>
        )}

        {copy.showSupport && (
          <p
            style={{
              marginTop: 24,
              fontSize: 12,
              color: 'var(--text-tertiary, #5E616B)',
            }}
          >
            Precisa de ajuda? Fale com o suporte de onde você adquiriu o acesso.
          </p>
        )}
      </div>
    </main>
  )
}
