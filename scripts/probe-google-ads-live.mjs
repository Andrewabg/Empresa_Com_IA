




import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, '..', 'tests', 'fixtures', 'google-ads')

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !svc) { console.error('MISSING_ENV'); process.exit(1) }
const db = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
const getSecret = async (n) => (await db.rpc('get_secret', { p_name: n })).data

const brief = (e) => (e instanceof Error ? e.message : String(e)).replace(/\s+/g, ' ').slice(0, 400)
function save(file, obj) {
  mkdirSync(FIXTURE_DIR, { recursive: true })
  writeFileSync(join(FIXTURE_DIR, file), JSON.stringify(obj, null, 2) + '\n', 'utf8')
  console.log('  WROTE tests/fixtures/google-ads/' + file)
}

function sanitize(v) {
  if (Array.isArray(v)) return v.map(sanitize)
  if (v && typeof v === 'object') {
    const o = {}
    for (const [k, val] of Object.entries(v)) {
      if (/name|descriptive/i.test(k) && typeof val === 'string') o[k] = 'Demo'
      else if (/^(id|customerId|resourceName)$/i.test(k) && typeof val === 'string') o[k] = val.replace(/\d{4,}/g, '000')
      else o[k] = sanitize(val)
    }
    return o
  }
  if (typeof v === 'string') return v.replace(/customers\/\d+/g, 'customers/000')
  return v
}

async function main() {
  console.log('=== PROBE google-ads LIVE ===')
  const [devToken, clientId, clientSecret, refreshToken, customerId] = await Promise.all([
    getSecret('google_ads_developer_token'), getSecret('google_ads_client_id'),
    getSecret('google_ads_client_secret'), getSecret('google_ads_refresh_token'),
    getSecret('google_ads_customer_id'),
  ])
  if (!devToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    console.error('faltam credenciais no Vault:', { devToken: !!devToken, clientId: !!clientId, clientSecret: !!clientSecret, refreshToken: !!refreshToken, customerId: !!customerId })
    process.exit(2)
  }
  console.log('credenciais lidas do Vault (todas ocultas). customer=***' + String(customerId).slice(-3))

  
  let accessToken
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
    })
    const j = await r.json()
    accessToken = j.access_token
    console.log('\n[refresh token] access_token obtido:', accessToken ? 'sim (len=' + accessToken.length + ')' : 'NAO — ' + brief(JSON.stringify(j)))
    if (!accessToken) process.exit(3)
  } catch (e) { console.error('refresh falhou:', brief(e)); process.exit(3) }

  const H = (v) => ({ Authorization: 'Bearer ' + accessToken, 'developer-token': devToken, ...(v ? {} : {}) })

  
  
  const versoes = ['v23', 'v22', 'v21', 'v24', 'v25', 'v20', 'v19', 'v18']
  let V = null
  for (const v of versoes) {
    try {
      const r = await fetch(`https://googleads.googleapis.com/${v}/customers:listAccessibleCustomers`, { headers: H() })
      const txt = await r.text()
      if (r.ok) {
        V = v
        const j = JSON.parse(txt)
        console.log(`\n[listAccessibleCustomers @ ${v}] OK — contas acessiveis:`, (j.resourceNames || []).length)
        save('accessible-customers.json', sanitize(j))
        break
      }
      
      if (r.status === 404 || /UNSUPPORTED_VERSION|deprecated|not supported/i.test(txt)) continue
      
      if (/DEVELOPER_TOKEN|PERMISSION|NOT_APPROVED|developer token/i.test(txt)) {
        console.error(`\n[${v}] erro de auth/token status ${r.status}:`, brief(txt))
        save('erro-auth.json', JSON.parse(txt || '{}')); process.exit(4)
      }
      console.error(`[${v}] status ${r.status}:`, brief(txt)) 
    } catch (e) { console.error(`[${v}] falhou:`, brief(e)) }
  }
  if (!V) { console.error('nenhuma versão da API respondeu 200 no listAccessibleCustomers — ver erros acima.'); process.exit(5) }

  const search = async (query) => {
    const r = await fetch(`https://googleads.googleapis.com/${V}/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST', headers: { ...H(), 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
    })
    const txt = await r.text()
    if (!r.ok) return { ok: false, status: r.status, txt }
    return { ok: true, data: JSON.parse(txt) }
  }

  
  console.log('\n[searchStream: customer] SELECT customer.id, descriptive_name, currency_code, time_zone')
  const cust = await search('SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer')
  if (!cust.ok) {
    console.error('  FALHOU status', cust.status, ':', brief(cust.txt))
    if (/DEVELOPER_TOKEN|NOT_APPROVED|test account/i.test(cust.txt)) console.error('  >> Provavel: dev token so acessa contas de TESTE — precisa aplicar Explorer/Basic.')
    save('erro-customer.json', JSON.parse(cust.txt || '{}')); process.exit(6)
  }
  save('customer.json', sanitize(cust.data))
  const custRow = cust.data?.[0]?.results?.[0]
  console.log('  OK. shape da linha:', custRow ? JSON.stringify(sanitize(custRow)) : '(vazio)')

  
  console.log('\n[searchStream: campaign] metricas por campanha, LAST_30_DAYS')
  const q = 'SELECT campaign.id, campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value, metrics.ctr FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC'
  const camp = await search(q)
  if (!camp.ok) { console.error('  FALHOU status', camp.status, ':', brief(camp.txt)); save('erro-campaign.json', JSON.parse(camp.txt || '{}')) }
  else {
    save('campaigns.json', sanitize(camp.data))
    const rows = (camp.data || []).flatMap((b) => b.results || [])
    console.log('  OK. campanhas retornadas:', rows.length)
    if (rows[0]) console.log('  shape da 1a linha:', JSON.stringify(sanitize(rows[0])))
    else console.log('  (conta sem campanhas na janela — normal pra conta nova; o contrato foi confirmado)')
  }

  console.log('\nDONE — API real acessivel. Versao =', V, '. Fixtures em tests/fixtures/google-ads/.')
}

main().catch((e) => { console.error('FATAL:', brief(e)); process.exit(1) })
