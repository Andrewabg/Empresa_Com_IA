import type { NextCookieStore } from '@/server/supabase'
import type { User } from '@supabase/supabase-js'
import { getMembro, requireMembro } from './membro'


export async function getOperator(cookies: NextCookieStore): Promise<User | null> {
  return (await getMembro(cookies))?.user ?? null
}


export async function requireOperator(cookies: NextCookieStore): Promise<User> {
  return (await requireMembro(cookies)).user
}
