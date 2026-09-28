

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('MISSING_ENV: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const email = process.argv[2]
const password = process.argv[3]

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})


const { data: list, error: listErr } = await db.auth.admin.listUsers({ perPage: 1 })
if (listErr) {
  console.error('LIST_ERROR:', listErr.message)
  process.exit(1)
}
const existingCount = list?.users?.length ?? 0
console.log('EXISTING_USERS_FOUND:', existingCount)
if (existingCount > 0) {
  console.log('EXISTING_EMAILS:', list.users.map((u) => u.email).join(', '))
}

if (!email || !password) {
  
  process.exit(0)
}



const { data: full, error: fullErr } = await db.auth.admin.listUsers({ perPage: 1000 })
if (fullErr) {
  console.error('LIST_ERROR:', fullErr.message)
  process.exit(1)
}
const existing = full.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

if (existing) {
  const { data, error } = await db.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  })
  if (error) {
    console.error('UPDATE_ERROR:', error.message)
    process.exit(1)
  }
  console.log('PASSWORD_RESET_FOR:', data.user?.email)
  console.log('USER_ID:', data.user?.id)
  console.log('OK')
} else {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) {
    console.error('CREATE_ERROR:', error.message)
    process.exit(1)
  }
  console.log('CREATED_USER_ID:', data.user?.id)
  console.log('CREATED_EMAIL:', data.user?.email)
  console.log('OK')
}
