'use client'



import { useEffect, useRef, useState } from 'react'
import { Card } from '@/app/agentes/parts'
import type { CanalRow } from '@/data/canais'
import { precisaJanela } from '@/lib/canais/janela'
import { janela24hDoProvider } from '@/lib/canais/capabilitiesPublicas'
import { agenteDaConversa } from '@/lib/canais/agenteDaConversa'
import type { AgenteRef, ConversaInbox } from '../InboxClient'
import {
  FILTROS_STATUS, PAGINA_INBOX, passaFiltroStatus, type FiltroStatus,
} from '@/lib/inbox/filtroConversas'
import { chaveDaConsulta } from '@/lib/inbox/chaveDaConsulta'






function horaRelativa(iso: string | null, agoraMs: number | null): string {
  if (!iso || agoraMs === null) return ''
  const delta = agoraMs - Date.parse(iso)
  if (!Number.isFinite(delta) || delta < 60_000) return 'agora'
  const min = Math.floor(delta / 60_000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}


function badgeSuprimido(ultimaMsgInAt: string | null, lidoAte: string | undefined): boolean {
  if (lidoAte === undefined) return false 
  if (!ultimaMsgInAt) return true 
  const carimbo = lidoAte ? Date.parse(lidoAte) : 0
  return Date.parse(ultimaMsgInAt) <= carimbo
}



function FiltroChip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      style={{
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 11,
        cursor: 'pointer',
        border: `1px solid ${ativo ? 'rgb(255 255 255 / 0.18)' : 'var(--border-hairline)'}`,
        background: ativo ? 'var(--surface-elevated)' : 'transparent',
        color: ativo ? 'var(--text-primary)' : 'var(--text-tertiary)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function ConversaRow({
  conversa,
  canal,
  agente,
  mostrarCanal,
  selected,
  lida,
  agoraMs,
  onSelect,
}: {
  conversa: ConversaInbox
  canal: CanalRow | undefined
  agente: AgenteRef | undefined
  mostrarCanal: boolean
  selected: boolean
  lida: boolean
  agoraMs: number | null
  onSelect: () => void
}) {
  const naoLidas = lida ? 0 : conversa.nao_lidas
  const nome = conversa.contato?.nome?.trim() || conversa.contato?.external_id || 'Contato'
  const aguardando = conversa.status === 'aguardando_humano'
  const fechada = conversa.status === 'fechada'
  
  
  
  const janelaFechada = canal
    ? precisaJanela(
        janela24hDoProvider(canal.provider),
        conversa.ultima_msg_in_at,
        new Date(agoraMs ?? Date.now()).toISOString(),
      )
    : false

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        width: '100%',
        textAlign: 'left',
        padding: '9px 10px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: selected ? 'var(--surface-elevated)' : 'transparent',
        border: `1px solid ${selected ? 'rgb(255 255 255 / 0.14)' : 'transparent'}`,
        color: 'inherit',
        opacity: fechada && !selected ? 0.65 : 1,
        flexShrink: 0,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        {aguardando && (
          <span
            title="Aguardando humano"
            aria-label="Aguardando humano"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'rgb(214 158 46)',
              flexShrink: 0,
            }}
          />
        )}
        {conversa.tem_rascunho && !janelaFechada && (
          <span
            title="rascunho aguardando aprovação"
            aria-label="rascunho aguardando aprovação"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'rgb(214 158 46)',
              flexShrink: 0,
            }}
          />
        )}
        {janelaFechada && (
          <span
            title="janela de 24h fechada — só template reabre"
            aria-label="janela de 24h fechada"
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              border: '1px solid var(--text-tertiary)',
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: selected || naoLidas > 0 ? 560 : 460,
            color: 'var(--text-primary)',
          }}
        >
          {nome}
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', flexShrink: 0 }}>
          {horaRelativa(conversa.ultima_msg_at, agoraMs)}
        </span>
        {naoLidas > 0 && (
          <span
            aria-label={`${naoLidas} não lidas`}
            style={{
              minWidth: 17,
              padding: '1px 5px',
              borderRadius: 999,
              textAlign: 'center',
              fontSize: 10.5,
              fontWeight: 600,
              background: 'var(--surface-elevated)',
              border: '1px solid rgb(255 255 255 / 0.14)',
              color: 'var(--text-primary)',
              flexShrink: 0,
            }}
          >
            {naoLidas}
          </span>
        )}
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: 'var(--text-tertiary)',
          minWidth: 0,
        }}
      >
        {agente && (
          <span
            style={{
              padding: '1px 7px',
              borderRadius: 999,
              border: '1px solid var(--border-hairline)',
              flexShrink: 0,
            }}
          >
            {agente.name}
          </span>
        )}
        {mostrarCanal && canal && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {canal.rotulo}
          </span>
        )}
        {fechada && <span style={{ marginLeft: 'auto', flexShrink: 0 }}>fechada</span>}
      </span>
    </button>
  )
}



