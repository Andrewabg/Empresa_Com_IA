import { setSetting as realSetSetting } from '@/data/settings'
import { getOnboardingSession, saveOnboardingSession } from '@/data/onboardingSession'
import { SNOOZE_KEY } from '../interview/coverage'
import type { Fase, OnboardingSession } from '@/lib/onboarding/types'

const DIA_MS = 24 * 60 * 60 * 1000


const FASES_ATIVAS: Fase[] = ['abertura', 'roteamento', 'entrevista']

export interface AdiarOnboardingResult { status: 'adiado'; até: string }

export interface AdiarOnboardingDeps {
  setSetting: (key: string, value: string) => Promise<void>
  getSession: (operatorId: string) => Promise<OnboardingSession | null>
  saveSession: (s: OnboardingSession) => Promise<void>
  now: () => Date
}

const defaultDeps: AdiarOnboardingDeps = {
  setSetting: realSetSetting,
  getSession: getOnboardingSession,
  saveSession: saveOnboardingSession,
  now: () => new Date(),
}


export async function adiarOnboarding(
  input: { operatorId?: string; motivo?: string },
  deps: AdiarOnboardingDeps = defaultDeps,
): Promise<AdiarOnboardingResult> {
  const até = new Date(deps.now().getTime() + DIA_MS).toISOString()
  await deps.setSetting(SNOOZE_KEY, até)

  if (input.operatorId) {
    try {
      const s = await deps.getSession(input.operatorId)
      if (s && FASES_ATIVAS.includes(s.fase)) await deps.saveSession({ ...s, fase: 'adiada' })
    } catch {
      
    }
  }

  return { status: 'adiado', até }
}
