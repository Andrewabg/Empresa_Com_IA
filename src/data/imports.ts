
import type { SupabaseClient } from '@supabase/supabase-js'
import type { StructuredChunk } from '@/lib/imports/chunkStructural'
import type { ImageRef } from '@/lib/imports/imageTriage'

export interface ImportRow {
  id: string
  status: string
  file_count: number
  fact_count: number
  commit_shas: string[]
  summary: string | null
  error: string | null
  
  context: string | null
  
  target: string
  
  base_agent_id: string | null
}

export interface ImportFileRow {
  id: string
  import_id: string
  filename: string
  storage_path: string
  mime: string | null
  status: string
  attempts: number
  max_attempts: number
  fact_count: number
  error: string | null
  ocr_pages_total: number
  ocr_pages_done: number
  chunks_total: number
  chunks_done: number
  
  doc_summary: string | null
  
  chunks?: (StructuredChunk & { parent_key?: string })[] | null
  
  image_refs?: ImageRef[] | null
}


const FILE_COLS = 'id, import_id, filename, storage_path, mime, status, attempts, max_attempts, fact_count, error, ocr_pages_total, ocr_pages_done, chunks_total, chunks_done, doc_summary, chunks, image_refs'


export async function createImport(
  db: SupabaseClient,
  operatorId: string,
  context?: string,
  opts?: { target?: 'cerebro' | 'base'; baseAgentId?: string | null },
): Promise<ImportRow> {
  const { data, error } = await db
    .from('brain_imports')
    .insert({
      operator_id: operatorId,
      status: 'queued',
      context: context ?? null,
      target: opts?.target ?? 'cerebro',
      base_agent_id: opts?.baseAgentId ?? null,
    })
    .select('id, status, file_count, fact_count, commit_shas, summary, error, context, target, base_agent_id')
    .single()
  if (error) throw new Error(`createImport: ${error.message}`)
  return data as ImportRow
}


export async function getImportSink(
  db: SupabaseClient,
  importId: string,
): Promise<{ target: 'cerebro' | 'base'; baseAgentId: string | null }> {
  const { data, error } = await db
    .from('brain_imports')
    .select('target, base_agent_id')
    .eq('id', importId)
    .maybeSingle()
  if (error || !data) return { target: 'cerebro', baseAgentId: null }
  const t = (data as { target?: string }).target
  return {
    target: t === 'base' ? 'base' : 'cerebro',
    baseAgentId: (data as { base_agent_id?: string | null }).base_agent_id ?? null,
  }
}


export async function sumFileFactCount(db: SupabaseClient, importId: string): Promise<number> {
  const { data, error } = await db
    .from('brain_import_files')
    .select('fact_count')
    .eq('import_id', importId)
  if (error) return 0
  return (data ?? []).reduce((n: number, r: { fact_count?: number }) => n + (r.fact_count ?? 0), 0)
}


export async function getImportContext(db: SupabaseClient, importId: string): Promise<string | null> {
  const { data, error } = await db
    .from('brain_imports')
    .select('context')
    .eq('id', importId)
    .maybeSingle()
  if (error) throw new Error(`getImportContext: ${error.message}`)
  return (data as { context: string | null } | null)?.context ?? null
}


export async function addImportFile(
  db: SupabaseClient,
  importId: string,
  f: { filename: string; storage_path: string; mime: string; bytes: number; file_hash?: string },
): Promise<ImportFileRow> {
  const { data, error } = await db
    .from('brain_import_files')
    .insert({
      import_id: importId,
      filename: f.filename,
      storage_path: f.storage_path,
      mime: f.mime,
      bytes: f.bytes,
      status: 'queued',
      
      
      ...(f.file_hash !== undefined ? { file_hash: f.file_hash } : {}),
    })
    .select(FILE_COLS)
    .single()
  if (error) throw new Error(`addImportFile: ${error.message}`)
  return data as ImportFileRow
}


export async function listOperatorImportIds(
  db: SupabaseClient,
  operatorId: string,
): Promise<string[]> {
  const { data, error } = await db
    .from('brain_imports')
    .select('id')
    .eq('operator_id', operatorId)
  if (error) throw new Error(`listOperatorImportIds: ${error.message}`)
  return (data ?? []).map((r) => (r as { id: string }).id)
}


export async function findImportedFileByHash(
  db: SupabaseClient,
  operatorId: string,
  fileHash: string,
): Promise<{ id: string; filename: string; import_id: string } | null> {
  
  const { data: imps, error: impErr } = await db
    .from('brain_imports')
    .select('id')
    .eq('operator_id', operatorId)
    .in('status', ['done', 'review'])
  if (impErr) throw new Error(`findImportedFileByHash imports: ${impErr.message}`)
  const importIds = (imps ?? []).map((r) => (r as { id: string }).id)
  if (importIds.length === 0) return null

  
  
  
  
  const { data, error } = await db
    .from('brain_import_files')
    .select('id, filename, import_id')
    .eq('file_hash', fileHash)
    .in('import_id', importIds)
    .neq('status', 'failed')
    .limit(1)
  if (error) throw new Error(`findImportedFileByHash files: ${error.message}`)
  const row = (data ?? [])[0] as { id: string; filename: string; import_id: string } | undefined
  return row ?? null
}


