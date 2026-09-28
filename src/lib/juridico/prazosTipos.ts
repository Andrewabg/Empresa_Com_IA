
export type PrazoTipo = 'renovacao' | 'aviso_previo' | 'expiracao' | 'pagamento' | 'compromisso'
export type PrazoStatus = 'ativo' | 'resolvido' | 'dispensado'


export interface PrazoView {
  id: string
  contratoId: string | null
  tipo: PrazoTipo
  titulo: string
  dataAlvo: string   
  janelaDias: number
  status: PrazoStatus
  updatedAt: string
}


export interface PropostaPrazo { tipo: PrazoTipo; titulo: string; dataAlvo: string; janelaDias: number }

export function toPrazoView(row: {
  id: string; contrato_id: string | null; tipo: string; titulo: string
  data_alvo: string; janela_dias: number; status: string; meta?: unknown; updated_at: string
}): PrazoView {
  return {
    id: row.id, contratoId: row.contrato_id ?? null, tipo: row.tipo as PrazoTipo,
    titulo: row.titulo, dataAlvo: row.data_alvo, janelaDias: row.janela_dias,
    status: row.status as PrazoStatus, updatedAt: row.updated_at,
  }
}
