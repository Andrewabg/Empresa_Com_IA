
import type { Perfil } from './types'

export interface OnboardingChip {
  
  perfil: Perfil
  label: string
}

export const ONBOARDING_CHIPS: readonly OnboardingChip[] = [
  { perfil: 'tem_empresa', label: 'Tenho uma empresa' },
  { perfil: 'sem_empresa', label: 'Ainda não tenho empresa' },
  { perfil: 'revendedor', label: 'Quero revender pros meus clientes' },
  { perfil: 'curioso', label: 'Só quero explorar' },
]


export const ONBOARDING_CHIP_LABELS: readonly string[] = ONBOARDING_CHIPS.map((c) => c.label)
