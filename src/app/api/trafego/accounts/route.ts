import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getSetting, setSetting } from '@/data/settings'
import { runAction } from '@/server/actions/actions'
import {
  discoverAllAccounts,
  resolveAccountId,
  ACCOUNT_SETTING_KEY,
} from '@/server/tools/trafego/buscarMetricas'
import { OBJETO_RE } from '@/lib/trafego/graph/tipos'


export async function GET() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    const accounts = await discoverAllAccounts({ operatorId: auth.id }, runAction)
    const preferred = await getSetting(ACCOUNT_SETTING_KEY).catch(() => null)
    return NextResponse.json({ ok: true, accounts, selectedId: resolveAccountId(accounts, preferred) })
  } catch (err) {
    console.error('[GET /api/trafego/accounts]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


export async function POST(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  let accountId: unknown
  try {
    accountId = ((await request.json()) as { accountId?: unknown }).accountId
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof accountId !== 'string' || !accountId.trim()) {
    return NextResponse.json({ error: 'accountId obrigatório' }, { status: 400 })
  }
  
  
  if (!OBJETO_RE.test(accountId.trim())) {
    return NextResponse.json({ error: 'accountId inválido' }, { status: 400 })
  }
  try {
    await setSetting(ACCOUNT_SETTING_KEY, accountId.trim())
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/trafego/accounts]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
