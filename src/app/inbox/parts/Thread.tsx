'use client'



import { Fragment, useEffect, useRef, useState } from 'react'
import { Card } from '@/app/agentes/parts'
import { Markdown } from '@/components/markdown/Markdown'
import type { CanalRow } from '@/data/canais'
import { precisaJanela } from '@/lib/canais/janela'
import { janela24hDoProvider } from '@/lib/canais/capabilitiesPublicas'
import { agenteDaConversa } from '@/lib/canais/agenteDaConversa'
import { autorDaBolha, ehEnvioDeAutomacao, AUTOR_AGENTE_DESCONHECIDO } from '@/lib/canais/autoriaDaBolha'
import { ehMidiaComoImagem } from '@/lib/canais/midiaComoImagem'
import { formatarCarimboMensagem, formatarTituloCarimbo, mudouDeDia, rotuloDoDia } from '@/lib/canais/carimboMensagem'
import { KIND_TRANSFERENCIA } from '@/lib/canais/roteamento'
import { KIND_SEM_RESPOSTA } from '@/lib/canais/semResposta'
import type { AcaoResultado, AgenteRef, ConversaInbox, MensagemInbox } from '../InboxClient'
import { AVISO_NAO_FECHADA } from '@/lib/inbox/copyExcluirConversa'


function carimboDaMensagem(m: MensagemInbox): string {
  return m.origem_em ?? m.created_at
}







const AVISOS: Record<string, string> = {
  janela_expirada: 'Janela de 24h expirou — não dá mais pra responder de graça.',
  bad_request: 'Não foi possível concluir — recarrega a página e tenta de novo.',
  erro: 'Não foi possível concluir — tenta de novo.',
  nao_fechada: AVISO_NAO_FECHADA,
}

export function textoAviso(reason?: string): string {
  return AVISOS[reason ?? 'erro'] ?? AVISOS.erro
}

const MIDIA_PLACEHOLDER: Record<string, string> = {
  image: '[imagem]',
  audio: '[áudio]',
  video: '[vídeo]',
  document: '[documento]',
  sticker: '[figurinha]',
  location: '[localização]',
  contacts: '[contato]',
  interactive: '[interativo]',
}

const MIDIA_ICONE: Record<string, string> = {
  video: '🎬', document: '📄', sticker: '🌟', image: '🖼️', audio: '🎧',
}



const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  cursor: 'pointer',
  background: 'linear-gradient(90deg, var(--wave-from), var(--wave-to))',
  color: '#0A0B0D',
  fontSize: 12.5,
  fontWeight: 600,
}

const btnGhost: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  border: '1px solid var(--border-hairline)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 12.5,
}

const avisoStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--reject)',
}



