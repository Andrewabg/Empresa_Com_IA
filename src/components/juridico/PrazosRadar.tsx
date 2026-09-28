'use client'






import { classificarPrazo, ordenarRadar } from '@/lib/juridico/prazosRadar'
import type { PrazoView, PrazoTipo } from '@/lib/juridico/prazosTipos'

const AMBAR = 'rgb(214 158 46)'

const TIPO_LABEL: Record<PrazoTipo, string> = {
  renovacao: 'Renovação',
  aviso_previo: 'Aviso prévio',
  expiracao: 'Expiração',
  pagamento: 'Pagamento',
  compromisso: 'Compromisso',
}


function corUrgencia(urgencia: ReturnType<typeof classificarPrazo>['urgencia']): string {
  if (urgencia === 'vencido' || urgencia === 'critico') return 'var(--reject)'
  if (urgencia === 'atencao') return AMBAR
  return 'var(--approve)'
}


function linhaTempo(diasRestantes: number): string {
  if (diasRestantes < 0) return `venceu há ${-diasRestantes} dia(s)`
  if (diasRestantes === 0) return 'vence hoje'
  return `vence em ${diasRestantes} dia(s)`
}

interface PrazosRadarProps {
  prazos: PrazoView[]
  hoje: string
  onAdiar: (id: string) => void
  onResolver: (id: string) => void
  onDispensar: (id: string) => void
  onAbrirContrato: (contratoId: string | null) => void
}

export function PrazosRadar({
  prazos,
  hoje,
  onAdiar,
  onResolver,
  onDispensar,
  onAbrirContrato,
}: PrazosRadarProps) {
  const ordenados = ordenarRadar(prazos, hoje)

  if (ordenados.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: 'var(--approve)',
            opacity: 0.7,
          }}
        />
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
          Nenhum prazo no radar.
        </p>
      </div>
    )
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ordenados.map((p) => {
        const { diasRestantes, urgencia } = classificarPrazo(p, hoje)
        const cor = corUrgencia(urgencia)
        return (
          <li
            key={p.id}
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface)',
              padding: '13px 15px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span
                aria-hidden
                title={urgencia}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: cor,
                  flexShrink: 0,
                  marginTop: 5,
                  boxShadow: `0 0 0 3px color-mix(in oklab, ${cor} 22%, transparent)`,
                }}
              />
              <div style={{ minWidth: 0, flex: 1, lineHeight: 1.4 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.titulo}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{TIPO_LABEL[p.tipo]}</span>
                  <span aria-hidden style={{ color: 'var(--text-tertiary)', opacity: 0.5 }}>
                    ·
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: cor }}>{linhaTempo(diasRestantes)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button type="button" onClick={() => onAdiar(p.id)} title="Adiar (empurra pra fora da janela)" style={radarBtn}>
                Adiar
              </button>
              <button type="button" onClick={() => onResolver(p.id)} title="Marcar como já resolvido" style={radarBtn}>
                Já resolvi
              </button>
              <button type="button" onClick={() => onDispensar(p.id)} title="Dispensar este prazo" style={radarBtn}>
                Dispensar
              </button>
              {p.contratoId && (
                <button
                  type="button"
                  onClick={() => onAbrirContrato(p.contratoId)}
                  title="Abrir o contrato de origem no palco"
                  style={{ ...radarBtn, marginLeft: 'auto' }}
                >
                  Abrir contrato
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const radarBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '5px 11px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 11.5,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
