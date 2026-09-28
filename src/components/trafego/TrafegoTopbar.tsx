'use client'


import type { MetaHealth } from '@/server/config/metaHealth'
import { ControlesDaSala } from '@/components/conversa/ControlesDaSala'

const AMBER = 'rgb(214 158 46)'
const GREEN = 'var(--approve)' 
const GREEN_RGB = '63 185 132'
const AMBER_RGB = '214 158 46'

export interface PeriodoOption {
  value: string
  label: string
}


export const PERIODO_OPTIONS: PeriodoOption[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_14d', label: 'Últimos 14 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
]


export interface ContaAd {
  id: string
  name: string | null
}

export function TrafegoTopbar({
  agentName,
  periodo,
  onPeriodoChange,
  metaHealth,
  onConfig,
  onAtualizar,
  atualizando,
  contas,
  contaSelecionada,
  onContaChange,
  onHistorico,
  onNova,
}: {
  agentName: string
  periodo: string
  onPeriodoChange: (value: string) => void
  metaHealth: MetaHealth
  
  onConfig: () => void
  onAtualizar: () => void
  atualizando: boolean
  
  contas?: ContaAd[]
  contaSelecionada?: string | null
  onContaChange?: (accountId: string) => void
  onHistorico: () => void
  onNova: () => void
}) {
  const connected = metaHealth === 'ok'
  const multiConta = connected && !!contas && contas.length > 1
  return (
    <header
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px clamp(16px, 2.5vw, 28px)',
        borderBottom: '1px solid var(--border-hairline)',
        background: 'linear-gradient(to bottom, rgb(255 255 255 / 0.012), transparent)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 14.5,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        Tráfego <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>· {agentName}</span>
      </h1>

      <div style={{ flex: 1 }} />

      <ControlesDaSala
        onHistorico={onHistorico}
        onNova={onNova}
        tituloNova="Começar uma frente nova com o Rui (o painel de blocos continua onde está)"
      />

      {}
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface)',
          padding: '5px 10px',
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>Período</span>
        <select
          value={periodo}
          onChange={(e) => onPeriodoChange(e.target.value)}
          aria-label="Período das buscas"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-ui)',
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          {PERIODO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} style={{ background: 'var(--bg-base)' }}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {}
      {multiConta && (
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface)',
            padding: '5px 10px',
            maxWidth: 220,
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>Conta</span>
          <select
            value={contaSelecionada ?? ''}
            onChange={(e) => onContaChange?.(e.target.value)}
            aria-label="Conta de anúncios que o Rui lê"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-ui)',
              fontSize: 12.5,
              cursor: 'pointer',
              maxWidth: 170,
              textOverflow: 'ellipsis',
            }}
          >
            {contas!.map((c) => (
              <option key={c.id} value={c.id} style={{ background: 'var(--bg-base)' }}>
                {c.name ?? c.id}
              </option>
            ))}
          </select>
        </label>
      )}

      {}
      <ConnectionChip health={metaHealth} onConfig={onConfig} />

      {}
      <button
        type="button"
        onClick={onAtualizar}
        disabled={atualizando}
        title={connected ? 'Re-puxar o Meta e atualizar o painel' : 'Atualizar e re-checar a conexão com o Meta'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '6px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface-elevated)',
          color: connected ? 'var(--text-secondary)' : 'var(--text-tertiary)',
          fontFamily: 'var(--font-ui)',
          fontSize: 12.5,
          cursor: atualizando ? 'default' : 'pointer',
          opacity: atualizando ? 0.55 : 1,
        }}
      >
        <RefreshGlyph spinning={atualizando} />
        {atualizando ? 'Atualizando…' : 'Atualizar'}
      </button>
    </header>
  )
}

interface ChipStyle {
  color: string
  border: string
  bg: string
  label: string
  
  warn: boolean
}


function chipStyle(health: MetaHealth): ChipStyle {
  switch (health) {
    case 'ok':
      return { color: GREEN, border: `rgb(${GREEN_RGB} / 0.3)`, bg: `rgb(${GREEN_RGB} / 0.08)`, label: 'Meta conectado', warn: false }
    case 'expired':
      return { color: AMBER, border: `rgb(${AMBER_RGB} / 0.3)`, bg: `rgb(${AMBER_RGB} / 0.07)`, label: 'Meta: reconectar', warn: true }
    case 'absent':
      return { color: AMBER, border: `rgb(${AMBER_RGB} / 0.3)`, bg: `rgb(${AMBER_RGB} / 0.07)`, label: 'Conectar Meta', warn: true }
    case 'unconfigured':
    default:
      return { color: 'var(--text-tertiary)', border: 'var(--border-hairline)', bg: 'var(--surface)', label: 'Configurar Composio', warn: false }
  }
}

function ConnectionChip({ health, onConfig }: { health: MetaHealth; onConfig: () => void }) {
  const s = chipStyle(health)
  const clickable = health !== 'ok'
  const inner = (
    <>
      {s.warn ? (
        <span aria-hidden style={{ fontSize: 11, lineHeight: 1, flexShrink: 0 }}>
          ⚠
        </span>
      ) : (
        <span style={{ width: 7, height: 7, borderRadius: 999, background: s.color, flexShrink: 0 }} />
      )}
      {s.label}
    </>
  )
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '5px 11px',
    borderRadius: 999,
    border: `1px solid ${s.border}`,
    background: s.bg,
    fontSize: 11.5,
    color: s.color,
    whiteSpace: 'nowrap',
  }

  if (!clickable) {
    return <span style={baseStyle}>{inner}</span>
  }
  return (
    <button
      type="button"
      onClick={onConfig}
      title="Abrir /config para conectar/reconectar o Meta Ads"
      style={{
        ...baseStyle,
        fontFamily: 'var(--font-ui)',
        cursor: 'pointer',
      }}
    >
      {inner}
    </button>
  )
}

function RefreshGlyph({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={spinning ? { animation: 'trafego-spin 0.9s linear infinite' } : undefined}
    >
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2v3h-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <style>{'@keyframes trafego-spin{to{transform:rotate(360deg)}}'}</style>
    </svg>
  )
}
