import type { SupabaseClient } from '@supabase/supabase-js'


export function signupAllowed(count: number): boolean {
  return count === 0
}


export function podeSignup(boundOperatorId: string | null): boolean {
  return boundOperatorId === null
}


export async function operatorExists(db: SupabaseClient): Promise<boolean> {
  
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1 })
  if (error) {
    throw new Error(`[operatorExists] Admin API error: ${error.message}`)
  }
  return (data?.users?.length ?? 0) > 0
}


export function signupOutcome(session: unknown | null): 'enter' | 'confirm-email' {
  return session ? 'enter' : 'confirm-email'
}
