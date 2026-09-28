import { getOrCreateOnboardingSession, saveOnboardingSession } from '@/data/onboardingSession'
import { motivoSeguro } from '@/lib/sanitizarErro'
import { trocarStatus } from '@/lib/onboarding/slots'
import type { OnboardingSession, Slot } from '@/lib/onboarding/types'
import { persistirNotaEmpresa, contaComoPersistido, type PersistNotaKind } from './registrarEntrevista'
import { gravarFatoDoSlot, type UpsertFato } from './gravarNaFicha'


type ReflectOutcome = { reflected: boolean; error?: boolean; permanent?: boolean }


export interface EntrevistaCommitDeps {
  getSession: (operatorId: string) => Promise<OnboardingSession>
  saveSession: (session: OnboardingSession) => Promise<void>
  persistirNota: (topicId: string, conteúdo: string) => Promise<PersistNotaKind>
  
  upsertFato?: UpsertFato
  
  now?: () => string
}

const DEPS_PADRAO: EntrevistaCommitDeps = {
  getSession: (operatorId) => getOrCreateOnboardingSession(operatorId),
  saveSession: saveOnboardingSession,
  persistirNota: persistirNotaEmpresa,
}


export async function entrevistaCommit(ref: string, deps: EntrevistaCommitDeps = DEPS_PADRAO): Promise<ReflectOutcome> {
  try {
    const sep = ref.indexOf(':')
    if (sep < 0) return { reflected: true } 
    const operatorId = ref.slice(0, sep)
    const topicId = ref.slice(sep + 1)
    if (!operatorId || !topicId) return { reflected: true }

    const session = await deps.getSession(operatorId)
    const slot = session.slots.find((s) => s.id === topicId)

    
    if (!slot || slot.status !== 'pendente_commit') return { reflected: true }

    const corpo = corpoDoSlot(slot)
    if (!corpo) return { reflected: true } 

    const kind = await deps.persistirNota(topicId, corpo)

    
    
    
    
    if (kind === 'invalido') {
      console.warn('[entrevistaCommit] topicId fora da lista publicada — slot encerrado como adiado:', topicId)
      await deps.saveSession(trocarStatus(session, topicId, 'adiado', false))
      return { reflected: true }
    }
    if (!contaComoPersistido(kind)) {
      return { reflected: true } 
    }

    await deps.saveSession(trocarStatus(session, topicId, 'coberto', true))

    
    
    
    
    
    const now = deps.now ?? (() => new Date().toISOString())
    await gravarFatoDoSlot({ topicId, valor: slot.valor ?? '', at: now() }, deps.upsertFato)
    return { reflected: true }
  } catch (err) {
    
    
    console.warn('[entrevistaCommit] falha transitória (requeue):', motivoSeguro(err))
    return { reflected: false, error: true }
  }
}


function corpoDoSlot(slot: Slot): string | undefined {
  return [slot.conteudoPendente, slot.valor].find((c) => (c ?? '').trim() !== '')
}
