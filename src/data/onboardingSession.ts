import { serverDb } from '@/server/supabase'
import type { OnboardingSession, Perfil, Fase, Slot } from '@/lib/onboarding/types'

interface Row { operator_id: string; conversation_id: string | null; perfil: Perfil | null; fase: Fase; slots: Slot[]; reflect_cutpoint_at: string | null; pergunta_em_jogo: string | null }

function toSession(r: Row): OnboardingSession {
  return { operatorId: r.operator_id, conversationId: r.conversation_id ?? undefined, perfil: r.perfil, fase: r.fase, slots: r.slots ?? [], reflectCutpointAt: r.reflect_cutpoint_at ?? undefined, perguntaEmJogo: r.pergunta_em_jogo ?? undefined }
}


export async function getOnboardingSession(operatorId: string): Promise<OnboardingSession | null> {
  const db = serverDb()
  const { data, error } = await db.from('onboarding_session').select().eq('operator_id', operatorId).maybeSingle()
  if (error) throw new Error(`getOnboardingSession select: ${error.message}`)
  return data ? toSession(data as Row) : null
}


async function faseInicialPadrao(): Promise<Fase> {
  try {
    const { coverage } = await import('@/server/interview/coverage')
    const { nucleoCoberto } = await import('@/lib/onboarding/perfis')
    return nucleoCoberto((await coverage()).covered) ? 'concluida' : 'abertura'
  } catch {
    return 'abertura'
  }
}


export async function getOrCreateOnboardingSession(
  operatorId: string,
  conversationId?: string,
  deps?: { faseInicial?: () => Promise<Fase> },
): Promise<OnboardingSession> {
  const db = serverDb()
  const existente = await db.from('onboarding_session').select().eq('operator_id', operatorId).maybeSingle()
  if (existente.error) throw new Error(`getOrCreateOnboardingSession select: ${existente.error.message}`)
  if (existente.data) return toSession(existente.data as Row)
  const fase = deps?.faseInicial ? await deps.faseInicial() : await faseInicialPadrao()
  const ins = await db.from('onboarding_session')
    .insert({ operator_id: operatorId, conversation_id: conversationId ?? null, fase }).select().single()
  if (ins.error) {
    if (ins.error.code === '23505') { 
      const again = await db.from('onboarding_session').select().eq('operator_id', operatorId).single()
      if (again.error) throw new Error(`getOrCreateOnboardingSession re-select: ${again.error.message}`)
      return toSession(again.data as Row)
    }
    throw new Error(`getOrCreateOnboardingSession insert: ${ins.error.message}`)
  }
  return toSession(ins.data as Row)
}

export async function saveOnboardingSession(s: OnboardingSession): Promise<void> {
  const { error } = await serverDb().from('onboarding_session')
    .update({ conversation_id: s.conversationId ?? null, perfil: s.perfil, fase: s.fase, slots: s.slots, reflect_cutpoint_at: s.reflectCutpointAt ?? null, pergunta_em_jogo: s.perguntaEmJogo ?? null, updated_at: new Date().toISOString() })
    .eq('operator_id', s.operatorId)
  if (error) throw new Error(`saveOnboardingSession: ${error.message}`)
}
