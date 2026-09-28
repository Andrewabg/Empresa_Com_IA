'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { statusHumanoDaTarefa } from '@/lib/agentes/fichaHumana'
import { VOZES, TIMBRES, vozInfo, VOZ_NAO_FALA, escolhaDeVoz, valorDoSelect, descricaoDaVozGuardada, MSG_SALVO_COM_VOZ, MSG_SALVO_SEM_VOZ, type EscolhaDeVoz } from '@/lib/voicePalette'
import { ToolsCustomCard, type ToolCustomMeta } from './ToolsCustomCard'
import type { Agent, AprendizadoUI, DiretrizUI, SaveState, TarefaUI } from './types'

const eyebrow: CSSProperties = {
  margin: 0, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.16em',
  textTransform: 'uppercase', color: 'var(--text-tertiary)',
}
const secLabel: CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.09em',
  textTransform: 'uppercase', color: 'var(--text-secondary)',
}
const countBadge: CSSProperties = {
  fontSize: 10.5, fontWeight: 600, lineHeight: 1.5, color: 'var(--text-primary)',
  background: 'color-mix(in srgb, var(--wave-to) 15%, transparent)',
  border: '1px solid color-mix(in srgb, var(--wave-to) 28%, transparent)',
  borderRadius: 999, padding: '0 7px',
}
const pill: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', fontSize: 11.5, fontWeight: 500, lineHeight: 1.4,
  color: 'var(--text-secondary)', background: 'var(--surface-elevated)',
  border: '1px solid var(--border-hairline)', borderRadius: 99, padding: '4px 11px', whiteSpace: 'nowrap',
}
const emptyText: CSSProperties = { margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.55 }


function Divisor() {
  return <div aria-hidden style={{ height: 1, background: 'var(--border-hairline)', flex: '0 0 auto' }} />
}