function Ticks({ status }: { status: MensagemInbox['status'] }) {
  if (status === 'falhou') {
    return <span style={{ fontSize: 10.5, color: 'var(--reject)' }}>não foi entregue</span>
  }
  if (status === 'enviada') {
    return <span aria-label="enviada" style={{ fontSize: 11, color: 'var(--text-tertiary)', opacity: 0.8 }}>✓</span>
  }
  if (status === 'entregue') {
    return <span aria-label="entregue" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>✓✓</span>
  }
  if (status === 'lida') {
    
    return (
      <span
        aria-label="lida"
        style={{
          fontSize: 11,
          background: 'linear-gradient(90deg, var(--wave-from), var(--wave-to))',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        ✓✓
      </span>
    )
  }
  return null
}



type ErroState = 'idle' | 'enviando' | 'ok' | 'erro'

function BotaoErro({ mensagemId }: { mensagemId: string }) {
  const [estado, setEstado] = useState<ErroState>('idle')

  async function marcar() {
    if (estado !== 'idle') return
    setEstado('enviando')
    try {
      const res = await fetch('/api/inbox/erro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagemId }),
      })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean }
      setEstado(j.ok ? 'ok' : 'erro')
    } catch {
      setEstado('erro')
    }
  }

  if (estado === 'ok') {
    return (
      <span
        style={{
          fontSize: 11,
          color: 'var(--text-tertiary)',
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        marcado — vai pra Sala de Treino
      </span>
    )
  }

  return (
    <button
      type="button"
      title="Marcar como erro — vai pra Sala de Treino"
      disabled={estado === 'enviando'}
      onClick={() => void marcar()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)',
        background: 'transparent',
        color: estado === 'erro' ? 'var(--color-reject, var(--reject))' : 'var(--text-tertiary)',
        fontSize: 11,
        cursor: estado === 'enviando' ? 'wait' : 'pointer',
        opacity: estado === 'enviando' ? 0.5 : 1,
        transition: 'opacity 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {estado === 'erro' ? '⚠ erro ao marcar' : '👎 marcar erro'}
    </button>
  )
}





function ehMarcaDoSistema(m: MensagemInbox): boolean {
  return m.midia?.kind === KIND_TRANSFERENCIA || m.midia?.kind === KIND_SEM_RESPOSTA
}

function MarcaDoSistema({ texto }: { texto: string }) {
  return (
    <div
      role="separator"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'stretch',
        margin: '2px 0',
      }}
    >
      <span style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
      <span
        style={{
          fontSize: 11, lineHeight: 1.4, color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-ui)', textAlign: 'center', maxWidth: '72%',
        }}
      >
        {}
        {}
        {texto.replace(/^\[|\]$/g, '')}
      </span>
      <span style={{ flex: 1, height: 1, background: 'var(--border-hairline)' }} />
    </div>
  )
}




function SeparadorDeDia({ texto }: { texto: string }) {
  return (
    <div role="separator" style={{ display: 'flex', justifyContent: 'center', margin: '2px 0' }}>
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: 'var(--text-tertiary)',
          padding: '3px 11px',
          borderRadius: 999,
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface)',
        }}
      >
        {texto}
      </span>
    </div>
  )
}




