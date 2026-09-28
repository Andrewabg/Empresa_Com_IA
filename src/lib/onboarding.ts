

export const ONBOARDING_STEPS = ['company', 'keys', 'jarvis'] as const
export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]


export type OnboardingPhase = 'ritual' | 'birth'

export interface OnboardingState {
  
  step: number
  phase: OnboardingPhase
}

export const FIRST_STEP: OnboardingState = { step: 0, phase: 'ritual' }
export const LAST_STEP_INDEX = ONBOARDING_STEPS.length - 1

function clampStep(i: number): number {
  if (i < 0) return 0
  if (i > LAST_STEP_INDEX) return LAST_STEP_INDEX
  return i
}


export function currentStepId(s: OnboardingState): OnboardingStepId | null {
  if (s.phase === 'birth') return null
  return ONBOARDING_STEPS[clampStep(s.step)]
}


export function isLastStep(s: OnboardingState): boolean {
  return s.phase === 'ritual' && s.step === LAST_STEP_INDEX
}


export function canGoBack(s: OnboardingState): boolean {
  return s.phase === 'ritual' && s.step > 0
}


export function next(s: OnboardingState): OnboardingState {
  if (s.phase === 'birth') return s
  if (s.step >= LAST_STEP_INDEX) return { step: s.step, phase: 'birth' }
  return { step: s.step + 1, phase: 'ritual' }
}


export function back(s: OnboardingState): OnboardingState {
  if (s.phase === 'birth') return { step: LAST_STEP_INDEX, phase: 'ritual' }
  return { step: clampStep(s.step - 1), phase: 'ritual' }
}


export function progress(s: OnboardingState): number {
  if (s.phase === 'birth') return 1
  return s.step / LAST_STEP_INDEX
}
