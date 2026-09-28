

import type { AccountBaseline } from '@/lib/trafego/baseline'
export type TipoDeColuna = 'inteiro' | 'real' | 'texto'
export interface ColunaDaBancada { nome: string; tipo: TipoDeColuna }
export interface TabelaDaBancada { nome: string; colunas: ColunaDaBancada[]; linhas: unknown[][]; porque?: string }
export interface EntradaDoWorker { tabelas: TabelaDaBancada[]; sql: string; tetoLinhas: number; heapBytes: number }
export type SaidaDoWorker =
  | { ok: true; colunas: string[]; linhas: unknown[][]; cortou: boolean; ms: number }
  | { ok: false; erro: string }
export interface Bancada {
  tabelas: Map<string, TabelaDaBancada>
  totalLinhas: number
  contador: number
  historicoCarregado: boolean
  
  carregando?: Promise<{ historico: number; cortou: boolean; normal: number }>
  
  reservado?: number
  
  baseline?: AccountBaseline | null
}
export const TETO_LINHAS_DA_BANCADA = 30_000
export const TETO_LINHAS_DA_SAIDA = 200
export const TETO_CHARS_DA_SAIDA = 6_000
export const HEAP_DA_BANCADA = 128_000_000
export const PRAZO_DA_CONSULTA_MS = 5_000
export const VAGAS_DA_BANCADA = 2
export const ESPERA_MAX_POR_VAGA_MS = 30_000
export const ERRO_PRAZO = 'prazo' as const

export const ERRO_INTERROMPIDO = 'interrompido' as const
