export type CategoriaId =
  | 'trabalho' | 'memoria' | 'agentes' | 'cerebro' | 'equipe' | 'credenciais' | 'identidade'


export interface ResetFlags {
  categorias: CategoriaId[]
}


export type ResetOp =
  
  | { op: 'delete'; table: string; keep?: 'primary_coo' | 'dono' | 'nao_kept_agente'; fk_cols?: string[] }
  | { op: 'update_sync_state' }
  | { op: 'delete_settings_keys'; keys: string[] }


