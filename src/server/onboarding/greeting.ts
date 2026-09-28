import { ASSISTANT_NAME } from '@/lib/brand'

export interface OnboardingProfile {
  companyName: string
  operatorName: string
  mission: string
  voiceTone: string
}


export function composeGreetingText(
  p: OnboardingProfile,
  assistantName: string = ASSISTANT_NAME,
  opts?: { semEmpresa?: boolean },
): string {
  const name = p.operatorName?.trim() || 'operador'
  if (opts?.semEmpresa) {
    
    
    
    return `Olá, ${name}. Sou o ${assistantName}. Vim te mostrar o que dá pra fazer aqui — e, quando você tiver uma empresa, é só falar que eu cuido dela. Pode me chamar quando quiser.`
  }
  const company = p.companyName?.trim() || 'sua empresa'
  return `Olá, ${name}. Sou o ${assistantName}. A partir de agora cuido da ${company} — penso, ajo e te aviso quando precisar de você. Pode falar comigo a qualquer momento.`
}
