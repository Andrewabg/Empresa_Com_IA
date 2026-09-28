



export interface ContaSnapshot {
  
  temConversaoConfigurada: boolean
  
  temEnhancedConversions?: boolean
  
  campanhasComAnuncioReprovado: number
  
  temNegativas: boolean
  
  conflitosKeyword: number
  
  gruposForaStag: number
}

export type Severidade = 'critico' | 'alerta' | 'dica'
export interface Achado {
  chave: string
  severidade: Severidade
  
  peso: number
}
export interface AuditResultado {
  
  score: number
  
  achados: Achado[]
}


const PESOS = {
  sem_conversao: 60,
  anuncio_reprovado: 20,
  sem_negativas: 15,
  conflito_keyword: 10,
  grupos_fora_stag: 5,
  sem_enhanced_conversions: 5,
} as const


export function auditarConta(s: ContaSnapshot): AuditResultado {
  const achados: Achado[] = []
  if (!s.temConversaoConfigurada) achados.push({ chave: 'sem_conversao', severidade: 'critico', peso: PESOS.sem_conversao })
  if (s.campanhasComAnuncioReprovado > 0) achados.push({ chave: 'anuncio_reprovado', severidade: 'critico', peso: PESOS.anuncio_reprovado })
  if (!s.temNegativas) achados.push({ chave: 'sem_negativas', severidade: 'alerta', peso: PESOS.sem_negativas })
  if (s.conflitosKeyword > 0) achados.push({ chave: 'conflito_keyword', severidade: 'alerta', peso: PESOS.conflito_keyword })
  if (s.gruposForaStag > 0) achados.push({ chave: 'grupos_fora_stag', severidade: 'dica', peso: PESOS.grupos_fora_stag })
  if (s.temConversaoConfigurada && s.temEnhancedConversions === false) {
    achados.push({ chave: 'sem_enhanced_conversions', severidade: 'dica', peso: PESOS.sem_enhanced_conversions })
  }
  achados.sort((a, b) => b.peso - a.peso)
  const desconto = achados.reduce((acc, a) => acc + a.peso, 0)
  return { score: Math.max(0, 100 - desconto), achados }
}
