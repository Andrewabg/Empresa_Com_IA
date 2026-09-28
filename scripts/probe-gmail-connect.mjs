












import { createClient } from '@supabase/supabase-js'
import { Composio } from '@composio/core'

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
function brief(err) { return (err instanceof Error ? `${err.name}: ${err.message}` : String(err)).replace(/\s+/g, ' ').slice(0, 500) }

const SLUG = 'gmail'

async function main() {
  console.log('=== PROBE gmail connect (managed activate path) ===')
  const apiKey = await getSecret('composio_api_key')
  if (!apiKey) { console.error('BLOCKED: composio_api_key NÃO está no Vault.'); process.exit(2) }
  console.log('OK chave Composio lida do Vault (len=%d, oculta).', apiKey.length)

  const c = new Composio({ apiKey, allowTracking: false })
  const userId = composioUserId()
  console.log('composioUserId =', userId)

  
  let tk
  try {
    tk = await c.toolkits.get(SLUG)
    console.log('\n[toolkits.get gmail] name:', tk?.name)
    console.log('  composioManagedAuthSchemes:', JSON.stringify(tk?.composioManagedAuthSchemes ?? null))
    const details = tk?.authConfigDetails ?? []
    console.log('  authConfigDetails modes:', details.map((d) => d?.mode ?? d?.name).join(', ') || '(nenhum)')
    const managed = (tk?.composioManagedAuthSchemes ?? []).some((s) => String(s).toUpperCase().includes('OAUTH'))
    console.log('  => planActivationFromToolkit =>', managed ? 'MANAGED (1-clique)' : 'NÃO-managed')
  } catch (err) {
    console.error('  toolkits.get FALHOU:', brief(err))
    console.error('  (se isto falhar, o /fields do comprador teria mostrado "não consegui ler o toolkit", NÃO o erro reportado)')
    process.exit(3)
  }

  
  let authConfigId = null
  try {
    const list = await c.authConfigs.list({ toolkit: SLUG })
    const items = list?.items ?? []
    console.log('\n[authConfigs.list gmail] total:', items.length)
    for (const it of items) {
      console.log('   -', JSON.stringify({ id: it?.id, authScheme: it?.authScheme, type: it?.type, isComposioManaged: it?.isComposioManaged ?? it?.is_composio_managed, name: it?.name }))
    }
    const existing = items[0]
    if (existing) {
      authConfigId = existing.id
      console.log('  => findOrCreateManagedAuthConfig REUSARIA items[0]:', JSON.stringify({ id: existing.id, authScheme: existing.authScheme }))
    } else {
      console.log('  => nenhum config; findOrCreateManagedAuthConfig CRIARIA um use_composio_managed_auth')
      const created = await c.authConfigs.create(SLUG, { type: 'use_composio_managed_auth', name: 'Gmail' })
      authConfigId = created.id
      console.log('  criado authConfigId:', authConfigId)
    }
  } catch (err) {
    console.error('  authConfigs.list/create FALHOU:', brief(err))
    process.exit(4)
  }

  
  try {
    const conns = await c.connectedAccounts.list({ userIds: [userId] })
    const items = conns?.items ?? []
    const g = items.filter((a) => (a?.toolkit?.slug ?? a?.toolkitSlug) === SLUG)
    console.log('\n[connectedAccounts.list] total:', items.length, '| gmail:', g.length)
    for (const a of g) console.log('   - status:', a?.status, '| id:', a?.id)
  } catch (err) {
    console.error('  connectedAccounts.list falhou:', brief(err))
  }

  
  const callbackUrl = 'http://localhost:3000/config'
  console.log('\n[connectedAccounts.link] userId=%s authConfigId=%s allowMultiple=true', userId, authConfigId)
  try {
    const req = await c.connectedAccounts.link(userId, authConfigId, { callbackUrl, allowMultiple: true })
    console.log('  RESPOSTA:', JSON.stringify({ id: req?.id, status: req?.status, redirectUrl: req?.redirectUrl, redirect_url: req?.redirect_url }, null, 2))
    const redir = req?.redirectUrl ?? req?.redirect_url
    console.log('\n==============================================================')
    if (redir) {
      console.log('VEREDITO: link() DEVOLVEU redirectUrl ✅  => o código funciona.')
      console.log('  O comprador cairia no fallback SÓ se a resposta dele NÃO tiver redirectUrl.')
      console.log('  Provável causa NO COMPRADOR: conta/projeto Composio dele (managed Google indisponível/limite).')
    } else {
      console.log('VEREDITO: link() NÃO devolveu redirectUrl ❌  => BUG DE SISTEMA reproduzido.')
      console.log('  O activate devolve {connectionId} sem redirectUrl → cliente mostra "Não consegui iniciar a conexão. Tente de novo."')
    }
    console.log('==============================================================')
  } catch (err) {
    console.error('  link() LANÇOU:', brief(err))
    console.log('\n==============================================================')
    console.log('NOTA: um THROW aqui => o activate devolveria 502 com "...Verifique os dados..."')
    console.log('  Mas o comprador viu "...Tente de novo." (fallback puro) => NÃO é este caminho.')
    console.log('  Se o throw for de auth/managed-indisponível, ainda aponta p/ a conta Composio.')
    console.log('==============================================================')
  }

  
  
  
  const badCallback = 'http://0.0.0.0:3000/config'
  console.log('\n[TESTE callback ruim] simulando NEXT_PUBLIC_BASE_URL ausente → callbackUrl=%s', badCallback)
  try {
    const req2 = await c.connectedAccounts.link(userId, authConfigId, { callbackUrl: badCallback, allowMultiple: true })
    const redir2 = req2?.redirectUrl ?? req2?.redirect_url
    console.log('  RESPOSTA:', JSON.stringify({ id: req2?.id, status: req2?.status, redirectUrl: redir2 }, null, 2))
    console.log('  => callback 0.0.0.0 ' + (redir2 ? 'AINDA devolve redirectUrl (só quebra o RETORNO, = bug do Eduardo)' : 'NÃO devolve redirectUrl (= fallback do Marcos!) — raiz unificada'))
  } catch (err) {
    console.log('  link(callback 0.0.0.0) LANÇOU:', brief(err), '=> daria "Verifique os dados", NÃO o fallback do Marcos')
  }
}

main().catch((err) => { console.error('FATAL:', brief(err)); process.exit(1) })
