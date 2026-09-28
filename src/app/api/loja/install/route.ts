import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireDonoApi } from '@/server/auth/apiAuth'
import { createAgent, getAgentRow, recontratarCargo } from '@/data/agents'
import { invalidateAgentCache } from '@/server/agent/jarvis'
import { getCargoCatalog, isInstallableSeed } from '@/server/agent/store/cargoCatalog'
import { hashPrompt } from '@/lib/persona-hash'

export async function POST(req: Request) {
  const auth = await requireDonoApi(await cookies())
  if (auth instanceof Response) return auth
  const body = await req.json().catch(() => null) as { seedId?: string; managerId?: string } | null
  
  const catalog = await getCargoCatalog()
  const seed = body?.seedId ? catalog.find((s) => s.id === body.seedId) : undefined
  if (!seed) {
    
    
    if (catalog.length === 0) {
      return NextResponse.json({ error: 'catálogo indisponível, tente em instantes' }, { status: 503 })
    }
    return NextResponse.json({ error: 'cargo não existe na loja' }, { status: 404 })
  }
  const managerId = body?.managerId
  if (!managerId || !(await getAgentRow(managerId))) {
    return NextResponse.json({ error: 'gerente inválido' }, { status: 400 })
  }
  
  
  
  const existing = await getAgentRow(seed.id)
  if (existing && !existing.dismissed_at) {
    return NextResponse.json({ error: 'cargo já instalado', agentId: seed.id }, { status: 409 })
  }
  
  
  
  if (!isInstallableSeed(seed)) {
    return NextResponse.json({ error: 'definição de cargo inválida' }, { status: 422 })
  }
  const definicao = {
    name: seed.name, role: seed.role, system_prompt: seed.system_prompt, model: null, voice: seed.voice,
    
    
    tools: { ...seed.tools, composio: seed.tools.composio === true, anotarAprendizado: true },
    manager_id: managerId, brain_read_scopes: seed.brain_read_scopes, skills: seed.skills, budget: seed.budget,
    definition_version: seed.version ?? 0,
    synced_prompt_hash: hashPrompt(seed.system_prompt),
  }
  try {
    const agent = existing
      ? await recontratarCargo(seed.id, definicao)
      : await createAgent({ id: seed.id, ...definicao })
    invalidateAgentCache()
    return NextResponse.json({ ok: true, agent })
  } catch (err) {
    
    const msg = err instanceof Error ? err.message : String(err)
    if (/duplicate key|already exists|23505/i.test(msg)) {
      return NextResponse.json({ error: 'cargo já instalado', agentId: seed.id }, { status: 409 })
    }
    console.error('[POST /api/loja/install]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
