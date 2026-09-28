














export const MECANISMOS = [
  'dor', 'perda', 'urgencia', 'curiosidade', 'prova', 'autoridade', 'identificacao', 'aspiracao',
] as const
export type MecanismoPsicologico = (typeof MECANISMOS)[number]


export const POLIMENTOS = ['cru', 'produzido'] as const
export type Polimento = (typeof POLIMENTOS)[number]


export const ESCALAS = ['preenche-o-quadro', 'objeto-na-cena'] as const
export type EscalaDoObjeto = (typeof ESCALAS)[number]


export const IDIOMA_DO_TEXTO_DIEGETICO = 'Brazilian Portuguese'

export interface ArquetipoDeCena {
  slug: string
  
  nome: string
  
  descricao: string
  
  cenaPede: string
  
  textoDiegetico?: string
  polimento: Polimento
  escala: EscalaDoObjeto
  
  mecanismos: MecanismoPsicologico[]
  
  camera: string
  
  templates: string[]
}
