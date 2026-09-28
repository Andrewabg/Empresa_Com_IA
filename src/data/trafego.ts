import { serverDb } from '../server/supabase'
import type { BlocoType } from '../lib/trafego/types'
import { compararBlocos } from '../lib/trafego/painel-reducer'

export interface SnapshotRow {
  id: string
  operator_id: string
  source: string
  level: 'account' | 'campaign' | 'adset' | 'ad'
  entity_id: string
  entity_name: string | null
  period_start: string
  period_end: string
  metrics: Record<string, unknown>
  fetched_at: string
  
  granularity?: 'day' | 'window' | 'consulta'
}

export interface BlocoRow {
  id: string
  operator_id: string
  agent_id: string
  type: BlocoType
  config: Record<string, unknown>
  snapshot_id: string | null
  annotation: string | null
  position: number
  status: 'active' | 'done'
  created_at: string
  updated_at: string
}


export async function createSnapshot(
  input: Omit<SnapshotRow, 'id' | 'fetched_at'>,
): Promise<SnapshotRow> {
  const { data, error } = await serverDb()
    .from('metric_snapshots')
    .insert({
      operator_id: input.operator_id,
      source: input.source,
      level: input.level,
      entity_id: input.entity_id,
      entity_name: input.entity_name ?? null,
      period_start: input.period_start,
      period_end: input.period_end,
      metrics: input.metrics ?? {},
      ...(input.granularity ? { granularity: input.granularity } : {}),
    })
    .select()
    .single()
  if (error) throw new Error(`createSnapshot: ${error.message}`)
  return data as SnapshotRow
}


export async function createSnapshotsEmLote(
  inputs: Array<Omit<SnapshotRow, 'id' | 'fetched_at'>>,
): Promise<number> {
  if (inputs.length === 0) return 0
  const { error } = await serverDb().from('metric_snapshots').insert(
    inputs.map((input) => ({
      operator_id: input.operator_id,
      source: input.source,
      level: input.level,
      entity_id: input.entity_id,
      entity_name: input.entity_name ?? null,
      period_start: input.period_start,
      period_end: input.period_end,
      metrics: input.metrics ?? {},
      ...(input.granularity ? { granularity: input.granularity } : {}),
    })),
  )
  if (error) throw new Error(`createSnapshotsEmLote: ${error.message}`)
  return inputs.length
}


export async function substituirSnapshotsConsulta(
  inputs: Array<Omit<SnapshotRow, 'id' | 'fetched_at'>>,
): Promise<number> {
  if (inputs.length === 0) return 0
  const db = serverDb()
  const porChave = new Map<string, string[]>()
  for (const i of inputs) {
    const k = `${i.operator_id}|${i.level}`
    porChave.set(k, [...(porChave.get(k) ?? []), i.entity_id])
  }
  for (const [k, ids] of porChave) {
    const [operator_id, level] = k.split('|')
    const { error } = await db.from('metric_snapshots').delete()
      .eq('operator_id', operator_id).eq('level', level).eq('granularity', 'consulta').in('entity_id', ids)
    if (error) throw new Error(`substituirSnapshotsConsulta: ${error.message}`)
  }
  return createSnapshotsEmLote(inputs.map((i) => ({ ...i, granularity: 'consulta' as const })))
}


export async function listSnapshotsDasEntidades(
  operatorId: string,
  level: SnapshotRow['level'],
  entityIds: string[],
  granularities: ReadonlyArray<'window' | 'consulta'>,
): Promise<SnapshotRow[]> {
  if (entityIds.length === 0 || granularities.length === 0) return []
  const { data, error } = await serverDb()
    .from('metric_snapshots')
    .select()
    .eq('operator_id', operatorId)
    .eq('level', level)
    .in('entity_id', entityIds)
    .in('granularity', [...granularities])
    .order('fetched_at', { ascending: false })
  if (error) throw new Error(`listSnapshotsDasEntidades: ${error.message}`)
  return (data ?? []) as SnapshotRow[]
}


