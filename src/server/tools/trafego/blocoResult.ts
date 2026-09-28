
import type { BlocoRow } from '@/data/trafego'
import type { PainelBloco, PainelBlocoPatch } from '@/lib/trafego/types'

export interface BlocoToolCtx {
  
  operatorId?: string
}

export interface BlocoToolResult {
  output: string
  
  patch?: PainelBlocoPatch
}


export function toPainelBloco(row: BlocoRow): PainelBloco {
  return {
    id: row.id,
    type: row.type,
    config: row.config,
    snapshot_id: row.snapshot_id,
    annotation: row.annotation,
    position: row.position,
    status: row.status,
    created_at: row.created_at,
  }
}

export const SEM_OPERADOR =
  'Não consegui identificar o operador para salvar o painel — recarregue a página e tente de novo.'
