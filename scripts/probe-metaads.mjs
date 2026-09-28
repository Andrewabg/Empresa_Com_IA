






















import { createClient } from '@supabase/supabase-js'
import { Composio } from '@composio/core'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(__dirname, '..', 'tests', 'fixtures', 'trafego')


const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !svc) {
  console.error('MISSING_ENV: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const db = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

async function getSecret(name) {
  const { data, error } = await db.rpc('get_secret', { p_name: name })
  if (error) throw new Error(`get_secret(${name}): ${error.message}`)
  return data ?? null
}


const composioUserId = () => process.env.COMPOSIO_USER_ID ?? 'operator'


const TOKEN_KEY_RE = /token|secret|access|bearer|credential|password|api[_-]?key/i
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (TOKEN_KEY_RE.test(k)) { out[k] = '<redacted>'; continue }
      
      if (/^(account_id|campaign_id|adset_id|ad_id|id|business_id|page_id|pixel_id)$/i.test(k) && typeof v === 'string') {
        out[k] = /^act_/.test(v) ? 'act_000' : v.replace(/\d{6,}/g, '000')
        continue
      }
      if (/name$/i.test(k) && typeof v === 'string') { out[k] = genericName(k, v); continue }
      out[k] = sanitize(v)
    }
    return out
  }
  if (typeof value === 'string') {
    return value.replace(/act_\d{3,}/g, 'act_000')
  }
  return value
}
function genericName(key, _orig) {
  if (/account/i.test(key)) return 'Conta Demo'
  if (/campaign/i.test(key)) return 'Campanha Demo'
  if (/adset/i.test(key)) return 'Conjunto Demo'
  if (/ad_?name|^name$/i.test(key)) return 'Anúncio Demo'
  if (/business/i.test(key)) return 'Negócio Demo'
  return 'Demo'
}

function saveFixture(file, obj) {
  mkdirSync(FIXTURE_DIR, { recursive: true })
  const path = join(FIXTURE_DIR, file)
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n', 'utf8')
  console.log('  WROTE', path)
}


function lastNDays(n) {
  const until = new Date()
  const since = new Date(until.getTime() - n * 24 * 60 * 60 * 1000)
  const iso = (d) => d.toISOString().slice(0, 10)
  return { since: iso(since), until: iso(until) }
}

const FIELDS = [
  'spend', 'impressions', 'reach', 'frequency', 'clicks', 'ctr', 'cpc', 'cpm',
  'actions', 'action_values', 'purchase_roas', 'cost_per_action_type',
  'conversions', 'conversion_values', 'objective',
  'account_id', 'account_name', 'campaign_id', 'campaign_name',
  'adset_id', 'adset_name', 'ad_id', 'ad_name',
  'video_play_actions', 'video_thruplay_watched_actions',
].join(',')

