import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { mesmaOrigem } from '@/server/auth/mesmaOrigem'
import { resumirPrevia } from '@/lib/reset/preview'
import { ORDEM_CATEGORIAS } from '@/lib/reset/categorias'
import type { CategoriaId } from '@/lib/reset/tipos'
import { getBranding } from '@/server/config/branding'

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  if (!mesmaOrigem(request)) return Response.json({ ok: false, error: 'Origem não permitida.' }, { status: 403 })

  let body: { categorias?: unknown }
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
  
  
  const { assistantName } = await getBranding()
  const previa = resumirPrevia({ categorias }, assistantName)
  return Response.json({ ok: true, previa })
}
