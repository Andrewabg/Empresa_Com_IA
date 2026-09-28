
import { AgentSpecSchema, type AgentSpec } from '../agent/architect'
import { materializarSpec, type CriarSkillInput } from '../agent/hiring'
import { aplicarRevisao } from './revisao'
import { cargosEquivalentes } from '@/lib/maestro/cargoMatch'
import { workspaceHref } from '@/lib/cockpit'
import { applyBriefPatch, slugsRequired, type FerramentaBrief } from '@/lib/hiring/brief'
import { hiringCoverage, type HiringTopic } from '@/lib/hiring/coverage'
import { claimSessionParaContratar, finishSession, getSession, patchBrief } from '@/data/hiringSessions'
import { listAgents, type AgentRow } from '@/data/agents'
import { serverDb } from '@/server/supabase'




export const DECISOES_FERRAMENTA = ['pendente', 'dispensado', 'aguardando_conexao'] as const
export type DecisaoFerramenta = (typeof DECISOES_FERRAMENTA)[number]

export type DecidirFerramentaResult =
  | { ok: true; ferramentas: FerramentaBrief[] }
  | { ok: false; error: 'sessao_inexistente' | 'ferramenta_desconhecida' }


export async function decidirFerramenta(
  sessionId: string,
  slug: string,
  decisao: DecisaoFerramenta,
): Promise<DecidirFerramentaResult> {
  const session = await getSession(sessionId)
  if (!session || session.status !== 'em_andamento') return { ok: false, error: 'sessao_inexistente' }
  const ferr = session.brief.ferramentas.find((f) => f.slug === slug)
  if (!ferr) return { ok: false, error: 'ferramenta_desconhecida' }
  const next = applyBriefPatch(session.brief, { ferramenta: { ...ferr, status: decisao } })
  await patchBrief(sessionId, next)
  return { ok: true, ferramentas: next.ferramentas }
}



export interface ConfirmarDeps {
  
  criarSkill?: (i: CriarSkillInput) => Promise<unknown>
  
  materializar?: typeof materializarSpec
  
  aplicarRevisao?: typeof aplicarRevisao
}

export type ConfirmarResult =
  | { ok: true; agentId: string; workspaceHref: string }
  | { ok: false; error: 'sessao_inexistente' | 'sessao_invalida' | 'sem_candidato' | 'spec_invalido' }
  | { ok: false; error: 'cobertura_incompleta'; faltam: HiringTopic[] }
  | { ok: false; error: 'ja_existe'; existingId: string; msg: string }


export async function confirmarContratacao(
  sessionId: string,
  nome?: string,
  deps: ConfirmarDeps = {},
): Promise<ConfirmarResult> {
  const session = await getSession(sessionId)
  if (!session) return { ok: false, error: 'sessao_inexistente' }
  if (session.status !== 'em_andamento') return { ok: false, error: 'sessao_invalida' }
  if (!session.spec_draft) return { ok: false, error: 'sem_candidato' }

  
  
  let spec: AgentSpec
  try {
    const raw = session.spec_draft as Record<string, unknown>
    const nomeLimpo = nome?.trim()
    spec = AgentSpecSchema.parse(nomeLimpo ? { ...raw, name: nomeLimpo } : raw)
  } catch {
    return { ok: false, error: 'spec_invalido' }
  }

  
  
  const cov = hiringCoverage(session.brief, session.mode)
  const papel = session.brief.papel?.trim()
  if (!cov.done || !papel) return { ok: false, error: 'cobertura_incompleta', faltam: cov.missing }

  
  
  
  if (session.mode === 'revisao') {
    if (!session.agent_id) return { ok: false, error: 'sessao_invalida' }
    
    
    const requiredToolkits = slugsRequired(session.brief)

    
    const claimed = await claimSessionParaContratar(session.id)
    if (!claimed) return { ok: false, error: 'sessao_invalida' }

    const fn = deps.aplicarRevisao ?? aplicarRevisao
    let row: AgentRow
    try {
      row = await fn(session.agent_id, spec, requiredToolkits)
    } catch (err) {
      
      
      try {
        await serverDb()
          .from('hiring_sessions')
          .update({ status: 'em_andamento', updated_at: new Date().toISOString() })
          .eq('id', session.id)
      } catch {
        
      }
      throw err
    }

    
    
    try { await finishSession(session.id, 'contratado', row.id) }
    catch (e) { console.warn('[confirmar] finishSession falhou (agente já existe, seguindo):', e) }
    const href = workspaceHref({ id: row.id, is_primary: false, tools: row.tools }, false)
    return { ok: true, agentId: row.id, workspaceHref: href ?? `/agente/${encodeURIComponent(row.id)}` }
  }

  
  
  const existente = (await listAgents()).find((a) => a.enabled && cargosEquivalentes(a.role, papel))
  if (existente) {
    return {
      ok: false,
      error: 'ja_existe',
      existingId: existente.id,
      msg: 'você já tem um agente pra isso — quer ajustá-lo?',
    }
  }

  
  
  const claimed = await claimSessionParaContratar(session.id)
  if (!claimed) return { ok: false, error: 'sessao_invalida' }

  
  
  
  const requiredToolkits = slugsRequired(session.brief)

  const fn = deps.materializar ?? materializarSpec
  let row: Awaited<ReturnType<typeof materializarSpec>>['row']
  try {
    const result = await fn(spec, {
      manager: 'jarvis',
      cargoOriginal: papel,
      requiredToolkits,
      ...(deps.criarSkill ? { criarSkill: deps.criarSkill } : {}),
    })
    row = result.row
  } catch (err) {
    
    
    
    try {
      await serverDb()
        .from('hiring_sessions')
        .update({ status: 'em_andamento', agent_id: null, updated_at: new Date().toISOString() })
        .eq('id', session.id)
    } catch {
      
    }
    throw err
  }

  
  
  
  try { await finishSession(session.id, 'contratado', row.id) }
  catch (e) { console.warn('[confirmar] finishSession falhou (agente já existe, seguindo):', e) }

  
  
  const href = workspaceHref({ id: row.id, is_primary: false, tools: row.tools }, false)
  return { ok: true, agentId: row.id, workspaceHref: href ?? `/agente/${encodeURIComponent(row.id)}` }
}
