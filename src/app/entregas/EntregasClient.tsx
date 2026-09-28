'use client'


import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PedidoWizard } from '@/components/entrega/PedidoWizard'
import { SumarioEntrega } from '@/components/entrega/SumarioEntrega'
import { Prancheta } from '@/components/entrega/Prancheta'
import { COPY_SALA, avisoDoTeto } from '@/lib/entrega/copy'
import { TETO_DE_PECAS_POR_ENTREGA } from '@/lib/entrega/estimativa'
import { montarEntrega, type ArteDoItem } from '@/lib/entrega/progresso'
import { algumTrabalhoEmVoo } from '@/lib/estudio/campanha'
import type { Entrega, PedidoDeEntrega } from '@/lib/entrega/types'
import type { CampanhaView } from '@/lib/estudio/types'

const INTERVALO_DO_POLL_MS = 5000

interface Props {
  initialCampanhas: CampanhaView[]
  initialEntregas: Entrega[]
  temMarca: boolean
  copywriterInstalado: boolean
  designerInstalado: boolean
  nomeCopywriter: string
  nomeDesigner: string
}


function indexarArtesIniciais(entregas: Entrega[]): Record<string, Record<number, ArteDoItem>> {
  const out: Record<string, Record<number, ArteDoItem>> = {}
  for (const e of entregas) {
    for (const it of e.itens) {
      if (!it.criativoId) continue
      ;(out[e.id] ??= {})[it.indice] = { criativoId: it.criativoId, ...(it.artifactId ? { artifactId: it.artifactId } : {}) }
    }
  }
  return out
}

export function EntregasClient({
  initialCampanhas, initialEntregas, temMarca, copywriterInstalado, designerInstalado,
  nomeCopywriter, nomeDesigner,
}: Props) {
  const [campanhas, setCampanhas] = useState<CampanhaView[]>(initialCampanhas)
  const [entregas, setEntregas] = useState<Entrega[]>(initialEntregas)
  const [pedindo, setPedindo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [recado, setRecado] = useState<string[]>([])
  const artesRef = useRef(indexarArtesIniciais(initialEntregas))

  const remontar = useCallback((lista: CampanhaView[]) => {
    setCampanhas(lista)
    setEntregas(lista.map((c) => montarEntrega(c, artesRef.current[c.id] ?? {})))
  }, [])

  const recarregar = useCallback(async () => {
    try {
      const res = await fetch('/api/entregas')
      if (!res.ok) return
      const json = (await res.json()) as { campanhas?: CampanhaView[] }
      if (json.campanhas) remontar(json.campanhas)
    } catch {
      
    }
  }, [remontar])

  
  const emVoo = algumTrabalhoEmVoo(campanhas)
  useEffect(() => {
    if (!emVoo) return
    const t = setInterval(() => { void recarregar() }, INTERVALO_DO_POLL_MS)
    return () => clearInterval(t)
  }, [emVoo, recarregar])

  async function confirmar(pedido: PedidoDeEntrega) {
    setEnviando(true)
    setErro(null)
    try {
      const res = await fetch('/api/entregas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
      })
      const json = (await res.json()) as { ok?: boolean; mensagem?: string; avisos?: string[]; cortouPeloTeto?: number; error?: string }
      if (!res.ok || !json.ok) {
        setErro(json.mensagem ?? json.error ?? 'Não consegui abrir a entrega agora.')
        return
      }
      setPedindo(false)
      
      
      setRecado([
        ...(json.mensagem ? [json.mensagem] : []),
        ...(json.cortouPeloTeto ? [avisoDoTeto(json.cortouPeloTeto, TETO_DE_PECAS_POR_ENTREGA)] : []),
        ...(json.avisos ?? []),
      ])
      
      await recarregar()
    } catch {
      setErro('Sem conexão com o servidor.')
    } finally {
      setEnviando(false)
    }
  }

  const equipe = { copy: nomeCopywriter, arte: nomeDesigner }
  const bloqueio = !copywriterInstalado ? COPY_SALA.semCopywriter : !temMarca ? COPY_SALA.semMarca : null

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '40px 28px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {COPY_SALA.titulo}
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>{COPY_SALA.subtitulo}</p>
        </div>
        {!pedindo && !bloqueio && entregas.length > 0 && (
          <Button variant="primary" onClick={() => { setErro(null); setPedindo(true) }}>{COPY_SALA.botaoPedir}</Button>
        )}
      </header>

      {bloqueio && (
        <p style={{ margin: 0, padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)', background: 'var(--surface)', fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>
          {bloqueio}
        </p>
      )}

      {!bloqueio && !designerInstalado && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-tertiary)' }}>
          {COPY_SALA.semDesigner}
        </p>
      )}

      {recado.length > 0 && !pedindo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {recado.map((linha) => (
            <p key={linha} style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)' }}>{linha}</p>
          ))}
        </div>
      )}

      {pedindo && (
        <PedidoWizard
          onConfirmar={(p) => void confirmar(p)}
          onCancelar={() => { setPedindo(false); setErro(null) }}
          enviando={enviando}
          erro={erro}
          designerInstalado={designerInstalado}
        />
      )}

      {!pedindo && entregas.length === 0 && !bloqueio && (
        <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
          <EmptyState
            headline={COPY_SALA.vazioTitulo}
            sub={COPY_SALA.vazioSub}
            action={<Button variant="primary" onClick={() => setPedindo(true)}>{COPY_SALA.botaoPrimeira}</Button>}
          />
        </div>
      )}

      {entregas.map((e) => (
        <section
          key={e.id}
          style={{
            display: 'flex', flexDirection: 'column', gap: 14,
            padding: 'clamp(16px, 2vw, 20px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface)',
          }}
        >
          <SumarioEntrega entrega={e} />
          <Prancheta itens={e.itens} equipe={equipe} />
        </section>
      ))}
    </div>
  )
}