export async function setImportStatus(
  db: SupabaseClient,
  id: string,
  status: string,
  patch?: { summary?: string; fact_count?: number; error?: string },
): Promise<void> {
  const { error } = await db
    .from('brain_imports')
    .update({ status, updated_at: new Date().toISOString(), ...(patch ?? {}) })
    .eq('id', id)
  if (error) throw new Error(`setImportStatus: ${error.message}`)
}


export async function casImportStatus(
  db: SupabaseClient,
  importId: string,
  from: string,
  to: string,
): Promise<boolean> {
  const { data, error } = await db
    .from('brain_imports')
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq('id', importId)
    .eq('status', from)
    .select('id')
  if (error) throw new Error(`casImportStatus: ${error.message}`)
  return Array.isArray(data) && data.length === 1
}


export async function appendCommitShas(db: SupabaseClient, id: string, shas: string[]): Promise<void> {
  if (shas.length === 0) return
  
  const { data, error: readErr } = await db
    .from('brain_imports')
    .select('commit_shas')
    .eq('id', id)
    .maybeSingle()
  if (readErr) throw new Error(`appendCommitShas read: ${readErr.message}`)
  if (!data) return
  const current: string[] = (data as { commit_shas: string[] }).commit_shas ?? []
  const merged = [...current, ...shas]
  const { error: writeErr } = await db
    .from('brain_imports')
    .update({ commit_shas: merged, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (writeErr) throw new Error(`appendCommitShas write: ${writeErr.message}`)
}


export async function claimFile(
  db: SupabaseClient,
  id: string,
  from: string,
  to: string,
): Promise<ImportFileRow | null> {
  const { data, error } = await db
    .from('brain_import_files')
    .update({ status: to, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', from)
    .select(FILE_COLS)
  if (error) throw new Error(`claimFile: ${error.message}`)
  return data && data.length === 1 ? (data[0] as ImportFileRow) : null
}


export async function claimStep(
  db: SupabaseClient, id: string, status: string, leaseMs: number,
): Promise<ImportFileRow | null> {
  const cutoff = new Date(Date.now() - leaseMs).toISOString()
  const { data, error } = await db.from('brain_import_files')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', status).lt('updated_at', cutoff)
    .select(FILE_COLS)
  if (error) throw new Error(`claimStep: ${error.message}`)
  return data && data.length === 1 ? (data[0] as ImportFileRow) : null
}


export async function setFileStatus(
  db: SupabaseClient,
  id: string,
  status: string,
  patch?: { fact_count?: number; error?: string; attempts?: number; extracted_text?: string; ocr_pages_total?: number; ocr_pages_done?: number; chunks_total?: number; chunks_done?: number; doc_summary?: string; chunks?: (StructuredChunk & { parent_key?: string })[]; image_refs?: ImageRef[] },
): Promise<void> {
  const { error } = await db
    .from('brain_import_files')
    .update({ status, updated_at: new Date().toISOString(), ...(patch ?? {}) })
    .eq('id', id)
  if (error) throw new Error(`setFileStatus: ${error.message}`)
}


const IMAGE_LEASE_MS = 2 * 60 * 1000


export async function setImageStatus(
  db: SupabaseClient,
  fileId: string,
  n: number,
  patch: Partial<ImageRef>,
): Promise<void> {
  const { data, error: readErr } = await db
    .from('brain_import_files')
    .select('image_refs')
    .eq('id', fileId)
    .single()
  if (readErr) throw new Error(`setImageStatus read: ${readErr.message}`)
  const refs: ImageRef[] = (data as { image_refs: ImageRef[] | null }).image_refs ?? []
  const novo = refs.map((r) => (r.n === n ? { ...r, ...patch } : r))
  const { error: writeErr } = await db
    .from('brain_import_files')
    .update({ image_refs: novo, updated_at: new Date().toISOString() })
    .eq('id', fileId)
  if (writeErr) throw new Error(`setImageStatus write: ${writeErr.message}`)
}


export async function claimImagemQueued(
  db: SupabaseClient,
  fileId: string,
  leaseMs: number = IMAGE_LEASE_MS,
): Promise<{ row: ImportFileRow; ref: ImageRef } | null> {
  const { data, error: readErr } = await db
    .from('brain_import_files')
    .select('image_refs')
    .eq('id', fileId)
    .single()
  if (readErr) throw new Error(`claimImagemQueued read: ${readErr.message}`)
  const refs: ImageRef[] = (data as { image_refs: ImageRef[] | null }).image_refs ?? []

  const cutoff = Date.now() - leaseMs
  const venceu = (r: ImageRef) => {
    if (r.status !== 'reading') return false
    const t = r.claimed_at ? Date.parse(r.claimed_at) : 0
    return !Number.isNaN(t) && t < cutoff
  }
  
  const alvo = refs.find((r) => r.status === 'queued') ?? refs.find(venceu)
  if (!alvo) return null

  
  const guardStatus = alvo.status
  const now = new Date().toISOString()
  const novo = refs.map((r) =>
    r.n === alvo.n ? { ...r, status: 'reading' as const, claimed_at: now } : r,
  )

  const { data: rows, error } = await db
    .from('brain_import_files')
    .update({ image_refs: novo, updated_at: now })
    .eq('id', fileId)
    .filter('image_refs', 'cs', JSON.stringify([{ n: alvo.n, status: guardStatus }]))
    .select(FILE_COLS)
  if (error) throw new Error(`claimImagemQueued: ${error.message}`)
  if (!rows || rows.length !== 1) return null

  const ref = novo.find((r) => r.n === alvo.n)!
  return { row: rows[0] as ImportFileRow, ref }
}


async function bumpAttemptsNoTouch(db: SupabaseClient, id: string, attempts: number): Promise<void> {
  const { error } = await db.from('brain_import_files').update({ attempts }).eq('id', id)
  if (error) throw new Error(`bumpAttemptsNoTouch: ${error.message}`)
}


export async function requeueStaleExtracting(
  db: SupabaseClient,
  staleMs: number,
): Promise<number> {
  
  const cutoff = new Date(Date.now() - staleMs).toISOString()

  const { data, error } = await db
    .from('brain_import_files')
    .select('id, attempts, max_attempts')
    .in('status', ['extracting', 'distilling'])
    .lt('updated_at', cutoff)
  if (error) throw new Error(`requeueStaleExtracting select: ${error.message}`)
  if (!data || data.length === 0) return 0

  const rows = data as { id: string; attempts: number; max_attempts: number }[]
  let reclaimed = 0
  for (const row of rows) {
    
    
    
    try {
      const newAttempts = row.attempts + 1
      if (newAttempts >= row.max_attempts) {
        
        await setFileStatus(db, row.id, 'failed', {
          attempts: newAttempts,
          error: 'passo travou (excedeu tentativas)',
        })
      } else {
        
        await bumpAttemptsNoTouch(db, row.id, newAttempts)
      }
      reclaimed++
    } catch (e) {
      console.warn(`[requeueStaleExtracting] erro ao processar ${row.id}:`, e)
    }
  }
  return reclaimed
}


export async function listFilesComImagemQueued(
  db: SupabaseClient,
  limit: number,
): Promise<ImportFileRow[]> {
  const { data, error } = await db
    .from('brain_import_files')
    .select(FILE_COLS)
    .filter('image_refs', 'cs', JSON.stringify([{ status: 'queued' }]))
    .limit(limit)
  if (error) throw new Error(`listFilesComImagemQueued: ${error.message}`)
  return (data ?? []) as ImportFileRow[]
}


export async function listFilesByStatus(
  db: SupabaseClient,
  status: string,
  limit: number,
): Promise<ImportFileRow[]> {
  const { data, error } = await db
    .from('brain_import_files')
    .select(FILE_COLS)
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(`listFilesByStatus: ${error.message}`)
  return (data ?? []) as ImportFileRow[]
}


export async function listActiveImports(db: SupabaseClient): Promise<ImportRow[]> {
  const { data, error } = await db
    .from('brain_imports')
    .select('id, status, file_count, fact_count, commit_shas, summary, error, context, target, base_agent_id')
    .not('status', 'in', '("done","failed","undone")')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`listActiveImports: ${error.message}`)
  return (data ?? []) as ImportRow[]
}


export async function getImportWithFiles(
  db: SupabaseClient,
  id: string,
): Promise<{ import: ImportRow; files: ImportFileRow[] } | null> {
  const { data: imp, error: impErr } = await db
    .from('brain_imports')
    .select('id, status, file_count, fact_count, commit_shas, summary, error, context, target, base_agent_id')
    .eq('id', id)
    .maybeSingle()
  if (impErr) throw new Error(`getImportWithFiles import: ${impErr.message}`)
  if (!imp) return null

  const { data: files, error: filesErr } = await db
    .from('brain_import_files')
    .select(FILE_COLS)
    .eq('import_id', id)
    .order('created_at', { ascending: true })
  if (filesErr) throw new Error(`getImportWithFiles files: ${filesErr.message}`)

  return {
    import: imp as ImportRow,
    files: (files ?? []) as ImportFileRow[],
  }
}


export async function getFileText(db: SupabaseClient, id: string): Promise<string | null> {
  const { data, error } = await db.from('brain_import_files').select('extracted_text').eq('id', id).maybeSingle()
  if (error) throw new Error(`getFileText: ${error.message}`)
  return (data as { extracted_text: string | null } | null)?.extracted_text ?? null
}
