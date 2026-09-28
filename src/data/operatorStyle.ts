import { serverDb } from '@/server/supabase'
import { coerceStyleProfile, type StyleProfile, type StyleDials } from '@/lib/style'


export async function getStyleProfile(operatorId: string): Promise<StyleProfile> {
  const { data, error } = await serverDb()
    .from('operator_style')
    .select('dials, notas, learning_paused, last_change, updated_at')
    .eq('operator_id', operatorId)
    .maybeSingle()
  if (error) throw new Error(`getStyleProfile: ${error.message}`)
  if (!data) return coerceStyleProfile(null)
  return coerceStyleProfile({
    dials: data.dials,
    notas: data.notas,
    learningPaused: data.learning_paused,
    lastChange: data.last_change,
    updatedAt: data.updated_at,
  })
}

export interface SaveStyleInput {
  dials: StyleDials
  notas: string
  learningPaused: boolean
  lastChange: StyleProfile['lastChange']
}


export async function saveStyleProfile(operatorId: string, input: SaveStyleInput): Promise<void> {
  const { error } = await serverDb()
    .from('operator_style')
    .upsert({
      operator_id: operatorId,
      dials: input.dials,
      notas: input.notas,
      learning_paused: input.learningPaused,
      last_change: input.lastChange,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'operator_id' })
  if (error) throw new Error(`saveStyleProfile: ${error.message}`)
}
