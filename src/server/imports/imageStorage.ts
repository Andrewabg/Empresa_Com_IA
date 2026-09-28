

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ImageRef } from '@/lib/imports/imageTriage'





const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}


export function mimeToExt(mime: string | undefined): string {
  if (!mime) return 'bin'
  return MIME_EXT[mime] ?? 'bin'
}





export interface UploadImagemResult {
  
  storage_path: string
  
  mime: string | undefined
}


export async function uploadImagemConteudo(
  db: SupabaseClient,
  importId: string,
  ref: ImageRef,
): Promise<UploadImagemResult> {
  if (!ref.b64) {
    throw new Error(
      `uploadImagemConteudo: b64 ausente na imagem n=${ref.n} sha256=${ref.sha256} (ref de conteúdo deve sempre ter b64)`,
    )
  }

  const bytes = Buffer.from(ref.b64, 'base64')
  const ext = mimeToExt(ref.mime)
  const sha8 = ref.sha256.slice(0, 8)
  const path = `imports/${importId}/images/${ref.n}-${sha8}.${ext}`

  const { error } = await db.storage
    .from('artifacts')
    .upload(path, bytes, { contentType: ref.mime, upsert: true })

  if (error) {
    throw new Error(`uploadImagemConteudo: erro no Storage — ${error.message}`)
  }

  return { storage_path: path, mime: ref.mime }
}






export async function signedImagemUrl(
  db: SupabaseClient,
  storage_path: string,
  ttlSec = 600,
): Promise<string> {
  const { data, error } = await db.storage
    .from('artifacts')
    .createSignedUrl(storage_path, ttlSec)

  if (error) {
    throw new Error(`signedImagemUrl: erro ao gerar URL assinada — ${error.message}`)
  }

  return data.signedUrl
}
