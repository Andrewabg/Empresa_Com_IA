'use client'



import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { fmtUsd } from '@/lib/chart'
import { SectionHeader } from '../SectionHeader'

interface CustoResponse {
  spentUsd: number
  budgetUsd: number
}

export function CustoSection() {
  const [data, setData] = useState<CustoResponse | null>(null)
  const [loading, setLoading] = useState(true)

  
  const [budgetInput, setBudgetInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    fetch('/api/config/custo')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: CustoResponse | null) => {
        if (!mounted.current || !j) return
        setData(j)
        
        setBudgetInput(j.budgetUsd > 0 ? String(j.budgetUsd) : '')
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setLoading(false)
      })
  }, [])

  async function salvarTeto() {
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/config/custo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: budgetInput }),
      })
      const j = (await res.json().catch(() => null)) as
        | { budgetUsd?: number; error?: string }
        | null
      if (!mounted.current) return
      if (res.ok && typeof j?.budgetUsd === 'number') {
        setData((d) => (d ? { ...d, budgetUsd: j.budgetUsd! } : d))
        setBudgetInput(j.budgetUsd > 0 ? String(j.budgetUsd) : '')
        setFeedback({
          kind: 'ok',
          msg: j.budgetUsd > 0 ? `Limite salvo: US$ ${fmtUsd(j.budgetUsd)}.` : 'Sem limite — a empresa não pausa por custo.',
        })
      } else {
        setFeedback({ kind: 'err', msg: j?.error ?? 'Não foi possível salvar.' })
      }
    } catch {
      if (mounted.current) setFeedback({ kind: 'err', msg: 'Não foi possível salvar.' })
    } finally {
      if (mounted.current) setSaving(false)
    }
  }

  const temTeto = (data?.budgetUsd ?? 0) > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHeader
        title="Custo"
        description="Uma estimativa do que a empresa gastou de IA neste mês, por uso de tokens. É referência de tendência — não a fatura exata da OpenAI."
      />

      {}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '20px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
          }}
        >
          Gasto estimado neste mês
        </p>

        {loading ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>Carregando…</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontSize: 14,
                color: 'var(--text-tertiary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              US$
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 30,
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fmtUsd(data?.spentUsd ?? 0)}
            </span>
          </div>
        )}

        <Link
          href="/custo"
          style={{
            alignSelf: 'flex-start',
            fontSize: 12.5,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
          }}
          className="rail-credit__link"
        >
          Ver detalhe do custo ↗
        </Link>
      </section>

      {}
      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: '20px 20px',
          background: 'var(--surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Limite mensal
          </p>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            {loading
              ? ' '
              : temTeto
                ? `Ao atingir US$ ${fmtUsd(data!.budgetUsd)}, a empresa pausa os gastos de IA (voz e chat) — sem surpresa no fim do mês.`
                : 'Sem limite — a empresa não pausa por custo. Defina um valor abaixo se quiser um teto de proteção.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                fontSize: 13,
                color: 'var(--text-tertiary)',
                pointerEvents: 'none',
              }}
            >
              US$
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={budgetInput}
              disabled={loading || saving}
              onChange={(e) => {
                setBudgetInput(e.target.value)
                setFeedback(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving) salvarTeto()
              }}
              placeholder="sem limite"
              aria-label="Limite mensal de custo em dólares"
              style={{
                width: 160,
                padding: '10px 12px 10px 42px',
                fontSize: 14,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--text-primary)',
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="button"
            onClick={salvarTeto}
            disabled={loading || saving}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-primary)',
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              cursor: loading || saving ? 'default' : 'pointer',
              opacity: loading || saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>

        {feedback && (
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              color: feedback.kind === 'ok' ? 'var(--text-secondary)' : 'var(--reject)',
            }}
          >
            {feedback.msg}
          </p>
        )}
      </section>
    </div>
  )
}
