












import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const LOCK_KEY = 7455101

export function parseMigrationFile(name) {
  const m = name.match(/^(\d{4})_.+\.sql$/)
  return m ? { version: m[1], name } : null
}




export const CUSTOM_RANGE_START = '9000'
export function isCustomerVersion(version) {
  return version >= CUSTOM_RANGE_START 
}






export function planMigrations({ files, customFiles =  ([]), applied, dbIsFresh }) {
  const oficiais = files
    .map(parseMigrationFile)
    .filter(Boolean)
    .map((m) => ({ ...m, origem: 'oficial' }))
  const custom = customFiles
    .map(parseMigrationFile)
    .filter(Boolean)
    .map((m) => ({ ...m, origem: 'custom' }))
  
  
  
  const customFora = custom.find((m) => !isCustomerVersion(m.version))
  if (customFora) return { error: 'custom_fora_da_faixa', apply: [], arquivo: customFora.name }
  const oficialNaFaixa = oficiais.find((m) => isCustomerVersion(m.version))
  if (oficialNaFaixa) return { error: 'oficial_na_faixa_custom', apply: [], arquivo: oficialNaFaixa.name }
  const migrations = [...oficiais, ...custom]
    .sort((a, b) => a.version.localeCompare(b.version))
  const dup = migrations.find((m, i) => i > 0 && m.version === migrations[i - 1].version)
  if (dup) return { error: 'duplicate_version', apply: [], duplicate: dup.version }
  if (!dbIsFresh && applied.size === 0) return { error: 'baseline_missing', apply: [] }
  const apply = migrations.filter((m) => !applied.has(m.version))
  
  
  
  
  
  
  const appliedVersions = [...applied]
  const maxOf = (versions) =>
    versions.length > 0 ? versions.sort((a, b) => a.localeCompare(b)).pop() : null
  const maxOficial = maxOf(appliedVersions.filter((v) => !isCustomerVersion(v)))
  const maxCustom = maxOf(appliedVersions.filter((v) => isCustomerVersion(v)))
  const outOfOrder = apply
    .filter((m) => {
      const max = m.origem === 'custom' ? maxCustom : maxOficial
      return max !== null && m.version.localeCompare(max) < 0
    })
    .map((m) => m.version)
  return { error: null, apply, outOfOrder }
}


export function healSupabasePoolerPort(dbUrl) {
  if (typeof dbUrl !== 'string') return { url: dbUrl, healed: false }
  
  
  if (/@[^@/]*\.pooler\.supabase\.com:6543([/?]|$)/.test(dbUrl)) {
    return { url: dbUrl.replace(/:6543([/?]|$)/, ':5432$1'), healed: true }
  }
  return { url: dbUrl, healed: false }
}


export function isSupabaseDirectHost(dbUrl) {
  if (typeof dbUrl !== 'string') return false
  return /@db\.[a-z0-9]+\.supabase\.co([:/]|$)/i.test(dbUrl)
}

