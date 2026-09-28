


import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !svc) { console.error('MISSING_ENV: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const [, , name, value] = process.argv
if (!name || !value) { console.error('uso: node --env-file=.env scripts/set-secret.mjs <nome> <valor>'); process.exit(1) }

const db = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

const { error } = await db.rpc('set_secret', { p_name: name, p_value: value })
if (error) { console.error(`set_secret(${name}) falhou:`, error.message); process.exit(1) }


const { data } = await db.rpc('get_secret', { p_name: name })
const len = (data ?? '').length
console.log(`OK '${name}' salvo no Vault (len=${len}, valor oculto).`)
