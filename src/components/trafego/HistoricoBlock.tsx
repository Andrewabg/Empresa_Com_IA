'use client'







import type { CSSProperties } from 'react'
import { BlocoCard, BlocoVazio } from './BlocoCard'
import { fmtValor, type BlocoFmt } from './_format'

interface HistoricoLinha {
  metrica: string
  valores: (number | null)[]
  fmt: BlocoFmt
}
export interface HistoricoConfig {
  campanha: { id: string; nome: string }
  dias: string[]
  linhas: HistoricoLinha[]
}


function fmtDia(iso: string): string {
  const p = iso.split('-')
  return p.length === 3 && p[0].length === 4 ? `${p[2]}/${p[1]}` : iso
}

const CELL: CSSProperties = { padding: '4px 8px', fontSize: 12, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

export function HistoricoBlock({ bloco }: { bloco: { config: Record<string, unknown>; annotation: string | null } }) {
  const cfg = (bloco.config ?? {}) as Partial<HistoricoConfig>
  const camp = cfg.campanha
  const dias = Array.isArray(cfg.dias) ? cfg.dias : []
  const linhas = Array.isArray(cfg.linhas) ? cfg.linhas : []

  if (!camp || dias.length === 0 || linhas.length === 0) {
    return (
      <BlocoCard type="historico" annotation={bloco.annotation}>
        <BlocoVazio>Sem histórico diário para esta campanha.</BlocoVazio>
      </BlocoCard>
    )
  }

  return (
    <BlocoCard type="historico" annotation={bloco.annotation}>
      <div
        style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={camp.nome}
      >
        {camp.nome}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 'min-content' }}>
          <thead>
            <tr>
              <th style={{ ...CELL, textAlign: 'left' }} aria-hidden />
              {dias.map((d) => (
                <th key={d} style={{ ...CELL, textAlign: 'right', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  {fmtDia(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.metrica} style={{ borderTop: '1px solid var(--border-hairline)' }}>
                <td style={{ ...CELL, textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>{linha.metrica}</td>
                {linha.valores.map((v, i) => {
                  const prev = i > 0 ? linha.valores[i - 1] : null
                  const caiu = typeof v === 'number' && typeof prev === 'number' && v < prev
                  return (
                    <td
                      key={i}
                      style={{
                        ...CELL,
                        textAlign: 'right',
                        color: caiu ? 'var(--reject)' : 'var(--text-primary)',
                        background: caiu ? 'color-mix(in srgb, var(--reject) 8%, transparent)' : 'transparent',
                      }}
                    >
                      {fmtValor(v ?? undefined, linha.fmt)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlocoCard>
  )
}
