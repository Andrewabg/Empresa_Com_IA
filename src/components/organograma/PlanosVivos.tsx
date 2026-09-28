'use client'


import { useState } from 'react'
import type { ArvorePlano, PassoView } from '@/lib/maestro-view'
import { rotuloStatusPasso } from '@/lib/maestro-view'
import { GavetaDaTarefa } from '@/components/tarefas/GavetaDaTarefa'
import { COPY_TAREFAS } from '@/lib/tarefas/copy'
import type { ArvoreDaTarefa } from '@/lib/tarefas/linhaDoTempo'

interface PlanosVivosProps {
  planos: ArvorePlano[]
  nomesPorId: Record<string, string>
}

export function PlanosVivos({ planos, nomesPorId }: PlanosVivosProps) {
  
  
  const [aberta, setAberta] = useState<ArvoreDaTarefa | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const agentes = Object.entries(nomesPorId).map(([id, nome]) => ({ id, nome }))

  async function abrirCaminho(taskId: string) {
    setErro(null)
    try {
      const res = await fetch(`/api/tarefas/${taskId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('falhou')
      const body = (await res.json()) as { arvore: ArvoreDaTarefa | null }
      if (!body.arvore) throw new Error('vazio')
      setAberta(body.arvore)
    } catch {
      setErro(COPY_TAREFAS.falhaAoAbrir)
    }
  }

  if (planos.length === 0) return null
  return (
    <section id="planos-vivos" style={{ marginTop: 56, scrollMarginTop: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        No que o time está trabalhando
      </h2>
      <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 16 }}>
        As orquestrações em curso — quem faz o quê, passo a passo.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(460px, 100%), 1fr))',
          gap: 16,
        }}
      >
        {planos.map((p) => (
          <PlanoCard key={p.planId} plano={p} nomesPorId={nomesPorId} aoVerCaminho={abrirCaminho} />
        ))}
      </div>
      {erro && (
        <p role="alert" style={{ marginTop: 12, fontSize: 12.5, color: 'var(--danger, #ff6b6b)' }}>{erro}</p>
      )}
      {aberta && (
        <GavetaDaTarefa
          arvore={aberta}
          agentes={agentes}
          ehDono={false}
          aoFechar={() => setAberta(null)}
        />
      )}
    </section>
  )
}

function PlanoCard({ plano, nomesPorId, aoVerCaminho }: {
  plano: ArvorePlano
  nomesPorId: Record<string, string>
  aoVerCaminho: (taskId: string) => void
}) {
  const { resumo } = plano
  const pct = resumo.total > 0 ? Math.round((resumo.concluidos / resumo.total) * 100) : 0
  return (
    <article
      style={{
        padding: '16px 18px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--text-primary)' }}>
          {plano.objetivo}
        </span>
        <button
          type="button"
          onClick={() => aoVerCaminho(plano.rootTaskId)}
          style={{
            flexShrink: 0, cursor: 'pointer', background: 'transparent', border: 'none', padding: 0,
            fontSize: 12, fontWeight: 600, color: 'var(--wave-to)',
          }}
        >
          Ver o caminho
        </button>
      </div>
      {}
      <div
        role="progressbar"
        aria-label={`Progresso do plano: ${plano.objetivo}`}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ height: 4, borderRadius: 999, background: '#ffffff14', overflow: 'hidden' }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, var(--wave-from), var(--wave-to))',
            transition: 'width 400ms ease',
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: 'var(--text-tertiary)',
          margin: '6px 0 12px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {resumo.concluidos}/{resumo.total} concluídos
        {resumo.emAndamento > 0 && ` · ${resumo.emAndamento} em andamento`}
        {resumo.falhos > 0 && ` · ${resumo.falhos} ${resumo.falhos === 1 ? 'falhou' : 'falharam'}`}
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {plano.passos.map((p) => (
          <PassoRow key={p.ordinal} passo={p} nomesPorId={nomesPorId} />
        ))}
      </ol>
    </article>
  )
}

function PassoRow({ passo, nomesPorId }: { passo: PassoView; nomesPorId: Record<string, string> }) {
  const dim = passo.status === 'skipped'
  const quem = (passo.agente && nomesPorId[passo.agente]) || passo.role
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: dim ? 0.55 : 1 }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 8, flexShrink: 0, ...dotPasso(passo.status) }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
        {quem}
      </span>
      <span
        title={passo.sub_objective}
        style={{
          fontSize: 12.5,
          color: 'var(--text-tertiary)',
          textDecoration: dim ? 'line-through' : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}
      >
        {passo.sub_objective}
      </span>
      <span
        style={{
          marginLeft: 'auto',
          fontSize: 11,
          color: passo.status === 'failed' ? 'var(--reject)' : 'var(--text-tertiary)',
          flexShrink: 0,
        }}
      >
        {rotuloStatusPasso(passo.status)}
      </span>
    </li>
  )
}


function dotPasso(status: PassoView['status']): { background: string; boxShadow: string } {
  switch (status) {
    case 'delegated':
      return { background: 'var(--wave-from)', boxShadow: '0 0 8px var(--wave-from)' }
    case 'done':
      return { background: 'var(--wave-to)', boxShadow: 'none' }
    case 'failed':
      return { background: 'var(--reject)', boxShadow: 'none' }
    case 'skipped':
      return { background: 'var(--text-tertiary)', boxShadow: 'none' }
    case 'pending':
    default:
      return { background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--text-tertiary)' }
  }
}
