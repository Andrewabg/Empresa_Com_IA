












import type { IgAutomacaoStatus } from '@/data/igAutomacoes'


export const STATUS_DA_AUTOMACAO = ['rascunho', 'ativa', 'expirada', 'arquivada'] as const


export const SAIDA_DO_ESTADO: Record<IgAutomacaoStatus, 'ligar' | 'salvar' | 'escolhida'> = {
  rascunho: 'ligar',
  ativa: 'ligar',
  
  
  expirada: 'salvar',
  arquivada: 'escolhida',
}


export function podeAlternarPelaLista(status: IgAutomacaoStatus): boolean {
  return SAIDA_DO_ESTADO[status] === 'ligar'
}


export function statusAoSalvar(atual: IgAutomacaoStatus): IgAutomacaoStatus | null {
  return atual === 'ativa' || atual === 'expirada' ? 'rascunho' : null
}
