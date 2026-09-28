'use client'


import { enderecoDeMidiaConfiavel } from '@/lib/instagram/enderecoDeMidia'
import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { TEXTOS_COCKPIT_IG } from '@/lib/instagram/copyCockpit'

export interface MidiaIg {
  id: string
  permalink: string
  thumbUrl: string | null
  legenda: string | null
  tipo: string
  publicadoEm: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEscolher: (m: MidiaIg) => void
}

export function EscolherPublicacao({ open, onOpenChange, onEscolher }: Props) {
  const [midias, setMidias] = useState<MidiaIg[] | null>(null)
  const [conectado, setConectado] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelado = false
    setMidias(null)
    setErro(false)
    fetch('/api/instagram/midias')
      .then((r) => r.json())
      .then((j: { midias?: MidiaIg[]; conectado?: boolean; falhou?: boolean }) => {
        if (cancelado) return
        setMidias(j.midias ?? [])
        setConectado(j.conectado !== false)
        
        
        if (j.falhou) setErro(true)
      })
      .catch(() => {
        if (cancelado) return
        setErro(true)
        setMidias([])
      })
    return () => { cancelado = true }
  }, [open])

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={TEXTOS_COCKPIT_IG.escolhaPublicacao}>
      {midias === null ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>{TEXTOS_COCKPIT_IG.publicacoesCarregando}</p>
      ) : erro || !conectado ? (
        <EmptyState
          compact
          headline={TEXTOS_COCKPIT_IG.publicacoesFalharam}
          sub={conectado ? TEXTOS_COCKPIT_IG.publicacoesFalharamSub : TEXTOS_COCKPIT_IG.publicacoesSemCanal}
        />
      ) : midias.length === 0 ? (
        
        
        
        <EmptyState compact headline={TEXTOS_COCKPIT_IG.semPublicacao} sub={TEXTOS_COCKPIT_IG.semPublicacaoSub} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 10 }}>
          {midias.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onEscolher(m); onOpenChange(false) }}
              title={m.legenda ?? undefined}
              style={{
                display: 'flex', flexDirection: 'column', gap: 6, padding: 6,
                background: 'var(--surface)', border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: '100%', aspectRatio: '1 / 1', borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden', background: 'var(--surface-elevated)',
                  display: 'grid', placeItems: 'center',
                }}
              >
                {enderecoDeMidiaConfiavel(m.thumbUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- imagem remota da Meta, fora do domínio configurado no next/image
                  <img src={enderecoDeMidiaConfiavel(m.thumbUrl)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>sem capa</span>
                )}
              </div>
              <span
                style={{
                  fontSize: 11, lineHeight: 1.4, color: 'var(--text-secondary)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}
              >
                {m.legenda || 'Sem legenda'}
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