export async function listLatestSnapshots(
  operatorId: string,
  level: SnapshotRow['level'],
  limit = 20,
  granularity: 'day' | 'window' = 'window',
): Promise<SnapshotRow[]> {
  const { data, error } = await serverDb()
    .from('metric_snapshots')
    .select()
    .eq('operator_id', operatorId)
    .eq('level', level)
    .eq('granularity', granularity)
    .order('fetched_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listLatestSnapshots: ${error.message}`)
  return (data ?? []) as SnapshotRow[]
}


export async function getUltimoSnapshotDaEntidade(
  operatorId: string,
  level: SnapshotRow['level'],
  entityId: string,
  granularidades: ReadonlyArray<'day' | 'window' | 'consulta'> = ['day', 'window'],
): Promise<SnapshotRow | null> {
  const { data, error } = await serverDb()
    .from('metric_snapshots')
    .select()
    .eq('operator_id', operatorId)
    .eq('level', level)
    .eq('entity_id', entityId)
    .in('granularity', [...granularidades])
    .order('fetched_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(`getUltimoSnapshotDaEntidade: ${error.message}`)
  return ((data ?? [])[0] as SnapshotRow | undefined) ?? null
}


const PAGINA_DE_SNAPSHOTS = 1000

export async function listDailySnapshots(
  operatorId: string,
  level: SnapshotRow['level'],
  sinceISO: string,
  untilISO: string,
  entityId?: string,
): Promise<SnapshotRow[]> {
  
  
  const out: SnapshotRow[] = []
  for (let de = 0; ; de += PAGINA_DE_SNAPSHOTS) {
    let query = serverDb()
      .from('metric_snapshots')
      .select()
      .eq('operator_id', operatorId)
      .eq('level', level)
      .eq('granularity', 'day')
      .gte('period_start', sinceISO)
      .lte('period_start', untilISO)
    if (entityId) query = query.eq('entity_id', entityId)
    const { data, error } = await query
      .order('period_start', { ascending: true })
      .order('id', { ascending: true })
      .range(de, de + PAGINA_DE_SNAPSHOTS - 1)
    if (error) throw new Error(`listDailySnapshots: ${error.message}`)
    const pagina = (data ?? []) as SnapshotRow[]
    out.push(...pagina)
    if (pagina.length < PAGINA_DE_SNAPSHOTS) break
  }
  return out
}


export async function listOperadoresComTrafego(desdeISO: string): Promise<string[]> {
  const { data, error } = await serverDb().from('metric_snapshots')
    .select('operator_id').eq('level', 'account').eq('granularity', 'day').gte('period_start', desdeISO)
  if (error) throw new Error(`listOperadoresComTrafego: ${error.message}`)
  return [...new Set((data ?? []).map((r) => (r as { operator_id: string }).operator_id))]
}


export async function upsertDailySnapshot(
  input: Omit<SnapshotRow, 'id' | 'fetched_at' | 'granularity'>,
): Promise<void> {
  const db = serverDb()
  const { data: existing } = await db
    .from('metric_snapshots')
    .select('id')
    .eq('operator_id', input.operator_id)
    .eq('source', input.source)
    .eq('level', input.level)
    .eq('entity_id', input.entity_id)
    .eq('period_start', input.period_start)
    .eq('granularity', 'day')
    .maybeSingle()
  if (existing) {
    const { error } = await db
      .from('metric_snapshots')
      .update({
        metrics: input.metrics ?? {},
        entity_name: input.entity_name ?? null,
        period_end: input.period_end,
        fetched_at: new Date().toISOString(),
      })
      .eq('id', (existing as { id: string }).id)
    if (error) throw new Error(`upsertDailySnapshot(update): ${error.message}`)
  } else {
    const { error } = await db
      .from('metric_snapshots')
      .insert({ ...input, granularity: 'day' })
    if (error) throw new Error(`upsertDailySnapshot(insert): ${error.message}`)
  }
}


export async function getSnapshotsByIds(
  operatorId: string,
  ids: string[],
): Promise<SnapshotRow[]> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))]
  if (unique.length === 0) return []
  const { data, error } = await serverDb()
    .from('metric_snapshots')
    .select()
    .eq('operator_id', operatorId)
    .in('id', unique)
  if (error) throw new Error(`getSnapshotsByIds: ${error.message}`)
  return (data ?? []) as SnapshotRow[]
}



async function comOrigemPreservada(
  db: ReturnType<typeof serverDb>,
  input: Partial<BlocoRow> & { operator_id: string },
): Promise<unknown> {
  const novo = input.config
  if (novo && typeof novo === 'object' && 'origem' in (novo as Record<string, unknown>)) return novo
  try {
    const { data, error } = await db
      .from('painel_blocos')
      .select('config')
      .eq('id', input.id as string)
      .eq('operator_id', input.operator_id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    const origem = (data as { config?: { origem?: unknown } } | null)?.config?.origem
    
    if (origem !== ORIGEM_DA_NOTA_DA_INVESTIGACAO) return novo
    return { ...(novo && typeof novo === 'object' ? (novo as Record<string, unknown>) : {}), origem }
  } catch (e) {
    console.warn('[upsertBloco] leitura para preservar a origem falhou (não-fatal):', e)
    return novo
  }
}

export async function upsertBloco(
  input: Partial<BlocoRow> & { operator_id: string; type: BlocoType },
): Promise<BlocoRow> {
  const db = serverDb()
  if (input.id) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.agent_id !== undefined) patch.agent_id = input.agent_id
    if (input.type !== undefined) patch.type = input.type
    
    
    
    
    
    
    if (input.config !== undefined) patch.config = await comOrigemPreservada(db, input)
    if (input.snapshot_id !== undefined) patch.snapshot_id = input.snapshot_id
    if (input.annotation !== undefined) patch.annotation = input.annotation
    if (input.position !== undefined) patch.position = input.position
    if (input.status !== undefined) patch.status = input.status
    const { data, error } = await db
      .from('painel_blocos')
      .update(patch)
      .eq('id', input.id)
      .eq('operator_id', input.operator_id)
      .select()
      .single()
    if (error) throw new Error(`upsertBloco(update): ${error.message}`)
    return data as BlocoRow
  }
  const { data, error } = await db
    .from('painel_blocos')
    .insert({
      operator_id: input.operator_id,
      agent_id: input.agent_id ?? 'gestor-trafego',
      type: input.type,
      config: input.config ?? {},
      snapshot_id: input.snapshot_id ?? null,
      annotation: input.annotation ?? null,
      position: input.position ?? 0,
      status: input.status ?? 'active',
    })
    .select()
    .single()
  if (error) throw new Error(`upsertBloco(insert): ${error.message}`)
  return data as BlocoRow
}


