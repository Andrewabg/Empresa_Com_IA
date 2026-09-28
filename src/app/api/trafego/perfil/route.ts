
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getSetting } from '@/data/settings'
import { runAction } from '@/server/actions/actions'
import {
  discoverAllAccounts,
  resolveAccountId,
  ACCOUNT_SETTING_KEY,
} from '@/server/tools/trafego/buscarMetricas'
import { getAccountMemory, upsertAccountMemory } from '@/data/accountMemory'
import { mergeAccountMemory } from '@/lib/trafego/accountMemory'
import { parsePerfilBody } from '@/lib/trafego/perfilConta'

const AGENT_ID = 'gestor-trafego'

export async function POST(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = parsePerfilBody(raw)
  if ('erro' in parsed) {
    return NextResponse.json({ error: parsed.erro }, { status: 400 })
  }
  const { perfilConta } = parsed

  try {
    
    
    const accounts = await discoverAllAccounts({ operatorId: auth.id, actingAgentId: AGENT_ID }, runAction)
    const preferred = await getSetting(ACCOUNT_SETTING_KEY).catch(() => null)
    const accountId = resolveAccountId(accounts, preferred)
    if (!accountId) {
      return NextResponse.json(
        { error: 'Nenhuma conta de anúncios conectada. Conecte o Meta em Configurações primeiro.' },
        { status: 409 },
      )
    }

    
    
    const mem = await getAccountMemory(auth.id, accountId)
    const next = mergeAccountMemory(mem, { perfilConta }, { origem: 'operador', at: new Date().toISOString() })
    await upsertAccountMemory(auth.id, accountId, next)

    return NextResponse.json({ ok: true, perfilConta })
  } catch (err) {
    console.error('[POST /api/trafego/perfil]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
