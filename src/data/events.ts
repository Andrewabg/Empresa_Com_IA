import { serverDb } from '../server/supabase'
import type { LiveEvent } from '../mock/types'


export interface EventRow {
  id: string
  type: 'memory' | 'action' | 'tool'
  label: string
  agent: string | null
  created_at: string
}


export function rowToSeedEvent(row: EventRow): LiveEvent {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    at: Date.parse(row.created_at),
    agent: row.agent,
  }
}

export interface RecordEventInput {
  id: string
  type: 'memory' | 'action' | 'tool'
  label: string
  agent?: string
  
  created_at?: string
}


export async function recordEvent(input: RecordEventInput): Promise<void> {
  const db = serverDb()
  const row: Record<string, unknown> = {
    id: input.id,
    type: input.type,
    label: input.label,
    agent: input.agent ?? null,
  }
  if (input.created_at !== undefined) {
    row['created_at'] = input.created_at
  }
  const { error } = await db.from('events').upsert(
    row,
    { onConflict: 'id', ignoreDuplicates: true },
  )
  if (error) throw new Error(`recordEvent: ${error.message}`)
}


export async function listRecentEvents(limit = 30): Promise<EventRow[]> {
  const db = serverDb()
  const { data, error } = await db
    .from('events')
    .select('id, type, label, agent, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`listRecentEvents: ${error.message}`)
  return (data ?? []) as EventRow[]
}
