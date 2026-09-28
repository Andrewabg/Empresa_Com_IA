

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { setSecret, getSecret, getConfigStatus, SECRET_KEYS } from '@/server/secrets'
import { listCanais } from '@/data/canais'
import { listAgentsSummary } from '@/data/agents'
import { baseUrlDaRequisicao } from '@/lib/public-url'
import { getSetting } from '@/data/settings'

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireDonoApi(cookieStore)
  if (auth instanceof Response) return auth

  const [status, canais, verifyToken, agents, empresa] = await Promise.all([
    getConfigStatus(),
    listCanais(),
    getSecret(SECRET_KEYS.whatsapp_verify_token),
    listAgentsSummary(),
    getSetting('company_name').catch(() => null),
  ])

  
  
  const webhookUrl = `${baseUrlDaRequisicao(request)}/api/canais/whatsapp/webhook`

  return NextResponse.json({
    ok: true,
    status: {
      whatsapp_access_token: status.whatsapp_access_token,
      whatsapp_app_secret: status.whatsapp_app_secret,
      whatsapp_verify_token: status.whatsapp_verify_token,
      whatsapp_waba_id: status.whatsapp_waba_id,
    },
    canais,
    webhookUrl,
    verifyToken,
    empresa: empresa ?? '',
    
    
    agentes: agents
      .filter((a) => a.enabled)
      .map((a) => ({ id: a.id, name: a.name, is_primary: a.is_primary })),
  })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const auth = await requireDonoApi(cookieStore)
  if (auth instanceof Response) return auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const allowed = [
    SECRET_KEYS.whatsapp_access_token,
    SECRET_KEYS.whatsapp_app_secret,
    SECRET_KEYS.whatsapp_verify_token,
    SECRET_KEYS.whatsapp_waba_id,
  ] as const

  
  await Promise.all(
    allowed.flatMap((key) => {
      const value = body[key]
      return typeof value === 'string' && value.trim().length > 0
        ? [setSecret(key, value.trim())]
        : []
    }),
  )

  
  let gerouVerify = false
  if (body.gerar_verify_token === true) {
    const existing = await getSecret(SECRET_KEYS.whatsapp_verify_token)
    if (!existing) {
      await setSecret(SECRET_KEYS.whatsapp_verify_token, crypto.randomUUID())
      gerouVerify = true
    }
  }

  const status = await getConfigStatus()
  return NextResponse.json({
    ok: true,
    gerou_verify: gerouVerify,
    status: {
      whatsapp_access_token: status.whatsapp_access_token,
      whatsapp_app_secret: status.whatsapp_app_secret,
      whatsapp_verify_token: status.whatsapp_verify_token,
      whatsapp_waba_id: status.whatsapp_waba_id,
    },
  })
}
