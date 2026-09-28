
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { recomporCriativo } from '@/server/tools/design/recomporCriativo'
import { BLOCOS_DE_ARTE } from '@/lib/design/templates'
import type { PatchDeArte } from '@/lib/design/aplicarPatchDeArte'

const CAMPOS_DE_COR = ['fundo', 'sobreFundo', 'destaque', 'botao', 'sobreBotao'] as const
const PAPEIS_DE_FONTE = ['display', 'corpo'] as const


function soStrings<K extends string>(bruto: unknown, chaves: readonly K[]): Partial<Record<K, string>> | undefined {
  if (!bruto || typeof bruto !== 'object') return undefined
  const entrada = bruto as Record<string, unknown>
  const saida: Partial<Record<K, string>> = {}
  let achou = false
  for (const k of chaves) {
    const v = entrada[k]
    if (typeof v === 'string') { saida[k] = v; achou = true }
  }
  return achou ? saida : undefined
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth
  const { id } = await ctx.params

  let body: Record<string, unknown> = {}
  try { body = (await request.json()) as Record<string, unknown> } catch {  }

  const foco = body.foco as { x?: unknown; y?: unknown } | undefined
  const patch: PatchDeArte = {
    ...(soStrings(body.blocos, BLOCOS_DE_ARTE) ? { blocos: soStrings(body.blocos, BLOCOS_DE_ARTE) } : {}),
    ...(typeof body.template === 'string' ? { template: body.template } : {}),
    ...(soStrings(body.cores, CAMPOS_DE_COR) ? { cores: soStrings(body.cores, CAMPOS_DE_COR) } : {}),
    ...(soStrings(body.fontes, PAPEIS_DE_FONTE) ? { fontes: soStrings(body.fontes, PAPEIS_DE_FONTE) } : {}),
    ...(foco && typeof foco.x === 'number' && typeof foco.y === 'number' ? { foco: { x: foco.x, y: foco.y } } : {}),
  }

  try {
    const r = await recomporCriativo(
      {
        pecaId: id,
        variacao: typeof body.variacao === 'number' ? body.variacao : undefined,
        ...(typeof body.slide === 'number' ? { slide: body.slide } : {}),
        patch,
      },
      { operatorId: auth.id, actingAgentId: 'designer' },
    )
    if (!r.patch || r.patch.entidade !== 'criativo') return NextResponse.json({ ok: false, error: r.output }, { status: 422 })
    return NextResponse.json({ ok: true, criativo: r.patch.criativo, aviso: r.output })
  } catch (err) {
    console.error('[POST /api/design/criativos/:id/recompor]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