export function ConversaList({
  conversas,
  temMais: temMaisInicial,
  canais,
  agentes,
  selecionadaId,
  lidoAte,
  onSelect,
  onListaMudou,
}: {
  
  conversas: ConversaInbox[]
  
  temMais: boolean
  canais: CanalRow[]
  agentes: AgenteRef[]
  selecionadaId: string | null
  lidoAte: Map<string, string>
  onSelect: (id: string) => void
  
  onListaMudou: (lista: ConversaInbox[]) => void
}) {
  const [filtroCanal, setFiltroCanal] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todas')
  
  const [paginas, setPaginas] = useState(1)
  
  
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [itens, setItens] = useState<ConversaInbox[]>(conversas)
  const [temMais, setTemMais] = useState(temMaisInicial)
  const [buscando, setBuscando] = useState(false)
  const [erroBusca, setErroBusca] = useState(false)
  
  
  const [agoraMs, setAgoraMs] = useState<number | null>(null)
  useEffect(() => {
    setAgoraMs(Date.now())
    const timer = setInterval(() => setAgoraMs(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  
  
  
  
  useEffect(() => {
    const t = setTimeout(() => { setPaginas(1); setBuscaAplicada(busca.trim()) }, 300)
    return () => clearTimeout(t)
  }, [busca])

  const padrao = filtroCanal === 'todos' && filtroStatus === 'todas' && paginas === 1 && !buscaAplicada
  const chave = chaveDaConsulta({ paginas, filtroCanal, filtroStatus, busca: buscaAplicada })

  
  
  
  
  
  
  useEffect(() => {
    if (!padrao) return
    setItens(conversas)
    setTemMais(temMaisInicial)
    setErroBusca(false)
    setBuscando(false)
  }, [padrao, conversas, temMaisInicial])

  
  
  
  useEffect(() => {
    if (padrao) return
    let vivo = true
    setBuscando(true)
    const qs = new URLSearchParams({ limite: String(paginas * PAGINA_INBOX) })
    if (filtroStatus !== 'todas') qs.set('status', filtroStatus)
    if (filtroCanal !== 'todos') qs.set('canal', filtroCanal)
    if (buscaAplicada) qs.set('busca', buscaAplicada)
    void fetch(`/api/inbox/conversas?${qs.toString()}`)
      .then(async (res) => (await res.json().catch(() => ({}))) as { ok?: boolean; conversas?: ConversaInbox[]; temMais?: boolean })
      .then((j) => {
        if (!vivo) return
        
        if (!j.ok || !Array.isArray(j.conversas)) { setErroBusca(true); return }
        setItens(j.conversas)
        setTemMais(Boolean(j.temMais))
        setErroBusca(false)
      })
      .catch(() => { if (vivo) setErroBusca(true) })
      .finally(() => { if (vivo) setBuscando(false) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padrao, chave])

  
  
  const avisar = useRef(onListaMudou)
  avisar.current = onListaMudou
  useEffect(() => { avisar.current(itens) }, [itens])

  const trocarFiltroCanal = (id: string) => { setPaginas(1); setFiltroCanal(id) }
  const trocarFiltroStatus = (id: FiltroStatus) => { setPaginas(1); setFiltroStatus(id) }

  const canalById = new Map(canais.map((k) => [k.id, k]))
  const agenteById = new Map(agentes.map((a) => [a.id, a]))

  
  
  const visiveis = itens.filter(
    (c) =>
      (filtroCanal === 'todos' || c.canal_id === filtroCanal) &&
      passaFiltroStatus(c.status, filtroStatus),
  )

  return (
    <Card label="Conversas" hint={temMais ? `${visiveis.length}+` : String(visiveis.length)} bodyScroll={false}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 8 }}>
        {}
        <div style={{ position: 'relative', flex: '0 0 auto' }}>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou número"
            aria-label="Buscar conversa por nome ou número"
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
              fontSize: 12.5,
              fontFamily: 'var(--font-ui)',
              outline: 'none',
            }}
          />
        </div>

        {}
        {canais.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: '0 0 auto' }}>
            <FiltroChip ativo={filtroCanal === 'todos'} onClick={() => trocarFiltroCanal('todos')}>
              Todos
            </FiltroChip>
            {canais.map((k) => (
              <FiltroChip key={k.id} ativo={filtroCanal === k.id} onClick={() => trocarFiltroCanal(k.id)}>
                {k.rotulo}
              </FiltroChip>
            ))}
          </div>
        )}

        {}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, flex: '0 0 auto' }}>
          {FILTROS_STATUS.map((f) => (
            <FiltroChip key={f.id} ativo={filtroStatus === f.id} onClick={() => trocarFiltroStatus(f.id)}>
              {f.rotulo}
            </FiltroChip>
          ))}
        </div>

        {}
        <div
          className="cc-scroll"
          style={{
            flex: '1 1 0',
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            paddingRight: 2,
          }}
        >
          {visiveis.length === 0 ? (
            <p style={{ margin: '10px 2px', fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-tertiary)' }}>
              {buscando
                ? 'Buscando…'
                : buscaAplicada
                  ? `Nenhuma conversa com "${buscaAplicada}".`
                  : conversas.length === 0
                    ? 'Nenhuma conversa ainda. Quando um cliente escrever no WhatsApp, ela aparece aqui.'
                    : 'Nenhuma conversa neste filtro.'}
            </p>
          ) : (
            visiveis.map((c) => (
              <ConversaRow
                key={c.id}
                conversa={c}
                canal={canalById.get(c.canal_id)}
                
                
                agente={agenteById.get(agenteDaConversa(c.agent_id, canalById.get(c.canal_id)?.agent_id ?? ''))}
                mostrarCanal={canais.length > 1}
                selected={c.id === selecionadaId}
                lida={badgeSuprimido(c.ultima_msg_in_at, lidoAte.get(c.id))}
                agoraMs={agoraMs}
                onSelect={() => onSelect(c.id)}
              />
            ))
          )}
          {erroBusca && (
            <p role="status" style={{ margin: '8px 2px 0', fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              Não consegui buscar o resto da lista agora. O que está aqui continua valendo.
            </p>
          )}
          {temMais && (
            <button
              type="button"
              onClick={() => setPaginas((p) => p + 1)}
              disabled={buscando}
              style={{
                margin: '8px 2px 2px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-hairline)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 12.5,
                fontFamily: 'var(--font-ui)',
                cursor: buscando ? 'not-allowed' : 'pointer',
                opacity: buscando ? 0.6 : 1,
              }}
            >
              {buscando ? 'Carregando…' : 'Carregar mais conversas'}
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
