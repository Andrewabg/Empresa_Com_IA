
import type { SupabaseClient } from '@supabase/supabase-js'
import { enqueueCandidate } from '@/brain/curator/candidates'
import { appendCommitShas, listOperatorImportIds } from '@/data/imports'
import { existingContentHashes } from '@/data/importCandidates'
import { contentHashDeFato } from '@/lib/imports/dedup'
import { withCloneLock } from '@/server/brain/cloneLock'
import { reconcileResilient } from '@/server/brain/reconcileResilient'
import { criarAprovacoesDePrOrfaos } from '@/server/brain/aprovacoesDoCerebro'
import type { FatoDestilado } from './distiller'
import type { Brain } from '@/server/brain/runtime'



export interface ImportCuratorDeps {
  withCloneLock?: typeof withCloneLock
  reconcileResilient?: typeof reconcileResilient
  criarAprovacoesDePr?: typeof criarAprovacoesDePrOrfaos
}




export async function enqueueFatos(
  db: SupabaseClient,
  importId: string,
  fatos: FatoDestilado[],
): Promise<number> {
  if (fatos.length === 0) return 0

  
  
  
  const hashes = fatos.map((f) => f.sourceHash ?? contentHashDeFato(f.titulo, f.corpo))

  
  let jaExistem = new Set<string>()
  try {
    const operatorImportIds = await resolveOperatorImportIds(db, importId)
    if (operatorImportIds.length > 0) {
      jaExistem = await existingContentHashes(db, operatorImportIds, hashes)
    }
  } catch (e) {
    console.warn('[enqueueFatos] dedup por content_hash falhou (fail-open, insere tudo):', e)
    jaExistem = new Set()
  }

  
  
  const vistosAgora = new Set<string>()
  let enfileirados = 0
  for (let i = 0; i < fatos.length; i++) {
    const fato = fatos[i]
    const hash = hashes[i]
    if (jaExistem.has(hash) || vistosAgora.has(hash)) continue
    vistosAgora.add(hash)
    await enqueueCandidate(db, {
      source_type: 'import',
      source_ref: importId,
      raw_content: '# ' + fato.titulo + '\n\n' + fato.corpo,
      suggested_type: fato.tipo,
      suggested_tags: fato.tags,
      author_agent: 'curador',
      status: 'awaiting_review',
      content_hash: hash,
    })
    enfileirados++
  }
  return enfileirados
}


async function resolveOperatorImportIds(db: SupabaseClient, importId: string): Promise<string[]> {
  const { data, error } = await db
    .from('brain_imports')
    .select('operator_id')
    .eq('id', importId)
    .maybeSingle()
  if (error) throw new Error(`resolveOperatorImportIds: ${error.message}`)
  const operatorId = (data as { operator_id: string } | null)?.operator_id
  if (!operatorId) return []
  return listOperatorImportIds(db, operatorId)
}




export async function drainImportTick(
  brain: Brain,
  limit: number,
  deps?: ImportCuratorDeps,
): Promise<{ processed: number }> {
  const lock = deps?.withCloneLock ?? withCloneLock
  const reconcile = deps?.reconcileResilient ?? reconcileResilient

  
  const { processed, shasByImport } = await brain.curator.drainImport(limit)

  
  for (const [importId, shas] of Object.entries(shasByImport)) {
    await appendCommitShas(brain.db, importId, shas)
  }

  
  const total = Object.values(shasByImport).reduce((n, a) => n + a.length, 0)

  
  if (total > 0) {
    await lock(() => reconcile(brain.db, brain.repo, brain.sync, brain.embedder.version()))
  }

  
  
  
  try {
    await (deps?.criarAprovacoesDePr ?? criarAprovacoesDePrOrfaos)(brain.db)
  } catch (err) {
    console.warn('[drainImportTick] aprovações de PR do Curador falharam (fail-open):', err)
  }

  return { processed }
}
