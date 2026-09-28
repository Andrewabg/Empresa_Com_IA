
import { getBrain } from '@/server/brain/runtime'
import { serverDb } from '@/server/supabase'
import {
  claimFile,
  claimStep,
  setFileStatus,
  setImageStatus,
  claimImagemQueued,
  listFilesComImagemQueued,
  getFileText,
  setImportStatus,
  casImportStatus,
  listFilesByStatus,
  listActiveImports,
  getImportContext,
  requeueStaleExtracting,
  getImportSink,
  sumFileFactCount,
  type ImportFileRow,
} from '@/data/imports'
import { dedupMergeImport } from '@/server/imports/dedupMerge'
import { enfileirarFatosNaBase } from './baseSink'
import {
  countAwaitingReview as defaultCountAwaitingReview,
  existingContentHashes,
} from '@/data/importCandidates'
import { extractImageText, PROMPT_IMAGEM_TABELA } from '@/server/imports/adapters/image'
import { enqueueCandidate } from '@/brain/curator/candidates'
import { contentHashDeTexto } from '@/lib/imports/dedup'
import { extractQuickText } from './adapters/index'
import { pdfNumPages, ocrPdfRange } from './adapters/pdfOcr'
import { destilarChunks } from './distiller'
import { gerarDocSummary } from './docSummary'
import { enqueueFatos, drainImportTick } from './importCurator'
import { chunkSmart } from '@/lib/imports/chunkSmart'
import { chunkStructural, type StructuredChunk } from '@/lib/imports/chunkStructural'
import { uploadImagemConteudo } from '@/server/imports/imageStorage'
import { headingDaImagem } from '@/lib/imports/imageAnchors'
import type { ImageRef } from '@/lib/imports/imageTriage'
import { CHUNK_MAX_CHARS, sliceChunks, prevTailsForSlice } from '@/lib/imports/chunking'
import { nextImportStatus, describeProgress, type FileStatusCount } from '@/lib/imports/state'
import type { Brain } from '@/server/brain/runtime'
import type { SupabaseClient } from '@supabase/supabase-js'




const PROCESS_FILES_PER_TICK = 3

const CHUNKS_PER_TICK = 6

const STEP_LEASE_MS = 2 * 60 * 1000

const CURATE_PER_TICK = 8


const IMAGENS_PER_TICK = 3


const OCR_PAGES_PER_TICK = 8

const OCR_TOTAL_CAP = 200


const STALE_EXTRACTING_MS = 20 * 60 * 1000


export function withOcrCapNotice(text: string, realPages: number): string {
  if (realPages > OCR_TOTAL_CAP) {
    return `${text}\n\n(Documento com ${realPages} páginas — processei as primeiras ${OCR_TOTAL_CAP}.)`
  }
  return text
}




export function slug(headingPath: string): string {
  return headingPath
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 64)
    .replace(/^-+|-+$/g, '') 
}


export function derivarChunksPersistidos(
  text: string,
  fileId: string,
): (StructuredChunk & { parent_key: string })[] {
  return chunkStructural(text).map(c => ({ ...c, parent_key: `${fileId}:${slug(c.heading_path)}` }))
}



export interface ImportHeartbeatDeps {
  getBrain?: () => Promise<Brain>
  serverDb?: () => SupabaseClient
  claimFile?: typeof claimFile
  claimStep?: typeof claimStep
  setFileStatus?: typeof setFileStatus
  getFileText?: typeof getFileText
  setImportStatus?: typeof setImportStatus
  listFilesByStatus?: typeof listFilesByStatus
  listActiveImports?: typeof listActiveImports
  getImportContext?: typeof getImportContext
  extractQuickText?: typeof extractQuickText
  pdfNumPages?: typeof pdfNumPages
  ocrPdfRange?: typeof ocrPdfRange
  destilarChunks?: typeof destilarChunks
  
  gerarDocSummary?: typeof gerarDocSummary
  enqueueFatos?: typeof enqueueFatos
  
