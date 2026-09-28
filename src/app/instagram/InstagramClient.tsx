'use client'


import { useState } from 'react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { ListaDeAutomacoes, type AvisoAutomacao } from '@/components/instagram/ListaDeAutomacoes'
import { RevisaoAntesDeAtivar, type RevisaoNaTela } from '@/components/instagram/RevisaoAntesDeAtivar'
import { ListaDeRuns } from '@/components/instagram/ListaDeRuns'
import { EditorDeAutomacao, rascunhoVazio, rascunhoDaAutomacao, paraEntrada, type RascunhoAutomacao } from '@/components/instagram/EditorDeAutomacao'
import { TEXTOS_EDICAO_IG } from '@/lib/instagram/copyEdicao'
import { TEXTOS_CONEXAO_IG } from '@/lib/instagram/copyConexao'
import {
  TEXTOS_COCKPIT_IG, tituloContratarCargo, textoContratarCargo, rotuloFalarCom,
} from '@/lib/instagram/copyCockpit'
import { AMBAR, AMBAR_RGB } from '@/lib/instagram/tons'
import { revisarAutomacao, TEXTOS_REVISAO_IG } from '@/lib/instagram/revisaoAntesDeAtivar'
import type { IgAutomacaoRow, IgPassoRow } from '@/data/igAutomacoes'

type Editor = { modo: 'fechado' } | { modo: 'nova' } | { modo: 'editando'; id: string; valor: RascunhoAutomacao } | { modo: 'carregando'; id: string }

interface Props {
  ehDono: boolean
  agentInstalled: boolean
  cargoNome: string
  
  agenteId: string | null
  canalConectado: boolean
  canalHabilitado: boolean
  diagnostico: { titulo: string; passo: string }
  initialAutomacoes: IgAutomacaoRow[]
  
  intervaloHeartbeatS: number
}

