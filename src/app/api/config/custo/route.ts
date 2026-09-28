
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { costSummary } from '@/data/cost'
import { setSetting } from '@/data/settings'
import { parseBudgetInput } from '@/lib/budget-input'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const auth = await requireDonoApi(cookieStore)
  if (auth instanceof Response) return auth

  try {
    const { spentUsd, budgetUsd } = await costSummary()
    return Response.json({ spentUsd, budgetUsd })
  } catch (err) {
    
    console.warn('[config/custo] falhou (não-fatal):', err instanceof Error ? err.message : err)
    return Response.json({ spentUsd: 0, budgetUsd: 0 })
  }
}

export async function PUT(req: Request) {
  const cookieStore = await cookies()
  const auth = await requireDonoApi(cookieStore)
  if (auth instanceof Response) return auth

  const body = (await req.json().catch(() => null)) as { budget?: unknown } | null
  const raw = typeof body?.budget === 'string' ? body.budget : ''
  const parsed = parseBudgetInput(raw)
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 })
  }

  try {
    await setSetting('budget_usd', String(parsed.value))
    return Response.json({ ok: true, budgetUsd: parsed.value })
  } catch (err) {
    console.error('[config/custo PUT] setSetting falhou:', err instanceof Error ? err.message : err)
    return Response.json({ error: 'Não foi possível salvar o limite.' }, { status: 500 })
  }
}