export async function removeBloco(id: string, operatorId: string): Promise<void> {
  const { error } = await serverDb()
    .from('painel_blocos')
    .delete()
    .eq('id', id)
    .eq('operator_id', operatorId)
  if (error) throw new Error(`removeBloco: ${error.message}`)
}


export async function clearBlocos(operatorId: string, agentId: string): Promise<string[]> {
  const db = serverDb()
  const { data: linhas, error: erroDaLeitura } = await db
    .from('painel_blocos')
    .select('id, type, config')
    .eq('operator_id', operatorId)
    .eq('agent_id', agentId)
  if (erroDaLeitura) throw new Error(`clearBlocos: ${erroDaLeitura.message}`)
  const alvos = (linhas ?? [])
    .filter((r) => !ehNotaDaInvestigacao(r as { type?: string; config?: unknown }))
    .map((r) => (r as { id: string }).id)
  if (alvos.length === 0) return []
  const { data, error } = await db
    .from('painel_blocos')
    .delete()
    .eq('operator_id', operatorId)
    .eq('agent_id', agentId)
    .in('id', alvos)
    .select('id')
  if (error) throw new Error(`clearBlocos: ${error.message}`)
  return (data ?? []).map((r) => (r as { id: string }).id)
}


export function ehNotaDaInvestigacao(row: { type?: string | null; config?: unknown }): boolean {
  if (row.type !== 'note') return false
  const config = row.config
  return !!config && typeof config === 'object'
    && (config as { origem?: unknown }).origem === ORIGEM_DA_NOTA_DA_INVESTIGACAO
}


export const MAX_NOTAS_DA_INVESTIGACAO = 5


export const ORIGEM_DA_NOTA_DA_INVESTIGACAO = 'investigacao'


export const POSICAO_DA_NOTA_DA_INVESTIGACAO = 1


export async function gravarNotaDaInvestigacao(operatorId: string, annotation: string): Promise<BlocoRow> {
  const row = await upsertBloco({
    operator_id: operatorId,
    type: 'note',
    config: { origem: ORIGEM_DA_NOTA_DA_INVESTIGACAO },
    annotation,
    position: POSICAO_DA_NOTA_DA_INVESTIGACAO,
  })
  try {
    const db = serverDb()
    const { data, error } = await db
      .from('painel_blocos')
      .select('id')
      .eq('operator_id', operatorId)
      .eq('type', 'note')
      .contains('config', { origem: ORIGEM_DA_NOTA_DA_INVESTIGACAO })
      
      
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
    if (error) throw new Error(error.message)
    const excedentes = (data ?? []).slice(MAX_NOTAS_DA_INVESTIGACAO).map((r) => (r as { id: string }).id)
    if (excedentes.length > 0) {
      const { error: erroDaPoda } = await db
        .from('painel_blocos')
        .delete()
        .eq('operator_id', operatorId)
        .in('id', excedentes)
      if (erroDaPoda) throw new Error(erroDaPoda.message)
    }
  } catch (e) {
    console.warn('[gravarNotaDaInvestigacao] poda das notas antigas falhou (não-fatal):', e)
  }
  return row
}


export async function getBlocoById(operatorId: string, id: string): Promise<BlocoRow | null> {
  const { data, error } = await serverDb()
    .from('painel_blocos')
    .select()
    .eq('id', id)
    .eq('operator_id', operatorId)
    .maybeSingle()
  if (error) throw new Error(`getBlocoById: ${error.message}`)
  return (data as BlocoRow | null) ?? null
}


export async function listBlocos(operatorId: string, agentId: string): Promise<BlocoRow[]> {
  const { data, error } = await serverDb()
    .from('painel_blocos')
    .select()
    .eq('operator_id', operatorId)
    .eq('agent_id', agentId)
  if (error) throw new Error(`listBlocos: ${error.message}`)
  return ((data ?? []) as BlocoRow[]).sort(compararBlocos)
}


export async function setBlocoStatus(
  id: string,
  operatorId: string,
  status: 'active' | 'done',
): Promise<BlocoRow> {
  const { data, error } = await serverDb()
    .from('painel_blocos')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('operator_id', operatorId)
    .select()
    .single()
  if (error) throw new Error(`setBlocoStatus: ${error.message}`)
  return data as BlocoRow
}
