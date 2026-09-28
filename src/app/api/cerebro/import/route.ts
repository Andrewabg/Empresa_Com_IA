
import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { serverDb } from '@/server/supabase'
import { createImport, addImportFile, setImportStatus, setFileStatus, findImportedFileByHash } from '@/data/imports'
import { validateUpload } from '@/lib/imports/upload'
import { chaveDeArquivoSegura } from '@/lib/storage/chaveSegura'
import { resolveImportTarget } from '@/lib/imports/target'
import { listCanais } from '@/data/canais'
import { runImportHeartbeat } from '@/server/imports/heartbeat'

export async function POST(request: Request) {
  
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const operatorId = auth.id

  
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'Corpo da requisição inválido (esperado multipart/form-data).' }, { status: 400 })
  }

  const rawFiles = formData.getAll('file') as File[]
  if (!rawFiles || rawFiles.length === 0) {
    return Response.json({ error: 'Nenhum campo `file` encontrado no formulário.' }, { status: 400 })
  }

  
  const context = (formData.get('context') as string | null)?.trim() ?? ''
  if (!context) {
    return Response.json(
      { error: 'Descreva, em uma frase, o que são estes arquivos e por que importam.' },
      { status: 422 },
    )
  }

  
  const validation = validateUpload(rawFiles.map(f => ({ name: f.name, size: f.size })))
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 422 })
  }
  const sanitizedNames = validation.sanitized ?? rawFiles.map(f => f.name)

  
  const rawTarget = formData.get('target') as string | null
  const rawBaseAgent = (formData.get('baseAgentId') as string | null) ?? ''
  let resolved: ReturnType<typeof resolveImportTarget>
  if ((rawTarget ?? '').trim() === 'base') {
    const canais = await listCanais()
    resolved = resolveImportTarget(rawTarget, rawBaseAgent, canais.map(c => c.agent_id))
  } else {
    resolved = resolveImportTarget(rawTarget, rawBaseAgent, [])
  }
  if ('error' in resolved) {
    return Response.json({ error: 'Escolha um agente de canal válido para a base.' }, { status: 422 })
  }

  
  const db = serverDb()
  let importRow: Awaited<ReturnType<typeof createImport>>
  try {
    importRow = await createImport(db, operatorId, context,
      resolved.target === 'base' ? { target: 'base', baseAgentId: resolved.baseAgentId } : undefined)
  } catch (err) {
    console.error('[POST /api/cerebro/import] createImport:', err)
    return Response.json({ error: 'Erro ao criar lote de importação.' }, { status: 500 })
  }

  const importId = importRow.id

  
  
  const skipped: { filename: string; reason: string }[] = []

  
  
  
  const falhas: { filename: string; reason: string }[] = []

  
  for (let i = 0; i < rawFiles.length; i++) {
    const file = rawFiles[i]
    const safeName = sanitizedNames[i]
    
    
    
    
    const storagePath = `imports/${importId}/${chaveDeArquivoSegura(safeName)}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const mime = file.type || 'application/octet-stream'

    
    
    
    const fileHash = createHash('sha256').update(bytes).digest('hex')
    try {
      const jaImportado = await findImportedFileByHash(db, operatorId, fileHash)
      if (jaImportado) {
        
        
        
        await addImportFile(db, importId, {
          filename: safeName,
          storage_path: storagePath,
          mime,
          bytes: file.size,
          file_hash: fileHash,
        }).then(row => setFileStatus(db, row.id, 'skipped', { error: 'arquivo idêntico já importado antes' }))
          .catch(() => {})
        skipped.push({ filename: safeName, reason: 'arquivo idêntico já importado antes' })
        continue
      }
    } catch (e) {
      console.warn(`[POST /api/cerebro/import] dedup file_hash ${safeName} (fail-open):`, e)
    }

    
    const { error: uploadErr } = await db.storage
      .from('artifacts')
      .upload(storagePath, bytes, { contentType: mime, upsert: true })
    if (uploadErr) {
      
      
      
      
      console.warn(`[POST /api/cerebro/import] upload ${safeName}:`, uploadErr.message)
      await addImportFile(db, importId, {
        filename: safeName,
        storage_path: storagePath,
        mime,
        bytes: file.size,
        file_hash: fileHash,
      }).then(row => setFileStatus(db, row.id, 'failed', {
        error: `Não consegui guardar o arquivo "${safeName}". Tente enviar de novo; se repetir, renomeie o arquivo com um nome mais simples.`,
      })).catch(() => {})
      falhas.push({ filename: safeName, reason: 'não foi possível guardar o arquivo' })
      continue
    }

    await addImportFile(db, importId, {
      filename: safeName,
      storage_path: storagePath,
      mime,
      bytes: file.size,
      file_hash: fileHash,
    })
  }

  
  
  
  const processados = rawFiles.length - skipped.length
  await db.from('brain_imports').update({ file_count: processados }).eq('id', importId)

  
  
  if (processados === 0) {
    await setImportStatus(db, importId, 'done', {
      summary: 'Nada a importar — todos os arquivos já tinham sido importados antes.',
    })
    return Response.json({ importId, skipped })
  }

  
  
  if (falhas.length === processados) {
    await setImportStatus(db, importId, 'failed', {
      error: 'Nenhum arquivo pôde ser guardado. Tente enviar de novo.',
    })
    return Response.json({ importId, skipped, falhas })
  }

  await setImportStatus(db, importId, 'queued')

  
  
  
  void runImportHeartbeat().catch(err =>
    console.warn('[POST /api/cerebro/import] kick heartbeat:', err),
  )

  
  
  if (falhas.length > 0) return Response.json({ importId, skipped, falhas })
  return skipped.length > 0
    ? Response.json({ importId, skipped })
    : Response.json({ importId })
}
