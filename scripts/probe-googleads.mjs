












import { createClient } from '@supabase/supabase-js'
import { Composio } from '@composio/core'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, '..', 'tests', 'fixtures', 'trafego')

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !svc) { console.error('MISSING_ENV: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const db = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

async function getSecret(name) {
  const { data, error } = await db.rpc('get_secret', { p_name: name })
  if (error) throw new Error(`get_secret(${name}): ${error.message}`)
  return data ?? null
}
const composioUserId = () => process.env.COMPOSIO_USER_ID ?? 'operator'
function brief(err) { return (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 300) }
function saveFixture(file, obj) {
  mkdirSync(FIXTURE_DIR, { recursive: true })
  const path = join(FIXTURE_DIR, file)
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n', 'utf8')
  console.log('  WROTE', path)
}


const CANDIDATES = ['googleads', 'google_ads', 'google_ads_api', 'googleadwords', 'adwords']

async function findToolkit(c) {
  for (const slug of CANDIDATES) {
    try {
      const tk = await c.toolkits.get(slug)
      if (tk) return { slug, tk }
    } catch {  }
  }
  return null
}

async function main() {
  console.log('=== PROBE googleads (Composio) ===')
  const apiKey = await getSecret('composio_api_key')
  if (!apiKey) {
    console.error('BLOCKED: composio_api_key NÃO está no Vault — rode /config (chave Composio).')
    process.exit(2)
  }
  console.log('OK chave Composio lida do Vault (len=%d, oculta).', apiKey.length)

  const c = new Composio({ apiKey, allowTracking: false })
  const userId = composioUserId()
  console.log('composioUserId =', userId)

  
  const found = await findToolkit(c)
  if (!found) {
    console.error('\n[toolkits.get] NENHUM slug de Google Ads encontrado entre:', CANDIDATES.join(', '))
    console.error('=> Composio pode não ter toolkit nativo de Google Ads. Ver fallback: google-ads-api direto.')
  } else {
    const { slug, tk } = found
    console.log('\n[toolkit ENCONTRADO] slug =', slug)
    console.log('  name:', tk?.name)
    const schemes = (tk?.authConfigDetails ?? tk?.meta?.authConfigDetails ?? [])
    console.log('  auth schemes:', schemes.map((a) => a?.mode ?? a?.name).join(', ') || '(?)')
    
    for (const s of schemes) {
      const fields = s?.fields ?? s?.credentials ?? s?.required ?? {}
      console.log('    modo:', s?.mode ?? s?.name, '| campos:', JSON.stringify(fields).slice(0, 400))
    }
    saveFixture('toolkit-googleads.json', { slug, name: tk?.name, authConfigDetails: schemes })
  }

  const toolkitSlug = found?.slug ?? 'googleads'

  
  let arr = []
  try {
    const tools = await c.tools.getRawComposioTools({ toolkits: [toolkitSlug], limit: 300 })
    arr = Array.isArray(tools) ? tools : (tools?.items ?? [])
    const slugs = arr.map((t) => t?.slug ?? t?.name).filter(Boolean)
    console.log('\n[tools.getRawComposioTools %s] total:', toolkitSlug, slugs.length)
    const cat = (re) => slugs.filter((s) => re.test(s))
    console.log('\n  LEITURA (GET/LIST/SEARCH/GAQL/REPORT/METRICS):')
    for (const s of cat(/GET_|LIST_|SEARCH|GAQL|QUERY|REPORT|METRIC|INSIGHT|_READ/i)) console.log('    -', s)
    console.log('\n  ESCRITA (CREATE/UPDATE/MUTATE/ADD/REMOVE/PAUSE/ENABLE/BUDGET/BID):')
    for (const s of cat(/CREATE|UPDATE|MUTATE|ADD_|REMOVE|DELETE|PAUSE|ENABLE|BUDGET|BID/i)) console.log('    -', s)
    console.log('\n  KEYWORDS / PLANNER (KEYWORD/PLAN/IDEA/FORECAST):')
    for (const s of cat(/KEYWORD|PLAN|IDEA|FORECAST/i)) console.log('    -', s)
    console.log('\n  CONTAS / CUSTOMER (CUSTOMER/ACCOUNT):')
    for (const s of cat(/CUSTOMER|ACCOUNT/i)) console.log('    -', s)
    saveFixture('actions-googleads-slugs.json', { toolkitSlug, total: slugs.length, slugs })
  } catch (err) {
    console.error('  getRawComposioTools falhou:', brief(err))
  }

  
  const KEY = /GAQL|SEARCH_STREAM|SEARCH$|GET_CAMPAIGN|LIST_CAMPAIGN|UPDATE_CAMPAIGN|CREATE_CAMPAIGN|KEYWORD_IDEA|GENERATE_KEYWORD|GET_CUSTOMER|LIST_CUSTOMER|LIST_ACCESSIBLE/i
  for (const t of arr.filter((t) => KEY.test(t?.slug ?? t?.name ?? ''))) {
    const params = t?.inputParameters ?? t?.input_parameters ?? t?.parameters
    console.log('\n  [schema]', t?.slug ?? t?.name)
    console.log('   desc:', (t?.description ?? '').replace(/\s+/g, ' ').slice(0, 160))
    console.log('   props:', Object.keys(params?.properties ?? {}).join(', ') || '(?)')
    console.log('   required:', (params?.required ?? []).join(', ') || '(?)')
  }

  
  try {
    const conns = await c.connectedAccounts.list({ userIds: [userId] })
    const items = conns.items ?? conns ?? []
    const g = items.filter((a) => /google.?ads|adwords/i.test(a?.toolkit?.slug ?? a?.toolkitSlug ?? ''))
    console.log('\n[connectedAccounts] total:', items.length, '| google ads:', g.length)
    for (const a of g) console.log('    - status:', a?.status)
  } catch (err) {
    console.error('  connectedAccounts.list falhou:', brief(err))
  }

  console.log('\nDONE — veredito de conexão do Gael salvo em tests/fixtures/trafego/.')
}

main().catch((err) => { console.error('FATAL:', brief(err)); process.exit(1) })
