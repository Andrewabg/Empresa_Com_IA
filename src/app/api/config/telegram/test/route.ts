

import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { getMe, setMyCommands } from '@/server/canais/telegram'
import { COMANDOS_BOT } from '@/lib/telegram/comandos'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  let body: { token?: string } = {}
  try { body = await request.json() } catch {  }
  const token = body.token?.trim() || (await getSecret(SECRET_KEYS.telegram_bot_token))
  if (!token) return Response.json({ ok: false, detail: 'Nenhum token informado ou salvo.' }, { status: 200 })
  try {
    const r = await getMe(token)
    
    
    
    if (r.ok) {
      try {
        const cmds = await setMyCommands(token, [...COMANDOS_BOT])
        if (!cmds.ok) console.warn('[config/telegram/test] setMyCommands falhou (segue):', cmds.erro)
      } catch (e) { console.warn('[config/telegram/test] setMyCommands lançou (segue):', e) }
    }
    return Response.json(r.ok ? { ok: true, username: r.username } : { ok: false, detail: r.detail })
  } catch (err) {
    console.error('[POST /api/config/telegram/test]', err)
    return Response.json({ ok: false, detail: 'Falha ao testar — tente de novo.' }, { status: 200 })
  }
}
