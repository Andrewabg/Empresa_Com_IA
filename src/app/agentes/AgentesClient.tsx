'use client'



import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { sameSkillSet } from '@/lib/skills'
import { agentPendingToolkits } from '@/lib/toolkit-gating'
import { AGENTES_INTERNOS } from '@/lib/agentes/fichaHumana'
import { mensagemDoDesligamento } from '@/lib/agentes/somenteDono'
import { lojaLiberada, type LicenseState } from '@/lib/license-state'
import type { EscolhaDeVoz } from '@/lib/voicePalette'
import type { Agent, AgentTools, DesligadoUI, DiretrizUI, AprendizadoUI, SaveState, SkillMeta, TarefaUI } from './types'
import { corpoDaDiretrizParaSalvar } from './types'
import { TOOL_DEFS } from './types'
import { SectionButton } from './parts'
import { Modal } from './Modal'
import { RosterColumn } from './RosterColumn'
import { EditorTopBar } from './EditorTopBar'
import { PersonaCard } from './PersonaCard'
import { PoderesCard, titleCaseFallback } from './PoderesCard'
import { ToolsCustomCard, type ToolCustomMeta } from './ToolsCustomCard'
import { SkillsCard } from './SkillsCard'
import { DiretrizesCard } from './DiretrizesCard'
import { AprendizadosCard } from './AprendizadosCard'
import { RespondeACard } from './RespondeACard'
import { VozCard } from './VozCard'
import { PalcoLeigo } from './PalcoLeigo'


type ModalSection = 'poderes' | 'toolsCustom' | 'skills' | 'diretrizes' | 'aprendizados'

interface AgentesClientProps {
  agents: Agent[]
  
  models: string[]
  
  initialSelectedId?: string | null
  
  toolkitNames?: Record<string, string>
  
  technicalMode: boolean
  
  fichas: Record<string, { tagline: string | null; descricao: string | null }>
  
  tarefas: Record<string, TarefaUI[]>
  
  licenseState: LicenseState
  
  customTools: ToolCustomMeta[]
  
  canalAgentIds?: string[]
  
  desligados?: DesligadoUI[]
  
  isDono: boolean
}