function Secao({ label, count, children }: { label: string; count?: number; children: ReactNode }) {
  return (
    <section style={{ flex: '0 0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
        <span style={secLabel}>{label}</span>
        {count !== undefined && count > 0 && <span style={countBadge}>{count}</span>}
      </div>
      {children}
    </section>
  )
}


export function FichaDetalhes(props: {
  agent: Agent
  
  nomeSave: SaveState
  onRenomear: (nome: string) => void
  
  isCanal: boolean
  
  treinoHref: string | null
  descricao: string | null
  tarefas: TarefaUI[]
  skillNames: string[]
  
  directives: DiretrizUI[]
  dirState: 'loading' | 'loaded' | 'error'
  dirSave: SaveState
  newDirective: string
  onNewDirective: (v: string) => void
  onAddCombinado: () => void
  onRemoveCombinado: (i: number) => void
  
  managerOptions: { id: string; name: string; role: string }[]
  managerSave: SaveState
  onManager: (id: string) => void
  
  vozSave: SaveState
  onVoz: (escolha: EscolhaDeVoz) => void
  
  learnings: AprendizadoUI[]
  
  customTools: ToolCustomMeta[]
  
  onCustomToolsSaved: (agentId: string, ids: string[]) => void
}) {
  const { agent, descricao, tarefas, skillNames } = props
  const combinados = props.directives
  const loaded = props.dirState === 'loaded'
  const combinarDisabled = props.dirSave.kind === 'saving' || !props.newDirective.trim()

  
  
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(agent.name)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    setEditando(false)
    setRascunho(agent.name)
  }, [agent.id, agent.name])
  useEffect(() => {
    if (editando) inputRef.current?.select()
  }, [editando])

  function confirmarNome() {
    if (!editando) return
    const limpo = rascunho.trim()
    setEditando(false)
    if (!limpo || limpo === agent.name) { setRascunho(agent.name); return } 
    props.onRenomear(limpo)
  }
  function cancelarNome() {
    setRascunho(agent.name)
    setEditando(false)
  }

  return (
    <div
      className="cc-scroll palco-ficha"
      style={{
        minHeight: 0,
        overflowY: 'auto',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: 'clamp(22px, 2.2vw, 34px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        justifyContent: 'safe center',
      }}
    >
      {}
      <div style={{ flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <p style={eyebrow}>
            Ficha de{' '}
            {props.isCanal ? (
              
              <span style={{ color: 'var(--text-primary)' }}>{agent.name}</span>
            ) : editando ? (
              <input
                ref={inputRef}
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onBlur={confirmarNome}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); confirmarNome() }
                  else if (e.key === 'Escape') { e.preventDefault(); cancelarNome() }
                }}
                maxLength={120}
                aria-label={`Nome de ${agent.name}`}
                style={{
                  font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit',
                  color: 'var(--text-primary)', background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
                  padding: '1px 6px', outline: 'none', minWidth: 80, width: `${Math.max(rascunho.length + 1, 6)}ch`,
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => { setRascunho(agent.name); setEditando(true) }}
                title="Renomear"
                aria-label={`Renomear ${agent.name}`}
                style={{
                  font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: 'inherit',
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}
              >
                {agent.name}
                <span aria-hidden style={{ fontSize: 10, color: 'var(--text-tertiary)', opacity: 0.7 }}>✎</span>
              </button>
            )}
          </p>
          {props.nomeSave.kind === 'saving' && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>salvando…</span>}
          {props.nomeSave.kind === 'saved' && <span style={{ fontSize: 11, color: 'var(--approve)' }}>✓ salvo</span>}
          {props.nomeSave.kind === 'error' && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{props.nomeSave.text}</span>}
        </div>
        {descricao && (
          <div style={{ position: 'relative', paddingLeft: 15, marginTop: 12 }}>
            <span
              aria-hidden
              style={{
                position: 'absolute', left: 0, top: 3, bottom: 3, width: 3, borderRadius: 3,
                background: 'linear-gradient(180deg, var(--wave-from), var(--wave-to))',
              }}
            />
            <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 'clamp(15px, 1.3vw, 17.5px)', lineHeight: 1.6, color: '#C8CBD2' }}>
              {descricao}
            </p>
          </div>
        )}
      </div>

      {}
      {props.isCanal && props.treinoHref && (
        <Link
          href={props.treinoHref}
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            width: '100%',
            textAlign: 'left',
            textDecoration: 'none',
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgb(40 224 200 / 0.32)',
            background: 'linear-gradient(120deg, color-mix(in srgb, var(--wave-from) 12%, transparent), color-mix(in srgb, var(--wave-to) 12%, transparent))',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Editar e testar no Treino</span>
            <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--text-tertiary)' }}>
              Edite com segurança, teste no simulador e publique. A produção só muda ao publicar.
            </span>
          </span>
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              fontSize: 16,
              lineHeight: 1,
              backgroundImage: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            →
          </span>
        </Link>
      )}

      <Divisor />

      {}
      <Secao label="Trabalhando agora" count={tarefas.length}>
        {tarefas.length === 0 ? (
          <p style={emptyText}>Nada em andamento — converse ou delegue algo.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {tarefas.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5, color: 'var(--text-secondary)' }}>
                  {t.objetivo}
                </span>
                <span style={pill}>{statusHumanoDaTarefa(t.status)}</span>
              </div>
            ))}
          </div>
        )}
      </Secao>

      {}
      {!agent.is_primary && props.managerOptions.length > 0 && (
        <>
          <Divisor />
          <Secao label="Responde a">
            <select
              aria-label={`Gerente de ${agent.name}`}
              value={agent.manager_id ?? ''}
              onChange={(e) => props.onManager(e.target.value)}
              disabled={props.managerSave.kind === 'saving'}
              style={{
                width: '100%', boxSizing: 'border-box', background: 'var(--surface-elevated)',
                border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 13,
                padding: '9px 12px', outline: 'none', cursor: props.managerSave.kind === 'saving' ? 'wait' : 'pointer',
              }}
            >
              {agent.manager_id === null && <option value="" disabled>— escolher —</option>}
              {props.managerOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.name} · {m.role}</option>
              ))}
            </select>
            {props.managerSave.kind === 'saved' && <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--approve)' }}>✓ salvo</span>}
            {props.managerSave.kind === 'error' && <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>{props.managerSave.text}</span>}
          </Secao>
        </>
      )}

      {}
      <Divisor />
      <Secao label="Voz">
        <select
          aria-label={`Voz de ${agent.name}`}
          value={valorDoSelect(agent.voice, agent.voz_desligada ?? false)}
          onChange={(e) => props.onVoz(escolhaDeVoz(e.target.value))}
          disabled={props.vozSave.kind === 'saving'}
          style={{
            width: '100%', boxSizing: 'border-box', background: 'var(--surface-elevated)',
            border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 13,
            padding: '9px 12px', outline: 'none', cursor: props.vozSave.kind === 'saving' ? 'wait' : 'pointer',
          }}
        >
          <option value="">Automática</option>
          <option value={VOZ_NAO_FALA}>Não fala (só texto)</option>
          {TIMBRES.map((t) => (
            <optgroup key={t} label={t === 'neutra' ? 'Neutras' : t === 'masculina' ? 'Masculinas' : 'Femininas'}>
              {VOZES.filter((v) => v.timbre === t).map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <p style={{ ...emptyText, marginTop: 7 }}>
          {agent.voz_desligada
            ? descricaoDaVozGuardada(agent.voice)
            : vozInfo(agent.voice)?.descricao ?? 'Escolhida automaticamente. Selecione uma para casar com a personalidade dele.'}
        </p>
        {props.vozSave.kind === 'saved' && (
          <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--approve)' }}>
            {}
            {agent.voz_desligada ? MSG_SALVO_SEM_VOZ : MSG_SALVO_COM_VOZ}
          </span>
        )}
        {props.vozSave.kind === 'error' && <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>{props.vozSave.text}</span>}
      </Secao>

      <Divisor />

      {}
      <Secao label="Combinados" count={loaded ? combinados.length : undefined}>
        {props.dirState === 'loading' ? (
          <p style={emptyText}>Carregando…</p>
        ) : props.dirState === 'error' ? (
          <p style={emptyText}>Não deu para carregar — recarregue a página.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {combinados.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {combinados.map((d, i) => (
                  <span key={`${i}-${d.at}`} style={{ ...pill, gap: 8, paddingRight: props.isCanal ? 11 : 7 }}>
                    <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.texto}</span>
                    {}
                    {!props.isCanal && (
                      <button
                        type="button"
                        onClick={() => props.onRemoveCombinado(i)}
                        aria-label={`Remover combinado: ${d.texto}`}
                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0 }}
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {props.isCanal ? (
              
              <p style={emptyText}>
                {combinados.length === 0
                  ? 'Regras que ele segue sempre. Edite pelo Treino.'
                  : 'Edite os combinados pelo Treino.'}
              </p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
                  <input
                    value={props.newDirective}
                    onChange={(e) => props.onNewDirective(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') props.onAddCombinado() }}
                    placeholder="ex.: nunca usar gíria com cliente"
                    aria-label="Novo combinado"
                    style={{
                      flex: 1, minWidth: 0, background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', fontSize: 13, padding: '9px 12px', outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={props.onAddCombinado}
                    disabled={combinarDisabled}
                    style={{
                      flexShrink: 0, fontSize: 13, fontWeight: 500, color: 'var(--bg-base)',
                      background: 'var(--text-primary)', border: 'none', borderRadius: 'var(--radius-sm)',
                      padding: '9px 16px', cursor: combinarDisabled ? 'not-allowed' : 'pointer', opacity: combinarDisabled ? 0.5 : 1,
                    }}
                  >
                    Combinar
                  </button>
                </div>
                {combinados.length === 0 && (
                  <p style={emptyText}>Regras que ele segue sempre. Escreva uma e ela vale a partir de agora.</p>
                )}
                {props.dirSave.kind === 'error' && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{props.dirSave.text}</span>}
              </>
            )}
          </div>
        )}
      </Secao>

      <Divisor />

      {}
      <Secao label="O que aprendeu" count={loaded ? props.learnings.length : undefined}>
        {props.learnings.length === 0 ? (
          <p style={emptyText}>Ainda nada — vai aprendendo conforme trabalha com você.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {props.learnings.map((a) => (
              <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{a.summary}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
          </div>
        )}
      </Secao>

      {}
      {skillNames.length > 0 && (
        <>
          <Divisor />
          <Secao label="No que é bom">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {skillNames.map((s, i) => (
                <span key={`${i}-${s}`} style={pill}>{s}</span>
              ))}
            </div>
          </Secao>
        </>
      )}

      {}
      {props.customTools.length > 0 && (
        <>
          <Divisor />
          <Secao label="Ferramentas da empresa">
            {props.isCanal ? (
              (() => {
                const ligadas = props.customTools.filter((t) => (agent.tools.custom_tools ?? []).includes(t.id))
                return (
                  <>
                    {ligadas.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                        {ligadas.map((t) => (
                          <span key={t.id} style={pill}>{t.titulo}</span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ ...emptyText, marginBottom: 12 }}>Nenhuma ligada.</p>
                    )}
                    <p style={emptyText}>Edite as ferramentas pelo Treino.</p>
                  </>
                )
              })()
            ) : (
              <>
                <p style={{ ...emptyText, marginBottom: 12 }}>
                  Ferramentas criadas sob medida pra sua empresa. Ligar ou desligar vale na hora.
                </p>
                <ToolsCustomCard
                  key={agent.id}
                  agentId={agent.id}
                  catalogo={props.customTools}
                  initial={agent.tools.custom_tools ?? []}
                  onSaved={(ids) => props.onCustomToolsSaved(agent.id, ids)}
                />
              </>
            )}
          </Secao>
        </>
      )}
    </div>
  )
}
