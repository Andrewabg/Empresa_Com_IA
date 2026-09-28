



import { createClient } from '@supabase/supabase-js'
import { criarClienteGoogleAds, type CredsGoogleAds } from '../src/server/google-ads/client'
import { lerContaReal } from '../src/server/google-ads/ler-conta'
import { montarRaioX, renderRaioX } from '../src/lib/google-ads/raio-x'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !svc) { console.error('MISSING_ENV'); process.exit(1) }
const db = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
const getSecret = async (n: string) => (await db.rpc('get_secret', { p_name: n })).data as string | null

const [devToken, clientId, clientSecret, refreshToken, customerId, login] = await Promise.all([
  getSecret('google_ads_developer_token'), getSecret('google_ads_client_id'),
  getSecret('google_ads_client_secret'), getSecret('google_ads_refresh_token'),
  getSecret('google_ads_customer_id'), getSecret('google_ads_login_customer_id'),
])
if (!devToken || !clientId || !clientSecret || !refreshToken || !customerId) {
  console.error('faltam credenciais no Vault'); process.exit(2)
}
const creds: CredsGoogleAds = { developerToken: devToken, clientId, clientSecret, refreshToken, customerId }
if (login) creds.loginCustomerId = login.replace(/-/g, '')

console.log('=== PROVA raio-X REAL (customer ***' + customerId.slice(-3) + ') ===\n')
const cliente = criarClienteGoogleAds(creds)
const real = await lerContaReal({ cliente, ficha: { cpaTetoRealista: 600 } })
if (!real) {
  console.log('lerContaReal -> NULL (o Gael cairia no MODO DEMO). Provavel: 403/sem acesso.')
  process.exit(0)
}
console.log('lerContaReal OK | negocio =', JSON.stringify(real.negocio), '| contaAtiva =', real.contaAtiva)
console.log('snapshot =', JSON.stringify(real.input.conta), '| termos =', real.input.searchTerms.length)
console.log('\n----- RAIO-X RENDERIZADO (dados reais) -----\n')
console.log(renderRaioX(montarRaioX(real.input), { demo: false, negocio: real.negocio, contaAtiva: real.contaAtiva }))
