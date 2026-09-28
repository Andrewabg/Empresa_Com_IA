
import type { FichaJuridica } from '@/lib/juridico/ficha'
import type { PropostaPrazo } from '@/lib/juridico/prazosTipos'

export type ContratoKind = 'gerado' | 'analisado' | 'modelo'
export type ContratoStatus = 'rascunho' | 'em_revisao' | 'recebido' | 'analisado' | 'finalizado' | 'arquivado'
export type Semaforo = 'critico' | 'atencao' | 'ok'
export type Recomendacao = 'assinar' | 'negociar' | 'nao_assinar'

export interface ParteContrato { papel: string; nome: string; qualificacao?: string }
export interface ClausulaParecer { ref: string; titulo: string; semaforo: Semaforo; analise: string; redline?: string }
export interface Parecer { resumoExecutivo: string; recomendacao: Recomendacao; clausulas: ClausulaParecer[] }


export interface ContratoView {
  id: string
  kind: ContratoKind
  tipo: string             
  titulo: string
  partes: ParteContrato[]
  status: ContratoStatus
  texto: string            
  parecer?: Parecer        
  pendencias: string[]     
  versaoAtual: number
  updatedAt: string
}


export type JuridicoPatch =
  | { op: 'upsert' | 'remove'; entidade: 'contrato'; contrato: ContratoView }
  | { op: 'upsert'; entidade: 'ficha'; ficha: FichaJuridica }
  | { op: 'upsert'; entidade: 'prazos-proposta'; contratoId: string; prazos: PropostaPrazo[] }


export function toContratoView(row: {
  id: string; kind: ContratoKind; tipo: string; titulo: string
  partes: unknown; status: ContratoStatus; texto: string
  parecer: unknown; meta: unknown; versao_atual: number; updated_at: string
}): ContratoView {
  const meta = (row.meta && typeof row.meta === 'object') ? row.meta as { pendencias?: unknown } : {}
  const pendencias = Array.isArray(meta.pendencias) ? meta.pendencias.filter((p): p is string => typeof p === 'string') : []
  const parecer = (row.parecer && typeof row.parecer === 'object') ? row.parecer as Parecer : undefined
  return {
    id: row.id, kind: row.kind, tipo: row.tipo, titulo: row.titulo,
    partes: Array.isArray(row.partes) ? row.partes as ParteContrato[] : [],
    status: row.status, texto: row.texto, parecer, pendencias,
    versaoAtual: row.versao_atual, updatedAt: row.updated_at,
  }
}
