




import { createClient } from '@supabase/supabase-js'
import http from 'node:http'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !svc) { console.error('MISSING_ENV'); process.exit(1) }
const db = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })
const getSecret = async (n) => (await db.rpc('get_secret', { p_name: n })).data
const setSecret = async (n, v) => (await db.rpc('set_secret', { p_name: n, p_value: v })).error

const clientId = await getSecret('google_ads_client_id')
const clientSecret = await getSecret('google_ads_client_secret')
if (!clientId || !clientSecret) { console.error('faltam client_id/secret no Vault'); process.exit(1) }

const PORT = Number(process.argv[2]) || 8976
const REDIRECT = `http://localhost:${PORT}/oauth2callback`
const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: clientId,
  redirect_uri: REDIRECT,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/adwords',
  access_type: 'offline',
  prompt: 'consent',
}).toString()

console.log('\n=== ABRA NO NAVEGADOR E CLIQUE PERMITIR ===\n' + authUrl + '\n')

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, REDIRECT)
  if (u.pathname !== '/oauth2callback') { res.writeHead(404); res.end('nope'); return }
  const err = u.searchParams.get('error')
  if (err) { res.writeHead(400); res.end('erro: ' + err); console.error('OAuth erro:', err); process.exit(1) }
  const code = u.searchParams.get('code')
  if (!code) { res.writeHead(400); res.end('sem code'); return }
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: REDIRECT, grant_type: 'authorization_code',
      }),
    })
    const tok = await r.json()
    if (!tok.refresh_token) {
      res.writeHead(500); res.end('sem refresh_token — ver console')
      console.error('resposta SEM refresh_token:', JSON.stringify(tok).slice(0, 300)); process.exit(1)
    }
    const e = await setSecret('google_ads_refresh_token', tok.refresh_token)
    if (e) { res.writeHead(500); res.end('erro ao salvar'); console.error('set_secret falhou:', e.message); process.exit(1) }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h2>Pronto! Conexao do Google Ads capturada. Pode fechar esta aba.</h2>')
    console.log('OK refresh_token salvo no Vault (len=' + tok.refresh_token.length + ', oculto).')
    server.close(); setTimeout(() => process.exit(0), 500)
  } catch (ex) {
    res.writeHead(500); res.end('erro na troca'); console.error('troca falhou:', ex.message); process.exit(1)
  }
})
server.listen(PORT, () => console.log('mint ouvindo em ' + REDIRECT + ' — aguardando o Permitir...'))
setTimeout(() => { console.error('TIMEOUT: ninguem aprovou em 5min'); process.exit(1) }, 300000)
