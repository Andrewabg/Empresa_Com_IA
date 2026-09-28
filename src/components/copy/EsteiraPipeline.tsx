'use client'







import { useState } from 'react'
import type { PecaView } from '@/lib/estudio/types'
import { getFormato } from '@/lib/estudio/formatos'
import { EstudioCard, EstudioVazio } from './EstudioCard'


const STATUS_LABEL: Record<PecaView['status'], string> = {
  brief: 'Brief',
  rascunho: 'Rascunho',
  revisao: 'Em revisão',
  aprovada: 'Aprovada',
  arquivada: 'Arquivada',
}


const STATUS_ORDER: PecaView['status'][] = ['brief', 'rascunho', 'revisao', 'aprovada', 'arquivada']


const RECOLHIDOS_INICIAIS: PecaView['status'][] = ['arquivada']


const ORIGEM_NOMES: Record<string, string> = {
  coo: 'João',
  'gestor-trafego': 'Rui',
  copywriter: 'Lia',
  operador: 'Você',
}

interface EsteiraPipelineProps {
  pecas: PecaView[]
  
  focadaId?: string
  onFocar: (id: string) => void
}

export function EsteiraPipeline({ pecas, focadaId, onFocar }: EsteiraPipelineProps) {
  const [recolhidos, setRecolhidos] = useState<Set<PecaView['status']>>(
    () => new Set(RECOLHIDOS_INICIAIS),
  )

  function toggle(status: PecaView['status']) {
    setRecolhidos((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  
  const grupos = STATUS_ORDER.map((status) => ({
    status,
    itens: pecas.filter((p) => p.status === status),
  })).filter((g) => g.itens.length > 0)

  return (
    <EstudioCard eyebrow="Esteira">
      {grupos.length === 0 ? (
        <EstudioVazio>Nenhuma peça ainda. Peça a primeira à Lia aqui do lado.</EstudioVazio>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {grupos.map(({ status, itens }) => {
            const aberto = !recolhidos.has(status)
            return (
              <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <GrupoHeader
                  label={STATUS_LABEL[status]}
                  count={itens.length}
                  aberto={aberto}
                  onToggle={() => toggle(status)}
                />
                {aberto && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {itens.map((p) => (
                      <EsteiraRow
                        key={p.id}
                        peca={p}
                        focada={p.id === focadaId}
                        onFocar={onFocar}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </EstudioCard>
  )
}


function GrupoHeader({
  label,
  count,
  aberto,
  onToggle,
}: {
  label: string
  count: number
  aberto: boolean
  onToggle: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-expanded={aberto}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: 0,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <Chevron aberto={aberto} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: hover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
          transition: 'color 140ms ease',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>
    </button>
  )
}


function EsteiraRow({
  peca,
  focada,
  onFocar,
}: {
  peca: PecaView
  focada: boolean
  onFocar: (id: string) => void
}) {
  const [hover, setHover] = useState(false)
  const formatoNome = getFormato(peca.formato)?.nome ?? peca.formato
  const origemLabel = ORIGEM_NOMES[peca.origem] ?? peca.origem

  function acionar() {
    onFocar(peca.id)
  }

  
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 11px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'background 140ms ease, border-color 140ms ease',
  }
  const style: React.CSSProperties = focada
    ? {
        ...baseStyle,
        border: '1px solid transparent',
        background:
          'linear-gradient(var(--surface-elevated), var(--surface-elevated)) padding-box, linear-gradient(120deg, var(--wave-from), var(--wave-to)) border-box',
      }
    : {
        ...baseStyle,
        border: '1px solid var(--border-hairline)',
        background: hover ? 'var(--surface-elevated)' : 'var(--surface)',
      }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={acionar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          acionar()
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`${peca.titulo || formatoNome} — ${STATUS_LABEL[peca.status]}`}
      style={style}
    >
      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {peca.titulo || formatoNome}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-tertiary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formatoNome}
        </span>
      </div>

      {}
      <OrigemChip origem={origemLabel} />

      {}
      <StatusBadge status={peca.status} />

      {}
      <span
        style={{
          fontSize: 11,
          color: 'var(--text-tertiary)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}
      >
        v{peca.versaoAtual}
      </span>
    </div>
  )
}


function OrigemChip({ origem }: { origem: string }) {
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11,
        lineHeight: 1.4,
        color: 'var(--text-secondary)',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-hairline)',
        maxWidth: 120,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={origem}
    >
      {origem}
    </span>
  )
}


function StatusBadge({ status }: { status: PecaView['status'] }) {
  const aprovada = status === 'aprovada'
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'inline-block',
        padding: '1px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        color: aprovada ? 'var(--approve)' : 'var(--text-tertiary)',
        background: aprovada ? 'color-mix(in srgb, var(--approve) 14%, transparent)' : 'transparent',
        border: aprovada
          ? '1px solid color-mix(in srgb, var(--approve) 30%, transparent)'
          : '1px solid var(--border-hairline)',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}


function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ transform: aberto ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 160ms ease', flexShrink: 0 }}
    >
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }} />
    </svg>
  )
}