function MidiaImagem({ src, alt }: { src: string; alt: string }) {
  const [aberta, setAberta] = useState(false)
  
  
  
  const miniaturaRef = useRef<HTMLButtonElement>(null)
  const fecharRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberta) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberta(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberta])

  useEffect(() => {
    if (!aberta) return
    fecharRef.current?.focus()
    return () => miniaturaRef.current?.focus()
  }, [aberta])

  return (
    <>
      <button
        ref={miniaturaRef}
        type="button"
        onClick={() => setAberta(true)}
        title="Abrir em tela cheia"
        style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'zoom-in', display: 'block', maxWidth: '100%' }}
      >
        {}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          style={{ maxWidth: '100%', maxHeight: 260, borderRadius: 'var(--radius-md)', display: 'block' }}
        />
      </button>
      {aberta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setAberta(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: 32,
            background: 'rgba(4, 6, 10, 0.86)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '82vh',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
              cursor: 'default',
            }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <a
              href={src}
              download
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 999,
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface)',
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
              }}
            >
              baixar
            </a>
            <button
              ref={fecharRef}
              type="button"
              onClick={() => setAberta(false)}
              aria-label="Fechar"
              style={{
                width: 30,
                height: 30,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 15,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}



function Bolha({ msg, autorNome, agoraMs }: { msg: MensagemInbox; autorNome: string; agoraMs: number }) {
  const doContato = msg.direcao === 'in'
  const carimbo = formatarCarimboMensagem(carimboDaMensagem(msg), agoraMs)
  
  
  const tituloCarimbo = formatarTituloCarimbo(carimboDaMensagem(msg))

  
  
  const interpretacao = msg.midia?.transcricao ?? msg.midia?.descricao ?? null

  
  let opcoesNode: React.ReactNode = null
  let midiaNode: React.ReactNode = null
  
  
  if (msg.midia && !ehEnvioDeAutomacao(msg.midia)) {
    if (ehMidiaComoImagem(msg.midia.kind) && msg.midiaUrl) {
      
      
      midiaNode = (
        <MidiaImagem
          src={msg.midiaUrl}
          
          
          
          
          alt={
            msg.midia.kind === 'sticker'
              ? (msg.direcao === 'out' ? 'Figurinha enviada' : 'Figurinha recebida')
              : (msg.direcao === 'out' ? 'Imagem enviada' : 'Imagem recebida')
          }
        />
      )
    } else if (msg.midia.kind === 'audio' && msg.midiaUrl) {
      midiaNode = <audio controls src={msg.midiaUrl} style={{ width: '100%', minWidth: 220, maxWidth: 300 }} />
    } else if (msg.midia.kind === 'video' && msg.midiaUrl) {
      midiaNode = (
        <video
          controls
          src={msg.midiaUrl}
          style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 'var(--radius-md)', display: 'block' }}
        />
      )
    } else if (msg.midia.kind === 'location' && typeof msg.midia.dados?.latitude === 'number') {
      
      const { latitude: lat, longitude: lon } = msg.midia.dados as { latitude: number; longitude: number }
      midiaNode = (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}
        >
          <span aria-hidden>📍</span>
          {String(msg.midia.dados?.nome ?? msg.midia.dados?.endereco ?? `${lat}, ${lon}`)}
          <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>abrir no mapa</span>
        </a>
      )
    } else if (msg.midia.media_id && !msg.midia.transcricao && !msg.midia.descricao && msg.midia.ingestao !== 'falhou' && msg.midia.ingestao !== 'ok') {
      
      midiaNode = (
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          {MIDIA_PLACEHOLDER[msg.midia.kind] ?? `[${msg.midia.kind}]`} · lendo…
        </span>
      )
    } else if (msg.midia.kind === 'interativo' && msg.direcao === 'out') {
      
      
      const dados = msg.midia.dados as { botoes?: Array<{ titulo: string }>; secoes?: Array<{ linhas?: Array<{ titulo: string }> }> } | undefined
      const rotulos = dados?.botoes?.map((b) => b.titulo)
        ?? (dados?.secoes ?? []).flatMap((s) => (s.linhas ?? []).map((l) => l.titulo))
      opcoesNode = (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          {rotulos.map((t, i) => (
            <span
              key={`${t}-${i}`}
              style={{
                padding: '3px 10px', borderRadius: 999,
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface-elevated)',
                fontSize: 11.5, color: 'var(--text-secondary)',
              }}
            >
              {msg.midia?.como_texto ? `${i + 1}. ${t}` : t}
            </span>
          ))}
          {msg.midia.como_texto && (
            <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>· foi como lista numerada</span>
          )}
        </span>
      )
    } else if (msg.midia.texto_estruturado) {
      
      midiaNode = (
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          {msg.midia.texto_estruturado}
        </span>
      )
    } else if (msg.midiaUrl) {
      
      
      midiaNode = (
        <a
          href={msg.midiaUrl}
          download
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: 999,
            border: '1px solid var(--border-hairline)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            width: 'fit-content',
          }}
        >
          <span aria-hidden>{MIDIA_ICONE[msg.midia.kind] ?? '📎'}</span>
          {}
          {msg.midia.rotulo || MIDIA_PLACEHOLDER[msg.midia.kind] || `[${msg.midia.kind}]`}
          <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>baixar</span>
        </a>
      )
    } else {
      
      midiaNode = (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 9px',
            borderRadius: 999,
            border: '1px solid var(--border-hairline)',
            fontSize: 11.5,
            color: 'var(--text-tertiary)',
            width: 'fit-content',
          }}
        >
          {msg.midia.rotulo || MIDIA_PLACEHOLDER[msg.midia.kind] || `[${msg.midia.kind}]`}
        </span>
      )
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: doContato ? 'flex-start' : 'flex-end',
        maxWidth: '100%',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          marginBottom: 3,
          fontSize: 10.5,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {autorNome}
      </span>
      <div
        style={{
          maxWidth: '82%',
          padding: '9px 13px',
          borderRadius: 'var(--radius-lg)',
          borderTopLeftRadius: doContato ? 'var(--radius-sm)' : 'var(--radius-lg)',
          borderTopRightRadius: doContato ? 'var(--radius-lg)' : 'var(--radius-sm)',
          background: doContato ? 'var(--surface)' : 'var(--surface-elevated)',
          border: '1px solid var(--border-hairline)',
          fontSize: 13.5,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          color: doContato ? 'var(--text-secondary)' : 'var(--text-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {}
        {!opcoesNode && midiaNode}
        {}
        {interpretacao && (
          <span style={{ fontSize: 12.5, lineHeight: 1.5, fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
            {interpretacao}
          </span>
        )}
        {}
        {msg.texto && (doContato ? <span>{msg.texto}</span> : <Markdown chat>{msg.texto}</Markdown>)}
        {opcoesNode}
      </div>
      {}
      {(carimbo || !doContato) && (
        <span style={{ marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {carimbo && (
            <span
              title={tituloCarimbo || undefined}
              style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}
            >
              {carimbo}
            </span>
          )}
          {!doContato && <Ticks status={msg.status} />}
          {}
          {!doContato && msg.autor === 'agente' && (
            <span className="bolha-erro-btn">
              <BotaoErro mensagemId={msg.id} />
            </span>
          )}
        </span>
      )}
      {}
      {msg.sandbox_ignorada && (
        <span
          style={{
            marginTop: 4,
            maxWidth: '82%',
            fontSize: 11.5,
            lineHeight: 1.45,
            color: 'var(--text-tertiary)',
            textAlign: 'left',
          }}
        >
          ⚠ O agente não respondeu: modo teste ligado e este número não está na lista.
        </span>
      )}
      {}
      {msg.status === 'falhou' && msg.erro && (
        <span
          style={{
            marginTop: 4,
            maxWidth: '82%',
            fontSize: 11.5,
            lineHeight: 1.45,
            color: 'var(--color-reject, var(--reject))',
            textAlign: doContato ? 'left' : 'right',
          }}
        >
          {msg.erro}
        </span>
      )}
    </div>
  )
}



function RascunhoCard({
  rascunho,
  onAprovar,
  onDescartar,
}: {
  rascunho: MensagemInbox
  onAprovar: (mensagemId: string, texto: string) => Promise<AcaoResultado>
  onDescartar: (mensagemId: string) => Promise<AcaoResultado>
}) {
  const [texto, setTexto] = useState(rascunho.texto)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aprovar() {
    if (enviando || !texto.trim()) return
    setEnviando(true)
    setAviso(null)
    const res = await onAprovar(rascunho.id, texto)
    setEnviando(false)
    
    
    
    if (!res.ok) setAviso(res.detalhe ?? textoAviso(res.reason))
    else if (res.aviso) setAviso(res.aviso)
  }

  async function descartar() {
    if (enviando) return
    setEnviando(true)
    setAviso(null)
    const res = await onDescartar(rascunho.id)
    setEnviando(false)
    if (!res.ok) setAviso(res.detalhe ?? textoAviso(res.reason))
  }

  
  
  const anexoProposto = rascunho.midia?.slug
    ? { rotulo: rascunho.midia.rotulo || rascunho.midia.slug, kind: rascunho.midia.kind, url: rascunho.midiaUrl }
    : null

  
  
  
  
  
  
  
  
  const opcoesPropostas = (() => {
    const ehSoDelas = rascunho.midia?.kind === 'interativo'
    const d = (ehSoDelas ? rascunho.midia?.dados : rascunho.midia?.opcoes) as
      | { corpo?: string; botoes?: Array<{ titulo: string }>; secoes?: Array<{ linhas?: Array<{ titulo: string }> }> }
      | undefined
    if (!d) return null
    const rotulos = d.botoes?.map((b) => b.titulo)
      ?? (d.secoes ?? []).flatMap((s) => (s.linhas ?? []).map((l) => l.titulo))
    if (!rotulos.length) return null
    const corpo = !ehSoDelas && typeof d.corpo === 'string' ? d.corpo.trim() : ''
    return { rotulos, corpo }
  })()

  return (
    <div
      style={{
        flex: '0 0 auto',
        padding: '11px 13px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgb(214 158 46 / 0.45)',
        background: 'rgb(214 158 46 / 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgb(214 158 46)',
        }}
      >
        Rascunho do agente — aguardando sua aprovação
      </span>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        aria-label="Texto do rascunho"
        style={{
          width: '100%',
          resize: 'vertical',
          padding: '8px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-hairline)',
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          fontSize: 13,
          lineHeight: 1.5,
          fontFamily: 'inherit',
        }}
      />
      {anexoProposto && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px',
            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)',
            background: 'var(--surface)',
          }}
        >
          {anexoProposto.kind === 'image' && anexoProposto.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={anexoProposto.url}
              alt={anexoProposto.rotulo}
              style={{ width: 34, height: 34, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
            />
          ) : (
            <span aria-hidden style={{ fontSize: 16, flexShrink: 0 }}>
              {MIDIA_ICONE[anexoProposto.kind] ?? '📎'}
            </span>
          )}
          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            vai junto: <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{anexoProposto.rotulo}</strong>
          </span>
          {anexoProposto.url && (
            <a
              href={anexoProposto.url}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-tertiary)', textDecoration: 'none', flexShrink: 0 }}
            >
              conferir →
            </a>
          )}
        </div>
      )}
      {opcoesPropostas?.corpo && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <span style={{ color: 'var(--text-tertiary)' }}>e depois, numa mensagem própria: </span>
          {opcoesPropostas.corpo}
        </p>
      )}
      {opcoesPropostas && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>o cliente vai poder clicar:</span>
          {opcoesPropostas.rotulos.map((t, i) => (
            <span
              key={`${t}-${i}`}
              style={{
                padding: '3px 10px', borderRadius: 999,
                border: '1px solid var(--border-hairline)',
                background: 'var(--surface)',
                fontSize: 11.5, color: 'var(--text-secondary)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {aviso && <p style={avisoStyle}>{aviso}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={{ ...btnGhost, opacity: enviando ? 0.6 : 1 }} disabled={enviando} onClick={() => void descartar()}>
          Descartar
        </button>
        <button
          type="button"
          style={{ ...btnPrimary, opacity: enviando || !texto.trim() ? 0.6 : 1 }}
          disabled={enviando || !texto.trim()}
          onClick={() => void aprovar()}
        >
          {enviando ? 'Enviando…' : 'Aprovar e enviar'}
        </button>
      </div>
    </div>
  )
}




type AnexoState =
  | { fase: 'subindo'; nome: string }
  | { fase: 'pronto'; nome: string; storagePath: string; aviso?: string }
  | { fase: 'erro'; nome: string; motivo: string }

function Composer({
  conversaId,
  onEnviar,
}: {
  conversaId: string
  onEnviar: (texto: string, storagePath?: string) => Promise<AcaoResultado>
}) {
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [anexo, setAnexo] = useState<AnexoState | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const pronto = anexo?.fase === 'pronto'
  const podeEnviar = (texto.trim().length > 0 || pronto) && anexo?.fase !== 'subindo'

  async function subirAnexo(file: File) {
    setAviso(null)
    setAnexo({ fase: 'subindo', nome: file.name })
    try {
      const fd = new FormData()
      fd.append('conversaId', conversaId)
      fd.append('file', file)
      const res = await fetch('/api/inbox/anexo', { method: 'POST', body: fd })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; storagePath?: string; detalhe?: string; reason?: string; aviso?: string }
      if (j.ok && j.storagePath) setAnexo({ fase: 'pronto', nome: file.name, storagePath: j.storagePath, ...(j.aviso ? { aviso: j.aviso } : {}) })
      else setAnexo({ fase: 'erro', nome: file.name, motivo: j.detalhe ?? textoAviso(j.reason) })
    } catch {
      setAnexo({ fase: 'erro', nome: file.name, motivo: 'Não consegui subir o arquivo.' })
    }
  }

  async function enviar() {
    if (!podeEnviar || enviando) return
    setEnviando(true)
    setAviso(null)
    const res = await onEnviar(texto.trim(), pronto ? anexo.storagePath : undefined)
    setEnviando(false)
    if (res.ok) {
      setTexto('')
      setAnexo(null)
      if (fileRef.current) fileRef.current.value = ''
    } else {
      
      setAviso(res.detalhe ?? textoAviso(res.reason))
    }
  }

  return (
    <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {aviso && <p style={avisoStyle}>{aviso}</p>}
      {anexo && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)', background: 'var(--surface)',
            fontSize: 12, color: 'var(--text-secondary)',
          }}
        >
          <span aria-hidden>📎</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {anexo.nome}
          </span>
          <span style={{ color: anexo.fase === 'erro' ? 'var(--reject)' : 'var(--text-tertiary)', fontSize: 11 }}>
            {anexo.fase === 'subindo'
              ? 'subindo…'
              : anexo.fase === 'pronto'
                ? (anexo.aviso ?? 'pronto')
                : anexo.motivo}
          </span>
          <button
            type="button"
            onClick={() => { setAnexo(null); if (fileRef.current) fileRef.current.value = '' }}
            style={{ ...btnGhost, padding: '2px 8px', fontSize: 11 }}
          >
            remover
          </button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void subirAnexo(f) }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          title="Anexar arquivo"
          aria-label="Anexar arquivo"
          onClick={() => fileRef.current?.click()}
          style={{ ...btnGhost, padding: '6px 10px' }}
        >
          📎
        </button>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void enviar()
            }
          }}
          placeholder={pronto ? 'Legenda (opcional)…' : 'Responder como você…'}
          aria-label="Responder como você"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '8px 11px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            background: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
            fontSize: 13,
          }}
        />
        <button
          type="button"
          style={{ ...btnPrimary, opacity: enviando || !podeEnviar ? 0.6 : 1 }}
          disabled={enviando || !podeEnviar}
          onClick={() => void enviar()}
        >
          {enviando ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}



