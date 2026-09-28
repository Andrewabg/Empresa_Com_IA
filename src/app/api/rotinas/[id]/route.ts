
import { cookies } from 'next/headers'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { atualizarRotina, getRotina, removerRotina, agendaDaRotina } from '@/data/rotinas'
import { normalizarEntrada } from '@/lib/rotinas/entrada'
import { proximaExecucaoAte, SEM_EXECUCAO_ATE_O_TERMINO } from '@/lib/rotinas/agenda'
import { getSetting } from '@/data/settings'
import { validarTz, TZ_DEFAULT } from '@/server/proativo/dispatcher'

async function fusoDoDono(): Promise<string> {
  return validarTz((await getSetting('operator_timezone')) ?? TZ_DEFAULT)
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const { id } = await ctx.params
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const atual = await getRotina(id)
    if (!atual) return Response.json({ error: 'Rotina não encontrada.' }, { status: 404 })

    const agora = new Date().toISOString()

    
    const soToggle = typeof body.ativa === 'boolean' && body.pedido === undefined && body.frequencia === undefined
    if (soToggle) {
      const ativa = body.ativa === true
      
      
      
      const nova = ativa ? proximaExecucaoAte(agendaDaRotina(atual), agora, await fusoDoDono()) : null
      if (ativa && nova === null) return Response.json({ error: SEM_EXECUCAO_ATE_O_TERMINO }, { status: 400 })
      const rotina = await atualizarRotina(id, {
        ativa,
        ...(nova ? { proximaExecucao: nova } : {}),
      })
      return Response.json({ rotina })
    }

    const entrada = normalizarEntrada({ ...body, ativa: body.ativa ?? atual.ativa })
    if (!entrada.ok) return Response.json({ error: entrada.erro }, { status: 400 })

    const proxima = proximaExecucaoAte(entrada.valor.agenda, agora, await fusoDoDono())
    
    
    
    if (entrada.valor.ativa && proxima === null) {
      return Response.json({ error: SEM_EXECUCAO_ATE_O_TERMINO }, { status: 400 })
    }
    const rotina = await atualizarRotina(id, {
      agentId: entrada.valor.agentId,
      titulo: entrada.valor.titulo,
      pedido: entrada.valor.pedido,
      agenda: entrada.valor.agenda,
      ativa: entrada.valor.ativa,
      
      
      ...(proxima ? { proximaExecucao: proxima } : {}),
    })
    return Response.json({ rotina })
  } catch (err) {
    console.error('[PUT /api/rotinas/[id]]', err)
    return Response.json({ error: 'Não consegui salvar a rotina agora.' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth

  const { id } = await ctx.params
  try {
    const ok = await removerRotina(id)
    if (!ok) return Response.json({ error: 'Rotina não encontrada.' }, { status: 404 })
    return Response.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/rotinas/[id]]', err)
    return Response.json({ error: 'Não consegui apagar a rotina agora.' }, { status: 500 })
  }
}
