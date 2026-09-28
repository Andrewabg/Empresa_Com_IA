


import { normalizarTexto } from '@/lib/google-ads/text'

export type ModoPolitica = 'padrao' | 'oab' | 'saude' | 'financeiro'

export interface RegraPolitica {
  modo: ModoPolitica
  
  proibeCtaVenda: boolean
  
  proibePromessaResultado: boolean
  
  exigeVerificacao: boolean
  
  aviso: string
}

export const REGRAS: Record<ModoPolitica, RegraPolitica> = {
  padrao: { modo: 'padrao', proibeCtaVenda: false, proibePromessaResultado: false, exigeVerificacao: false, aviso: '' },
  oab: { modo: 'oab', proibeCtaVenda: true, proibePromessaResultado: true, exigeVerificacao: false, aviso: 'modo_oab_so_conteudo_informativo' },
  saude: { modo: 'saude', proibeCtaVenda: false, proibePromessaResultado: true, exigeVerificacao: false, aviso: 'saude_sem_promessa_de_cura' },
  financeiro: { modo: 'financeiro', proibeCtaVenda: false, proibePromessaResultado: false, exigeVerificacao: true, aviso: 'financeiro_exige_verificacao_google' },
}


export function modoPorVertical(vertical: string): ModoPolitica {
  const v = normalizarTexto(vertical)
  if (/advog|advoc|juridic|oab/.test(v)) return 'oab'
  if (/saude|clinic|odonto|dentis|estetic|medic|fisio|nutri|psico/.test(v)) return 'saude'
  if (/financ|credit|emprestimo|consorcio|seguro|investim/.test(v)) return 'financeiro'
  return 'padrao'
}


export function regraDe(vertical: string): RegraPolitica {
  return REGRAS[modoPorVertical(vertical)]
}
