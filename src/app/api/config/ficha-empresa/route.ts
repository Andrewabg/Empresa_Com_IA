
import { cookies } from 'next/headers'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getFichaEmpresa, upsertFatoEmpresa, removerFatoEmpresa } from '@/data/fichaEmpresa'


async function fatosVisiveis() {
  return (await getFichaEmpresa()).filter((f) => !f.arquivado)
}
import { slugFato, type CategoriaFato } from '@/lib/memory/fichaEmpresa'

const CATEGORIAS_VALIDAS: ReadonlySet<string> = new Set([
  'financeiro', 'oferta', 'publico', 'politica', 'dados', 'outro',
])

const ROTULO_MAX = 80
const VALOR_MAX = 400

export async function GET() {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    return Response.json({ ok: true, fatos: await fatosVisiveis() })
  } catch (err) {
    console.error('[GET /api/config/ficha-empresa]', err)
    return Response.json({ ok: false, error: 'Erro interno. Tente de novo.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'JSON inválido.' }, { status: 400 })
  }

  const action = body.action

  if (action === 'upsert') {
    const raw = body.fato
    if (raw == null || typeof raw !== 'object') {
      return Response.json({ ok: false, error: 'Campo "fato" obrigatório.' }, { status: 400 })
    }
    const f = raw as Record<string, unknown>

    const rotulo = typeof f.rotulo === 'string' ? f.rotulo.trim().slice(0, ROTULO_MAX) : ''
    const valor = typeof f.valor === 'string' ? f.valor.trim().slice(0, VALOR_MAX) : ''

    if (!rotulo) {
      return Response.json({ ok: false, error: 'Rótulo obrigatório.' }, { status: 400 })
    }
    if (!valor) {
      return Response.json({ ok: false, error: 'Valor obrigatório.' }, { status: 400 })
    }

    const id = slugFato(rotulo)
    if (!id) {
      return Response.json({ ok: false, error: 'Rótulo inválido (não gera identificador).' }, { status: 400 })
    }

    const categoria: CategoriaFato | undefined =
      typeof f.categoria === 'string' && CATEGORIAS_VALIDAS.has(f.categoria)
        ? (f.categoria as CategoriaFato)
        : undefined

    try {
      await upsertFatoEmpresa({
        id,
        rotulo,
        valor,
        categoria,
        fonte: 'operador',
        at: new Date().toISOString(),
      })
      return Response.json({ ok: true, fatos: await fatosVisiveis() })
    } catch (err) {
      console.error('[POST /api/config/ficha-empresa upsert]', err)
      return Response.json({ ok: false, error: 'Não foi possível salvar o fato. Tente de novo.' }, { status: 500 })
    }
  }

  if (action === 'remove') {
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) {
      return Response.json({ ok: false, error: 'id obrigatório para remover.' }, { status: 400 })
    }
    try {
      await removerFatoEmpresa(id)
      return Response.json({ ok: true, fatos: await fatosVisiveis() })
    } catch (err) {
      console.error('[POST /api/config/ficha-empresa remove]', err)
      return Response.json({ ok: false, error: 'Não foi possível remover o fato. Tente de novo.' }, { status: 500 })
    }
  }

  return Response.json({ ok: false, error: 'Ação inválida. Use "upsert" ou "remove".' }, { status: 400 })
}
