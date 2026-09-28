


import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { clusterizar, subconjuntoDe, normalizarTitulo, type CandItem } from '@/lib/imports/dedupCluster'
import { formatCandidate } from '@/lib/imports/candidateText'
import { buildSiblingMergePrompt, buildRetryPrompt } from '@/lib/brain-merge-prompt'
import { generateBackgroundObject } from '@/server/cost/backgroundLLM'
import { recordCost } from '@/data/cost'
import { OpenAIMergeCritic, type MergeCritic } from '@/server/brain/mergeCritic'
import { listReviewCandidates, editCandidate, rejectCandidate } from '@/data/importCandidates'
import type { Note } from '@/brain/note'

const SiblingMergeSchema = z.object({
  acao: z.enum(['merge', 'manter_separado']),
  titulo: z.string(),
  corpo: z.string(),
  tags: z.array(z.string()),
})

export interface DedupMergeDeps {
  list?: typeof listReviewCandidates
  edit?: typeof editCandidate
  reject?: typeof rejectCandidate
  gen?: typeof generateBackgroundObject
  record?: typeof recordCost
  critic?: MergeCritic
}

const uniao = (a: string[], b: string[]): string[] => [...new Set([...a, ...b])]


function semTituloRepetido(corpo: string, titulo: string): string {
  const m = corpo.match(/^\s*(?:#{1,6}\s+)?([^\n]+?)\s*\r?\n+/)
  if (m && normalizarTitulo(m[1]) === normalizarTitulo(titulo)) return corpo.slice(m[0].length)
  return corpo
}

export async function dedupMergeImport(db: SupabaseClient, importId: string, deps: DedupMergeDeps = {}): Promise<void> {
  const list = deps.list ?? listReviewCandidates
  const edit = deps.edit ?? editCandidate
  const reject = deps.reject ?? rejectCandidate
  const gen = deps.gen ?? generateBackgroundObject
  const record = deps.record ?? recordCost
  const critic = deps.critic ?? new OpenAIMergeCritic()

  let cands: CandItem[]
  try { cands = await list(db, importId) as CandItem[] } catch (e) { console.warn('[dedupMerge] list fail-open:', e); return }
  const { clusters } = clusterizar(cands)
  for (const cluster of clusters) {
    try { await resolverCluster(db, importId, cluster, { edit, reject, gen, record, critic }) }
    catch (e) { console.warn('[dedupMerge] cluster fail-open:', e) }
  }
}

async function resolverCluster(
  db: SupabaseClient, importId: string, cluster: CandItem[],
  d: { edit: typeof editCandidate; reject: typeof rejectCandidate; gen: typeof generateBackgroundObject; record: typeof recordCost; critic: MergeCritic },
): Promise<void> {
  
  
  const original = [...cluster] 
  const vivos = [...cluster].sort((a, b) => b.corpo.length - a.corpo.length)
  const dropados = new Set<number>()
  
  const tagsPorId = new Map<number, string[]>(cluster.map((c) => [c.id, [...c.tags]]))
  for (let i = 0; i < vivos.length; i++) {
    if (dropados.has(vivos[i].id)) continue
    for (let j = i + 1; j < vivos.length; j++) {
      if (dropados.has(vivos[j].id)) continue
      if (subconjuntoDe(vivos[j].corpo, vivos[i].corpo)) {
        dropados.add(vivos[j].id)
        const merged = uniao(tagsPorId.get(vivos[i].id) ?? [], tagsPorId.get(vivos[j].id) ?? [])
        tagsPorId.set(vivos[i].id, merged)
        await d.reject(db, importId, vivos[j].id)
      }
    }
  }
  
  const restantes = original.filter((v) => !dropados.has(v.id)).map((v) => ({ ...v, tags: tagsPorId.get(v.id) ?? v.tags }))
  
  if (restantes.length === 1) {
    const s = restantes[0]
    if (s.tags.length > 0) await d.edit(db, importId, s.id, formatCandidate(s.titulo, s.corpo), s.tags)
    return
  }
  if (restantes.length < 2) return

  
  const irmas = restantes.map((r) => ({ titulo: r.titulo, corpo: r.corpo }))
  const prompt = buildSiblingMergePrompt(irmas)
  const merged = await destilarMerge(d, prompt)
  if (!merged || merged.acao !== 'merge') return 

  
  const before = { body: irmas.map((s) => s.corpo).join('\n\n') } as unknown as Note
  const cand = { raw_content: formatCandidate(irmas[0].titulo, irmas[0].corpo) }
  let verdict = await auditSafe(d.critic, before, cand, merged.corpo)
  let corpoFinal = merged.corpo
  if (verdict.verdict === 'fixable') {
    const retry = await destilarMerge(d, buildRetryPrompt(prompt, [...verdict.lost_facts, ...verdict.placeholders]))
    if (retry && retry.acao === 'merge') {
      const v2 = await auditSafe(d.critic, before, cand, retry.corpo)
      if (v2.verdict === 'clean') { corpoFinal = retry.corpo; verdict = v2 }
      else return 
    } else return
  }
  if (verdict.verdict !== 'clean') return 

  
  const survivor = restantes[0]
  const tituloFinal = merged.titulo || survivor.titulo
  const tagsFinais = uniao(merged.tags, restantes.flatMap((r) => r.tags))
  await d.edit(db, importId, survivor.id, formatCandidate(tituloFinal, semTituloRepetido(corpoFinal, tituloFinal)), tagsFinais)
  for (const r of restantes.slice(1)) await d.reject(db, importId, r.id)
}

async function destilarMerge(
  d: { gen: typeof generateBackgroundObject; record: typeof recordCost },
  prompt: string,
): Promise<z.infer<typeof SiblingMergeSchema> | null> {
  try {
    const r = await d.gen({ schema: SiblingMergeSchema, prompt, reasoningEffort: 'low' })
    try {
      await d.record({
        kind: 'curator',
        model: r.model,
        promptTokens: r.usage.inputTokens ?? 0,
        completionTokens: r.usage.outputTokens ?? 0,
        cachedTokens: r.usage.cachedInputTokens ?? 0,
        agent: 'curador',
        tool: 'dedupMerge',
      })
    } catch {  }
    const parsed = SiblingMergeSchema.safeParse(r.object)
    return parsed.success ? parsed.data : null
  } catch (e) { console.warn('[dedupMerge] gen fail-open:', e); return null }
}

async function auditSafe(critic: MergeCritic, before: Note, cand: { raw_content: string }, proposed: string) {
  try { return await critic.audit({ before, candidate: cand, proposed: { body: proposed } }) }
  catch { return { lost_facts: [], duplicated_entities: [], placeholders: [], contradictions: ['crítico indisponível'], verdict: 'escalate' as const } }
}
