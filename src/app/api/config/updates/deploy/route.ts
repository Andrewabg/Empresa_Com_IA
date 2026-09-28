
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { setSetting } from '@/data/settings'
import { getUpdateStatus, setUpdateState } from '@/server/updates/status'
import { acionarDeploy, UPDATE_DEPLOY_TRIGGER_KEY } from '@/server/updates/apply'

export async function POST() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const webhook = await getSecret(SECRET_KEYS.easypanel_deploy_webhook)
  if (!webhook) {
    return NextResponse.json(
      { error: 'Salve o webhook de deploy aqui no painel para eu conseguir acionar a reconstrução.' },
      { status: 409 },
    )
  }

  const status = await getUpdateStatus()
  
  
  
  
  
  
  
  
  
  
  const alvo = status.state?.target ?? status.current ?? null
  const resultado = await acionarDeploy(webhook)
  const at = new Date().toISOString()
  await setSetting(
    UPDATE_DEPLOY_TRIGGER_KEY,
    JSON.stringify(resultado.ok ? { kind: 'fired', at } : { kind: 'failed', detail: resultado.detail, at }),
  )
  if (!resultado.ok) {
    return NextResponse.json({ ok: false, detail: resultado.detail }, { status: 502 })
  }
  
  
  if (alvo) await setUpdateState({ phase: 'aguardando_rebuild', target: alvo, at })
  return NextResponse.json({ ok: true })
}
