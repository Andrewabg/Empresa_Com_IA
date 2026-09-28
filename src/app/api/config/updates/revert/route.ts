

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getUpdateStatus, STALE_APPLY_MS } from '@/server/updates/status'
import { revertUpdate } from '@/server/updates/revert'
import { claimSetting, releaseSetting, getSetting } from '@/data/settings'

const UPDATE_LOCK_KEY = 'update_lock'

export async function POST() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const lockValue = new Date().toISOString()
  let claimed = await claimSetting(UPDATE_LOCK_KEY, lockValue)
  if (!claimed) {
    const existing = await getSetting(UPDATE_LOCK_KEY)
    const heldSince = existing ? Date.parse(existing) : NaN
    if (Number.isNaN(heldSince) || Date.now() - heldSince > STALE_APPLY_MS) {
      await releaseSetting(UPDATE_LOCK_KEY)
      claimed = await claimSetting(UPDATE_LOCK_KEY, lockValue)
    }
  }
  if (!claimed) return NextResponse.json({ error: 'Operação de update em andamento.' }, { status: 409 })

  try {
    await revertUpdate()
  } catch {
    const errStatus = await getUpdateStatus()
    return NextResponse.json(errStatus, { status: 502 }) 
  } finally {
    await releaseSetting(UPDATE_LOCK_KEY).catch(() => {})
  }
  return NextResponse.json(await getUpdateStatus())
}
