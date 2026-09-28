import type { User } from '@supabase/supabase-js'


export function claimsToOperator(claims: {
  sub: string
  email?: string
  user_metadata?: Record<string, unknown>
  [k: string]: unknown
}): User {
  return {
    id: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    user_metadata: claims.user_metadata ?? {},
    app_metadata: {},
    aud: '',
    created_at: '',
  } as User
}
