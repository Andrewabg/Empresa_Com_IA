import type { SupabaseClient } from '@supabase/supabase-js'






let _cachedOperatorId: string | null = null


export function sessionMatchesOperator(
  boundId: string | null,
  sub: string | undefined | null,
): boolean {
  if (!boundId) return true
  return !!sub && sub === boundId
}


export async function getBoundOperatorId(db: SupabaseClient): Promise<string | null> {
  if (_cachedOperatorId) return _cachedOperatorId
  const { data, error } = await db
    .from('operator_identity')
    .select('user_id')
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[operatorIdentity] leitura falhou (tratando como não-vinculado):', error.message)
    return null
  }
  _cachedOperatorId = (data?.user_id as string | undefined) ?? null
  return _cachedOperatorId
}


export async function bindOperatorIdentity(db: SupabaseClient, userId: string): Promise<void> {
  const { error } = await db
    .from('operator_identity')
    .insert({ singleton: true, user_id: userId })
  if (error && error.code !== '23505') {
    
    console.error('[operatorIdentity] bind falhou:', error.message)
    return
  }
  
  const bound = await getBoundOperatorId(db)
  _cachedOperatorId = bound ?? userId
}
