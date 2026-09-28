
export type Aresta = 'insights' | 'campanhas' | 'conjuntos' | 'anuncios' | 'criativos' | 'detalhes' | 'audiencias'
export type TipoDeNo = 'conta' | 'campanha' | 'conjunto' | 'anuncio' | 'criativo'
export type NivelDeInsights = 'campanha' | 'conjunto' | 'anuncio'
export type Incremento = 'dia' | 'semana' | 'mes' | 'total'
export type OpDeFiltro = 'igual' | 'contem' | 'maior' | 'menor' | 'em'
export interface FiltroDaConsulta { campo: string; op: OpDeFiltro; valor: string | number | Array<string | number> }
export interface PeriodoDaConsulta { preset?: string; since?: string; until?: string; incremento?: Incremento }

export interface ConsultaMeta {
  objeto: string
  aresta: Aresta
  tipo?: TipoDeNo
  nivel?: NivelDeInsights
  campos?: string[]
  periodo?: PeriodoDaConsulta
  breakdowns?: string[]
  filtros?: FiltroDaConsulta[]
  ordenar?: { campo: string; direcao: 'asc' | 'desc' }
  limite?: number
  porque: string
  fonte?: 'meta'
}

export interface ConsultaValida {
  objeto: 'conta' | string
  aresta: Aresta
  tipoDoNo: TipoDeNo | null
  levelGraph: 'campaign' | 'adset' | 'ad' | null
  campos: string[]
  periodo: { preset: string } | { since: string; until: string } | null
  incremento: Incremento
  breakdowns: string[]
  filtros: FiltroDaConsulta[]
  ordenar: { campo: string; direcao: 'asc' | 'desc' } | null
  limite: number
  porque: string
}

export const TETO_DE_CALCULOS = 20
export const TETO_CHAMADAS_HTTP = 40
export const AVISO_CHAMADAS_HTTP = 30
export const LIMITE_PADRAO = 100
export const LIMITE_MAXIMO = 500
export const PRAZO_DA_PAGINA_MS = 15_000
export const PRAZO_DA_CONSULTA_MS = 30_000
export const LINHAS_DA_AMOSTRA = 15
export const TETO_DO_PORQUE = 80
export const CURSOR_RE = /^[A-Za-z0-9_=-]+$/
export const OBJETO_RE = /^(act_)?\d{1,20}$/
export const DATA_RE = /^\d{4}-\d{2}-\d{2}$/
