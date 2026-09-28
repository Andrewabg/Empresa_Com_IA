

import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { getSecret, setSecret, SECRET_KEYS } from '@/server/secrets'
import { setSetting, getSettings } from '@/data/settings'
import { gerarCodigo, PAIRING_TTL_MS, type PairingState } from '@/lib/proativo/pareamento'
import { setMyCommands } from '@/server/canais/telegram'
import { COMANDOS_BOT } from '@/lib/telegram/comandos'
import { QUIET_DEFAULT, type NotifPrefs } from '@/lib/proativo/politica'
import { aplicarAjusteNotificacoes } from '@/server/proativo/prefs'

export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    const [token, settings] = await Promise.all([
      getSecret(SECRET_KEYS.telegram_bot_token),
      
      getSettings(['telegram_owner_chat', 'telegram_pairing', 'telegram_poll_last_seen', 'telegram_poll_last_error', 'app_public_url', 'notificacao_prefs']),
    ])
    const ownerRaw = settings.get('telegram_owner_chat') ?? null
    const pairingRaw = settings.get('telegram_pairing') ?? null
    const lastSeen = settings.get('telegram_poll_last_seen') ?? null
    const lastError = settings.get('telegram_poll_last_error') ?? null
    const appUrl = settings.get('app_public_url') ?? null
    let pairing: { code: string; expiresAt: string } | null = null
    try {
      const p = pairingRaw ? (JSON.parse(pairingRaw) as PairingState) : null
      if (p && Date.parse(p.expiresAt) > Date.now()) pairing = { code: p.code, expiresAt: p.expiresAt }
    } catch {  }
    
    
    
    let quietHours: { inicio: string; fim: string } = QUIET_DEFAULT
    try {
      const prefsRaw = settings.get('notificacao_prefs')
      const prefs = prefsRaw ? (JSON.parse(prefsRaw) as NotifPrefs) : {}
      if (typeof prefs.quietHours?.inicio === 'string' && typeof prefs.quietHours?.fim === 'string') {
        quietHours = prefs.quietHours
      }
    } catch {  }
    return Response.json({
      ok: true,
      status: { telegram_bot_token: Boolean(token) },
      pareado: Boolean(ownerRaw),
      pairing,
      pollLastSeen: lastSeen,
      pollLastError: lastError || null, 
      
      
      
      
      
      pollDesligadoPorConfig: process.env.TELEGRAM_ENABLED === '0',
      appPublicUrl: appUrl,
      quietHours,
    })
  } catch (err) {
    console.error('[GET /api/config/telegram]', err)
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }) }
  try {
    if (typeof body.telegram_bot_token === 'string' && body.telegram_bot_token.trim()) {
      const token = body.telegram_bot_token.trim()
      await setSecret(SECRET_KEYS.telegram_bot_token, token)
      
      
      try {
        const r = await setMyCommands(token, [...COMANDOS_BOT])
        if (!r.ok) console.warn('[config/telegram] setMyCommands falhou (segue):', r.erro)
      } catch (e) { console.warn('[config/telegram] setMyCommands lançou (segue):', e) }
    }
    if (typeof body.app_public_url === 'string') {
      const trimmed = body.app_public_url.trim()
      if (trimmed) {
        try {
          const u = new URL(trimmed)
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            return Response.json({ ok: false, error: 'URL inválida — use http(s)://...' }, { status: 400 })
          }
        } catch {
          return Response.json({ ok: false, error: 'URL inválida — use http(s)://...' }, { status: 400 })
        }
      }
      await setSetting('app_public_url', trimmed)
    }
    
    
    
    
    if (body.quietHours !== undefined) {
      const q = body.quietHours as { inicio?: unknown; fim?: unknown } | null
      const inicio = typeof q?.inicio === 'string' ? q.inicio.trim() : ''
      const fim = typeof q?.fim === 'string' ? q.fim.trim() : ''
      const r = await aplicarAjusteNotificacoes({ quietHours: { inicio, fim } })
      if (!r.ok) return Response.json({ ok: false, error: r.resumo }, { status: 400 })
    }
    if (body.gerar_codigo === true) {
      
      const tokenAtual = await getSecret(SECRET_KEYS.telegram_bot_token)
      if (!tokenAtual) {
        return Response.json(
          { ok: false, error: 'Salve o token do bot antes de gerar o código.' },
          { status: 400 },
        )
      }
      const state: PairingState = {
        code: gerarCodigo(() => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32),
        expiresAt: new Date(Date.now() + PAIRING_TTL_MS).toISOString(),
        tentativas: 0,
        operatorId: auth.user.id, 
      }
      await setSetting('telegram_pairing', JSON.stringify(state))
      return Response.json({ ok: true, pairing: { code: state.code, expiresAt: state.expiresAt } })
    }
    if (body.desparear === true) {
      await setSetting('telegram_owner_chat', '')
      await setSetting('telegram_pairing', '')
    }
    const token = await getSecret(SECRET_KEYS.telegram_bot_token)
    return Response.json({ ok: true, status: { telegram_bot_token: Boolean(token) } })
  } catch (err) {
    console.error('[POST /api/config/telegram]', err)
    return Response.json({ ok: false, error: 'Não foi possível salvar. Tente de novo.' }, { status: 500 })
  }
}
