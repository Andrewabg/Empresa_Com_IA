'use client'



import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ChannelConfigDelta, ChannelConfigSnapshot } from '@/lib/canais/configSnapshot'
import type { AgentTools } from '@/data/agents'
import { diffBaseOps } from '@/lib/canais/baseOps'
import type { EntradaBaseRow } from '@/data/baseConhecimento'
import type { ConfigInicial } from './types'
import { PersonaJaEBloco } from './PersonaJaEBloco'
import { Simulador } from './Simulador'
import { PublicarBar } from './PublicarBar'
import { AcoesEditor } from './AcoesEditor'
import { CustomToolsEditor } from './CustomToolsEditor'
import { PersonaEditorRascunho } from './PersonaEditorRascunho'
import { BaseEditor, type EntradaBaseView } from './BaseEditor'


function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em',
      textTransform: 'uppercase', color: 'var(--text-tertiary)',
    }}>
      {children}
    </span>
  )
}

const inputBase: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-ui)',
  fontSize: 13.5,
  color: 'var(--text-primary)',
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '8px 11px',
  outline: 'none',
}


function diretrizesEfetivas(base: ChannelConfigSnapshot, delta: ChannelConfigDelta): string[] {
  const set = new Set(base.diretrizes ?? [])
  for (const r of delta.diretrizes?.remove ?? []) set.delete(r)
  for (const a of delta.diretrizes?.add ?? []) set.add(a)
  return [...set]
}


function baseToView(rows: EntradaBaseRow[], agentId: string): EntradaBaseView[] {
  return rows.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    conteudo: e.conteudo,
    tipo: e.tipo,
    enabled: e.enabled,
    editavel: e.agent_id === agentId,
    origem: e.origem,
  }))
}

