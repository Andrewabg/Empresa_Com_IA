'use client'


import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { validarAutomacao, LIMITES, type AutomacaoEntrada } from '@/lib/instagram/validarAutomacao'
import { enderecoDeMidiaConfiavel } from '@/lib/instagram/enderecoDeMidia'
import { avisoDeAtraso, GATILHO_INDISPONIVEL_LABEL, AVISO_GATILHO_INDISPONIVEL, SUFIXO_GATILHO_FORA_DE_USO } from '@/lib/instagram/copyGatilho'
import { TEXTOS_IMAGEM_PASSO } from '@/lib/instagram/copyImagemPasso'
import { TEXTOS_EDITOR_IG } from '@/lib/instagram/copyEditor'
import type { BotaoIg } from '@/lib/instagram/limitesDaMeta'
import { interpolar } from '@/lib/instagram/interpolar'
import type { ModoCasamento } from '@/lib/instagram/palavraChave'
import type { IgAutomacaoRow, IgGatilho, IgPassoRow } from '@/data/igAutomacoes'
import { EscolherPublicacao, type MidiaIg } from './EscolherPublicacao'


const novoIdPasso = () => crypto.randomUUID()

export interface PassoRascunho {
  id: string
  texto: string
  imagemPath: string | null
  botoes: BotaoIg[]
  atrasoS: number
}

export interface RascunhoAutomacao {
  nome: string
  gatilho: IgGatilho
  midiaId: string | null
  midiaPermalink: string | null
  midiaThumbUrl: string | null
  storyId: string
  palavras: string[]
  modoCasamento: ModoCasamento
  respostaPublica: boolean
  respostaPublicaTexto: string
  passos: PassoRascunho[]
}

export function rascunhoVazio(): RascunhoAutomacao {
  return {
    nome: '', gatilho: 'comentario', midiaId: null, midiaPermalink: null, midiaThumbUrl: null,
    storyId: '', palavras: [], modoCasamento: 'contem', respostaPublica: false, respostaPublicaTexto: '',
    passos: [{ id: novoIdPasso(), texto: '', imagemPath: null, botoes: [], atrasoS: 0 }],
  }
}

export function rascunhoDaAutomacao(a: IgAutomacaoRow, passos: IgPassoRow[]): RascunhoAutomacao {
  return {
    nome: a.nome, gatilho: a.gatilho, midiaId: a.midia_id,
    
    
    
    
    
    midiaPermalink: enderecoDeMidiaConfiavel(a.midia_permalink),
    midiaThumbUrl: enderecoDeMidiaConfiavel(a.midia_thumb_url),
    storyId: a.story_id ?? '', palavras: a.palavras,
    modoCasamento: a.modo_casamento, respostaPublica: a.resposta_publica,
    respostaPublicaTexto: a.resposta_publica_texto ?? '',
    passos: passos.length > 0
      ? passos.map((p) => ({ id: novoIdPasso(), texto: p.texto ?? '', imagemPath: p.imagem_path, botoes: p.botoes, atrasoS: p.atraso_s }))
      : [{ id: novoIdPasso(), texto: '', imagemPath: null, botoes: [], atrasoS: 0 }],
  }
}


export function paraEntrada(v: RascunhoAutomacao): AutomacaoEntrada {
  return {
    nome: v.nome, gatilho: v.gatilho, midiaId: v.midiaId, storyId: v.storyId || null,
    
    
    
    midiaPermalink: v.midiaPermalink, midiaThumbUrl: v.midiaThumbUrl,
    palavras: v.palavras, modoCasamento: v.modoCasamento,
    respostaPublica: v.respostaPublica, respostaPublicaTexto: v.respostaPublicaTexto,
    passos: v.passos.map((p) => ({ texto: p.texto, imagemPath: p.imagemPath, botoes: p.botoes, atrasoS: p.atrasoS })),
  }
}


const GATILHO_OPCOES: Array<{ valor: IgGatilho; label: string; ajuda: string }> = [
  { valor: 'comentario', label: TEXTOS_EDITOR_IG.gatilhoComentario, ajuda: TEXTOS_EDITOR_IG.gatilhoComentarioAjuda },
]

