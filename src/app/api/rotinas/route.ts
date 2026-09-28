
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { criarRotina, listarRotinas } from '@/data/rotinas'
import { normalizarEntrada } from '@/lib/rotinas/entrada'
import { proximaExecucaoAte, SEM_EXECUCAO_ATE_O_TERMINO } from '@/lib/rotinas/agenda'
import { getSetting } from '@/data/settings'
import { validarTz, TZ_DEFAULT } from '@/server/proativo/dispatcher'

export async function GET() {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  try {
    return Response.json({ rotinas: await listarRotinas() })
  } catch (err) {
    console.error('[GET /api/rotinas]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const entrada = normalizarEntrada(body)
  if (!entrada.ok) return Response.json({ error: entrada.erro }, { status: 400 })

  try {
    const tz = validarTz((await getSetting('operator_timezone')) ?? TZ_DEFAULT)
    
    
    const primeira = proximaExecucaoAte(entrada.valor.agenda, new Date().toISOString(), tz)
    if (primeira === null) return Response.json({ error: SEM_EXECUCAO_ATE_O_TERMINO }, { status: 400 })
    const rotina = await criarRotina({
      agentId: entrada.valor.agentId,
      titulo: entrada.valor.titulo,
      pedido: entrada.valor.pedido,
      agenda: entrada.valor.agenda,
      ativa: entrada.valor.ativa,
      proximaExecucao: primeira,
    })
    return Response.json({ rotina })
  } catch (err) {
    console.error('[POST /api/rotinas]', err)
    return Response.json({ error: 'Não consegui salvar a rotina agora.' }, { status: 500 })
  }
}
