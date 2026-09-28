





















import { createClient } from '@supabase/supabase-js'
import { Composio } from '@composio/core'

const EXECUTE = process.argv.includes('--execute-paused')



const VERIFY = process.argv.includes('--verify-creative')


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
const brief = (err) => (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 300)


const TEST_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='


const SLUGS_ALVO = [
  'METAADS_UPLOAD_AD_IMAGE',
  'METAADS_CREATE_AD_CREATIVE',
  'METAADS_CREATE_AD',
  'METAADS_UPDATE_CAMPAIGN', 
]

async function main() {
  console.log('=== PROBE META WRITE (Mãos do Rui) ===')
  console.log(EXECUTE ? 'MODO: --execute-paused (VAI CRIAR entidades reais PAUSADAS)' : 'MODO: schema-only (SEGURO, 0 escrita)')

  const apiKey = await getSecret('composio_api_key')
  if (!apiKey) {
    console.error('BLOCKED: composio_api_key NÃO está no Vault — conecte a chave Composio em /config.')
    process.exit(2)
  }
  console.log('OK chave Composio lida do Vault (len=%d, oculta).', apiKey.length)

  const c = new Composio({ apiKey, allowTracking: false })
  const userId = composioUserId()
  console.log('composioUserId =', userId)

  
  let connected = []
  try {
    const conns = await c.connectedAccounts.list({ userIds: [userId] })
    connected = (conns.items ?? conns ?? []).filter((a) => a?.toolkit?.slug === 'metaads' || a?.toolkitSlug === 'metaads')
    console.log('\n[connectedAccounts] contas metaads conectadas:', connected.length)
  } catch (err) {
    console.error('  connectedAccounts.list falhou:', brief(err))
  }

  
  console.log('\n===== SCHEMAS (args reais — construa contra ISTO, não invente) =====')
  try {
    const tools = await c.tools.getRawComposioTools({ toolkits: ['metaads'], limit: 200 })
    const arr = Array.isArray(tools) ? tools : (tools?.items ?? [])
    const bySlug = new Map(arr.map((t) => [(t?.slug ?? t?.name), t]))
    for (const slug of SLUGS_ALVO) {
      const t = bySlug.get(slug)
      if (!t) { console.log(`\n[${slug}] AUSENTE no catálogo desta conta (⚠ Mão indisponível por aqui).`); continue }
      const params = t?.inputParameters ?? t?.input_parameters ?? t?.parameters
      const props = params?.properties ?? {}
      console.log(`\n[${slug}] version: ${t?.version ?? '(?)'}`)
      console.log('  required:', (params?.required ?? []).join(', ') || '(nenhum)')
      for (const [k, v] of Object.entries(props)) {
        const tipo = v?.type ?? (v?.enum ? 'enum' : '?')
        const enumV = v?.enum ? ` {${v.enum.slice(0, 8).join('|')}${v.enum.length > 8 ? '…' : ''}}` : ''
        const desc = v?.description ? ` — ${String(v.description).replace(/\s+/g, ' ').slice(0, 90)}` : ''
        console.log(`    - ${k}: ${tipo}${enumV}${desc}`)
      }
      
      if (/CREATE_AD_CREATIVE|CREATE_AD$|UPLOAD_AD_IMAGE/.test(slug)) {
        console.log('  --- schema completo (aninhado) ---')
        console.log(JSON.stringify(params, null, 2).split('\n').map((l) => '  ' + l).join('\n'))
      }
    }
  } catch (err) {
    console.error('  getRawComposioTools falhou:', brief(err))
  }

  
  console.log('\n===== PÁGINAS (page_id — pra criar creative) =====')
  try {
    const tools = await c.tools.getRawComposioTools({ toolkits: ['metaads'], limit: 200 })
    const arr = Array.isArray(tools) ? tools : (tools?.items ?? [])
    const slugs = arr.map((t) => t?.slug ?? t?.name).filter(Boolean)
    const pageSlugs = slugs.filter((s) => /PAGE/i.test(s))
    console.log('  slugs com "PAGE":', pageSlugs.join(', ') || '(nenhum)')
    
    let accountId = null
    try {
      const accRes = await c.tools.execute('METAADS_GET_AD_ACCOUNTS', { userId, arguments: {}, dangerouslySkipVersionCheck: true })
      const rows = accRes?.data?.data ?? accRes?.data ?? []
      const rawId = Array.isArray(rows) ? (rows[0]?.id ?? rows[0]?.account_id) : null
      if (rawId) accountId = String(rawId).startsWith('act_') ? String(rawId) : `act_${rawId}`
    } catch {  }
    
    for (const slug of pageSlugs) {
      for (const args of [{}, ...(accountId ? [{ object_id: accountId }, { ad_account_id: accountId }, { account_id: accountId }] : [])]) {
        try {
          const res = await c.tools.execute(slug, { userId, arguments: args, dangerouslySkipVersionCheck: true })
          if (res?.successful) {
            const rows = res?.data?.data ?? res?.data ?? []
            const list = Array.isArray(rows) ? rows : (rows && typeof rows === 'object' ? Object.values(rows) : [])
            console.log(`  [${slug}] argsTentados=${Object.keys(args).join(',') || '(vazio)'} → OK, ${list.length} página(s).`)
            const p = list[0]
            if (p && typeof p === 'object') {
              console.log('     campos:', Object.keys(p).join(', '))
              console.log('     amostra: id/name presentes?', 'id' in p || 'page_id' in p, '/', 'name' in p)
            }
            break 
          } else {
            console.log(`  [${slug}] args=${Object.keys(args).join(',') || '(vazio)'} → falhou: ${brief(res?.error ?? 'sem successful')}`)
          }
        } catch (err) {
          console.log(`  [${slug}] args=${Object.keys(args).join(',') || '(vazio)'} → erro: ${brief(err)}`)
        }
      }
    }
    if (pageSlugs.length === 0) {
      console.log('  Nenhum slug de página no Composio — descoberta terá que ser via metaGraphGet (/me/accounts ou /act_x/promote_pages).')
    }
    
    const igSlugs = slugs.filter((s) => /INSTAGRAM|IG_/i.test(s))
    console.log('\n  slugs com "INSTAGRAM":', igSlugs.join(', ') || '(nenhum)')
    for (const slug of igSlugs.filter((s) => /GET|LIST|ACCOUNT/i.test(s))) {
      for (const args of [{}, ...(accountId ? [{ object_id: accountId }, { ad_account_id: accountId }, { account_id: accountId }] : [])]) {
        try {
          const res = await c.tools.execute(slug, { userId, arguments: args, dangerouslySkipVersionCheck: true })
          if (res?.successful) {
            const rows = res?.data?.data ?? res?.data ?? []
            const list = Array.isArray(rows) ? rows : (rows && typeof rows === 'object' ? Object.values(rows) : [])
            console.log(`  [${slug}] args=${Object.keys(args).join(',') || '(vazio)'} → OK, ${list.length} conta(s) IG. campos:`, list[0] && typeof list[0] === 'object' ? Object.keys(list[0]).join(', ') : '(vazio)')
            break
          } else {
            console.log(`  [${slug}] args=${Object.keys(args).join(',') || '(vazio)'} → falhou: ${brief(res?.error ?? 'sem successful')}`)
          }
        } catch (err) {
          console.log(`  [${slug}] args=${Object.keys(args).join(',') || '(vazio)'} → erro: ${brief(err)}`)
        }
      }
    }
  } catch (err) {
    console.error('  descoberta de páginas falhou:', brief(err))
  }

  if (!EXECUTE && !VERIFY) {
    console.log('\n===== FIM (schema-only) =====')
    console.log('Rode com  --verify-creative  pra PROVAR o Caminho B (identidade FB+IG) de forma SEGURA (só biblioteca, sem anúncio).')
    return
  }

  if (connected.length === 0) {
    console.error('\nBLOCKED: nenhuma conta metaads conectada.')
    process.exit(3)
  }

  
  let caId = null
  try {
    const conns = await c.connectedAccounts.list({ userIds: [userId] })
    const items = (conns?.items ?? conns ?? [])
    caId = items.find((a) => (a?.toolkit?.slug ?? a?.toolkitSlug) === 'metaads')?.id ?? null
  } catch (err) { console.error('  resolve connectedAccountId falhou:', brief(err)) }
  if (!caId) { console.error('\nBLOCKED: sem connectedAccountId metaads.'); process.exit(3) }
  const proxy = async (endpoint, method, body) => {
    const res = await c.tools.proxyExecute(
      { endpoint, method, connectedAccountId: caId, ...(body ? { body } : {}) },
      { signal: AbortSignal.timeout(20000) },
    )
    return res?.data ?? res ?? null
  }

  const run = (slug, args) => c.tools.execute(slug, { userId, arguments: args, dangerouslySkipVersionCheck: true })

  
  let accountId = null
  try {
    const accRes = await run('METAADS_GET_AD_ACCOUNTS', {})
    const rows = accRes?.data?.data ?? accRes?.data ?? []
    const rawId = Array.isArray(rows) ? (rows[0]?.id ?? rows[0]?.account_id) : null
    if (rawId) accountId = String(rawId).startsWith('act_') ? String(rawId) : `act_${rawId}`
  } catch (err) { console.error('  GET_AD_ACCOUNTS falhou:', brief(err)) }
  if (!accountId) { console.error('\nBLOCKED: não achei o ad account id.'); process.exit(5) }

  
  let pageId = null
  try {
    const pgRes = await run('METAADS_GET_PAGE_ACCOUNTS', {})
    const rows = pgRes?.data?.data ?? pgRes?.data ?? []
    const list = Array.isArray(rows) ? rows : (rows && typeof rows === 'object' ? Object.values(rows) : [])
    pageId = list[0]?.id ?? null
    console.log('\n[página] encontrada:', pageId ? 'sim (id oculto)' : 'NÃO', '|', list.length, 'página(s)')
  } catch (err) { console.error('  GET_PAGE_ACCOUNTS falhou:', brief(err)) }
  if (!pageId) { console.error('\nBLOCKED: não achei page_id.'); process.exit(6) }

  
  let igUserId = null
  try {
    console.log('\n[IG] GET /{page}?fields=instagram_business_account,connected_instagram_account,instagram_accounts{id,username}')
    const pg = await proxy(`/${pageId}?fields=name,instagram_business_account,connected_instagram_account,instagram_accounts{id,username}`, 'GET')
    const iba = pg?.instagram_business_account?.id
    const cia = pg?.connected_instagram_account?.id
    const iga = pg?.instagram_accounts?.data?.[0]?.id
    igUserId = iba ?? cia ?? iga ?? null
    console.log('  instagram_business_account:', iba ? 'sim (oculto)' : 'não',
      '| connected_instagram_account:', cia ? 'sim' : 'não',
      '| instagram_accounts[0]:', iga ? 'sim' : 'não')
    console.log('  => igUserId a usar:', igUserId ? 'obtido (oculto)' : 'NENHUM — a Página não tem IG vinculado (IG não serviria!)')
  } catch (err) { console.error('  resolver IG falhou:', brief(err)) }

  
  let imageHash = null
  try {
    console.log('\n[adimage] POST /act_x/adimages (Graph cru, imagem de teste 1x1)')
    const up = await proxy(`/${accountId}/adimages`, 'POST', { bytes: TEST_PNG_B64 })
    const imgs = up?.images ?? up ?? {}
    const first = imgs && typeof imgs === 'object' ? Object.values(imgs)[0] : null
    imageHash = first?.hash ?? up?.hash ?? null
    console.log('  image_hash:', imageHash ? 'obtido (oculto)' : 'NÃO — ver erro/shape:', imageHash ? '' : JSON.stringify(up).slice(0, 200))
  } catch (err) { console.error('  adimages falhou:', brief(err)) }
  
  
  const PIC_URL = 'https://picsum.photos/600/600.jpg'
  const linkData = imageHash
    ? { image_hash: imageHash, link: 'https://example.com', message: 'AWAVE probe (apagar)' }
    : { picture: PIC_URL, link: 'https://example.com', message: 'AWAVE probe (apagar)' }
  console.log(imageHash ? '  usando image_hash' : `  usando picture URL (${PIC_URL}) — mesma via do loop real (signed URL)`)
  const tentativas = [
    { rotulo: 'instagram_user_id', oss: { page_id: pageId, ...(igUserId ? { instagram_user_id: igUserId } : {}), link_data: linkData } },
    { rotulo: 'instagram_actor_id (legado)', oss: { page_id: pageId, ...(igUserId ? { instagram_actor_id: igUserId } : {}), link_data: linkData } },
  ]
  let creativeId = null
  let campoIgQueFuncionou = null
  for (const t of tentativas) {
    if (!igUserId && t.rotulo.startsWith('instagram_actor')) break 
    try {
      console.log(`\n[adcreative] POST /act_x/adcreatives com ${igUserId ? t.rotulo : 'SÓ page_id (sem IG)'}`)
      const cr = await proxy(`/${accountId}/adcreatives`, 'POST', { name: 'AWAVE probe (apagar)', object_story_spec: t.oss })
      creativeId = cr?.id ?? null
      if (creativeId) { campoIgQueFuncionou = igUserId ? t.rotulo : '(sem IG)'; console.log('  ✅ adcreative criado (id oculto) — Meta ACEITOU', igUserId ? t.rotulo : 'só page_id'); break }
      console.log('  sem id no retorno:', JSON.stringify(cr).slice(0, 200))
    } catch (err) { console.error(`  ${t.rotulo} rejeitado:`, brief(err)) }
  }

  
  if (creativeId) {
    try {
      await proxy(`/${creativeId}`, 'DELETE')
      console.log('  🧹 adcreative de teste deletado (limpo).')
    } catch (err) { console.log('  (não deletei o adcreative de teste — apague "AWAVE probe (apagar)" na biblioteca de criativos):', brief(err)) }
  }

  console.log('\n===== VEREDITO DO CAMINHO B =====')
  if (creativeId) {
    console.log(`✅ FUNCIONA. Meta aceitou um adcreative FB${igUserId ? '+IG' : ''} via Graph cru usando ${campoIgQueFuncionou}.`)
    console.log(igUserId
      ? '   A identidade dupla (page_id + IG) está confirmada — o loop pode nascer FB+IG de verdade.'
      : '   ⚠ Esta Página NÃO tem IG vinculado — no build eu aviso o dono (IG não serviria até vincular o Instagram na Página).')
  } else {
    console.log('❌ Meta rejeitou a criação do adcreative — ver erros acima. NÃO construir o loop antes de resolver.')
  }
}

main().catch((err) => { console.error('FATAL:', brief(err)); process.exit(1) })