  getImportSink?: typeof getImportSink
  
  enfileirarFatosNaBase?: typeof enfileirarFatosNaBase
  
  sumFileFactCount?: typeof sumFileFactCount
  
  uploadImagemConteudo?: typeof uploadImagemConteudo
  
  
  listFilesComImagemQueued?: typeof listFilesComImagemQueued
  
  claimImagemQueued?: typeof claimImagemQueued
  
  extractImageText?: typeof extractImageText
  
  setImageStatus?: typeof setImageStatus
  
  enqueueCandidate?: typeof enqueueCandidate
  
  existingContentHashes?: typeof existingContentHashes
  
  contentHashDeTexto?: typeof contentHashDeTexto
  drainImportTick?: typeof drainImportTick
  
  stepLeaseMs?: number
  
  countPendingCandidates?: (db: SupabaseClient, importId: string) => Promise<number>
  
  countAwaitingReview?: (db: SupabaseClient, importId: string) => Promise<number>
  
  requeueStaleExtracting?: (db: SupabaseClient, staleMs: number) => Promise<number>
  
  staleExtractingMs?: number
  
  casImportStatus?: typeof casImportStatus
  
  dedupMergeImport?: typeof dedupMergeImport
}



async function defaultCountPendingCandidates(
  db: SupabaseClient,
  importId: string,
): Promise<number> {
  const { count, error } = await (db as any)
    .from('memory_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('source_type', 'import')
    .eq('source_ref', importId)
    .eq('status', 'pending_import')
  if (error) return 0
  return count ?? 0
}




async function downloadBytes(db: SupabaseClient, storage_path: string): Promise<Uint8Array> {
  const { data: blob, error } = await (db as any).storage.from('artifacts').download(storage_path)
  if (error || !blob) throw new Error(`download: ${error?.message ?? 'sem dados'}`)
  return new Uint8Array(await (blob as Blob).arrayBuffer())
}




async function computeDocSummary(
  file: ImportFileRow,
  db: SupabaseClient,
  text: string,
  deps: Required<ImportHeartbeatDeps>,
): Promise<string | null> {
  try {
    const context = await deps.getImportContext(db, file.import_id).catch(() => null)
    return await deps.gerarDocSummary(text, { filename: file.filename, context: context ?? undefined })
  } catch {
    return null 
  }
}




async function stepDistill(
  file: ImportFileRow,
  _brain: Brain,
  db: SupabaseClient,
  deps: Required<ImportHeartbeatDeps>,
): Promise<void> {
  const text = (await deps.getFileText(db, file.id)) ?? ''

  
  
  
  let textos: string[]
  let janela: string[] 
  if (file.chunks != null) {
    
    janela = file.chunks.map(c => c.text)
    textos = sliceChunks(janela, file.chunks_done, CHUNKS_PER_TICK)
  } else if (file.chunks_done > 0) {
    
    
    
    
    
    
    janela = chunkSmart(text, { maxChars: CHUNK_MAX_CHARS })
    textos = sliceChunks(janela, file.chunks_done, CHUNKS_PER_TICK)
  } else {
    
    
    const persistidos = derivarChunksPersistidos(text, file.id)
    await deps.setFileStatus(db, file.id, 'distilling', {
      chunks: persistidos,
      chunks_total: persistidos.length,
    })
    janela = persistidos.map(c => c.text)
    textos = sliceChunks(janela, file.chunks_done, CHUNKS_PER_TICK)
  }

  const fatia = textos
  
  
  if (fatia.length === 0) {
    await deps.setFileStatus(db, file.id, 'distilled', {
      chunks_done: file.chunks_done,
      fact_count: file.fact_count ?? 0,
    })
    return
  }
  const context = await deps.getImportContext(db, file.import_id).catch(() => null)
  
  
  
  
  const prevTails = prevTailsForSlice(janela, file.chunks_done, fatia.length)
  const fatos = await deps.destilarChunks(
    fatia,
    { filename: file.filename, context: context ?? undefined },
    undefined,
    { docSummary: file.doc_summary ?? undefined, prevTails },
  )
  
  
  const sink = await deps.getImportSink(db, file.import_id)
  if (sink.target === 'base') await deps.enfileirarFatosNaBase(sink.baseAgentId, fatos)
  else await deps.enqueueFatos(db, file.import_id, fatos) 
  const done = file.chunks_done + fatia.length 
  const factCount = (file.fact_count ?? 0) + fatos.length 
  
  
  const total = janela.length
  const target = done >= total ? 'distilled' : 'distilling'
  await deps.setFileStatus(db, file.id, target, { chunks_done: done, fact_count: factCount })
}




async function stepFirstExtraction(
  file: ImportFileRow,
  _brain: Brain,
  db: SupabaseClient,
  deps: Required<ImportHeartbeatDeps>,
): Promise<void> {
  const bytes = await downloadBytes(db, file.storage_path)
  const q = await deps.extractQuickText(bytes, file.mime, file.filename) 
  if (q.skippedReason) {
    await deps.setFileStatus(db, file.id, 'failed', {
      error: q.skippedReason,
      attempts: (file.attempts ?? 0) + 1,
    })
    return
  }
  if (q.needsOcr) {
    
    
    
    
    const realPages = await deps.pdfNumPages(bytes)
    const total = Math.min(realPages, OCR_TOTAL_CAP)
    if (total === 0) {
      
      await deps.setFileStatus(db, file.id, 'failed', {
        error: 'scanned_or_empty',
        attempts: (file.attempts ?? 0) + 1,
      })
      return
    }
    const upTo = Math.min(OCR_PAGES_PER_TICK, total) 
    const batch = await deps.ocrPdfRange(bytes, 1, upTo + 1) 
    if (upTo >= total) {
      
      
      
      const finalText = withOcrCapNotice(batch, realPages)
      
      
      const chunks = derivarChunksPersistidos(finalText, file.id)
      
      const doc_summary = await computeDocSummary(file, db, finalText, deps)
      await deps.setFileStatus(db, file.id, 'distilling', {
        extracted_text: finalText,
        ocr_pages_total: total,
        ocr_pages_done: upTo,
        chunks,
        chunks_total: chunks.length,
        chunks_done: 0,
        ...(q.imageRefs ? { image_refs: q.imageRefs } : {}),
        ...(doc_summary ? { doc_summary } : {}),
      })
    } else {
      
      await deps.setFileStatus(db, file.id, 'extracting', {
        extracted_text: batch,
        ocr_pages_total: total,
        ocr_pages_done: upTo,
      })
    }
    return
  }
  
  const text = q.text
  
  
  const chunks = derivarChunksPersistidos(text, file.id)
  
  
  
  
  
  
  
  const imageRefsPersistidos: ImageRef[] = []
  for (const ref of q.imageRefs ?? []) {
    let up: { storage_path: string; mime: string | undefined }
    try {
      up = await deps.uploadImagemConteudo(db, file.import_id, ref)
    } catch (e) {
      console.warn('[stepFirstExtraction] upload de imagem falhou, pulando:', e)
      continue
    }
    const origin_heading =
      ref.pagina != null ? `Página ${ref.pagina}` : headingDaImagem(chunks, ref.n)
    imageRefsPersistidos.push({
      n: ref.n,
      sha256: ref.sha256,
      bytes: ref.bytes,
      width: ref.width,
      height: ref.height,
      mime: up.mime,
      storage_path: up.storage_path,
      origin_heading,
      ...(ref.pagina != null ? { pagina: ref.pagina } : {}),
      status: 'pending',
    })
  }
  
  const doc_summary = await computeDocSummary(file, db, text, deps)
  await deps.setFileStatus(db, file.id, 'distilling', {
    extracted_text: text,
    ocr_pages_total: 0,
    chunks,
    chunks_total: chunks.length,
    chunks_done: 0,
    ...(imageRefsPersistidos.length ? { image_refs: imageRefsPersistidos } : {}),
    ...(doc_summary ? { doc_summary } : {}),
  })
  
}




async function stepOcr(
  file: ImportFileRow,
  _brain: Brain,
  db: SupabaseClient,
  deps: Required<ImportHeartbeatDeps>,
): Promise<void> {
  const bytes = await downloadBytes(db, file.storage_path)
  const from = file.ocr_pages_done + 1 
  const to = Math.min(file.ocr_pages_done + OCR_PAGES_PER_TICK, file.ocr_pages_total) + 1 
  const batch = await deps.ocrPdfRange(bytes, from, to)
  const prev = (await deps.getFileText(db, file.id)) ?? ''
  const combined = prev ? (batch ? `${prev}\n\n${batch}` : prev) : batch
  const done = to - 1 
  if (done >= file.ocr_pages_total) {
    
    
    
    
    const realPages = await deps.pdfNumPages(bytes)
    const finalText = withOcrCapNotice(combined, realPages)
    
    
    
    const chunks = derivarChunksPersistidos(finalText, file.id)
    
    const doc_summary = await computeDocSummary(file, db, finalText, deps)
    await deps.setFileStatus(db, file.id, 'distilling', {
      extracted_text: finalText,
      ocr_pages_done: done,
      chunks,
      chunks_total: chunks.length,
      chunks_done: 0,
      ...(doc_summary ? { doc_summary } : {}),
    })
  } else {
    await deps.setFileStatus(db, file.id, 'extracting', {
      extracted_text: combined,
      ocr_pages_done: done,
    })
  }
}




async function stepFile(
  file: ImportFileRow,
  brain: Brain,
  db: SupabaseClient,
  deps: Required<ImportHeartbeatDeps>,
): Promise<void> {
  try {
    
    
    if (file.status === 'extracting') {
      return file.ocr_pages_total > 0
        ? await stepOcr(file, brain, db, deps)
        : await stepFirstExtraction(file, brain, db, deps)
    }
    if (file.status === 'distilling') return await stepDistill(file, brain, db, deps)
  } catch (err) {
    const newAttempts = (file.attempts ?? 0) + 1
    const finalStatus = newAttempts >= (file.max_attempts ?? 3) ? 'failed' : file.status 
    await deps.setFileStatus(db, file.id, finalStatus, {
      error: String(err),
      attempts: newAttempts,
    }).catch(() => {})
  }
}



async function aggregateFileStatuses(
  db: SupabaseClient,
  importId: string,
  deps: Required<ImportHeartbeatDeps>,
): Promise<FileStatusCount> {
  const statuses = ['queued', 'extracting', 'distilling', 'distilled', 'failed'] as const
  const counts: FileStatusCount = {
    queued: 0,
    extracting: 0,
    distilling: 0,
    distilled: 0,
    failed: 0,
  }
  
  await Promise.all(
    statuses.map(async s => {
      
      
      
      
      const all = await deps.listFilesByStatus(db, s, 1000)
      counts[s] = all.filter(f => f.import_id === importId).length
    }),
  )
  return counts
}




export async function runImportHeartbeat(
  overrides?: ImportHeartbeatDeps,
): Promise<{ processed: number; curated: number }> {
  const d: Required<ImportHeartbeatDeps> = {
    getBrain: overrides?.getBrain ?? getBrain,
    serverDb: overrides?.serverDb ?? serverDb,
    claimFile: overrides?.claimFile ?? claimFile,
    claimStep: overrides?.claimStep ?? claimStep,
    setFileStatus: overrides?.setFileStatus ?? setFileStatus,
    getFileText: overrides?.getFileText ?? getFileText,
    setImportStatus: overrides?.setImportStatus ?? setImportStatus,
    listFilesByStatus: overrides?.listFilesByStatus ?? listFilesByStatus,
    listActiveImports: overrides?.listActiveImports ?? listActiveImports,
    getImportContext: overrides?.getImportContext ?? getImportContext,
    extractQuickText: overrides?.extractQuickText ?? extractQuickText,
    pdfNumPages: overrides?.pdfNumPages ?? pdfNumPages,
    ocrPdfRange: overrides?.ocrPdfRange ?? ocrPdfRange,
    destilarChunks: overrides?.destilarChunks ?? destilarChunks,
    gerarDocSummary: overrides?.gerarDocSummary ?? gerarDocSummary,
    enqueueFatos: overrides?.enqueueFatos ?? enqueueFatos,
    getImportSink: overrides?.getImportSink ?? getImportSink,
    enfileirarFatosNaBase: overrides?.enfileirarFatosNaBase ?? enfileirarFatosNaBase,
    sumFileFactCount: overrides?.sumFileFactCount ?? sumFileFactCount,
    uploadImagemConteudo: overrides?.uploadImagemConteudo ?? uploadImagemConteudo,
    listFilesComImagemQueued: overrides?.listFilesComImagemQueued ?? listFilesComImagemQueued,
    claimImagemQueued: overrides?.claimImagemQueued ?? claimImagemQueued,
    extractImageText: overrides?.extractImageText ?? extractImageText,
    setImageStatus: overrides?.setImageStatus ?? setImageStatus,
    enqueueCandidate: overrides?.enqueueCandidate ?? enqueueCandidate,
    existingContentHashes: overrides?.existingContentHashes ?? existingContentHashes,
    contentHashDeTexto: overrides?.contentHashDeTexto ?? contentHashDeTexto,
    drainImportTick: overrides?.drainImportTick ?? drainImportTick,
    stepLeaseMs: overrides?.stepLeaseMs ?? STEP_LEASE_MS,
    countPendingCandidates:
      overrides?.countPendingCandidates ?? defaultCountPendingCandidates,
    countAwaitingReview:
      overrides?.countAwaitingReview ?? defaultCountAwaitingReview,
    requeueStaleExtracting:
      overrides?.requeueStaleExtracting ?? requeueStaleExtracting,
    staleExtractingMs:
      overrides?.staleExtractingMs ?? STALE_EXTRACTING_MS,
    casImportStatus: overrides?.casImportStatus ?? casImportStatus,
    dedupMergeImport: overrides?.dedupMergeImport ?? dedupMergeImport,
  }

  let processed = 0
  let curated = 0

  try {
    const brain = await d.getBrain()
    const db = brain.db

    
    
    
    
    try {
      const reclaimed = await d.requeueStaleExtracting(db, d.staleExtractingMs)
      if (reclaimed > 0) {
        console.warn(`[importHeartbeat] ${reclaimed} arquivo(s) stale em 'extracting' re-enfileirado(s)`)
      }
    } catch (e) {
      console.warn('[importHeartbeat] requeueStaleExtracting fail-open:', e)
    }

    
    
    
    
    let steps = 0
    const budget = PROCESS_FILES_PER_TICK

    
    for (const f of await d.listFilesByStatus(db, 'queued', budget)) {
      if (steps >= budget) break
      if (!(await d.claimFile(db, f.id, 'queued', 'extracting'))) continue 
      await stepFile({ ...f, status: 'extracting' }, brain, db, d)
      steps++
    }

    
    for (const f of await d.listFilesByStatus(db, 'distilling', budget - steps)) {
      if (steps >= budget) break
      const c = await d.claimStep(db, f.id, 'distilling', d.stepLeaseMs)
      if (!c) continue 
      await stepFile(c, brain, db, d)
      steps++
    }

    
    
    
    for (const f of await d.listFilesByStatus(db, 'extracting', budget - steps)) {
      if (steps >= budget) break
      const c = await d.claimStep(db, f.id, 'extracting', d.stepLeaseMs)
      if (!c) continue 
      await stepFile(c, brain, db, d)
      steps++
    }

    processed = steps

    
    try {
      const drainResult = await d.drainImportTick(brain, CURATE_PER_TICK)
      curated = drainResult.processed
    } catch (e) {
      console.warn('[importHeartbeat] drainImportTick fail-open:', e)
    }

    
    
    
    
    
    try {
      let lidas = 0
      const filesComImg = await d.listFilesComImagemQueued(db, IMAGENS_PER_TICK)
      for (const f of filesComImg) {
        while (lidas < IMAGENS_PER_TICK) {
          const claim = await d.claimImagemQueued(db, f.id)
          if (!claim) break 
          const ref = claim.ref
          try {
            const bytes = await downloadBytes(db, ref.storage_path!)
            const texto = await d.extractImageText(bytes, ref.mime ?? 'image/png', {}, { prompt: PROMPT_IMAGEM_TABELA })
            const hash = d.contentHashDeTexto('imagem:' + ref.sha256)
            if (!texto) {
              
              await d.setImageStatus(db, f.id, ref.n, { status: 'read' })
            } else {
              const ja = await d.existingContentHashes(db, [f.import_id], [hash])
              if (ja.has(hash)) {
                
                await d.setImageStatus(db, f.id, ref.n, { status: 'read' })
              } else {
                
                
                await d.enqueueCandidate(db, {
                  source_type: 'import',
                  source_ref: f.import_id,
                  raw_content: `# Imagem ${ref.n} (${f.filename}${ref.origin_heading ? ', seção ' + ref.origin_heading : ''})\n\n${texto}`,
                  suggested_tags: ['imagem'],
                  author_agent: 'curador',
                  status: 'awaiting_review',
                  content_hash: hash,
                })
                await d.setImageStatus(db, f.id, ref.n, { status: 'read' })
              }
            }
            lidas++
          } catch (e) {
            console.warn('[importHeartbeat] leitura de imagem falhou (fail-open):', e)
            await d.setImageStatus(db, f.id, ref.n, { status: 'failed' }).catch(() => {})
            
            break
          }
        }
        if (lidas >= IMAGENS_PER_TICK) break
      }
    } catch (e) {
      console.warn('[importHeartbeat] passo ler-imagens fail-open:', e)
    }

    
    try {
      const activeImports = await d.listActiveImports(db)
      for (const imp of activeImports) {
        try {
          const fileCounts = await aggregateFileStatuses(db, imp.id, d)
          const pending = await d.countPendingCandidates(db, imp.id)
          
          const awaitingReview = await d.countAwaitingReview(db, imp.id)
          const nextStatus = nextImportStatus({
            files: fileCounts,
            pendingCandidates: pending,
            awaitingReview,
          })

          if (nextStatus === imp.status) continue 

          
          
          
          
          
          
          
          if (nextStatus === 'review' && imp.status !== 'review') {
            const won = await d.casImportStatus(db, imp.id, imp.status, 'curating').catch(() => false)
            if (won) {
              try { await d.dedupMergeImport(db, imp.id) } catch (e) { console.warn(`[importHeartbeat] dedupMerge ${imp.id} fail-open:`, e) }
              await d.setImportStatus(db, imp.id, 'review').catch(() => {})
            }
            continue 
          }

          const progress = describeProgress(fileCounts, pending, awaitingReview)

          if (nextStatus === 'done') {
            
            
            
            
            const factCount = imp.target === 'base'
              ? await d.sumFileFactCount(db, imp.id)
              : (imp.commit_shas?.length ?? 0)
            await d.setImportStatus(db, imp.id, 'done', {
              summary: progress.label,
              fact_count: factCount,
            })
          } else {
            await d.setImportStatus(db, imp.id, nextStatus)
          }
        } catch (e) {
          console.warn(`[importHeartbeat] fechar lote ${imp.id} fail-open:`, e)
        }
      }
    } catch (e) {
      console.warn('[importHeartbeat] fechar lotes fail-open:', e)
    }
  } catch (e) {
    
    console.warn('[importHeartbeat] fail-open:', e)
  }

  return { processed, curated }
}
