import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireOperator } from '@/server/auth/session'
import { updateAgent, getAgentRow, managerChainHasCycle } from '@/data/agents'
import { invalidateAgentCache } from '@/server/agent/jarvis'
import { isAllowedModel } from '@/server/agent/agentModels'
import { mergeToolsPatch } from '@/server/agent/toolsPatch'
import { invalidateConnectionsCache } from '@/server/config/connections'
import { invalidateBrandingCache } from '@/server/config/branding'
import { ehAgenteDeCanal } from '@/server/canais/ehAgenteDeCanal'
import { renomearNaPersona } from '@/lib/agent-identity'
import { isVozValida } from '@/lib/voicePalette'





const CAMPOS_COMPORTAMENTAIS = ['name', 'system_prompt', 'model', 'tools', 'skills', 'enabled'] as const

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireOperator(await cookies())
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  
  
  const existing = await getAgentRow(id)
  if (!existing) return NextResponse.json({ error: 'agente não existe' }, { status: 404 })

  
  
  
  
  const tocaComportamento = CAMPOS_COMPORTAMENTAIS.some((k) => k in body)
  if (tocaComportamento && (await ehAgenteDeCanal(id))) {
    return NextResponse.json(
      { error: 'Edite este atendente no Treino.', redirect: 'draft' },
      { status: 409 },
    )
  }

  const patch: Record<string, unknown> = {}

  if ('name' in body) {
    const nome = body.name
    if (typeof nome !== 'string' || !nome.trim()) return NextResponse.json({ error: 'nome vazio' }, { status: 400 })
    if (nome.trim().length > 120) return NextResponse.json({ error: 'nome muito longo (máx. 120)' }, { status: 400 })
    patch.name = nome.trim()
  }
  if ('system_prompt' in body) {
    const sp = body.system_prompt
    if (typeof sp !== 'string' || !sp.trim()) return NextResponse.json({ error: 'system_prompt vazio' }, { status: 400 })
    patch.system_prompt = sp
  }
  if ('model' in body && body.model !== null) {
    if (typeof body.model !== 'string' || !isAllowedModel(body.model)) {
      return NextResponse.json({ error: 'modelo não suportado' }, { status: 400 })
    }
    patch.model = body.model
  }
  
  
  
  
  if ('voice' in body) {
    if (body.voice !== null && !isVozValida(body.voice)) {
      return NextResponse.json({ error: 'voz não suportada' }, { status: 400 })
    }
    patch.voice = body.voice as string | null
  }
  
  
  if ('voz_desligada' in body) {
    if (typeof body.voz_desligada !== 'boolean') {
      return NextResponse.json({ error: 'voz_desligada deve ser verdadeiro ou falso' }, { status: 400 })
    }
    patch.voz_desligada = body.voz_desligada
  }
  let requiredChanged = false
  if ('tools' in body) {
    const r = mergeToolsPatch(existing.tools, body.tools)
    if (r.error) return NextResponse.json({ error: r.error }, { status: 400 })
    patch.tools = r.tools
    requiredChanged = !!r.requiredChanged
  }
  if ('skills' in body) {
    const s = body.skills
    if (!Array.isArray(s) || !s.every((x) => typeof x === 'string')) {
      return NextResponse.json({ error: 'skills deve ser um array de strings' }, { status: 400 })
    }
    patch.skills = s as string[]
  }
  if ('enabled' in body) {
    if (typeof body.enabled !== 'boolean') return NextResponse.json({ error: 'enabled deve ser boolean' }, { status: 400 })
    patch.enabled = body.enabled
  }

  
  
  if ('manager_id' in body) {
    const managerId = body.manager_id
    if (managerId !== null && typeof managerId !== 'string') {
      return NextResponse.json({ error: 'manager_id inválido' }, { status: 400 })
    }
    if (managerId !== null) {
      if (managerId === id) {
        return NextResponse.json({ error: 'um agente não pode responder a si mesmo (ciclo)' }, { status: 400 })
      }
      if (!(await getAgentRow(managerId))) {
        return NextResponse.json({ error: 'gerente não existe' }, { status: 400 })
      }
      if (await managerChainHasCycle(id, managerId)) {
        return NextResponse.json({ error: 'essa troca criaria um ciclo de gerência' }, { status: 400 })
      }
    }
    patch.manager_id = managerId
  }

  
  
  
  
  
  
  
  if (typeof patch.name === 'string' && patch.name !== existing.name) {
    const base = typeof patch.system_prompt === 'string' ? patch.system_prompt : existing.system_prompt
    const reescrito = renomearNaPersona(base, existing.name, patch.name)
    if (reescrito !== existing.system_prompt) patch.system_prompt = reescrito
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'nada a atualizar' }, { status: 400 })

  try {
    const row = await updateAgent(id, patch)
    invalidateAgentCache() 
    if (requiredChanged) invalidateConnectionsCache() 
    if ('name' in patch && row.is_primary) invalidateBrandingCache() 
    return NextResponse.json({ ok: true, agent: row })
  } catch (err) {
    console.error('[PUT /api/agents/:id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
