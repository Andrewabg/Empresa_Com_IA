'use client'


import { useCallback, useEffect, useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { GavetaDaTarefa, type AgenteNomeado } from '@/components/tarefas/GavetaDaTarefa'
import { COPY_TAREFAS, ROTULO_DO_STATUS, ROTULO_SEM_RESPOSTA } from '@/lib/tarefas/copy'
import { duracaoLegivel, horaLegivel } from '@/lib/tarefas/formato'
import { tituloDoObjetivo } from '@/lib/tarefas/tituloDoObjetivo'
import { passaNoFiltro, sinalDoObjetivo, type FiltroDaLista, type SinalDoObjetivo } from '@/lib/tarefas/filtro'
import type { ArvoreDaTarefa, StatusTarefa } from '@/lib/tarefas/linhaDoTempo'

export interface ObjetivoDaLista {
  id: string
  agent_id: string
  objective: string
  status: StatusTarefa
  created_at: string
  updated_at: string
  
  result?: string | null
}

interface Props {
  objetivos: ObjetivoDaLista[]
  
  sinais: Record<string, SinalDoObjetivo>
  agentes: AgenteNomeado[]
  ehDono: boolean
  agora: string
}

const FILTROS: Array<{ chave: FiltroDaLista; rotulo: string }> = [
  { chave: 'tudo', rotulo: COPY_TAREFAS.filtroTudo },
  { chave: 'falhas', rotulo: COPY_TAREFAS.filtroFalhas },
  { chave: 'esperando', rotulo: COPY_TAREFAS.filtroEsperando },
]


function marcadorDoItem(
  status: StatusTarefa,
  sinal: SinalDoObjetivo,
  filtro: FiltroDaLista,
): { texto: string; cor: string } | null {
  const falha = { texto: COPY_TAREFAS.marcadorFalhou, cor: 'var(--danger, #ff6b6b)' }
  const espera = { texto: COPY_TAREFAS.marcadorEsperando, cor: 'var(--wave-to)' }
  const temFalhaEscondida = sinal.falhou && status !== 'failed'
  const temEsperaEscondida = sinal.esperando && status !== 'needs_approval'
  if (filtro === 'esperando') return temEsperaEscondida ? espera : null
  if (filtro === 'falhas') return temFalhaEscondida ? falha : null
  
  if (temFalhaEscondida) return falha
  return temEsperaEscondida ? espera : null
}

function corDoStatus(status: StatusTarefa, semResposta = false): string {
  
  
  if (status === 'failed' || semResposta) return 'var(--danger, #ff6b6b)'
  if (status === 'needs_approval') return 'var(--wave-to)'
  if (status === 'cancelled') return 'var(--text-tertiary)'
  return 'var(--text-secondary)'
}

export function TarefasClient({ objetivos, sinais, agentes, ehDono, agora }: Props) {
  const [lista, setLista] = useState<ObjetivoDaLista[]>(objetivos)
  const [sinaisAtuais, setSinais] = useState<Record<string, SinalDoObjetivo>>(sinais)
  const [filtro, setFiltro] = useState<FiltroDaLista>('tudo')
  const [aberta, setAberta] = useState<ArvoreDaTarefa | null>(null)
  const [carregando, setCarregando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const recarregarLista = useCallback(async () => {
    try {
      const res = await fetch('/api/tarefas', { cache: 'no-store' })
      if (!res.ok) return
      const body = (await res.json()) as { objetivos?: ObjetivoDaLista[]; sinais?: Record<string, SinalDoObjetivo> }
      if (Array.isArray(body.objetivos)) setLista(body.objetivos)
      if (body.sinais) setSinais(body.sinais)
    } catch {
      
    }
  }, [])

  
  useEffect(() => {
    const aoVoltar = () => { if (document.visibilityState === 'visible') void recarregarLista() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [recarregarLista])

  async function abrir(id: string) {
    setCarregando(id)
    setErro(null)
    try {
      const res = await fetch(`/api/tarefas/${id}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('falhou')
      const body = (await res.json()) as { arvore: ArvoreDaTarefa | null }
      if (!body.arvore) throw new Error('vazio')
      setAberta(body.arvore)
    } catch {
      setErro(COPY_TAREFAS.falhaAoAbrir)
    } finally {
      setCarregando(null)
    }
  }

  async function cancelar(raizId: string) {
    const res = await fetch(`/api/tarefas/${raizId}/cancelar`, { method: 'POST' })
    if (!res.ok) throw new Error('falhou')
    setAberta(null)
    await recarregarLista()
  }

  
  
  
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('tarefa')
    if (id) void abrir(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  
  const sinalDe = (o: ObjetivoDaLista) => sinaisAtuais[o.id] ?? sinalDoObjetivo(o.status, [], o.result)
  const visiveis = lista.filter((o) => passaNoFiltro(sinalDe(o), filtro))
  const agoraMs = Date.parse(agora)

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 28px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <header>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          {COPY_TAREFAS.tituloDaPagina}
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
          {COPY_TAREFAS.subtitulo}
        </p>
      </header>

      {lista.length > 0 && (
        <div role="group" aria-label="Filtro" style={{ display: 'flex', gap: 8 }}>
          {FILTROS.map((f) => (
            <Button
              key={f.chave}
              variant={filtro === f.chave ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFiltro(f.chave)}
            >
              {f.rotulo}
            </Button>
          ))}
        </div>
      )}

      {erro && (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--danger, #ff6b6b)' }}>{erro}</p>
      )}

      {lista.length === 0 ? (
        <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
          <EmptyState headline={COPY_TAREFAS.tituloDaPagina} sub={COPY_TAREFAS.vazio} />
        </div>
      ) : visiveis.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)' }}>{COPY_TAREFAS.vazioComFiltro}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visiveis.map((o) => {
            const nome = agentes.find((a) => a.id === o.agent_id)?.nome ?? o.agent_id
            const terminal = ['done', 'failed', 'cancelled'].includes(o.status)
            const desdeMs = agoraMs - Date.parse(o.created_at)
            const marcador = marcadorDoItem(o.status, sinalDe(o), filtro)
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => abrir(o.id)}
                  disabled={carregando === o.id}
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: 'var(--surface)', border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-md)', padding: '14px 16px',
                    display: 'flex', gap: 14, alignItems: 'baseline',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span title={o.objective} style={{ display: 'block', fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tituloDoObjetivo(o.objective)}
                    </span>
                    <span style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {nome} · {carregando === o.id ? COPY_TAREFAS.carregando : horaLegivel(o.updated_at)}
                      {terminal ? '' : ` · ${duracaoLegivel(desdeMs)} ${COPY_TAREFAS.duracaoAgora}`}
                    </span>
                  </span>
                  {marcador && (
                    <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: marcador.cor }}>
                      {marcador.texto}
                    </span>
                  )}
                  <span style={{ flexShrink: 0, fontSize: 12, color: corDoStatus(o.status, sinalDe(o).semResposta) }}>
                    {sinalDe(o).semResposta ? ROTULO_SEM_RESPOSTA : ROTULO_DO_STATUS[o.status]}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {aberta && (
        <GavetaDaTarefa
          arvore={aberta}
          agentes={agentes}
          ehDono={ehDono}
          aoFechar={() => setAberta(null)}
          aoCancelar={cancelar}
        />
      )}
    </div>
  )
}
