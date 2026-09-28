

export type WizardFieldKey = 'companyName' | 'operatorName' | 'voiceTone' | 'mission'

export interface WizardField {
  key: WizardFieldKey
  
  label: string
  
  microcopy: string
  placeholder: string
  
  multiline: boolean
  
  required: boolean
  maxLength: number
  
  minLength?: number
  
  dicaCurta?: string
}

export const WIZARD_FIELDS: readonly WizardField[] = [
  {
    key: 'companyName',
    label: 'Como sua empresa se chama?',
    microcopy: 'O nome que vai assinar tudo que ela faz.',
    placeholder: 'Ex: Awave Agents',
    multiline: false,
    required: true,
    maxLength: 80,
    
    
    minLength: 1,
    dicaCurta: 'Escreve o nome como ela é conhecida.', 
  },
  {
    key: 'operatorName',
    label: 'Quem está no comando?',
    microcopy: 'Seu nome. É com você que ela vai falar.',
    placeholder: 'Seu nome',
    multiline: false,
    required: true,
    maxLength: 60,
    minLength: 2,
    dicaCurta: 'Como as pessoas te chamam?', 
  },
  {
    key: 'voiceTone',
    label: 'Como ela fala?',
    microcopy: 'O tom de voz da sua empresa em cada resposta.',
    placeholder: 'Ex: Direto, caloroso, sem firula',
    multiline: false,
    required: true,
    maxLength: 120,
    minLength: 3,
    dicaCurta: 'Uma palavra já serve: seco, caloroso, técnico…', 
  },
  {
    key: 'mission',
    label: 'Por que ela existe?',
    microcopy: 'A missão que guia cada decisão.',
    placeholder: 'Ex: Uma empresa de IA que trabalha enquanto você dorme.',
    multiline: true,
    required: true,
    maxLength: 240,
    minLength: 8,
    dicaCurta: 'Uma frase basta. Conta o porquê.', 
  },
]


export const FORM_INICIAL: Record<WizardFieldKey, string> = {
  companyName: '',
  operatorName: '',
  voiceTone: '',
  mission: '',
}

export const FIRST_FIELD_INDEX = 0
export const LAST_FIELD_INDEX = WIZARD_FIELDS.length - 1

function clampIndex(i: number): number {
  if (i < FIRST_FIELD_INDEX) return FIRST_FIELD_INDEX
  if (i > LAST_FIELD_INDEX) return LAST_FIELD_INDEX
  return i
}


export function fieldAt(i: number): WizardField {
  return WIZARD_FIELDS[clampIndex(i)]
}


export function fieldByKey(key: WizardFieldKey): WizardField {
  const field = WIZARD_FIELDS.find((f) => f.key === key)
  if (!field) throw new Error(`onboarding-wizard: campo desconhecido "${key}"`)
  return field
}


export function canAdvance(field: WizardField, value: string): boolean {
  if (!field.required) return true
  return value.trim().length >= (field.minLength ?? 1)
}


const CONVITE_VAZIO = 'Escreve aqui pra continuar.' 


export function dicaMinimo(
  field: WizardField,
  value: string,
  tentou: boolean = false,
): string | null {
  if (!field.required) return null
  const len = value.trim().length
  if (len === 0) return tentou ? (field.dicaCurta ?? CONVITE_VAZIO) : null
  if (len >= (field.minLength ?? 1)) return null
  return field.dicaCurta ?? `Pelo menos ${field.minLength} caracteres.`
}


export function nextStep(i: number): number {
  return clampIndex(i + 1)
}


export function prevStep(i: number): number {
  return clampIndex(i - 1)
}


export function isLastField(i: number): boolean {
  return clampIndex(i) === LAST_FIELD_INDEX
}
