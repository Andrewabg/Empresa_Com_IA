'use client'






import { useState } from 'react'
import type { PropostaPrazo, PrazoTipo } from '@/lib/juridico/prazosTipos'


const AMBAR = 'rgb(214 158 46)'


const TIPO_LABEL: Record<PrazoTipo, string> = {
  renovacao: 'Renovação automática',
  aviso_previo: 'Aviso prévio',
  expiracao: 'Expiração',
  pagamento: 'Pagamento',
  compromisso: 'Compromisso',
}


interface Linha extends PropostaPrazo {
  incluir: boolean
}


const dataValida = (d: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(d)

export function PrazosPropostaForm({
  contratoId,
  prazos,
  onConfirmar,
}: {
  contratoId: string
  prazos: PropostaPrazo[]
  onConfirmar: (contratoId: string, prazos: PropostaPrazo[]) => void
}) {
  const [rows, setRows] = useState<Linha[]>(() => prazos.map((p) => ({ ...p, incluir: true })))
  const [enviando, setEnviando] = useState(false)

  const incluidos = rows.filter((r) => r.incluir).length
  
  
  const faltaData = rows.some((r) => r.incluir && !dataValida(r.dataAlvo))
  const podeConfirmar = incluidos > 0 && !faltaData && !enviando

  const patch = (i: number, campo: Partial<Linha>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...campo } : r)))

  const submit = async () => {
    if (!podeConfirmar) return
    setEnviando(true)
    try {
      await onConfirmar(
        contratoId,
        rows
          .filter((r) => r.incluir)
          .map((r) => ({ tipo: r.tipo, titulo: r.titulo, dataAlvo: r.dataAlvo, janelaDias: r.janelaDias })),
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid color-mix(in srgb, ${AMBAR} 30%, transparent)`,
        background: `color-mix(in srgb, ${AMBAR} 8%, transparent)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: AMBAR }}>⏰ O Alan achou estes prazos</span>
        <button
          type="button"
          onClick={submit}
          disabled={!podeConfirmar}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: podeConfirmar ? 'pointer' : 'default',
            color: podeConfirmar ? 'var(--bg-base)' : 'var(--text-tertiary)',
            background: podeConfirmar ? AMBAR : 'var(--surface-elevated)',
            border: `1px solid ${podeConfirmar ? AMBAR : 'var(--border-hairline)'}`,
            transition: 'background 120ms ease, color 120ms ease',
          }}
        >
          {enviando ? 'Confirmando…' : `Confirmar prazos (${incluidos})`}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r, i) => {
          const rotulo = TIPO_LABEL[r.tipo] ?? r.titulo ?? r.tipo
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '9px 11px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface)',
                opacity: r.incluir ? 1 : 0.55,
                transition: 'opacity 120ms ease',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={r.incluir}
                  onChange={(e) => patch(i, { incluir: e.target.checked })}
                  style={{ accentColor: AMBAR, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{rotulo}</span>
                {r.titulo && rotulo !== r.titulo && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.titulo}
                  </span>
                )}
              </label>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 14px', paddingLeft: 24 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                  Data
                  <input
                    type="date"
                    value={r.dataAlvo}
                    onChange={(e) => patch(i, { dataAlvo: e.target.value })}
                    disabled={!r.incluir}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${r.incluir && !dataValida(r.dataAlvo) ? AMBAR : 'var(--border-hairline)'}`,
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-ui)',
                      fontSize: 12.5,
                      outline: 'none',
                    }}
                  />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                  avisar
                  <input
                    type="number"
                    min={0}
                    value={r.janelaDias}
                    onChange={(e) => patch(i, { janelaDias: Number(e.target.value) || 0 })}
                    disabled={!r.incluir}
                    style={{
                      width: 60,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-hairline)',
                      background: 'var(--surface)',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-ui)',
                      fontSize: 12.5,
                      outline: 'none',
                      textAlign: 'right',
                    }}
                  />
                  dias antes
                </label>
              </div>
            </div>
          )
        })}
      </div>

      <p style={{ margin: '10px 0 0', fontSize: 11, lineHeight: 1.5, color: faltaData ? AMBAR : 'var(--text-tertiary)' }}>
        {faltaData ? 'Cada prazo incluído precisa de uma data para virar radar.' : 'Confirmar cria o radar de prazos deste contrato.'}
      </p>
    </div>
  )
}
