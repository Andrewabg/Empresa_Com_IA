'use client'



import { useEffect, useMemo, useState } from 'react'
import type { AgentTools } from '@/data/agents'
import { montarFerramentas, type FerramentaView } from '@/lib/inbox/ferramentas'

interface ToolkitReport {
  slug: string
  name: string
  connected: boolean
}


function toolsComFerramentas(base: AgentTools, views: FerramentaView[]): AgentTools {
  const composio_toolkits = views.filter((f) => f.ligada && !f.required).map((f) => f.slug)
  const composio_action_modes: Record<string, 'hitl' | 'direto'> = {}
  for (const f of views) if (f.ligada) composio_action_modes[f.slug] = f.modo
  return { ...base, composio_toolkits, composio_action_modes }
}


function ToggleLigada({ ligada, disabled, onClick }: { ligada: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-label={ligada ? 'Desligar ferramenta' : 'Ligar ferramenta'}
      disabled={disabled}
      onClick={onClick}
      style={{
        flexShrink: 0, width: 36, height: 20, padding: 0, borderRadius: 99, position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
        border: `1px solid ${ligada ? 'rgb(40 224 200 / 0.4)' : 'var(--border-hairline)'}`,
        background: ligada ? 'linear-gradient(120deg, var(--wave-from), var(--wave-to))' : 'var(--surface-elevated)',
        transition: 'background 0.18s, border-color 0.18s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: ligada ? 'calc(100% - 18px)' : 2, width: 14, height: 14,
        borderRadius: '50%', background: ligada ? '#fff' : 'var(--text-tertiary)', transition: 'left 0.18s',
      }} />
    </button>
  )
}


function ModoSegmento({ modo, disabled, onSelect }: {
  modo: 'hitl' | 'direto'; disabled: boolean; onSelect: (m: 'hitl' | 'direto') => void
}) {
  const opcoes: Array<{ valor: 'hitl' | 'direto'; label: string }> = [
    { valor: 'hitl', label: 'Pede sua aprovação' },
    { valor: 'direto', label: 'Age sozinho' },
  ]
  return (
    <div role="radiogroup" aria-label="Ao agir" style={{
      display: 'inline-flex', gap: 2, padding: 2, borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
    }}>
      {opcoes.map((o) => {
        const ativo = modo === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={disabled}
            onClick={() => onSelect(o.valor)}
            style={{
              padding: '3px 10px', borderRadius: 'calc(var(--radius-sm) - 2px)', border: 'none',
              background: ativo ? 'var(--surface)' : 'transparent',
              color: ativo ? 'var(--text-primary)' : 'var(--text-tertiary)',
              fontSize: 12, fontWeight: ativo ? 500 : 400, cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1, transition: 'background 0.15s, color 0.15s',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}


export function AcoesEditor({ tools, onChange }: { tools: AgentTools; onChange: (t: AgentTools) => void }) {
  const [report, setReport] = useState<ToolkitReport[] | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/config/connections')
      .then((r) => r.json())
      .then((d: { toolkits?: ToolkitReport[] }) => {
        if (!alive) return
        setReport(Array.isArray(d.toolkits) ? d.toolkits : [])
        setCarregando(false)
      })
      .catch(() => { if (alive) { setReport([]); setCarregando(false) } })
    return () => { alive = false }
  }, [])

  
  const ferramentas = useMemo(() => montarFerramentas(tools, report ?? []), [tools, report])

  function toggleLigada(slug: string, ligada: boolean) {
    const views = ferramentas.map((f) => (f.slug === slug && !f.required ? { ...f, ligada } : f))
    onChange(toolsComFerramentas(tools, views))
  }
  function definirModo(slug: string, modo: 'hitl' | 'direto') {
    const views = ferramentas.map((f) => (f.slug === slug ? { ...f, modo } : f))
    onChange(toolsComFerramentas(tools, views))
  }

  if (carregando) {
    return <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>Carregando ações…</p>
  }
  if (ferramentas.length === 0) {
    return (
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
        Conecte ferramentas em Integrações para equipar este atendente.
      </p>
    )
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {ferramentas.map((f) => (
        <li
          key={f.slug}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            padding: '9px 11px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)', background: 'var(--surface)',
          }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{
              fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {f.name}
            </span>
            {!f.connected && (
              <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                conexão caiu — reconecte em Integrações
              </span>
            )}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {f.ligada && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Ao agir:</span>
                  <ModoSegmento modo={f.modo} disabled={false} onSelect={(m) => definirModo(f.slug, m)} />
                </span>
                {f.modo === 'direto' && (
                  <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>executa sem te avisar</span>
                )}
              </div>
            )}
            {f.required ? (
              <span style={{
                display: 'inline-block', padding: '1px 7px', borderRadius: 999,
                border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
                fontSize: 11.5, fontWeight: 500, color: 'var(--text-tertiary)', lineHeight: '18px',
              }}>
                necessária
              </span>
            ) : (
              <ToggleLigada ligada={f.ligada} disabled={false} onClick={() => toggleLigada(f.slug, !f.ligada)} />
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
