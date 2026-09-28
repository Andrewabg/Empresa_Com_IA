









import { TOPICS, MANDATORY } from '@/server/interview/topics'


export const NUCLEO_BASE: readonly string[] = MANDATORY.map((t) => t.id)


export const TETO_NUCLEO = 6


export const TOPICOS_POR_CARGO: Readonly<Record<string, readonly string[]>> = {
  
  'gestor-trafego': ['metas', 'receita'],
  gael: ['metas', 'receita'],
  
  copywriter: ['posicionamento'],
  designer: ['posicionamento'],
  
  juridico: ['restricoes'],
  
  atendimento: ['processos', 'ferramentas'],
  
  
  
  
  
  
  
  
  
}


const IDS_VALIDOS = new Set(TOPICS.map((t) => t.id))


export function nucleoParaCargos(cargoIds: readonly string[]): string[] {
  const extras = new Set<string>()
  for (const cargo of cargoIds) {
    for (const topico of TOPICOS_POR_CARGO[cargo] ?? []) {
      if (IDS_VALIDOS.has(topico) && !NUCLEO_BASE.includes(topico)) {
        extras.add(topico)
      }
    }
  }
  
  
  const extrasOrdenados = TOPICS.filter((t) => extras.has(t.id)).map((t) => t.id)
  return [...NUCLEO_BASE, ...extrasOrdenados].slice(0, TETO_NUCLEO)
}