async function main() {
  const rawDbUrl = process.env.SUPABASE_DB_URL
  if (!rawDbUrl) {
    console.log('[migrate] SUPABASE_DB_URL ausente — pulando (migrations seguem no fluxo manual).')
    return 0
  }
  
  
  const { url: dbUrl, healed } = healSupabasePoolerPort(rawDbUrl)
  if (healed) {
    console.warn('[migrate] SUPABASE_DB_URL apontava pro transaction pooler (6543); usando o session pooler (5432) automaticamente.')
  }
  
  
  
  
  if (/:6543([/?]|$)/.test(dbUrl)) {
    console.error('[migrate] SUPABASE_DB_URL usa o transaction pooler (porta 6543), incompatível com o runner (advisory lock é por sessão). Use o Session pooler (porta 5432) — DEPLOY.md §2.1.')
    return 1
  }
  
  
  if (isSupabaseDirectHost(dbUrl)) {
    console.error('[migrate] SUPABASE_DB_URL usa a Direct connection do Supabase (db.<ref>.supabase.co), que é só IPv6 e não resolve no EasyPanel/maioria dos hosts (ENOTFOUND). Use a Session pooler: Supabase → Settings → Database → Connection string → aba "Session pooler" (host ...pooler.supabase.com, usuário postgres.<ref>, porta 5432). Ver DEPLOY.md §2.1.')
    return 1
  }
  const { default: postgres } = await import('postgres')
  const local = /127\.0\.0\.1|localhost/.test(dbUrl)
  const sql = postgres(dbUrl, {
    max: 1,
    ssl: local ? false : 'require',
    prepare: false,
    onnotice: (n) => console.log('[migrate] pg:', n.severity ?? 'NOTICE', n.message), 
  })
  try {
    
    
    
    
    
    const attempts = Math.max(1, Number(process.env.MIGRATE_CONNECT_ATTEMPTS) || 3)
    for (let i = 1; ; i++) {
      try {
        await sql`select 1`
        break
      } catch (err) {
        if (i >= attempts) throw err
        const backoff = 1000 * i 
        console.warn(`[migrate] conexão falhou (tentativa ${i}/${attempts}: ${err?.message ?? err}) — novo teste em ${backoff}ms`)
        await new Promise((r) => setTimeout(r, backoff))
      }
    }
    
    
    
    
    await sql.unsafe(`set lock_timeout = '15s'`)
    await sql`select pg_advisory_lock(${LOCK_KEY})`
    await sql`create table if not exists public.awave_migrations (
      version text primary key,
      name text not null,
      applied_at timestamptz not null default now()
    )`
    
    
    await sql`alter table public.awave_migrations enable row level security`
    const sentinel = await sql`select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'sync_state'`
    const applied = new Set((await sql`select version from public.awave_migrations`).map((r) => r.version))
    const dir = join(dirname(fileURLToPath(import.meta.url)), 'supabase', 'migrations')
    const files = await readdir(dir)
    
    
    
    
    const customDir = join(dirname(fileURLToPath(import.meta.url)), 'custom', 'migrations')
    const customFiles = await readdir(customDir).catch((err) => {
      if (err?.code === 'ENOENT') return []
      throw err 
    })
    for (const name of [...files, ...customFiles]) {
      
      if (name.endsWith('.sql') && !parseMigrationFile(name)) {
        console.warn('[migrate] ignorando arquivo fora do padrão: ' + name)
      }
    }
    const plan = planMigrations({ files, customFiles, applied, dbIsFresh: sentinel.length === 0 })
    if (plan.error === 'custom_fora_da_faixa') {
      console.error(
        `[migrate] Migration em custom/migrations fora da faixa reservada (9000–9999): ${plan.arquivo}. ` +
        'Renomeie pro prefixo 9000+ e reinicie. (Numa atualização, o container atual continua no ar até isso ser corrigido.)'
      )
      return 1
    }
    if (plan.error === 'oficial_na_faixa_custom') {
      console.error(
        `[migrate] Migration OFICIAL (supabase/migrations) dentro da faixa reservada ao cliente (9000–9999): ${plan.arquivo}. ` +
        'Isso é erro de empacotamento da release — migrations oficiais usam prefixo abaixo de 9000. ' +
        '(Numa atualização, o container atual continua no ar até isso ser corrigido.)'
      )
      return 1
    }
    if (plan.error === 'duplicate_version') {
      
      
      const pastaDup = isCustomerVersion(plan.duplicate) ? 'custom/migrations' : 'supabase/migrations'
      console.error(
        `[migrate] Versão duplicada nas migrations: ${plan.duplicate} — ` +
        `dois arquivos em ${pastaDup} com o mesmo prefixo. Corrija antes de subir.`
      )
      return 1
    }
    if (plan.error === 'baseline_missing') {
      console.error(
        '[migrate] Banco existente sem baseline (public.awave_migrations vazia). ' +
        'Aplique as migrations pendentes manualmente UMA última vez — até a migration de ' +
        'baseline (a que cria public.awave_migrations) — e rebuilde (DEPLOY.md §7).'
      )
      return 1
    }
    if (plan.outOfOrder && plan.outOfOrder.length > 0) {
      console.warn(
        '[migrate] AVISO: migration(s) fora de ordem (abaixo da última aplicada): ' +
        plan.outOfOrder.join(', ') + ' — verifique o empacotamento'
      )
    }
    if (plan.apply.length === 0) {
      console.log('[migrate] Nenhuma migration pendente.')
      return 0
    }
    for (const m of plan.apply) {
      const content = await readFile(join(m.origem === 'custom' ? customDir : dir, m.name), 'utf8')
      console.log(`[migrate] Aplicando ${m.name}…`)
      await sql.begin(async (tx) => {
        await tx.unsafe(content)
        await tx`insert into public.awave_migrations (version, name)
          values (${m.version}, ${m.name}) on conflict (version) do nothing`
      })
    }
    console.log(`[migrate] OK — ${plan.apply.length} migration(s) aplicada(s).`)
    return 0
  } finally {
    await sql.end({ timeout: 5 })
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error('[migrate] ERRO:', err?.message ?? err)
      process.exit(1) 
    })
}
