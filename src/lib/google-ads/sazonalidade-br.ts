


export interface EventoSazonal {
  nome: string
  
  mes: number
  
  dia?: number
}

export const CALENDARIO_BR: EventoSazonal[] = [
  { nome: 'Carnaval', mes: 2 },
  { nome: 'Dia do Consumidor', mes: 3, dia: 15 },
  { nome: 'Dia do Trabalhador', mes: 5, dia: 1 },
  { nome: 'Dia das Mães', mes: 5 },
  { nome: 'Dia dos Namorados', mes: 6, dia: 12 },
  { nome: 'Dia dos Pais', mes: 8 },
  { nome: 'Dia das Crianças', mes: 10, dia: 12 },
  { nome: 'Black Friday', mes: 11 },
  { nome: 'Natal', mes: 12, dia: 25 },
]


export function eventosDoMes(mes: number): EventoSazonal[] {
  return CALENDARIO_BR.filter((e) => e.mes === mes)
}


export function eventosParaPreparar(mesAtual: number): EventoSazonal[] {
  const prox = mesAtual === 12 ? 1 : mesAtual + 1
  return CALENDARIO_BR.filter((e) => e.mes === prox)
}