export function AgentesClient({ agents: initialAgents, models, initialSelectedId, toolkitNames = {}, technicalMode, fichas, tarefas, licenseState, customTools, canalAgentIds = [], desligados: initialDesligados = [], isDono }: AgentesClientProps) {
  
  
  
  const criacaoOn = lojaLiberada(licenseState) && isDono
  
  const nameFor = (slug: string) => toolkitNames[slug] ?? titleCaseFallback(slug)
  const [agents, setAgents] = useState<Agent[]>(initialAgents)
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    
    
    const pool = technicalMode ? initialAgents : initialAgents.filter((a) => !AGENTES_INTERNOS.includes(a.id))
    return initialSelectedId && pool.some((a) => a.id === initialSelectedId)
      ? initialSelectedId
      : (pool[0]?.id ?? null)
  })

  
  const [systemPrompt, setSystemPrompt] = useState('')
  const [tools, setTools] = useState<AgentTools>({})
  const [skillsSel, setSkillsSel] = useState<string[]>([])
  const [enabled, setEnabled] = useState(true)
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })
  
  const [feriasSave, setFeriasSave] = useState<SaveState>({ kind: 'idle' })
  const [managerSave, setManagerSave] = useState<SaveState>({ kind: 'idle' })
  const [nomeSave, setNomeSave] = useState<SaveState>({ kind: 'idle' })
  const [vozSave, setVozSave] = useState<SaveState>({ kind: 'idle' })
  
  
  const [desligados, setDesligados] = useState<DesligadoUI[]>(initialDesligados)
  const [desligamentoSave, setDesligamentoSave] = useState<SaveState>({ kind: 'idle' })

  
  
  
  const [directives, setDirectives] = useState<DiretrizUI[]>([])
  const [learnings, setLearnings] = useState<AprendizadoUI[]>([])
  const [dirState, setDirState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [newDirective, setNewDirective] = useState('')
  const [dirDirty, setDirDirty] = useState(false)
  const [dirSave, setDirSave] = useState<SaveState>({ kind: 'idle' })
  
  
  const dirCacheRef = useRef<Map<string, { diretrizes: DiretrizUI[]; aprendizados: AprendizadoUI[] }>>(new Map())

  
  const [openModal, setOpenModal] = useState<ModalSection | null>(null)

  useEffect(() => {
    if (!selectedId) return
    
    setNewDirective('')
    setDirDirty(false)
    setDirSave({ kind: 'idle' })
    setFeriasSave({ kind: 'idle' })
    setManagerSave({ kind: 'idle' })
    setNomeSave({ kind: 'idle' })
    
    
    
    const cached = dirCacheRef.current.get(selectedId)
    if (cached) {
      setDirectives(cached.diretrizes)
      setLearnings(cached.aprendizados)
      setDirState('loaded')
      return
    }
    const controller = new AbortController()
    setDirState('loading')
    fetch('/api/agents/' + encodeURIComponent(selectedId) + '/directives', { signal: controller.signal })
      .then((r) => r.json())
      .then((d: { diretrizes?: DiretrizUI[]; aprendizados?: AprendizadoUI[] }) => {
        const diretrizes = Array.isArray(d.diretrizes) ? d.diretrizes : []
        const aprendizados = Array.isArray(d.aprendizados) ? d.aprendizados : []
        dirCacheRef.current.set(selectedId, { diretrizes, aprendizados })
        setDirectives(diretrizes)
        setLearnings(aprendizados)
        setDirState('loaded')
      })
      .catch((e) => { if ((e as Error).name !== 'AbortError') setDirState('error') })
    return () => controller.abort()
  }, [selectedId])

  function touchDir() {
    setDirDirty(true)
    if (dirSave.kind !== 'idle') setDirSave({ kind: 'idle' })
  }
  function addDirectiveRow() {
    const t = newDirective.trim()
    if (!t) return
    setDirectives((prev) => [...prev, { texto: t, origem: 'operador', at: new Date().toISOString() }])
    setNewDirective('')
    touchDir()
  }
  function removeDirectiveRow(i: number) {
    setDirectives((prev) => prev.filter((_, idx) => idx !== i))
    touchDir()
  }
  function editDirectiveRow(i: number, texto: string) {
    setDirectives((prev) => prev.map((d, idx) => (idx === i ? { ...d, texto } : d)))
    touchDir()
  }
  async function saveDirectives() {
    if (!selectedId) return
    setDirSave({ kind: 'saving' })
    try {
      const res = await fetch('/api/agents/' + encodeURIComponent(selectedId) + '/directives', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diretrizes: directives.map(corpoDaDiretrizParaSalvar),
        }),
      })
      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try { const j = (await res.json()) as { error?: string }; if (j?.error) detail = j.error } catch {  }
        setDirSave({ kind: 'error', text: `Não foi possível salvar (${detail}).` })
        return
      }
      const j = (await res.json()) as { diretrizes?: DiretrizUI[] }
      
      const saved = Array.isArray(j.diretrizes) ? j.diretrizes : []
      setDirectives(saved)
      const prev = dirCacheRef.current.get(selectedId)
      dirCacheRef.current.set(selectedId, { diretrizes: saved, aprendizados: prev?.aprendizados ?? learnings })
      setDirDirty(false)
      setDirSave({ kind: 'saved', at: Date.now() })
    } catch (err) {
      setDirSave({ kind: 'error', text: `Não foi possível salvar (${err instanceof Error ? err.message : String(err)}).` })
    }
  }

  
  
  
  const [catalog, setCatalog] = useState<SkillMeta[]>([])
  const [catalogState, setCatalogState] = useState<'loading' | 'loaded' | 'error'>('loading')
  useEffect(() => {
    let ativo = true
    fetch('/api/skills')
      .then((r) => r.json())
      .then((data: { skills?: SkillMeta[] }) => {
        if (!ativo) return
        if (Array.isArray(data.skills)) { setCatalog(data.skills); setCatalogState('loaded') }
        else setCatalogState('error')
      })
      .catch(() => { if (ativo) setCatalogState('error') })
    return () => { ativo = false } 
  }, [])

  const defaultModel = models[0] ?? 'gpt-5.1'
  const selected = useMemo(
    () => agents.find((a) => a.id === selectedId) ?? null,
    [agents, selectedId],
  )
  
  
  const isCanal = !!selected && canalAgentIds.includes(selected.id)

  
  
  const [connectedSlugs, setConnectedSlugs] = useState<string[]>([])
  useEffect(() => {
    let alive = true
    fetch('/api/config/connections')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { toolkits?: { slug: string; connected: boolean }[] } | null) => {
        if (alive && j?.toolkits) setConnectedSlugs(j.toolkits.filter((t) => t.connected).map((t) => t.slug))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  const { pendingConnect, pendingEnable } = agentPendingToolkits(
    selected?.tools?.required_toolkits ?? [], connectedSlugs, selected?.tools ?? {},
  )

  
  const [loadedId, setLoadedId] = useState<string | null>(null)
  if (selected && loadedId !== selected.id) {
    setLoadedId(selected.id)
    setSystemPrompt(selected.system_prompt ?? '')
    
    const newTools = {} as AgentTools
    for (const d of TOOL_DEFS) newTools[d.key] = selected.tools[d.key] ?? false
    setTools(newTools)
    setSkillsSel(selected.skills ?? [])
    setEnabled(selected.enabled)
    setSave({ kind: 'idle' })
  }

  
  
  const dirty = useMemo(() => {
    if (!selected) return false
    if (systemPrompt !== (selected.system_prompt ?? '')) return true
    if (enabled !== selected.enabled) return true
    if (!sameSkillSet(skillsSel, selected.skills ?? [])) return true
    return TOOL_DEFS.some((d) => (tools[d.key] ?? false) !== (selected.tools[d.key] ?? false))
  }, [selected, systemPrompt, enabled, tools, skillsSel])

  

  
  
  
  
  const rosterAgents = useMemo(
    () => (technicalMode ? agents : agents.filter((a) => !AGENTES_INTERNOS.includes(a.id))),
    [agents, technicalMode],
  )
  const rosterAtivos = useMemo(() => rosterAgents.filter((a) => a.enabled).length, [rosterAgents])
  const rosterFerias = rosterAgents.length - rosterAtivos
  
  
  
  const managerOptions = agents.filter(
    (a) => (a.enabled || a.id === selected?.manager_id) && a.id !== selectedId && !AGENTES_INTERNOS.includes(a.id),
  ).map((a) => ({ id: a.id, name: a.enabled ? a.name : `${a.name} (de férias)`, role: a.role }))
  
  const skillNames = (selected?.skills ?? []).map(
    (slug) => catalog.find((s) => s.slug === slug)?.name ?? titleCaseFallback(slug),
  )

  async function handleSave() {
    if (!selected) return
    if (!systemPrompt.trim()) {
      setSave({ kind: 'error', text: 'A persona não pode ficar em branco.' })
      return
    }
    setSave({ kind: 'saving' })

    
    
    
    const toolsPayload = {} as AgentTools
    for (const d of TOOL_DEFS) toolsPayload[d.key] = tools[d.key] ?? false
    const body = {
      system_prompt: systemPrompt,
      tools: toolsPayload,
      skills: skillsSel,
      enabled,
    }

    try {
      const res = await fetch('/api/agents/' + encodeURIComponent(selected.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        
        let detail = `HTTP ${res.status}`
        try {
          const json = (await res.json()) as { error?: string }
          if (json?.error) detail = json.error
        } catch {
          
        }
        setSave({ kind: 'error', text: `Não foi possível salvar (${detail}).` })
        return
      }

      const json = (await res.json()) as { ok?: boolean; agent?: Agent }
      const updated = json.agent
      
      setAgents((prev) =>
        prev.map((a) =>
          a.id === selected.id
            ? updated ?? { ...a, system_prompt: systemPrompt, tools: toolsPayload, skills: skillsSel, enabled }
            : a,
        ),
      )
      
      if (updated) {
        setSystemPrompt(updated.system_prompt ?? '')
        const resyncedTools = {} as AgentTools
        for (const d of TOOL_DEFS) resyncedTools[d.key] = updated.tools[d.key] ?? false
        setTools(resyncedTools)
        setSkillsSel(updated.skills ?? [])
        setEnabled(updated.enabled)
      }
      setSave({ kind: 'saved', at: Date.now() })
    } catch (err) {
      setSave({
        kind: 'error',
        text: `Não foi possível salvar (${err instanceof Error ? err.message : String(err)}).`,
      })
    }
  }

  

  
  async function putCampoLeigo(
    body: Record<string, unknown>,
    aplicar: (a: Agent) => Agent,
    setEstado: (s: SaveState) => void,
  ) {
    if (!selected) return
    setEstado({ kind: 'saving' })
    try {
      const res = await fetch('/api/agents/' + encodeURIComponent(selected.id), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try { const j = (await res.json()) as { error?: string }; if (j?.error) detail = j.error } catch {  }
        setEstado({ kind: 'error', text: `Não foi possível salvar (${detail}).` })
        return
      }
      
      setAgents((prev) => prev.map((a) => (a.id === selected.id ? aplicar(a) : a)))
      setEstado({ kind: 'saved', at: Date.now() })
    } catch (err) {
      setEstado({ kind: 'error', text: `Não foi possível salvar (${err instanceof Error ? err.message : String(err)}).` })
    }
  }

  function handleFerias(v: boolean) {
    void putCampoLeigo({ enabled: v }, (a) => ({ ...a, enabled: v }), setFeriasSave)
  }

  
  async function chamarDesligamento(id: string, method: 'DELETE' | 'POST'): Promise<Agent | null> {
    setDesligamentoSave({ kind: 'saving' })
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(id)}/desligamento`, { method })
      if (!res.ok) {
        let erroDoServidor: string | null = null
        try { const j = (await res.json()) as { error?: string }; if (j?.error) erroDoServidor = j.error } catch {  }
        
        
        setDesligamentoSave({ kind: 'error', text: mensagemDoDesligamento(res.status, erroDoServidor) })
        return null
      }
      const j = (await res.json()) as { agent?: Agent }
      setDesligamentoSave({ kind: 'saved', at: Date.now() })
      return j.agent ?? null
    } catch (err) {
      setDesligamentoSave({ kind: 'error', text: err instanceof Error ? err.message : String(err) })
      return null
    }
  }

  async function handleDesligar() {
    if (!selected) return
    const saindo = selected
    if (!(await chamarDesligamento(saindo.id, 'DELETE'))) return
    
    
    const novoGerente = saindo.manager_id
    setAgents((prev) =>
      prev
        .filter((a) => a.id !== saindo.id)
        .map((a) => (a.manager_id === saindo.id ? { ...a, manager_id: novoGerente } : a)),
    )
    setDesligados((prev) => [
      { id: saindo.id, name: saindo.name, role: saindo.role, dismissed_at: new Date().toISOString() },
      ...prev,
    ])
    setSelectedId((atual) => (atual === saindo.id ? null : atual))
  }

  async function handleReadmitir(id: string) {
    const volta = await chamarDesligamento(id, 'POST')
    if (!volta) return
    setDesligados((prev) => prev.filter((d) => d.id !== id))
    
    
    
    setAgents((prev) => (prev.some((a) => a.id === volta.id) ? prev : [...prev, volta]))
    setSelectedId(volta.id)
  }

  
  function handleCustomToolsSaved(agentId: string, ids: string[]) {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, tools: { ...a.tools, custom_tools: ids } } : a)),
    )
  }
  
  const customIdsValidos = useMemo(() => new Set(customTools.map((t) => t.id)), [customTools])
  const customLigadas = (selected?.tools.custom_tools ?? []).filter((id) => customIdsValidos.has(id))
  function handleManager(managerId: string) {
    void putCampoLeigo({ manager_id: managerId }, (a) => ({ ...a, manager_id: managerId }), setManagerSave)
  }

  
  function handleVoz(escolha: EscolhaDeVoz) {
    
    
    
    const mexeNaVoz = 'voice' in escolha
    const voice = escolha.voice ?? null
    void putCampoLeigo(
      mexeNaVoz ? { voice, voz_desligada: escolha.desligada } : { voz_desligada: escolha.desligada },
      (a) => (mexeNaVoz ? { ...a, voice, voz_desligada: escolha.desligada } : { ...a, voz_desligada: escolha.desligada }),
      setVozSave,
    )
  }

  
  async function onRenomear(nome: string) {
    if (!selected) return
    const limpo = nome.trim()
    if (!limpo) { setNomeSave({ kind: 'error', text: 'O nome não pode ficar em branco.' }); return }
    if (limpo.length > 120) { setNomeSave({ kind: 'error', text: 'O nome é longo demais (máx. 120).' }); return }
    if (limpo === selected.name) { setNomeSave({ kind: 'idle' }); return } 
    const alvo = selected.id
    const anterior = selected.name
    setNomeSave({ kind: 'saving' })
    setAgents((prev) => prev.map((a) => (a.id === alvo ? { ...a, name: limpo } : a))) 
    try {
      const res = await fetch('/api/agents/' + encodeURIComponent(alvo), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: limpo }),
      })
      if (!res.ok) {
        setAgents((prev) => prev.map((a) => (a.id === alvo ? { ...a, name: anterior } : a))) 
        let detail = `HTTP ${res.status}`
        try { const j = (await res.json()) as { error?: string }; if (j?.error) detail = j.error } catch {  }
        setNomeSave({ kind: 'error', text: `Não foi possível salvar (${detail}).` })
        return
      }
      setNomeSave({ kind: 'saved', at: Date.now() })
    } catch (err) {
      setAgents((prev) => prev.map((a) => (a.id === alvo ? { ...a, name: anterior } : a))) 
      setNomeSave({ kind: 'error', text: `Não foi possível salvar (${err instanceof Error ? err.message : String(err)}).` })
    }
  }

  
  async function commitCombinados(next: DiretrizUI[]) {
    if (!selectedId) return
    const anterior = directives
    setDirectives(next) 
    setDirSave({ kind: 'saving' })
    try {
      const res = await fetch('/api/agents/' + encodeURIComponent(selectedId) + '/directives', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diretrizes: next.map(corpoDaDiretrizParaSalvar) }),
      })
      if (!res.ok) { setDirectives(anterior); setDirSave({ kind: 'error', text: 'Não foi possível salvar o combinado.' }); return }
      const j = (await res.json()) as { diretrizes?: DiretrizUI[] }
      const saved = Array.isArray(j.diretrizes) ? j.diretrizes : next
      setDirectives(saved)
      const prev = dirCacheRef.current.get(selectedId)
      dirCacheRef.current.set(selectedId, { diretrizes: saved, aprendizados: prev?.aprendizados ?? learnings })
      setDirSave({ kind: 'saved', at: Date.now() })
    } catch {
      setDirectives(anterior)
      setDirSave({ kind: 'error', text: 'Não foi possível salvar o combinado.' })
    }
  }
  function addCombinado() {
    
    if (dirSave.kind === 'saving') return
    const t = newDirective.trim()
    if (!t) return
    setNewDirective('')
    void commitCombinados([...directives, { texto: t, origem: 'operador', at: new Date().toISOString() }])
  }
  function removeCombinado(i: number) {
    
    if (dirSave.kind === 'saving') return
    void commitCombinados(directives.filter((_, idx) => idx !== i))
  }

  return (
    <div className="agentes-page">
      {}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          {technicalMode ? 'Agentes' : 'Seu time'}
        </span>
        {}
        <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
          · {rosterAtivos} {technicalMode ? 'no time' : rosterAtivos === 1 ? 'pessoa' : 'pessoas'}
          {rosterFerias > 0 && ` · ${rosterFerias} de férias`}
        </span>
        {}
        {criacaoOn && (
          <Link
            href="/loja/contratar"
            style={{
              marginLeft: 'auto',
              alignSelf: 'center',
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-hairline)',
              background: 'var(--surface)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Contratar sob medida →
          </Link>
        )}
      </div>

      {technicalMode ? (
        <div className="agentes-grid">
          {}
          <RosterColumn agents={rosterAgents} selectedId={selectedId} defaultModel={defaultModel} onSelect={setSelectedId} />
          {selected ? (
            <>
              {}
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12 }}>
                <EditorTopBar
                  agent={selected}
                  effectiveModel={selected.model ?? defaultModel}
                  enabled={enabled}
                  onToggleEnabled={(v) => { setEnabled(v); if (save.kind !== 'idle') setSave({ kind: 'idle' }) }}
                  dirty={dirty}
                  save={save}
                  onSave={handleSave}
                  locked={isCanal}
                />
                <PersonaCard
                  name={selected.name}
                  value={systemPrompt}
                  onChange={(v) => { setSystemPrompt(v); if (save.kind !== 'idle') setSave({ kind: 'idle' }) }}
                  readOnly={isCanal}
                />
              </div>
              {}
              <div className="cc-scroll agentes-col-dir" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12, paddingRight: 6 }}>
                <SectionButton
                  label="Poderes"
                  count={TOOL_DEFS.filter((d) => tools[d.key]).length}
                  alert={pendingConnect.length > 0 || pendingEnable.length > 0}
                  alertTitle={
                    pendingConnect.length > 0
                      ? `Precisa conectar: ${pendingConnect.map(nameFor).join(', ')}`
                      : 'Ferramenta conectada, mas desligada nos Poderes'
                  }
                  onClick={() => setOpenModal('poderes')}
                />
                {}
                {customTools.length > 0 && (
                  <SectionButton
                    label="Tools custom"
                    count={customLigadas.length}
                    onClick={() => setOpenModal('toolsCustom')}
                  />
                )}
                {}
                {isCanal && (
                  <Link
                    href={'/treino/' + encodeURIComponent(selected.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      padding: '11px 14px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-hairline)', background: 'var(--surface)',
                      color: 'var(--text-primary)', fontSize: 13.5, fontWeight: 500, textDecoration: 'none',
                    }}
                  >
                    Editar e testar no Treino
                    <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>→</span>
                  </Link>
                )}
                <SectionButton label="Skills" count={skillsSel.length === 0 ? 'todas' : skillsSel.length} onClick={() => setOpenModal('skills')} />
                <SectionButton label="Diretrizes" count={dirState === 'loaded' ? directives.length : undefined} onClick={() => setOpenModal('diretrizes')} />
                <SectionButton label="Aprendizados" count={dirState === 'loaded' ? learnings.length : undefined} onClick={() => setOpenModal('aprendizados')} />
                {}
                {!selected.is_primary && (
                  <RespondeACard agent={selected} options={managerOptions} save={managerSave} onChange={handleManager} />
                )}
                {}
                <VozCard agent={selected} save={vozSave} onChange={handleVoz} />
              </div>
            </>
          ) : (
            <div style={{ gridColumn: '2 / 4', display: 'grid', placeItems: 'center', minHeight: 0, padding: 24, background: 'var(--surface)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', fontSize: 14, color: 'var(--text-tertiary)' }}>
              Selecione um agente à esquerda para editar.
            </div>
          )}
        </div>
      ) : (
        <PalcoLeigo
          agents={rosterAgents}
          selected={selected}
          selectedId={selectedId}
          onSelect={setSelectedId}
          tagline={fichas[selected?.id ?? '']?.tagline ?? null}
          descricao={fichas[selected?.id ?? '']?.descricao ?? null}
          conversarHref={selected && selected.id !== 'curator-agent' ? `/conversa?agent=${selected.id}` : null}
          estacaoHref={selected && selected.id !== 'curator-agent' && !selected.is_primary ? `/agente/${selected.id}` : null}
          feriasSave={feriasSave}
          onFerias={handleFerias}
          nomeSave={nomeSave}
          onRenomear={onRenomear}
          tarefas={selected ? (tarefas[selected.id] ?? []) : []}
          skillNames={skillNames}
          directives={directives}
          dirState={dirState}
          dirSave={dirSave}
          newDirective={newDirective}
          onNewDirective={setNewDirective}
          onAddCombinado={addCombinado}
          onRemoveCombinado={removeCombinado}
          managerOptions={managerOptions}
          managerSave={managerSave}
          onManager={handleManager}
          vozSave={vozSave}
          onVoz={handleVoz}
          learnings={learnings}
          customTools={customTools}
          onCustomToolsSaved={handleCustomToolsSaved}
          isCanal={isCanal}
          treinoHref={selected ? '/treino/' + encodeURIComponent(selected.id) : null}
          desligados={desligados}
          desligamentoSave={desligamentoSave}
          onDesligar={() => { void handleDesligar() }}
          onReadmitir={(id) => { void handleReadmitir(id) }}
          isDono={isDono}
        />
      )}

      {}
      {selected && technicalMode && (
        <Modal
          open={openModal !== null}
          onOpenChange={(o) => { if (!o) setOpenModal(null) }}
          title={
            openModal === 'poderes' ? 'Poderes'
              : openModal === 'toolsCustom' ? 'Tools custom'
                : openModal === 'skills' ? 'Skills'
                  : openModal === 'diretrizes' ? 'Diretrizes'
                    : openModal === 'aprendizados' ? 'Aprendizados recentes'
                      : ''
          }
          hint={
            openModal === 'poderes' ? 'Ligue ou desligue os poderes do agente. As mudanças entram ao Salvar (no topo do editor).'
              : openModal === 'toolsCustom' ? 'Ferramentas criadas sob medida pra sua empresa. Ligar ou desligar salva na hora.'
                : openModal === 'skills' ? 'Nenhuma marcada = todas (padrão). As mudanças entram ao Salvar (no topo do editor).'
                  : openModal === 'diretrizes' ? `Regras fixas que ${selected.name} segue sempre.`
                    : openModal === 'aprendizados' ? 'O que o agente vem aprendendo ao trabalhar.'
                      : undefined
          }
        >
          {openModal === 'poderes' && (
            <PoderesCard
              tools={tools}
              pendingConnect={pendingConnect}
              pendingEnable={pendingEnable}
              toolkitNames={toolkitNames}
              isDono={isDono}
              onChange={(key, v) => { setTools((prev) => ({ ...prev, [key]: v })); if (save.kind !== 'idle') setSave({ kind: 'idle' }) }}
            />
          )}
          {openModal === 'toolsCustom' && (
            <ToolsCustomCard
              key={selected.id}
              agentId={selected.id}
              catalogo={customTools}
              initial={selected.tools.custom_tools ?? []}
              onSaved={(ids) => handleCustomToolsSaved(selected.id, ids)}
            />
          )}
          {openModal === 'skills' && (
            <SkillsCard
              catalog={catalog}
              catalogState={catalogState}
              skillsSel={skillsSel}
              onToggle={(slug, checked) => {
                setSkillsSel((prev) => (checked ? [...prev, slug] : prev.filter((s) => s !== slug)))
                if (save.kind !== 'idle') setSave({ kind: 'idle' })
              }}
            />
          )}
          {openModal === 'diretrizes' && (
            <DiretrizesCard
              directives={directives}
              dirState={dirState}
              newDirective={newDirective}
              onNewDirectiveChange={setNewDirective}
              onAdd={addDirectiveRow}
              onRemove={removeDirectiveRow}
              onEdit={editDirectiveRow}
              dirSave={dirSave}
              dirDirty={dirDirty}
              onSave={saveDirectives}
            />
          )}
          {openModal === 'aprendizados' && <AprendizadosCard learnings={learnings} />}
        </Modal>
      )}
    </div>
  )
}
