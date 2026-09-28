
import { WIZARD_FIELDS, fieldByKey, type WizardField } from '@/lib/onboarding-wizard'

export type ModoNascimento = 'com_empresa' | 'pre_empresa'


const CAMPO_PRE_EMPRESA: WizardField = {
  ...fieldByKey('operatorName'),
  label: 'Antes de tudo, como te chamo?', 
  microcopy: 'É com você que eu vou falar. Empresa a gente vê depois, sem pressa.',
}


export function camposDoModo(modo: ModoNascimento): readonly WizardField[] {
  return modo === 'pre_empresa' ? [CAMPO_PRE_EMPRESA] : WIZARD_FIELDS
}
