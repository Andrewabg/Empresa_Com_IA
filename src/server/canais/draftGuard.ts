

import type { NextCookieStore } from '@/server/supabase'
import { requireOperator } from '@/server/auth/session'
import { ehAgenteDeCanal } from './ehAgenteDeCanal'

export type GuardResult = { ok: true; userId: string } | { ok: false; status: 401 | 404 }


export async function guardCanalDraft(
  cookies: NextCookieStore,
  agentId: string,
): Promise<GuardResult> {
  let userId: string
  try {
    userId = (await requireOperator(cookies)).id
  } catch {
    return { ok: false, status: 401 }
  }
  if (!(await ehAgenteDeCanal(agentId))) return { ok: false, status: 404 }
  return { ok: true, userId }
}