export function InstagramClient({
  ehDono, agentInstalled, cargoNome, agenteId, canalConectado, canalHabilitado, diagnostico, initialAutomacoes,
  intervaloHeartbeatS,
}: Props) {
  const [automacoes, setAutomacoes] = useState<IgAutomacaoRow[]>(initialAutomacoes)
  const [editor, setEditor] = useState<Editor>({ modo: 'fechado' })
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [avisos, setAvisos] = useState<Record<string, AvisoAutomacao>>({})
  const [historico, setHistorico] = useState<{ id: string; nome: string } | null>(null)
  const [revisao, setRevisao] = useState<RevisaoNaTela | null>(null)

  
  
  
  const avisar = (id: string, msg: string | null, tipo: AvisoAutomacao['tipo'] = 'erro') =>
    setAvisos((a) => {
      const proximo = { ...a }
      if (msg) proximo[id] = { texto: msg, tipo }
      else delete proximo[id]
      return proximo
    })

  const aplicar = (a: IgAutomacaoRow) =>
    setAutomacoes((lista) => (lista.some((x) => x.id === a.id) ? lista.map((x) => (x.id === a.id ? a : x)) : [a, ...lista]))

  async function salvar(v: RascunhoAutomacao) {
    setSalvando(true)
    setErroForm(null)
    const editando = editor.modo === 'editando' ? editor.id : null
    
    
    
    
    const corpo = paraEntrada(v)
    try {
      const res = await fetch(editando ? `/api/instagram/automacoes/${editando}` : '/api/instagram/automacoes', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const json = (await res.json()) as { automacao?: IgAutomacaoRow; ok?: boolean; error?: string; rebaixada?: boolean }
      if (!res.ok) {
        setErroForm(json.error ?? TEXTOS_COCKPIT_IG.naoSalvou)
        
        
        
        if (editando && json.rebaixada) {
          setAutomacoes((lista) => lista.map((x) => (x.id === editando ? { ...x, status: 'rascunho' } : x)))
          avisar(editando, json.error ?? TEXTOS_EDICAO_IG.saiuDoArAoFalharSalvamento)
        }
        return
      }
      if (json.automacao) {
        aplicar(json.automacao)
      } else if (editando) {
        
        
        const r = await fetch(`/api/instagram/automacoes/${editando}`)
        const j2 = (await r.json()) as { automacao?: IgAutomacaoRow }
        if (j2.automacao) aplicar(j2.automacao)
      }
      
      
      
      if (editando && json.rebaixada) avisar(editando, TEXTOS_EDICAO_IG.rebaixadaAoEditar, 'info')
      setEditor({ modo: 'fechado' })
    } catch {
      setErroForm(TEXTOS_COCKPIT_IG.semRedeAoSalvar)
    } finally {
      setSalvando(false)
    }
  }

  
  async function alternar(a: IgAutomacaoRow, novoStatus: 'ativa' | 'rascunho', baseadoEm?: string | null) {
    setOcupada(a.id)
    avisar(a.id, null)
    try {
      const res = await fetch(`/api/instagram/automacoes/${a.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseadoEm ? { status: novoStatus, baseadoEm } : { status: novoStatus }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.ok) {
        aplicar({ ...a, status: novoStatus })
        setRevisao(null)
      } else {
        avisar(a.id, json.error ?? TEXTOS_COCKPIT_IG.naoMudouEstado)
        setRevisao(null)
      }
    } catch {
      avisar(a.id, TEXTOS_REVISAO_IG.semConexao)
    } finally {
      setOcupada(null)
    }
  }

  
  async function revisarAntesDeAtivar(a: IgAutomacaoRow) {
    avisar(a.id, null)
    const vazia = { id: a.id, nome: a.nome, carregando: false, erro: null, conteudo: null, baseadoEm: null }
    setRevisao({ ...vazia, carregando: true })
    try {
      const res = await fetch(`/api/instagram/automacoes/${a.id}`)
      const json = (await res.json()) as { automacao?: IgAutomacaoRow; passos?: IgPassoRow[] }
      if (!res.ok || !json.automacao) {
        setRevisao({ ...vazia, erro: TEXTOS_REVISAO_IG.naoAbriu })
        return
      }
      setRevisao({
        ...vazia,
        
        
        conteudo: revisarAutomacao({
          passos: json.passos ?? [],
          respostaPublica: json.automacao.resposta_publica,
          respostaPublicaTexto: json.automacao.resposta_publica_texto,
          palavras: json.automacao.palavras,
        }),
        
        
        baseadoEm: json.automacao.updated_at,
      })
    } catch {
      setRevisao({ ...vazia, erro: TEXTOS_REVISAO_IG.semConexao })
    }
  }

  async function arquivar(a: IgAutomacaoRow) {
    setOcupada(a.id)
    const antes = automacoes
    setAutomacoes((lista) => lista.filter((x) => x.id !== a.id)) 
    try {
      const res = await fetch(`/api/instagram/automacoes/${a.id}`, { method: 'DELETE' })
      if (!res.ok) {
        setAutomacoes(antes)
        avisar(a.id, TEXTOS_COCKPIT_IG.naoArquivou)
      }
    } catch {
      setAutomacoes(antes)
      avisar(a.id, TEXTOS_REVISAO_IG.semConexao)
    } finally {
      setOcupada(null)
    }
  }

  async function abrirEdicao(a: IgAutomacaoRow) {
    setErroForm(null)
    setEditor({ modo: 'carregando', id: a.id })
    try {
      const res = await fetch(`/api/instagram/automacoes/${a.id}`)
      const json = (await res.json()) as { automacao?: IgAutomacaoRow; passos?: IgPassoRow[] }
      if (json.automacao) {
        setEditor({ modo: 'editando', id: a.id, valor: rascunhoDaAutomacao(json.automacao, json.passos ?? []) })
      } else {
        avisar(a.id, TEXTOS_COCKPIT_IG.naoAbriu)
        setEditor({ modo: 'fechado' })
      }
    } catch {
      avisar(a.id, TEXTOS_REVISAO_IG.semConexao)
      setEditor({ modo: 'fechado' })
    }
  }

  if (!agentInstalled) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 28px 64px' }}>
        <EmptyState
          headline={tituloContratarCargo(cargoNome)}
          sub={textoContratarCargo(cargoNome)}
          action={<Link href="/loja"><Button variant="primary">{TEXTOS_COCKPIT_IG.irParaLoja}</Button></Link>}
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 28px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Instagram
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
              {TEXTOS_COCKPIT_IG.subtitulo}
            </p>
          </div>
          {agenteId && (
            
            
            
            
            <Link
              href={`/conversa?agent=${encodeURIComponent(agenteId)}`}
              style={{ fontSize: 12.5, color: 'var(--text-secondary)', textDecoration: 'underline', flexShrink: 0, alignSelf: 'flex-end', marginBottom: 8 }}
            >
              {rotuloFalarCom(cargoNome)}
            </Link>
          )}
          {canalConectado && editor.modo === 'fechado' && (
            <Button variant="primary" onClick={() => setEditor({ modo: 'nova' })}>{TEXTOS_COCKPIT_IG.novaAutomacao}</Button>
          )}
        </div>

        <ConexaoBanner canalConectado={canalConectado} canalHabilitado={canalHabilitado} diagnostico={diagnostico} />
      </header>

      {!canalConectado ? (
        <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
          <EmptyState
            headline={TEXTOS_COCKPIT_IG.semCanalTitulo}
            sub={TEXTOS_COCKPIT_IG.semCanalTexto}
            action={<Link href="/config"><Button variant="primary">{TEXTOS_COCKPIT_IG.abrirConfiguracoes}</Button></Link>}
          />
        </div>
      ) : (
        <>
          {editor.modo === 'carregando' && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>{TEXTOS_COCKPIT_IG.abrindoAutomacao}</p>
          )}

          {(editor.modo === 'nova' || editor.modo === 'editando') && (
            <EditorDeAutomacao
              key={editor.modo === 'editando' ? editor.id : 'nova'}
              valor={editor.modo === 'editando' ? editor.valor : rascunhoVazio()}
              intervaloHeartbeatS={intervaloHeartbeatS}
              editando={editor.modo === 'editando'}
              salvando={salvando}
              erro={erroForm}
              onCancelar={() => { setEditor({ modo: 'fechado' }); setErroForm(null) }}
              onSalvar={salvar}
            />
          )}

          {automacoes.length === 0 && editor.modo === 'fechado' ? (
            <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
              <EmptyState
                headline={TEXTOS_COCKPIT_IG.semAutomacaoTitulo}
                sub={TEXTOS_COCKPIT_IG.semAutomacaoTexto}
                action={<Button variant="primary" onClick={() => setEditor({ modo: 'nova' })}>{TEXTOS_COCKPIT_IG.criarPrimeira}</Button>}
              />
            </div>
          ) : (
            <ListaDeAutomacoes
              automacoes={automacoes}
              ehDono={ehDono}
              canalHabilitado={canalHabilitado}
              ocupada={ocupada}
              avisos={avisos}
              onAlternar={(a) => void alternar(a, 'rascunho')}
              onRevisar={(a) => void revisarAntesDeAtivar(a)}
              onEditar={(a) => void abrirEdicao(a)}
              onArquivar={(a) => void arquivar(a)}
              onVerHistorico={(a) => setHistorico({ id: a.id, nome: a.nome })}
            />
          )}
        </>
      )}

      <RevisaoAntesDeAtivar
        revisao={revisao}
        ocupada={revisao !== null && ocupada === revisao.id}
        onConfirmar={() => {
          const alvo = revisao && automacoes.find((x) => x.id === revisao.id)
          if (alvo && revisao) void alternar(alvo, 'ativa', revisao.baseadoEm)
        }}
        onCancelar={() => setRevisao(null)}
      />

      <ListaDeRuns
        automacaoId={historico?.id ?? null}
        automacaoNome={historico?.nome ?? ''}
        onFechar={() => setHistorico(null)}
      />
    </div>
  )
}


function ConexaoBanner({
  canalConectado, canalHabilitado, diagnostico,
}: {
  canalConectado: boolean
  canalHabilitado: boolean
  diagnostico: { titulo: string; passo: string }
}) {
  
  
  
  if (!canalConectado) return null

  const problema = !canalHabilitado || Boolean(diagnostico.passo)
  if (!problema) {
    
    
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--wave-from)' }} />
          {diagnostico.titulo}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {TEXTOS_CONEXAO_IG.validadeNaoConferivel}
        </span>
      </div>
    )
  }
  const mensagem = !canalHabilitado
    ? TEXTOS_COCKPIT_IG.canalDesligado
    : diagnostico.passo || diagnostico.titulo
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
        borderRadius: 'var(--radius-sm)', border: `1px solid rgb(${AMBAR_RGB} / 0.3)`,
        background: `rgb(${AMBAR_RGB} / 0.07)`,
      }}
    >
      <span aria-hidden style={{ fontSize: 12, color: AMBAR, flexShrink: 0 }}>⚠</span>
      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{mensagem}</span>
      <Link href="/config" style={{ marginLeft: 'auto', fontSize: 12.5, color: AMBAR, textDecoration: 'underline', flexShrink: 0 }}>
        {TEXTOS_COCKPIT_IG.abrirConfiguracoes}
      </Link>
    </div>
  )
}
