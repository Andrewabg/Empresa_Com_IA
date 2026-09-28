






import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('MISSING_ENV: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const openai = process.env.OPENAI_API_KEY?.trim()
const repo = process.env.BRAIN_REPO?.trim() || 'owner/brain-repo'
const token = 'ghp_DUMMYtokenReplaceMeWithARealToken000'

if (!openai) {
  console.error('MISSING_ENV: OPENAI_API_KEY is empty in .env')
  process.exit(1)
}

async function setSecret(name, value) {
  const { error } = await db.rpc('set_secret', { p_name: name, p_value: value })
  if (error) throw new Error(`set_secret(${name}): ${error.message}`)
}

await setSecret('openai_api_key', openai)
await setSecret('github_repo', repo)
await setSecret('github_token', token)


const { data: configured, error: cErr } = await db.rpc('is_configured', {})
if (cErr) {
  console.error('is_configured error:', cErr.message)
  process.exit(1)
}

console.log('SET openai_api_key: <real key from .env, len=%d>', openai.length)
console.log('SET github_repo:', repo)
console.log('SET github_token:', token, '(DUMMY — replace with a real token)')
console.log('IS_CONFIGURED:', configured)
