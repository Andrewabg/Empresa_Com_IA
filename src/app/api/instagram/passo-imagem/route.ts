
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { serverDb } from '@/server/supabase'
import { BUCKET_MIDIA } from '@/server/canais/media'
import {
  validarImagemDoPasso, PREFIXO_IMAGEM_PASSO, TAMANHO_ASSINATURA,
  TETO_DO_CORPO_DA_IMAGEM, ERRO_IMAGEM_GRANDE,
} from '@/lib/instagram/imagemDoPasso'
import { lerCorpoComTeto, pedidoComCorpo } from '@/server/http/corpoComTeto'
import { TEXTOS_IMAGEM_PASSO } from '@/lib/instagram/copyImagemPasso'
import { chaveDeArquivoSegura } from '@/lib/storage/chaveSegura'

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = await requireOperatorApi(await cookies())
    if (auth instanceof Response) return auth
    return await enviar(request)
  } catch (e) {
    
    
    console.warn('[instagram/passo-imagem] POST falhou:', e)
    return Response.json({ error: TEXTOS_IMAGEM_PASSO.erroGenerico }, { status: 500 })
  }
}

async function enviar(request: Request): Promise<Response> {
  
  
  
  
  
  
  const corpo = await lerCorpoComTeto(request, TETO_DO_CORPO_DA_IMAGEM)
  if (corpo === null) return Response.json({ error: ERRO_IMAGEM_GRANDE }, { status: 413 })

  const form = await pedidoComCorpo(request, corpo.bytes).formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: TEXTOS_IMAGEM_PASSO.semArquivo }, { status: 400 })
  }

  
  
  const inicio = new Uint8Array(await file.slice(0, TAMANHO_ASSINATURA).arrayBuffer())
  
  
  const v = validarImagemDoPasso({ inicio, bytes: file.size })
  if (!v.ok) return Response.json({ error: v.erro }, { status: 400 })

  
  const seguro = chaveDeArquivoSegura(file.name || 'imagem')
  const path = `${PREFIXO_IMAGEM_PASSO}${randomUUID()}-${seguro}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error } = await serverDb().storage.from(BUCKET_MIDIA)
    
    
    .upload(path, Buffer.from(bytes), { contentType: v.tipo, upsert: false })
  if (error) {
    console.warn('[instagram/passo-imagem] upload falhou:', error.message)
    return Response.json({ error: TEXTOS_IMAGEM_PASSO.erroGenerico }, { status: 500 })
  }

  return Response.json({ path })
}
