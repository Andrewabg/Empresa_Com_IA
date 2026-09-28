


export type Registro = Record<string, string | number | null>


export interface Agregado {
  colunas: string[]
  linhas: Registro[]
  
  cortado?: true
}


export type TipoFonte = 'banco' | 'composio' | 'http' | 'webhook'


export interface ConsultaProposta {
  rotulo: string
  
  corpo: string
  
  notaPath: string
  
  motivo: string
}


export interface Adaptador {
  readonly tipo: TipoFonte
  
  readonly suportaAgregacao: boolean
  descrever(credencial: string): Promise<string>
  obter(credencial: string, corpoDaConsulta: string): Promise<Agregado>
}


export const MAX_FONTES = 10
export const MAX_CONSULTAS_POR_FONTE = 30
