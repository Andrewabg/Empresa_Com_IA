import { serverDb } from '../server/supabase'
import type { Diretriz } from '@/lib/directives'
import { norm } from '@/lib/directives'

export interface DirectivesRow { diretrizes: Diretriz[]; updatedAt: string | null }


export async function getDirectives(agentId: string): Promise<DirectivesRow> {
  const { data, error } = await serverDb()
    .from('agent_directives')
    .select('diretrizes, updated_at')
    .eq('agent_id', agentId)
    .maybeSingle()
  if (error) throw new Error(`getDirectives: ${error.message}`)
  if (!data) return { diretrizes: [], updatedAt: null }
  return { diretrizes: (data.diretrizes ?? []) as Diretriz[], updatedAt: data.updated_at as string }
}


export async function upsertDirectives(agentId: string, diretrizes: Diretriz[]): Promise<void> {
  const { error } = await serverDb()
    .from('agent_directives')
    .upsert(
      { agent_id: agentId, diretrizes, updated_at: new Date().toISOString() },
      { onConflict: 'agent_id' },
    )
  if (error) throw new Error(`upsertDirectives: ${error.message}`)
}


export async function removeDirective(agentId: string, texto: string): Promise<void> {
  const { diretrizes } = await getDirectives(agentId)
  const alvoNorm = norm(texto)
  const filtrada = diretrizes.filter((d) => norm(d.texto) !== alvoNorm)
  if (filtrada.length === diretrizes.length) return 
  await upsertDirectives(agentId, filtrada)
}
