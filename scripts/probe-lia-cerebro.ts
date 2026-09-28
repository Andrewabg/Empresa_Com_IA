






import { createClient } from '@supabase/supabase-js'
import { TOPICS, topicTag } from '../src/server/interview/topics'
import { ingerirMarca } from '../src/server/tools/estudio/ingerirMarca'
import { assembleRecallMemory } from '../src/server/memory/inject'
import { brandCoverage, temDnaDaMarca } from '../src/lib/estudio/brandCoverage'
import { escolherNotasDaMarca } from '../src/lib/estudio/notasDaMarca'
import { getBrandVoice } from '../src/data/brandVoice'
import { getDefaultBrand } from '../src/data/brands'

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !svc) { console.error('MISSING_ENV'); process.exit(1) }
const db = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })


const { data: brs } = await db.from('brands').select('operator_id').eq('is_default', true).limit(1)
const operatorId = brs?.[0]?.operator_id as string
console.log('operador:', operatorId)


const tags = TOPICS.map((t) => topicTag(t.id))
const { data: todas } = await db.from('notes').select('path, tags')
const { data: antigas } = await db.from('notes').select('path').overlaps('tags', tags)
const agora = escolherNotasDaMarca(
  ((todas ?? []) as { path: string; tags: string[] }[]).map((n) => ({ path: n.path, titulo: n.path, corpo: 'x', tags: n.tags ?? [] })),
  tags,
)
console.log(`\n=== 1. notas no Cérebro: ${todas?.length ?? 0} | filtro ANTIGO (tags da entrevista): ${antigas?.length ?? 0} | selector de hoje: ${agora.length} ===`)
const alc = new Set((antigas ?? []).map((n: { path: string }) => n.path))
for (const n of (todas ?? []) as { path: string; tags: string[] }[]) {
  console.log(`  filtro antigo: ${alc.has(n.path) ? 'LIA' : 'IGNORAVA'}  ${n.path}  ${JSON.stringify(n.tags)}`)
}


const brand = await getDefaultBrand(operatorId)
const voice = brand ? await getBrandVoice(operatorId, brand.id) : null
const temDna = !!voice && temDnaDaMarca(voice)
const cov = voice ? brandCoverage(voice) : { faltando: [], minDone: false }
console.log(`\n=== 2. DNA gravado hoje: temDna=${temDna} minDone=${cov.minDone} faltando=${JSON.stringify(cov.faltando.map((g) => g.label))} ===`)
console.log('   (sem DNA ⇒ a diretiva manda ela devorar o Cérebro com ingerirMarca ANTES de perguntar)')



const gravar = process.argv.includes('--gravar')
console.log(`\n=== 3. o DNA que o ingerirMarca extrai do Cérebro ${gravar ? '(GRAVANDO)' : '(upsert no-op: nada é gravado)'} ===`)
const r = await ingerirMarca({}, { operatorId, actingAgentId: 'copywriter' },
  gravar ? {} : { upsertBrandVoice: async () => {  } })
console.log(r.output)
console.log(JSON.stringify(r.patch, null, 2)?.slice(0, 2500))


const pedido = 'Cria uma copy de um anúncio pra gente que vai converter bastante para a aula de amanhã.'
const recall = await assembleRecallMemory(pedido, 6)
console.log(`\n=== 4. recall injetado no prompt para "${pedido}" ===`)
console.log(recall ? recall.slice(0, 3000) : '(VAZIO — o prompt dela não recebe nada do Cérebro)')
