import { serverDb } from '../server/supabase'
import type { ChannelConfigDelta, ChannelConfigSnapshot } from '@/lib/canais/configSnapshot'

export interface DraftRow {
  agent_id: string
  delta: ChannelConfigDelta
  base_snapshot: ChannelConfigSnapshot
  updated_at: string
  updated_by: string | null
}

export async function getDraft(agentId: string): Promise<DraftRow | null> {
  const { data, error } = await serverDb()
    .from('agent_config_drafts')
    .select('agent_id, delta, base_snapshot, updated_at, updated_by')
    .eq('agent_id', agentId)
    .maybeSingle()
  if (error) throw new Error(`getDraft: ${error.message}`)
  return (data as DraftRow | null) ?? null
}

export async function upsertDraft(
  agentId: string, delta: ChannelConfigDelta, baseSnapshot: ChannelConfigSnapshot, updatedBy: string | null,
): Promise<DraftRow> {
  const { data, error } = await serverDb()
    .from('agent_config_drafts')
    .upsert(
      { agent_id: agentId, delta, base_snapshot: baseSnapshot, updated_at: new Date().toISOString(), updated_by: updatedBy },
      { onConflict: 'agent_id' },
    )
    .select('agent_id, delta, base_snapshot, updated_at, updated_by')
    .single()
  if (error) throw new Error(`upsertDraft: ${error.message}`)
  return data as DraftRow
}

export async function deleteDraft(agentId: string): Promise<void> {
  const { error } = await serverDb().from('agent_config_drafts').delete().eq('agent_id', agentId)
  if (error) throw new Error(`deleteDraft: ${error.message}`)
}

export async function insertVersion(agentId: string, snapshot: ChannelConfigSnapshot, publishedBy: string | null): Promise<void> {
  const { error } = await serverDb()
    .from('agent_config_versions')
    .insert({ agent_id: agentId, snapshot, published_by: publishedBy })
  if (error) throw new Error(`insertVersion: ${error.message}`)
}

export async function latestVersion(agentId: string): Promise<ChannelConfigSnapshot | null> {
  const { data, error } = await serverDb()
    .from('agent_config_versions')
    .select('snapshot')
    .eq('agent_id', agentId)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`latestVersion: ${error.message}`)
  return (data?.snapshot as ChannelConfigSnapshot | null) ?? null
}
