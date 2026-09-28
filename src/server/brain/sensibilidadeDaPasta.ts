
import { classifySensitivity, type Operation } from '@/brain/curator/classify'


export const PASTAS_QUE_EXIGEM_APROVACAO = ['identidade/'] as const


export function exigeAprovacaoDoDono(path: string): boolean {
  const limpo = path.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()
  return PASTAS_QUE_EXIGEM_APROVACAO.some((pasta) => limpo.startsWith(pasta))
}


export function classificarSensibilidade(input: {
  path: string
  operation: Operation
  touched: number
}): 'auto' | 'pr' {
  if (exigeAprovacaoDoDono(input.path)) return 'pr'
  return classifySensitivity(input)
}
