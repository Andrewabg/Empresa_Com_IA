import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { mesmaOrigem } from '@/server/auth/mesmaOrigem'
import { getCompanyProfile } from '@/data/settings'
import { executarReset } from '@/server/reset/executarReset'
import { ORDEM_CATEGORIAS } from '@/lib/reset/categorias'
import type { CategoriaId } from '@/lib/reset/tipos'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  if (!mesmaOrigem(request)) return Response.json({ ok: false, error: 'Origem não permitida.' }, { status: 403 })

  let body: { categorias?: unknown; confirmacaoNome?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'JSON inválido.' }, { status: 400 })
  }

  if (
    !Array.isArray(body.categorias) ||
    body.categorias.length === 0 ||
    !body.categorias.every((c) => (ORDEM_CATEGORIAS as readonly string[]).includes(c as string))
  ) {
    return Response.json(
      { ok: false, error: 'categorias deve ser um array não-vazio de categorias válidas.' },
      { status: 400 },
    )
  }

  if (new Set(body.categorias).size !== body.categorias.length) {
    return Response.json(
      { ok: false, error: 'categorias deve ser um array não-vazio de categorias válidas.' },
      { status: 400 },
    )
  }

  const categorias = body.categorias as CategoriaId[]

  
  const { companyName } = await getCompanyProfile()
  const confirmacaoNome = String(body.confirmacaoNome ?? '').trim()
  const nomeEsperado = String(companyName ?? '').trim()

  if (nomeEsperado === '') {
    return Response.json(
      { ok: false, error: 'A empresa ainda não foi configurada; não há o que resetar.' },
      { status: 422 },
    )
  }

  if (confirmacaoNome !== nomeEsperado) {
    return Response.json(
      { ok: false, error: 'Confirmação não confere.' },
      { status: 409 },
    )
  }

  try {
    await executarReset({ categorias })
  } catch (err) {
    console.error('[POST /api/config/reset]', err)
    return Response.json({ ok: false, error: 'Erro ao executar o reset.' }, { status: 500 })
  }

  return Response.json({
    ok: true,
    redirect: categorias.includes('identidade') ? '/onboarding' : null,
  })
}
