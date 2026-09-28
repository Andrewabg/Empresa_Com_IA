
















import { createClient } from '@supabase/supabase-js'
import { Composio } from '@composio/core'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !svc) { console.error('MISSING_ENV: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const db = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

const composioUserId = () => process.env.COMPOSIO_USER_ID ?? 'operator'
const AGENT_ID = process.argv[2] ?? 'jarvis'
const CATALOG_LIMIT = 200
const MIN_TOOLS_PER_TOOLKIT = 3

function brief(err) {
  return (err instanceof Error ? `${err.name}: ${err.message}` : String(err)).replace(/\s+/g, ' ').slice(0, 400)
}


const perToolkitLimit = (total, n) => (n <= 1 ? total : Math.max(MIN_TOOLS_PER_TOOLKIT, Math.ceil(total / n)))
function isActionAllowed(actionSlug, allowlist) {
  if (!allowlist || allowlist.length === 0) return true
  const a = actionSlug.toUpperCase()
  return allowlist.some((tk) => { const t = tk.toUpperCase(); return a === t || a.startsWith(t + '_') })
}

async function getSecret(name) {
  const { data, error } = await db.rpc('get_secret', { p_name: name })
  if (error) throw new Error(`get_secret(${name}): ${error.message}`)
  return data ?? null
}

const line = () => console.log('-'.repeat(74))


const apiKey = await getSecret('composio_api_key')
if (!apiKey) { console.error('X  composio_api_key AUSENTE no Vault -> capacidade off. Configure em /config.'); process.exit(1) }
const c = new Composio({ apiKey, allowTracking: false })
console.log(`OK chave Composio no Vault  |  COMPOSIO_USER_ID efetivo = "${composioUserId()}"  |  agente = "${AGENT_ID}"`)


line()
let conns
try {
  conns = await c.connectedAccounts.list({ userIds: [composioUserId()] }, { signal: AbortSignal.timeout(15000) })
} catch (err) {
  console.error(`X  connectedAccounts.list FALHOU: ${brief(err)}`)
  console.error('   401/403 => chave invalida/expirada. Outro erro => rede.')
  process.exit(1)
}
const items = conns.items ?? []
console.log(`PASSO 1  contas retornadas para userId="${composioUserId()}": ${items.length}`)
if (items.length === 0) {
  console.log('   !! ZERO contas sob ESTE user id. As integracoes provavelmente foram conectadas')
  console.log('      sob OUTRO user id no painel do Composio. O Motor SO enxerga as deste id.')
}
for (const a of items) {
  const slug = a.toolkit?.slug ?? a.toolkitSlug ?? '(sem slug)'
  const status = String(a.status ?? '')
  const ativo = status.toUpperCase() === 'ACTIVE'
  console.log(`   ${ativo ? '[ATIVA ]' : '[IGNOR ]'} ${slug.padEnd(20)} status=${status}`)
}
const connected = [...new Set(
  items
    .map((a) => ({ slug: a.toolkit?.slug ?? a.toolkitSlug, status: String(a.status ?? '') }))
    .filter((a) => !!a.slug && a.status.toUpperCase() === 'ACTIVE')
    .map((a) => a.slug),
)]
console.log(`PASSO 2  toolkits com conta ACTIVE (o unico conjunto que o Motor usa): ${connected.length ? connected.join(', ') : '(NENHUM)'}`)
if (connected.length === 0) {
  console.log('   !! Aqui o caminho MORRE. Catalogo = {} -> ToolSearchProcessor NAO e construido')
  console.log('      -> o modelo nao recebe nem `search_tools`. Sintoma: "nenhuma ferramenta externa".')
  console.log('      Reconecte os toolkits em /integracoes ate o status ficar ACTIVE.')
  process.exit(0)
}


line()
const per = perToolkitLimit(CATALOG_LIMIT, connected.length)
const lists = await Promise.all(connected.map(async (slug) => {
  try {
    return await c.tools.getRawComposioTools({ toolkits: [slug], limit: per, important: true }, undefined, { signal: AbortSignal.timeout(15000) })
  } catch (err) { console.warn(`   aviso: descoberta de ${slug} falhou: ${brief(err)}`); return [] }
}))
const interleaved = []
const max = lists.reduce((m, l) => Math.max(m, l.length), 0)
for (let i = 0; i < max; i++) for (const l of lists) if (i < l.length) interleaved.push(l[i])
const catalogo = interleaved.slice(0, CATALOG_LIMIT)
console.log(`PASSO 3  catalogo buscavel montado: ${catalogo.length} actions (teto CATALOG_LIMIT=${CATALOG_LIMIT})`)
for (let i = 0; i < connected.length; i++) console.log(`   ${connected[i].padEnd(20)} ${lists[i].length} actions descobertas`)


line()
console.log(`PASSO 4  ToolSearchProcessor seria construido? ${catalogo.length > 0 ? 'SIM -> `search_tools` exposto' : 'NAO -> `search_tools` AUSENTE'}`)
console.log('         (obs: `load_tool` NAO existe por design — autoLoad:true ativa os matches direto)')


line()
const { data: row, error: rowErr } = await db.from('agents').select('id, tools, enabled, updated_at').eq('id', AGENT_ID).maybeSingle()
if (rowErr) { console.error(`X  leitura da linha do agente falhou: ${rowErr.message}`); process.exit(1) }
if (!row) { console.error(`X  agente "${AGENT_ID}" nao existe na tabela agents.`); process.exit(1) }
const tools = row.tools ?? {}
const allow = tools.composio_toolkits ?? null
console.log(`PASSO 5  agente "${row.id}"  enabled=${row.enabled}  tools.composio=${tools.composio}`)
if (tools.composio === false) console.log('   !! tools.composio === false -> catalogo forcado a {} no build. Ligue a skill em /agentes.')
console.log(`         allow-list composio_toolkits = ${allow && allow.length ? JSON.stringify(allow) : '(vazia/ausente = todos permitidos)'}`)

const permitidas = catalogo.filter((t) => isActionAllowed(t.slug, allow))
console.log(`         actions que sobrevivem ao filter: ${permitidas.length} de ${catalogo.length}`)
if (permitidas.length === 0 && catalogo.length > 0) {
  console.log('   !! A allow-list esta cortando TUDO. O `search_tools` existe mas devolve sempre 0.')
  console.log('      Sintoma identico a "nenhuma ferramenta aparece". Corrija a curadoria em /agentes.')
}
const porToolkit = new Map()
for (const t of permitidas) {
  const tk = t.toolkit?.slug ?? '?'
  porToolkit.set(tk, (porToolkit.get(tk) ?? 0) + 1)
}
for (const [tk, n] of [...porToolkit].sort()) console.log(`            ${tk.padEnd(20)} ${n} alcancaveis`)

line()
const amostra = permitidas.filter((t) => (t.toolkit?.slug ?? '').includes('notion')).slice(0, 8).map((t) => t.slug)
console.log(`VEREDITO  o agente "${row.id}" alcanca ${permitidas.length} actions externas via search_tools.`)
if (amostra.length) console.log(`          amostra Notion alcancavel: ${amostra.join(', ')}`)
else console.log('          nenhuma action de Notion alcancavel (ver passos 2 e 5 acima).')
