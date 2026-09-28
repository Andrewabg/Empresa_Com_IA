


export const TETO_DO_SELO = 9


export function eventoMexeNaFila(idDoEvento: string | null | undefined): boolean {
  return typeof idDoEvento === 'string' && idDoEvento.startsWith('apr:')
}

export interface SeloDeAprovacoes {
  
  visivel: boolean
  
  texto: string
  
  descricao: string
}


export function seloDeAprovacoes(pendentes: number): SeloDeAprovacoes {
  const n = Number.isFinite(pendentes) ? Math.floor(pendentes) : 0
  if (n <= 0) return { visivel: false, texto: '', descricao: 'Nenhuma aprovação pendente' }
  return {
    visivel: true,
    texto: n > TETO_DO_SELO ? `${TETO_DO_SELO}+` : String(n),
    descricao: n === 1 ? '1 aprovação esperando você' : `${n} aprovações esperando você`,
  }
}