export function ConfigTab({ agentId, agentName, initial }: { agentId: string; agentName: string; initial: ConfigInicial }) {
  const router = useRouter()

  
  
  const baseSnapshotRef = useRef<ChannelConfigSnapshot>(initial.baseSnapshot)
  const deltaExtraRef = useRef<ChannelConfigDelta>((() => {
    const delta = initial.delta ?? {}
    return {
      ...(delta.model !== undefined ? { model: delta.model } : {}),
      ...(delta.skills !== undefined ? { skills: delta.skills } : {}),
      ...(delta.enabled !== undefined ? { enabled: delta.enabled } : {}),
      ...(delta.personaCampos
        ? { personaCampos: { ...delta.personaCampos, quem_e: undefined, tom: undefined, nunca_faz: undefined } }
        : {}),
    }
  })())

  
  const [temRascunho, setTemRascunho] = useState(initial.temRascunho)
  const [name, setName] = useState(() => initial.delta?.name ?? initial.baseSnapshot.name ?? '')
  const [systemPrompt, setSystemPrompt] = useState(() => initial.delta?.system_prompt ?? initial.baseSnapshot.system_prompt ?? '')
  const [quemE, setQuemE] = useState(() => initial.delta?.personaCampos?.quem_e ?? initial.baseSnapshot.personaCampos?.quem_e ?? '')
  const [tom, setTom] = useState(() => initial.delta?.personaCampos?.tom ?? initial.baseSnapshot.personaCampos?.tom ?? '')
  const [nuncaFaz, setNuncaFaz] = useState<string[]>(() => initial.delta?.personaCampos?.nunca_faz ?? initial.baseSnapshot.personaCampos?.nunca_faz ?? [])
  const [toolsWork, setToolsWork] = useState<AgentTools>(() => initial.delta?.tools ?? initial.baseSnapshot.tools ?? {})
  const [diretrizes, setDiretrizes] = useState<string[]>(() => diretrizesEfetivas(initial.baseSnapshot, initial.delta ?? {}))
  const [novaDiretriz, setNovaDiretriz] = useState('')

  
  
  const [baseEditada, setBaseEditada] = useState<EntradaBaseView[]>(() => baseToView(initial.base, agentId))
  const baseVivaRef = useRef<EntradaBaseView[]>(baseToView(initial.base, agentId))

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  
  const montarDelta = useCallback((): ChannelConfigDelta => {
    const base = baseSnapshotRef.current
    const delta: ChannelConfigDelta = { ...deltaExtraRef.current }
    delta.name = name
    delta.system_prompt = systemPrompt
    
    delta.tools = toolsWork
    
    delta.personaCampos = {
      ...(deltaExtraRef.current.personaCampos ?? {}),
      quem_e: quemE,
      tom: tom,
      nunca_faz: nuncaFaz,
    }
    
    const baseSet = new Set(base.diretrizes ?? [])
    const atualSet = new Set(diretrizes)
    const add = [...atualSet].filter((d) => !baseSet.has(d))
    const remove = [...baseSet].filter((d) => !atualSet.has(d))
    delta.diretrizes = { add, remove }
    
    
    
    const editadasParaDiff = baseEditada.filter((e) => (e.id ? true : e.titulo.trim() !== '' && e.conteudo.trim() !== ''))
    const baseOps = diffBaseOps(baseVivaRef.current, editadasParaDiff)
    if (baseOps.add.length || baseOps.update.length || baseOps.toggle.length || baseOps.remove.length) {
      delta.base = baseOps
    }
    return delta
  }, [name, systemPrompt, quemE, tom, nuncaFaz, diretrizes, toolsWork, baseEditada])

  
  
  
  
  const salvarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deltaBaselineRef = useRef<string | null>(null)
  useEffect(() => {
    const atual = JSON.stringify(montarDelta())
    if (deltaBaselineRef.current === null) { deltaBaselineRef.current = atual; return }
    if (atual === deltaBaselineRef.current) return
    if (salvarTimer.current) clearTimeout(salvarTimer.current)
    salvarTimer.current = setTimeout(() => {
      setSaveState('saving')
      fetch('/api/agents/' + encodeURIComponent(agentId) + '/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(montarDelta()),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          setTemRascunho(true)
          setSaveState('saved')
        })
        .catch(() => setSaveState('error'))
    }, 600)
    return () => { if (salvarTimer.current) clearTimeout(salvarTimer.current) }
  }, [montarDelta])

  function addDiretriz() {
    const t = novaDiretriz.trim()
    if (!t || diretrizes.includes(t)) { setNovaDiretriz(''); return }
    setDiretrizes((prev) => [...prev, t])
    setNovaDiretriz('')
  }
  function removeDiretriz(i: number) {
    setDiretrizes((prev) => prev.filter((_, idx) => idx !== i))
  }

  
  
  function onChanged() {
    router.refresh()
    fetch('/api/agents/' + encodeURIComponent(agentId) + '/draft')
      .then((r) => r.json())
      .then((d: { temRascunho?: boolean; delta?: ChannelConfigDelta | null; baseSnapshot?: ChannelConfigSnapshot | null; base?: EntradaBaseRow[] }) => {
        const base = d.baseSnapshot ?? baseSnapshotRef.current
        baseSnapshotRef.current = base
        const delta = d.delta ?? {}
        deltaExtraRef.current = {
          ...(delta.model !== undefined ? { model: delta.model } : {}),
          ...(delta.skills !== undefined ? { skills: delta.skills } : {}),
          ...(delta.enabled !== undefined ? { enabled: delta.enabled } : {}),
          ...(delta.personaCampos
            ? { personaCampos: { ...delta.personaCampos, quem_e: undefined, tom: undefined, nunca_faz: undefined } }
            : {}),
        }
        
        deltaBaselineRef.current = null
        setTemRascunho(!!d.temRascunho)
        setName(delta.name ?? base.name ?? '')
        setSystemPrompt(delta.system_prompt ?? base.system_prompt ?? '')
        setQuemE(delta.personaCampos?.quem_e ?? base.personaCampos?.quem_e ?? '')
        setTom(delta.personaCampos?.tom ?? base.personaCampos?.tom ?? '')
        setNuncaFaz(delta.personaCampos?.nunca_faz ?? base.personaCampos?.nunca_faz ?? [])
        setToolsWork(delta.tools ?? base.tools ?? {})
        setDiretrizes(diretrizesEfetivas(base, delta))
        
        const baseView = baseToView(d.base ?? [], agentId)
        baseVivaRef.current = baseView
        setBaseEditada(baseView)
      })
      .catch(() => {  })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {}
      <PersonaJaEBloco initial={initial} agentName={agentName} />

      {}
      {temRascunho && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 'var(--radius-sm)',
          border: '1px solid rgb(214 158 46 / 0.32)', background: 'rgb(214 158 46 / 0.06)',
          fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)',
        }}>
          <span aria-hidden style={{ width: 7, height: 7, flexShrink: 0, borderRadius: '50%', background: 'rgb(214 158 46)' }} />
          <span>Rascunho não publicado · a produção roda a versão publicada</span>
        </div>
      )}

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Label>Personalidade</Label>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            Como {agentName} pensa e se comporta.
          </p>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={8}
            style={{ ...inputBase, resize: 'vertical', lineHeight: 1.55, minHeight: 150 }}
          />
        </div>

        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Label>Nome</Label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            style={inputBase}
          />
        </div>

        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Label>Ajustes finos (opcional)</Label>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
              A camada que o Treino aprende sozinho. Vazio é normal.
            </p>
          </div>
          <PersonaEditorRascunho
            quemE={quemE}
            tom={tom}
            nuncaFaz={nuncaFaz}
            onQuemEChange={setQuemE}
            onTomChange={setTom}
            onNuncaFazChange={setNuncaFaz}
          />
        </div>

        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Label>Regras fixas (diretrizes)</Label>
          {diretrizes.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>Nenhuma regra fixa ainda.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {diretrizes.map((d, i) => (
                <li key={`${d}-${i}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-hairline)', background: 'var(--surface)',
                }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{d}</span>
                  <button
                    type="button"
                    onClick={() => removeDiretriz(i)}
                    aria-label="Remover regra"
                    style={{
                      flexShrink: 0, width: 24, height: 24, display: 'grid', placeItems: 'center',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)',
                      background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 15, lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={novaDiretriz}
              onChange={(e) => setNovaDiretriz(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDiretriz() } }}
              placeholder="Nova regra fixa…"
              style={{ ...inputBase, flex: 1 }}
            />
            <button
              type="button"
              onClick={addDiretriz}
              disabled={!novaDiretriz.trim()}
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-hairline)', background: 'var(--surface-elevated)',
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
                cursor: novaDiretriz.trim() ? 'pointer' : 'not-allowed', opacity: novaDiretriz.trim() ? 1 : 0.5,
              }}
            >
              Adicionar
            </button>
          </div>
        </div>

        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Label>Ações (aprovação)</Label>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            O que ele pode usar e como age (marcar, criar, enviar). Ler é sempre na hora.
          </p>
          <AcoesEditor tools={toolsWork} onChange={setToolsWork} />
        </div>

        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Label>O que ela sabe</Label>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>
            O que {agentName} sabe. Fatos = informações; playbooks = como agir.
          </p>
          <BaseEditor entradas={baseEditada} onChange={setBaseEditada} />
        </div>

        {}
        {initial.customTools.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Label>Tools da zona custom</Label>
            <CustomToolsEditor
              catalogo={initial.customTools}
              ligadas={toolsWork.custom_tools ?? []}
              onChange={(ids) => setToolsWork((prev) => ({ ...prev, custom_tools: ids }))}
            />
          </div>
        )}

        {}
        <div style={{ minHeight: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
          {saveState === 'saving' && 'Salvando rascunho…'}
          {saveState === 'saved' && '✓ Rascunho salvo'}
          {saveState === 'error' && <span style={{ color: 'var(--reject)' }}>Não foi possível salvar o rascunho.</span>}
        </div>
      </div>

      {}
      <Simulador agentId={agentId} agentName={agentName} />

      {}
      <PublicarBar agentId={agentId} temRascunho={temRascunho} onChanged={onChanged} />
    </div>
  )
}
