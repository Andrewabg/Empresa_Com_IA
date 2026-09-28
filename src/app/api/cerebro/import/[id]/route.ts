
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { serverDb } from '@/server/supabase'
import { getImportWithFiles } from '@/data/imports'
import { listReviewCandidates } from '@/data/importCandidates'
import { imageQueueView } from '@/lib/imports/imageQueueView'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  const { id } = await params

  
  const db = serverDb()
  const result = await getImportWithFiles(db, id)
  if (!result) {
    return Response.json({ error: 'Lote não encontrado.' }, { status: 404 })
  }

  const { import: imp, files } = result

  
  const imageRefs = files.flatMap(f => f.image_refs ?? [])
  const imagens = imageQueueView(imageRefs)

  
  const candidates =
    imp.status === 'review' ? await listReviewCandidates(db, id) : undefined

  
  
  
  const distillingFile = files.find(f => f.status === 'distilling')
  const extractingFile = files.find(f => f.status === 'extracting' && f.ocr_pages_total > 0)
  const activeCursor = distillingFile
    ? { done: distillingFile.chunks_done, total: distillingFile.chunks_total, unit: 'chunks' as const }
    : extractingFile
      ? { done: extractingFile.ocr_pages_done, total: extractingFile.ocr_pages_total, unit: 'pages' as const }
      : undefined

  return Response.json({
    status: imp.status,
    file_count: imp.file_count,
    fact_count: imp.fact_count,
    summary: imp.summary,
    context: imp.context,
    files: files.map(f => ({
      filename: f.filename,
      status: f.status,
      error: f.error,
    })),
    ...(candidates !== undefined ? { candidates } : {}),
    ...(activeCursor !== undefined ? { activeCursor } : {}),
    ...(imagens.length ? { imagens } : {}),
  })
}