const MODO_OPCOES: Array<{ valor: ModoCasamento; label: string }> = [
  { valor: 'contem', label: TEXTOS_EDITOR_IG.modoContem },
  { valor: 'exata', label: TEXTOS_EDITOR_IG.modoExata },
  { valor: 'exata_normalizada', label: TEXTOS_EDITOR_IG.modoExataNormalizada },
]

const rotulo: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 7,
}

const campo: React.CSSProperties = {
  width: '100%', padding: '9px 11px', fontFamily: 'var(--font-ui)', fontSize: 13.5,
  color: 'var(--text-primary)', background: 'var(--surface)',
  border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
}

interface Props {
  valor: RascunhoAutomacao
  
  intervaloHeartbeatS: number
  editando: boolean
  salvando: boolean
  erro: string | null
  onCancelar: () => void
  onSalvar: (v: RascunhoAutomacao) => void
}

export function EditorDeAutomacao({ valor, intervaloHeartbeatS, editando, salvando, erro, onCancelar, onSalvar }: Props) {
  const [v, setV] = useState<RascunhoAutomacao>(valor)
  const [escolhendoPublicacao, setEscolhendoPublicacao] = useState(false)
  const [novaPalavra, setNovaPalavra] = useState('')
  
  
  
  const [passosEnviando, setPassosEnviando] = useState<Set<string>>(new Set())
  const set = <K extends keyof RascunhoAutomacao>(k: K, novo: RascunhoAutomacao[K]) => setV((old) => ({ ...old, [k]: novo }))

  const validacao = useMemo(() => validarAutomacao(paraEntrada(v)), [v])
  const podeSalvar = validacao.ok && !salvando && passosEnviando.size === 0
  
  
  const gatilhoConhecido = GATILHO_OPCOES.some((o) => o.valor === v.gatilho)

  const adicionarPalavra = () => {
    const p = novaPalavra.trim()
    if (!p) return
    if (v.palavras.some((x) => x.toLowerCase() === p.toLowerCase())) { setNovaPalavra(''); return }
    if (v.palavras.length >= LIMITES.palavras) return
    set('palavras', [...v.palavras, p])
    setNovaPalavra('')
  }

  
  
  
  
  const setPasso = (id: string, patch: Partial<PassoRascunho>) =>
    set('passos', v.passos.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (podeSalvar) onSalvar(v) }}
      style={{
        background: 'var(--surface-elevated)', border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 18,
      }}
    >
      <div>
        <label style={rotulo} htmlFor="ig-nome">{TEXTOS_EDITOR_IG.rotuloNome}</label>
        <input
          id="ig-nome" style={campo} value={v.nome} maxLength={LIMITES.nome}
          placeholder={TEXTOS_EDITOR_IG.exemploNome}
          onChange={(e) => set('nome', e.target.value)}
        />
      </div>

      <div>
        <label style={rotulo} htmlFor="ig-gatilho">{TEXTOS_EDITOR_IG.rotuloGatilho}</label>
        <select
          id="ig-gatilho" style={campo} value={v.gatilho}
          
          
          
          
          
          
          
          
          
          
          onChange={(e) => {
            const gatilho = e.target.value as IgGatilho
            
            
            
            
            setV((old) => ({
              ...old, gatilho,
              midiaId: gatilho === 'comentario' ? old.midiaId : null,
              midiaPermalink: gatilho === 'comentario' ? old.midiaPermalink : null,
              midiaThumbUrl: gatilho === 'comentario' ? old.midiaThumbUrl : null,
              storyId: gatilho === 'story' ? old.storyId : '',
              respostaPublica: gatilho === 'comentario' && old.respostaPublica,
            }))
          }}
        >
          {!gatilhoConhecido && (
            <option value={v.gatilho} disabled>
              {GATILHO_INDISPONIVEL_LABEL[v.gatilho] ?? v.gatilho}{SUFIXO_GATILHO_FORA_DE_USO}
            </option>
          )}
          {GATILHO_OPCOES.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
        </select>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
          {gatilhoConhecido ? GATILHO_OPCOES.find((o) => o.valor === v.gatilho)?.ajuda : AVISO_GATILHO_INDISPONIVEL}
        </p>
      </div>

      {v.gatilho === 'comentario' && (
        <div>
          <label style={rotulo}>Publicação</label>
          {v.midiaId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {enderecoDeMidiaConfiavel(v.midiaThumbUrl) && (
                // eslint-disable-next-line @next/next/no-img-element -- imagem remota da Meta
                
                
                
                
                
                
                
                
                <img
                  key={enderecoDeMidiaConfiavel(v.midiaThumbUrl)!}
                  src={enderecoDeMidiaConfiavel(v.midiaThumbUrl)!}
                  alt=""
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                  style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                />
              )}
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>Publicação escolhida</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEscolhendoPublicacao(true)}>Trocar</Button>
            </div>
          ) : (
            <Button type="button" size="sm" onClick={() => setEscolhendoPublicacao(true)}>Escolher publicação</Button>
          )}
        </div>
      )}

      {v.gatilho === 'story' && (
        <div>
          <label style={rotulo} htmlFor="ig-story">{TEXTOS_EDITOR_IG.rotuloStory}</label>
          <input
            id="ig-story" style={campo} value={v.storyId} maxLength={LIMITES.idDaMeta}
            placeholder={TEXTOS_EDITOR_IG.exemploStory}
            onChange={(e) => set('storyId', e.target.value)}
          />
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            {TEXTOS_EDITOR_IG.ajudaStory}
          </p>
        </div>
      )}

      <div>
        <label style={rotulo}>{TEXTOS_EDITOR_IG.rotuloPalavras}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: v.palavras.length > 0 ? 8 : 0 }}>
          {v.palavras.map((p) => (
            <span
              key={p}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px',
                background: 'var(--surface)', border: '1px solid var(--border-hairline)',
                borderRadius: 999, fontSize: 12, color: 'var(--text-secondary)',
              }}
            >
              {p}
              <button
                type="button" onClick={() => set('palavras', v.palavras.filter((x) => x !== p))}
                aria-label={`Remover ${p}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={campo} value={novaPalavra} maxLength={LIMITES.palavra}
            placeholder={TEXTOS_EDITOR_IG.exemploPalavra}
            onChange={(e) => setNovaPalavra(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); adicionarPalavra() } }}
          />
          <Button type="button" size="sm" onClick={adicionarPalavra}>{TEXTOS_EDITOR_IG.botaoAdicionarPalavra}</Button>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
          {v.gatilho === 'palavra_no_direct' ? TEXTOS_EDITOR_IG.ajudaSemPalavrasDireta : TEXTOS_EDITOR_IG.ajudaSemPalavras}
        </p>
      </div>

      <div>
        <label style={rotulo} htmlFor="ig-modo">Como a palavra é reconhecida</label>
        <select id="ig-modo" style={campo} value={v.modoCasamento} onChange={(e) => set('modoCasamento', e.target.value as ModoCasamento)}>
          {MODO_OPCOES.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
        </select>
      </div>

      {v.gatilho === 'comentario' && (
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={v.respostaPublica} onChange={(e) => set('respostaPublica', e.target.checked)} />
            Responder também em público, embaixo do comentário
          </label>
          {v.respostaPublica && (
            <textarea
              style={{ ...campo, marginTop: 8, minHeight: 60, resize: 'vertical' }}
              value={v.respostaPublicaTexto} maxLength={LIMITES.respostaPublica}
              placeholder={TEXTOS_EDITOR_IG.exemploRespostaPublica}
              onChange={(e) => set('respostaPublicaTexto', e.target.value)}
            />
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label style={rotulo}>{TEXTOS_EDITOR_IG.rotuloPassos}</label>
        {v.passos.length > 1 && (
          <p style={{ margin: '-6px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
            {TEXTOS_EDITOR_IG.avisoMaisDeUmaMensagem}
          </p>
        )}
        {v.passos.map((p, i) => (
          <PassoCard
            key={p.id}
            posicao={i + 1}
            passo={p}
            palavraExemplo={v.palavras[0] ?? 'oferta'}
            intervaloHeartbeatS={intervaloHeartbeatS}
            onMudar={(patch) => setPasso(p.id, patch)}
            onRemover={v.passos.length > 1 ? () => set('passos', v.passos.filter((x) => x.id !== p.id)) : undefined}
            onEnviandoMudou={(enviando) => setPassosEnviando((old) => {
              const novo = new Set(old)
              if (enviando) novo.add(p.id); else novo.delete(p.id)
              return novo
            })}
          />
        ))}
        {v.passos.length < LIMITES.passos && (
          <Button
            type="button" size="sm"
            onClick={() => set('passos', [...v.passos, { id: novoIdPasso(), texto: '', imagemPath: null, botoes: [], atrasoS: 0 }])}
          >
            Adicionar mensagem
          </Button>
        )}
      </div>

      {!validacao.ok && (v.nome || v.passos.some((p) => p.texto || p.imagemPath)) && (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>{validacao.erro}</p>
      )}

      {erro && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--reject)' }}>{erro}</p>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-hairline)', paddingTop: 14 }}>
        <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={!podeSalvar}>
          {salvando ? TEXTOS_EDITOR_IG.salvando : editando ? TEXTOS_EDITOR_IG.salvarMudancas : TEXTOS_EDITOR_IG.criarAutomacao}
        </Button>
      </div>

      <EscolherPublicacao
        open={escolhendoPublicacao}
        onOpenChange={setEscolhendoPublicacao}
        onEscolher={(m: MidiaIg) => setV((old) => ({ ...old, midiaId: m.id, midiaPermalink: m.permalink, midiaThumbUrl: m.thumbUrl }))}
      />
    </form>
  )
}

function PassoCard({
  posicao, passo, palavraExemplo, intervaloHeartbeatS, onMudar, onRemover, onEnviandoMudou,
}: {
  posicao: number
  passo: PassoRascunho
  palavraExemplo: string
  intervaloHeartbeatS: number
  onMudar: (patch: Partial<PassoRascunho>) => void
  onRemover?: () => void
  onEnviandoMudou: (enviando: boolean) => void
}) {
  const teto = passo.botoes.length > 0 ? LIMITES.textoPassoComBotoes : LIMITES.textoPasso
  const previa = passo.texto ? interpolar(passo.texto, { usuario: '@exemplo', palavra: palavraExemplo }) : ''
  const aviso = avisoDeAtraso(passo.atrasoS, intervaloHeartbeatS)

  return (
    <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>Mensagem {posicao}</span>
        {onRemover && (
          <Button type="button" size="sm" variant="ghost" onClick={onRemover} style={{ marginLeft: 'auto' }}>Remover</Button>
        )}
      </div>

      <textarea
        style={{ ...campo, minHeight: 64, resize: 'vertical', lineHeight: 1.55 }}
        value={passo.texto} maxLength={teto}
        placeholder={TEXTOS_EDITOR_IG.exemploTextoDoPasso}
        onChange={(e) => onMudar({ texto: e.target.value })}
      />
      {previa && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
          Como vai chegar: “{previa}”
        </p>
      )}

      <ImagemDoPasso
        posicao={posicao}
        imagemPath={passo.imagemPath}
        temTexto={passo.texto.trim().length > 0}
        onEscolher={(path) => onMudar({ imagemPath: path })}
        onRemover={() => onMudar({ imagemPath: null })}
        onEnviandoMudou={onEnviandoMudou}
      />

      <Botoes passo={passo} onMudar={onMudar} />

      <div style={{ maxWidth: 220 }}>
        <label style={rotulo} htmlFor={`ig-atraso-${posicao}`}>{TEXTOS_EDITOR_IG.rotuloEspera}</label>
        <input
          id={`ig-atraso-${posicao}`} type="number" min={0} max={LIMITES.atrasoS} style={campo}
          value={passo.atrasoS}
          onChange={(e) => onMudar({ atrasoS: Math.max(0, Math.min(LIMITES.atrasoS, Number(e.target.value) || 0)) })}
        />
        {aviso && <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-tertiary)' }}>{aviso}</p>}
      </div>
    </div>
  )
}


function ImagemDoPasso({
  posicao, imagemPath, temTexto, onEscolher, onRemover, onEnviandoMudou,
}: {
  posicao: number
  imagemPath: string | null
  temTexto: boolean
  onEscolher: (path: string) => void
  onRemover: () => void
  onEnviandoMudou: (enviando: boolean) => void
}) {
  const [enviando, setEnviando] = useState(false)
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const id = `ig-imagem-${posicao}`

  const subir = async (file: File) => {
    setErroLocal(null)
    setEnviando(true)
    onEnviandoMudou(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/instagram/passo-imagem', { method: 'POST', body: form })
      const corpo = await res.json().catch(() => ({}))
      if (!res.ok || typeof corpo.path !== 'string') {
        setErroLocal(typeof corpo.error === 'string' ? corpo.error : TEXTOS_IMAGEM_PASSO.erroGenerico)
        return
      }
      onEscolher(corpo.path)
    } catch {
      setErroLocal(TEXTOS_IMAGEM_PASSO.erroGenerico)
    } finally {
      setEnviando(false)
      onEnviandoMudou(false)
    }
  }

  return (
    <div>
      <label style={rotulo} htmlFor={id}>Imagem (opcional)</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input
          id={id} type="file" accept="image/jpeg,image/png" disabled={enviando}
          onChange={(e) => {
            const f = e.target.files?.[0]
            
            
            e.target.value = ''
            if (f) void subir(f)
          }}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />
        <label
          htmlFor={id}
          style={{
            padding: '5px 10px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)',
            color: enviando ? 'var(--text-tertiary)' : 'var(--text-secondary)',
            fontSize: 11.5, cursor: enviando ? 'not-allowed' : 'pointer', opacity: enviando ? 0.6 : 1,
          }}
        >
          {imagemPath ? TEXTOS_IMAGEM_PASSO.trocar : TEXTOS_IMAGEM_PASSO.anexar}
        </label>

        {enviando && (
          <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{TEXTOS_IMAGEM_PASSO.enviando}</span>
        )}

        {!enviando && imagemPath && (
          <>
            <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{TEXTOS_IMAGEM_PASSO.jaAnexada}</span>
            <Button type="button" size="sm" variant="ghost" onClick={onRemover}>{TEXTOS_IMAGEM_PASSO.remover}</Button>
          </>
        )}
      </div>

      {erroLocal && <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--reject)' }}>{erroLocal}</p>}

      {imagemPath && temTexto && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>
          {TEXTOS_IMAGEM_PASSO.avisoDuasMensagens}
        </p>
      )}
    </div>
  )
}

function Botoes({ passo, onMudar }: { passo: PassoRascunho; onMudar: (patch: Partial<PassoRascunho>) => void }) {
  const setBotao = (i: number, patch: Partial<BotaoIg>) =>
    onMudar({ botoes: passo.botoes.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {passo.botoes.map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            style={{ ...campo, flex: '0 0 40%' }} value={b.rotulo} placeholder={TEXTOS_EDITOR_IG.exemploRotuloBotao} maxLength={LIMITES.rotuloBotao}
            onChange={(e) => setBotao(i, { rotulo: e.target.value })}
          />
          <input
            style={{ ...campo, flex: 1 }} value={b.url} placeholder="https://…" maxLength={LIMITES.urlBotao}
            onChange={(e) => setBotao(i, { url: e.target.value })}
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => onMudar({ botoes: passo.botoes.filter((_, idx) => idx !== i) })}>
            Remover
          </Button>
        </div>
      ))}
      {passo.botoes.length < LIMITES.botoes && (
        <Button
          type="button" size="sm" variant="ghost"
          onClick={() => onMudar({ botoes: [...passo.botoes, { rotulo: '', url: '' }] })}
        >
          Adicionar botão
        </Button>
      )}
    </div>
  )
}