export function Thread({
  conversa,
  canal,
  agentes,
  mensagens,
  carregando,
  onAprovar,
  onDescartar,
  onEnviar,
}: {
  conversa: ConversaInbox | null
  canal: CanalRow | undefined
  agentes: AgenteRef[]
  mensagens: MensagemInbox[]
  carregando: boolean
  onAprovar: (mensagemId: string, texto: string) => Promise<AcaoResultado>
  onDescartar: (mensagemId: string) => Promise<AcaoResultado>
  onEnviar: (texto: string) => Promise<AcaoResultado>
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  
  const pertoDoFimRef = useRef(true)
  const conversaAnteriorRef = useRef<string | null>(null)

  
  
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const trocouConversa = conversaAnteriorRef.current !== (conversa?.id ?? null)
    conversaAnteriorRef.current = conversa?.id ?? null
    if (trocouConversa || pertoDoFimRef.current) {
      el.scrollTop = el.scrollHeight
      pertoDoFimRef.current = true
    }
  }, [mensagens, conversa?.id])

  if (!conversa) {
    return (
      <Card label="Conversa">
        <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--text-tertiary)' }}>
          Selecione uma conversa à esquerda pra ver as mensagens aqui.
        </p>
      </Card>
    )
  }

  const nome = conversa.contato?.nome?.trim() || conversa.contato?.external_id || 'Contato'
  
  
  const agenteDono = canal
    ? agentes.find((a) => a.id === agenteDaConversa(conversa.agent_id, canal.agent_id))
    : undefined

  
  const rascunho = [...mensagens].reverse().find((m) => m.status === 'rascunho') ?? null
  
  
  
  
  const visiveis = mensagens.filter(
    (m) => ehMarcaDoSistema(m) || (m.status !== 'rascunho' && m.status !== 'descartada'),
  )

  
  
  
  
  const agentePorMsg = new Map<string, string>()
  {
    let atual = canal ? agenteDaConversa(conversa.agent_id, canal.agent_id) : ''
    for (let i = visiveis.length - 1; i >= 0; i--) {
      const m = visiveis[i]
      if (m.midia?.kind === KIND_TRANSFERENCIA) {
        const de = (m.midia.dados as { de?: unknown } | undefined)?.de
        if (typeof de === 'string' && de) atual = de 
        continue
      }
      agentePorMsg.set(m.id, atual)
    }
  }

  
  
  
  
  
  
  const nomePorAgente = new Map(agentes.map((a) => [a.id, a.name]))
  const autorNome = (m: MensagemInbox) =>
    autorDaBolha(m, {
      contato: nome,
      agente: nomePorAgente.get(agentePorMsg.get(m.id) ?? '')
        ?? agenteDono?.name
        ?? AUTOR_AGENTE_DESCONHECIDO,
    })

  
  const janelaFechada = canal
    ? precisaJanela(janela24hDoProvider(canal.provider), conversa.ultima_msg_in_at, new Date().toISOString())
    : false

  
  
  const agoraMs = Date.now()

  return (
    <Card label={nome} hint={canal ? `${canal.rotulo} · WhatsApp` : 'WhatsApp'} bodyScroll={false}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 10 }}>
        <div
          ref={scrollRef}
          className="cc-scroll"
          onScroll={(e) => {
            const el = e.currentTarget
            pertoDoFimRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
          }}
          style={{
            flex: '1 1 0',
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '4px 2px',
          }}
        >
          {carregando && visiveis.length === 0 ? (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
              Carregando conversa…
            </p>
          ) : visiveis.length === 0 ? (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
              Sem mensagens ainda.
            </p>
          ) : (
            visiveis.map((m, i) => {
              const carimboAtual = carimboDaMensagem(m)
              
              
              
              const precisaSeparador = i === 0 || mudouDeDia(carimboDaMensagem(visiveis[i - 1]), carimboAtual)
              const rotuloSeparador = precisaSeparador ? rotuloDoDia(carimboAtual, agoraMs) : ''
              return (
                <Fragment key={m.id}>
                  {rotuloSeparador && <SeparadorDeDia texto={rotuloSeparador} />}
                  {ehMarcaDoSistema(m)
                    ? <MarcaDoSistema texto={m.texto} />
                    : <Bolha msg={m} autorNome={autorNome(m)} agoraMs={agoraMs} />}
                </Fragment>
              )
            })
          )}
        </div>

        {}
        {janelaFechada && (
          <div
            style={{
              marginTop: 10,
              padding: '10px 13px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface)',
              fontSize: 12.5,
              lineHeight: 1.5,
              color: 'var(--text-tertiary)',
            }}
          >
            Passaram mais de 24h desde a última mensagem deste cliente. O WhatsApp não
            permite mensagem livre agora, então o agente não vai responder sozinho.
          </div>
        )}

        {}
        {rascunho && !janelaFechada && (
          <RascunhoCard key={rascunho.id} rascunho={rascunho} onAprovar={onAprovar} onDescartar={onDescartar} />
        )}

        {}
        {conversa.status === 'assumida' && !janelaFechada && (
          <Composer conversaId={conversa.id} onEnviar={onEnviar} />
        )}
      </div>
    </Card>
  )
}