async function main() {
  console.log('=== PROBE metaads (Composio) ===')
  const apiKey = await getSecret('composio_api_key')
  if (!apiKey) {
    console.error('BLOCKED: composio_api_key NÃO está no Vault — rode /config (chave Composio).')
    console.error('=> Sem chave: gere fixtures SINTÉTICOS da doc do Meta Insights (marque _synthetic:true).')
    process.exit(2)
  }
  console.log('OK chave Composio lida do Vault (len=%d, oculta).', apiKey.length)

  const c = new Composio({ apiKey, allowTracking: false })
  const userId = composioUserId()
  console.log('composioUserId =', userId)

  
  let toolkit = null
  try {
    toolkit = await c.toolkits.get('metaads')
    const tk = sanitize(toolkit)
    console.log('\n[toolkits.get("metaads")]')
    console.log('  name:', tk?.name, '| slug:', tk?.slug)
    console.log('  auth schemes:', (tk?.authConfigDetails ?? tk?.meta?.authConfigDetails ?? []).map((a) => a?.mode).join(', ') || '(?)')
    saveFixture('toolkit-metaads.json', tk)
  } catch (err) {
    console.error('  toolkits.get falhou:', brief(err))
  }

  
  let connected = []
  try {
    const conns = await c.connectedAccounts.list({ userIds: [userId] })
    connected = (conns.items ?? conns ?? []).filter((a) => a?.toolkit?.slug === 'metaads' || a?.toolkitSlug === 'metaads')
    console.log('\n[connectedAccounts.list]')
    console.log('  total contas conectadas:', (conns.items ?? []).length)
    console.log('  contas metaads:', connected.length)
    for (const a of connected) console.log('    -', a?.id ? 'id<oculto>' : '(sem id)', '| status:', a?.status)
  } catch (err) {
    console.error('  connectedAccounts.list falhou:', brief(err))
  }

  
  let slugs = []
  try {
    const tools = await c.tools.getRawComposioTools({ toolkits: ['metaads'], limit: 100 })
    const arr = Array.isArray(tools) ? tools : (tools?.items ?? [])
    slugs = arr.map((t) => t?.slug ?? t?.name).filter(Boolean)
    console.log('\n[tools.getRawComposioTools metaads] total:', slugs.length)
    const readish = slugs.filter((s) => /INSIGHT|GET_|LIST_|_READ|CAMPAIGN|ADSET|ADS?$|ACCOUNT/i.test(s))
    console.log('  candidatas de LEITURA:')
    for (const s of readish) console.log('    -', s)
    
    const insightTools = arr.filter((t) => /INSIGHT/i.test(t?.slug ?? t?.name ?? ''))
    for (const t of insightTools) {
      const params = t?.inputParameters ?? t?.input_parameters ?? t?.parameters
      console.log('\n  [schema]', t?.slug ?? t?.name, '| version:', t?.version ?? '(?)')
      console.log('   props:', Object.keys(params?.properties ?? {}).join(', ') || '(?)')
      console.log('   required:', (params?.required ?? []).join(', ') || '(?)')
    }
    saveFixture('actions-metaads-slugs.json', { slugs, generatedAt: '<probe>' })
  } catch (err) {
    console.error('  getRawComposioTools falhou:', brief(err))
  }

  
  if (connected.length === 0) {
    console.error('\nBLOCKED_INSIGHTS: nenhuma conta metaads CONECTADA pro userId="%s".', userId)
    console.error('=> Sem conta Meta conectada não dá pra ler Insights reais.')
    console.error('=> Gere fixtures SINTÉTICOS da doc do Meta Insights (marque _synthetic:true).')
    process.exit(3)
  }

  
  
  
  const runTool = (slug, args) =>
    c.tools.execute(slug, { userId, arguments: args, dangerouslySkipVersionCheck: true })

  
  let objectId = null
  try {
    console.log('\n[execute METAADS_GET_AD_ACCOUNTS]')
    const accRes = await runTool('METAADS_GET_AD_ACCOUNTS', {})
    saveFixture('ad-accounts.json', sanitize(accRes))
    const rows = accRes?.data?.data ?? accRes?.data?.adaccounts?.data ?? accRes?.data ?? []
    const first = Array.isArray(rows) ? rows[0] : null
    const rawId = first?.id ?? first?.account_id ?? null
    if (rawId) objectId = String(rawId).startsWith('act_') ? String(rawId) : `act_${rawId}`
    console.log('  ad account encontrado:', objectId ? 'sim (id oculto)' : 'NÃO', '| successful:', accRes?.successful, '| error:', accRes?.error)
  } catch (err) {
    console.error('  METAADS_GET_AD_ACCOUNTS falhou:', brief(err))
  }
  if (!objectId) {
    console.error('\nBLOCKED_INSIGHTS: não consegui descobrir o ad account id (object_id) — ver erro acima.')
    process.exit(4)
  }

  const insightsSlug = slugs.find((s) => /INSIGHT/i.test(s)) ?? 'METAADS_GET_INSIGHTS'
  console.log('\nUsando slug de Insights:', insightsSlug, '| object_id = act_<oculto>')

  const { since, until } = lastNDays(7)
  
  const levels = ['account', 'campaign', 'adset', 'ad']
  let anyOk = false
  for (const level of levels) {
    try {
      const args = {
        object_id: objectId,
        level,
        fields: FIELDS,
        time_range: { since, until },
        limit: 25,
      }
      console.log(`\n[execute ${insightsSlug}] level=${level} ${since}..${until}`)
      const res = await runTool(insightsSlug, args)
      const clean = sanitize(res)
      saveFixture(`insights-${level}.json`, clean)
      anyOk = true
      const sample = clean?.data?.data?.[0] ?? clean?.data?.[0] ?? clean?.data
      console.log('  successful:', res?.successful, '| error:', res?.error)
      console.log('  linhas:', (clean?.data?.data ?? clean?.data ?? []).length ?? '?')
      console.log('  amostra de campos:', sample && typeof sample === 'object' ? Object.keys(sample).join(', ') : '(vazio)')
    } catch (err) {
      console.error(`  execute(level=${level}) falhou:`, brief(err))
    }
  }

  
  try {
    console.log('\n[execute METAADS_READ_ADSETS] (learning_stage vive aqui, não no Insights)')
    const adsetRes = await runTool('METAADS_READ_ADSETS', {
      object_id: objectId,
      fields: 'id,name,effective_status,configured_status,learning_stage_info,daily_budget,budget_remaining,optimization_goal',
      limit: 10,
    })
    saveFixture('adsets-entity.json', sanitize(adsetRes))
    const sample = adsetRes?.data?.data?.[0] ?? adsetRes?.data?.[0]
    console.log('  successful:', adsetRes?.successful, '| error:', adsetRes?.error)
    console.log('  campos do adset:', sample && typeof sample === 'object' ? Object.keys(sample).join(', ') : '(vazio)')
  } catch (err) {
    console.error('  METAADS_READ_ADSETS falhou (não-fatal):', brief(err))
  }

  if (!anyOk) {
    console.error('\nBLOCKED_INSIGHTS: execução de Insights não retornou dados — ver erros acima.')
    process.exit(4)
  }
  console.log('\nDONE — fixtures LIVE salvos em tests/fixtures/trafego/.')
}

function brief(err) {
  return (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 240)
}

main().catch((err) => {
  console.error('FATAL:', brief(err))
  process.exit(1)
})
