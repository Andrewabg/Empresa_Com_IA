
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { setSetting } from '@/data/settings'
import { invalidateBrandingCache } from '@/server/config/branding'
import { serverDb } from '@/server/supabase'

const BUCKET = 'branding'
const MAX_BYTES = 2 * 1024 * 1024


const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}



let bucketEnsured = false


async function ensureBucket(): Promise<void> {
  if (bucketEnsured) return
  try {
    const { error } = await serverDb().storage.createBucket(BUCKET, { public: true })
    
    if (error && !/exist|duplicate/i.test(error.message)) {
      console.warn('[brand-logo] createBucket:', error.message)
      return 
    }
    
    bucketEnsured = true
  } catch (e) {
    
    console.warn('[brand-logo] createBucket lançou (segue — provável já-existe):', e)
    bucketEnsured = true
  }
}


async function removeLogoFiles(keep?: string): Promise<void> {
  try {
    const paths = Object.values(EXT)
      .map((ext) => `logo.${ext}`)
      .filter((p) => p !== keep)
    await serverDb().storage.from(BUCKET).remove(paths)
  } catch (e) {
    console.warn('[brand-logo] faxina de arquivos falhou (não-fatal):', e)
  }
}



const MULTIPART_SLACK = 16 * 1024

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  
  
  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_BYTES + MULTIPART_SLACK) {
    return NextResponse.json({ ok: false, error: 'Arquivo grande demais (máx. 2MB).' }, { status: 400 })
  }

  let file: File
  try {
    const form = await request.formData()
    const f = form.get('file')
    if (!(f instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Envie o arquivo no campo "file".' }, { status: 400 })
    }
    file = f
  } catch {
    return NextResponse.json({ ok: false, error: 'multipart/form-data inválido' }, { status: 400 })
  }

  const ext = EXT[file.type]
  if (!ext) {
    return NextResponse.json(
      { ok: false, error: 'Formato não suportado — use PNG, JPG ou WebP.' },
      { status: 400 },
    )
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'Arquivo grande demais (máx. 2MB).' }, { status: 400 })
  }

  try {
    await ensureBucket()
    const bytes = Buffer.from(await file.arrayBuffer())
    const path = `logo.${ext}`
    
    
    const { error } = await serverDb()
      .storage.from(BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: true })
    if (error) throw new Error(`upload logo: ${error.message}`)
    
    
    await removeLogoFiles(path)

    const { data } = serverDb().storage.from(BUCKET).getPublicUrl(path)
    if (!data?.publicUrl) throw new Error('getPublicUrl devolveu vazio')
    
    
    const url = `${data.publicUrl}?v=${Date.now()}`
    await setSetting('brand_logo_url', url)
    invalidateBrandingCache()
    return NextResponse.json({ ok: true, logoUrl: url })
  } catch (err) {
    console.error('[POST /api/config/brand-logo]', err)
    return NextResponse.json(
      { ok: false, error: 'Não foi possível enviar o logo. Tente de novo.' },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    await setSetting('brand_logo_url', '')
    invalidateBrandingCache()
    await removeLogoFiles() 
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/config/brand-logo]', err)
    return NextResponse.json(
      { ok: false, error: 'Não foi possível remover o logo. Tente de novo.' },
      { status: 500 },
    )
  }
}
