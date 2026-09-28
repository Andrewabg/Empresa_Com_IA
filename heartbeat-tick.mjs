










const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
const port = process.env.PORT ?? '3000'

async function main() {
  if (!url || !svc) {
    console.warn('[heartbeat-tick] SUPABASE_URL / SERVICE_ROLE_KEY ausentes — pulando')
    return
  }

  
  let secret = null
  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/get_secret`, {
      method: 'POST',
      headers: { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_name: 'cron_secret' }),
      signal: AbortSignal.timeout(15_000), 
    })
    if (!r.ok) { console.warn(`[heartbeat-tick] get_secret HTTP ${r.status} — pulando`); return }
    const body = await r.json()
    secret = typeof body === 'string' ? body : null
  } catch (e) {
    console.warn('[heartbeat-tick] get_secret falhou (fail-open):', e?.message ?? e)
    return
  }

  if (!secret) {
    
    console.warn('[heartbeat-tick] cron_secret não configurado ainda — pulando')
    return
  }

  
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/heartbeat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      
      
      
      signal: AbortSignal.timeout(120_000),
    })
    console.log(`[heartbeat-tick] /api/heartbeat -> ${r.status}`)
  } catch (e) {
    console.warn('[heartbeat-tick] chamada ao heartbeat falhou (fail-open):', e?.message ?? e)
  }
}

await main()
