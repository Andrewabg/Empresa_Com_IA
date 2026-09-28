'use client'


import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { rotuloDoDisparo, corDoDisparo, legendaDeRepeticoes } from '@/lib/instagram/copyGatilho'
import { TEXTOS_COCKPIT_IG, tituloDoHistorico } from '@/lib/instagram/copyCockpit'
import type { IgRunRow } from '@/data/igAutomacoes'

function formatarData(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

interface Props {
  automacaoId: string | null
  automacaoNome: string
  onFechar: () => void
}

export function ListaDeRuns({ automacaoId, automacaoNome, onFechar }: Props) {
  const [runs, setRuns] = useState<IgRunRow[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!automacaoId) return
    let cancelado = false
    setRuns(null)
    setErro(false)
    fetch(`/api/instagram/automacoes/${automacaoId}/runs`)
      .then((r) => r.json())
      .then((j: { runs?: IgRunRow[]; error?: string }) => {
        if (cancelado) return
        if (j.runs) setRuns(j.runs)
        else setErro(true)
      })
      .catch(() => { if (!cancelado) setErro(true) })
    return () => { cancelado = true }
  }, [automacaoId])

  return (
    <Modal open={automacaoId !== null} onOpenChange={(o) => { if (!o) onFechar() }} title={tituloDoHistorico(automacaoNome)}>
      {runs === null && !erro ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>{TEXTOS_COCKPIT_IG.historicoCarregando}</p>
      ) : erro ? (
        <EmptyState compact headline={TEXTOS_COCKPIT_IG.historicoFalhou} sub={TEXTOS_COCKPIT_IG.historicoFalhouSub} />
      ) : runs && runs.length === 0 ? (
        <EmptyState compact headline={TEXTOS_COCKPIT_IG.semDisparo} sub={TEXTOS_COCKPIT_IG.semDisparoSub} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(runs ?? []).map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px',
                background: 'var(--surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 550, color: 'var(--text-primary)' }}>
                  {r.ig_username ? `@${r.ig_username}` : TEXTOS_COCKPIT_IG.semUsuario}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: corDoDisparo(r.status) }}>{rotuloDoDisparo(r.status)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
                {r.origem === 'comentario' ? 'comentário' : 'direct'} · {formatarData(r.created_at)}
                {r.palavra_casada ? ` · palavra "${r.palavra_casada}"` : ''}
              </p>
              {legendaDeRepeticoes(r.repeticoes) && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>{legendaDeRepeticoes(r.repeticoes)}</p>
              )}
              {r.erro_mensagem && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--reject)' }}>{r.erro_mensagem}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
