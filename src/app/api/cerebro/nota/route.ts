
import { cookies } from 'next/headers'
import { requireDonoApi, requireOperatorApi } from '@/server/auth/apiAuth'
import { editarNota, lerNota } from '@/server/brain/editarNota'
import { arquivarNota } from '@/server/brain/arquivarNota'
import { AVISO_VIROU_PEDIDO } from '@/lib/brain/edicaoDeNota'
import { AVISO_ERRO_AO_ARQUIVAR, AVISO_CEREBRO_INDISPONIVEL } from '@/lib/brain/arquivoDeNotas'
import { NotConfiguredError, BrainUnreachableError } from '@/server/brain/runtime'


export async function GET(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  const path = new URL(request.url).searchParams.get('path') ?? ''
  if (!path) return Response.json({ error: 'path é obrigatório' }, { status: 400 })

  try {
    const nota = await lerNota(path)
    if (!nota) return Response.json({ error: 'Essa nota não está mais no Cérebro.' }, { status: 404 })
    return Response.json(nota)
  } catch (err) {
    if (err instanceof NotConfiguredError) return Response.json({ needsConfig: true }, { status: 200 })
    if (err instanceof BrainUnreachableError) {
      return Response.json({ error: 'O Cérebro não respondeu agora. Tente daqui a pouco.' }, { status: 503 })
    }
    console.error('[GET /api/cerebro/nota]', err)
    return Response.json({ error: 'Não consegui abrir essa nota.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  let body: { path?: unknown; titulo?: unknown; corpo?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const path = typeof body.path === 'string' ? body.path : ''
  const titulo = typeof body.titulo === 'string' ? body.titulo : ''
  const corpo = typeof body.corpo === 'string' ? body.corpo : ''
  if (!path) return Response.json({ error: 'path é obrigatório' }, { status: 400 })

  try {
    const r = await editarNota({ path, titulo, corpo })
    if (r.status === 'nao_encontrada') {
      return Response.json({ error: 'Essa nota não está mais no Cérebro.' }, { status: 404 })
    }
    if (r.status === 'recusado') return Response.json({ error: r.aviso }, { status: 400 })
    
    
    
    if (r.status === 'virou_pedido') {
      return Response.json({ error: AVISO_VIROU_PEDIDO, url: r.url }, { status: 409 })
    }
    return Response.json(r)
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return Response.json({ needsConfig: true }, { status: 200 })
    }
    if (err instanceof BrainUnreachableError) {
      
      return Response.json(
        { error: 'O Cérebro não respondeu agora. Sua edição não foi salva, tente daqui a pouco.' },
        { status: 503 },
      )
    }
    console.error('[PATCH /api/cerebro/nota]', err)
    return Response.json({ error: 'Não consegui salvar a edição.' }, { status: 500 })
  }
}


export async function DELETE(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const path = new URL(request.url).searchParams.get('path') ?? ''
  if (!path) return Response.json({ error: 'path é obrigatório' }, { status: 400 })

  try {
    const r = await arquivarNota(path)
    if (!r.ok) return Response.json({ error: r.motivo ?? AVISO_ERRO_AO_ARQUIVAR }, { status: 400 })
    
    
    
    return Response.json({ ok: true, destino: r.destino, indice_atrasado: r.indice_atrasado })
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return Response.json({ needsConfig: true }, { status: 200 })
    }
    if (err instanceof BrainUnreachableError) {
      return Response.json({ error: AVISO_CEREBRO_INDISPONIVEL }, { status: 503 })
    }
    console.error('[DELETE /api/cerebro/nota]', err)
    return Response.json({ error: AVISO_ERRO_AO_ARQUIVAR }, { status: 500 })
  }
}
