

import type { MockNote } from '@/mock/types'
import { ASSISTANT_NAME } from '@/lib/brand'



export interface AgentMeta {
  name: string
  role: string
  
  accent?: 'wave' | 'mono'
}


export const AGENT_REGISTRY: Record<string, AgentMeta> = {
  jarvis: { name: ASSISTANT_NAME, role: 'Maestro · chat & voz', accent: 'wave' },
  'curator-agent': { name: 'Curador', role: 'Guardião da memória' },
  'sales-agent': { name: 'Vendas', role: 'Receita & parcerias' },
  'growth-agent': { name: 'Growth', role: 'Aquisição & campanhas' },
  'finance-agent': { name: 'Financeiro', role: 'Custos & orçamento' },
  'research-agent': { name: 'Pesquisa', role: 'Inteligência & contexto' },
}


export const AGENT_ALIASES: Record<string, string> = { curator: 'curator-agent' }


export function canonicalSlug(slug: string): string {
  return AGENT_ALIASES[slug] ?? slug
}


function humanize(slug: string): string {
  const base = slug.replace(/-agent$/, '').replace(/[-_]+/g, ' ').trim()
  if (!base) return slug
  return base
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}


export function agentMeta(slug: string, nomes?: Record<string, string>): AgentMeta {
  const canon = canonicalSlug(slug)
  const base = AGENT_REGISTRY[canon] ?? { name: humanize(canon), role: 'Agente' }
  const doRoster = nomes?.[canon]?.trim()
  return doRoster ? { ...base, name: doRoster } : base
}


export function agentName(slug: string, nomes?: Record<string, string>): string {
  const canon = canonicalSlug(slug)
  const doRoster = nomes?.[canon]?.trim()
  if (doRoster) return doRoster
  return AGENT_REGISTRY[canon]?.name ?? humanize(canon)
}




export const PARA_ORDER = ['Projetos', 'Areas', 'Recursos', 'Arquivo'] as const


export const PARA_META: Record<string, { hint: string }> = {
  Projetos: { hint: 'Esforços ativos com prazo' },
  Areas: { hint: 'Responsabilidades contínuas' },
  Recursos: { hint: 'Referências e temas de interesse' },
  Arquivo: { hint: 'Inativo — guardado para consulta' },
}


export const NAV_BUNDLE_TAG = '97876a61-15f8-005d-a717-3b72db2f3be0' as const


export function topFolder(path: string): string {
  const trimmed = path.replace(/^\/+/, '')
  const slash = trimmed.indexOf('/')
  const head = slash === -1 ? trimmed : trimmed.slice(0, slash)
  return head.length > 0 ? head : 'Outros'
}

export interface NoteGroup {
  folder: string
  notes: MockNote[]
}


export function groupByFolder(notes: MockNote[]): NoteGroup[] {
  const buckets = new Map<string, MockNote[]>()
  for (const note of notes) {
    const folder = topFolder(note.path)
    const list = buckets.get(folder)
    if (list) list.push(note)
    else buckets.set(folder, [note])
  }

  const folders = [...buckets.keys()].sort((a, b) => {
    const ia = PARA_ORDER.indexOf(a as (typeof PARA_ORDER)[number])
    const ib = PARA_ORDER.indexOf(b as (typeof PARA_ORDER)[number])
    if (ia !== -1 && ib !== -1) return ia - ib
    if (ia !== -1) return -1
    if (ib !== -1) return 1
    return a.localeCompare(b, 'pt-BR')
  })

  return folders.map((folder) => ({
    folder,
    notes: buckets
      .get(folder)!
      .slice()
      .sort((a, b) => {
        if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1
        return a.id.localeCompare(b.id)
      }),
  }))
}




export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .trim()
}


export function noteMatches(note: MockNote, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalize(`${note.title} ${note.snippet} ${note.path}`)
  return terms.every((term) => haystack.includes(term))
}


export function filterNotes(notes: MockNote[], query: string): MockNote[] {
  if (normalize(query).length === 0) return notes
  return notes.filter((note) => noteMatches(note, query))
}
