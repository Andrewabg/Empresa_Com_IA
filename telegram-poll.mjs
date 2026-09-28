




const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
const port = process.env.PORT ?? '3000'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function cronSecret() {
  const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/get_secret`, {
    method: 'POST',
    headers: { apikey: svc, Authorization: `Bearer ${svc}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_name: 'cron_secret' }),
    signal: AbortSignal.timeout(15_000), 
  })
  if (!r.ok) return null
  const body = await r.json()
  return typeof body === 'string' ? body : null
}

let atraso = 1_000
async function main() {
  if (!url || !svc) {
    
    
    console.warn('[telegram-poll] SUPABASE_URL / SERVICE_ROLE_KEY ausentes — dormindo 5min antes de encerrar')
    await sleep(300_000)
    return
  }
  for (;;) {
    try {
      const secret = await cronSecret()
      if (!secret) { console.warn('[telegram-poll] cron_secret ausente — aguardando config'); await sleep(60_000); continue }
      const r = await fetch(`http://127.0.0.1:${port}/api/telegram/poll`, {
        method: 'POST', headers: { Authorization: `Bearer ${secret}` },
        
        
        
        
        
        
        
        
        
        
        
        signal: AbortSignal.timeout(420_000),
      })
      if (!r.ok) { console.warn(`[telegram-poll] rota -> ${r.status}`); atraso = Math.min(atraso * 2, 60_000); await sleep(atraso); continue }
      const body = await r.json().catch(() => ({}))
      if (body.disabled) { atraso = 1_000; await sleep(60_000); continue } 
      if (body.erro) { console.warn('[telegram-poll] getUpdates erro (backoff):', body.erro); atraso = Math.min(atraso * 2, 60_000); await sleep(atraso); continue } 
      atraso = 1_000 
    } catch (e) {
      console.warn('[telegram-poll] erro (backoff):', e?.message ?? e)
      atraso = Math.min(atraso * 2, 60_000)
      await sleep(atraso)
    }
  }
}

await main()
