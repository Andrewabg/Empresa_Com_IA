import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getUpdateStatus, STALE_APPLY_MS } from '@/server/updates/status'
import { applyUpdate } from '@/server/updates/apply'
import { claimSetting, releaseSetting, getSetting } from '@/data/settings'


const UPDATE_LOCK_KEY = 'update_lock'


export async function POST() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  
  const status = await getUpdateStatus()

  
  if (!status.updateAvailable) {
    return NextResponse.json({ error: 'Nada a atualizar.' }, { status: 409 })
  }

  
  
  if (!status.migrationsAuto) {
    return NextResponse.json(
      {
        error:
          'Configure SUPABASE_DB_URL no EasyPanel antes de atualizar com 1 clique — senão o app novo sobe contra o schema antigo. Veja DEPLOY.md §2.1.',
      },
      { status: 409 },
    )
  }

  
  if (status.state && ['baixando', 'extraindo', 'publicando'].includes(status.state.phase)) {
    return NextResponse.json({ error: 'Atualização já em andamento.' }, { status: 409 })
  }

  
  
  
  
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
  if (!claimed) {
    return NextResponse.json({ error: 'Atualização já em andamento.' }, { status: 409 })
  }

  
  
  
  try {
    await applyUpdate(status.latest as string)
  } catch {
    
    
    const errStatus = await getUpdateStatus()
    return NextResponse.json(errStatus, { status: 502 })
  } finally {
    await releaseSetting(UPDATE_LOCK_KEY).catch(() => {})
  }

  const final = await getUpdateStatus() 
  return NextResponse.json(final)
}
