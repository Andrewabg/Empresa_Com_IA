


export const JUSTIFICATIVA_MAX = 120


export const MARCADORES_DE_REPETICAO: readonly string[] = [
  
  'todo dia', 'todos os dias', 'todo santo dia', 'diariamente', 'diaria', 'diario',
  'por dia', 'cada dia', 'a cada dia', 'dia sim dia nao',
  
  'todo dia util', 'todos os dias uteis', 'dias uteis', 'de segunda a sexta', 'segunda a sexta',
  
  'toda semana', 'todas as semanas', 'semanalmente', 'por semana', 'a cada semana', 'cada semana',
  'toda segunda', 'toda terca', 'toda quarta', 'toda quinta', 'toda sexta',
  'todo sabado', 'todo domingo',
  'todas as segundas', 'todas as tercas', 'todas as quartas', 'todas as quintas',
  'todas as sextas', 'todos os sabados', 'todos os domingos',
  
  'as segundas', 'as tercas', 'as quartas', 'as quintas', 'as sextas', 'aos sabados', 'aos domingos',
  'todo fim de semana', 'todos os fins de semana',
  
  'todo mes', 'todos os meses', 'mensalmente', 'por mes', 'a cada mes', 'cada mes',
  
  'sempre', 'toda vez', 'todas as vezes', 'de tempos em tempos',
  'se repete', 'se repita', 'repetir', 'repete', 'repetido', 'recorrente', 'recorrencia',
  'periodicamente', 'regularmente',
]


const CONTRADICOES: readonly string[] = [
  'uma vez so', 'so uma vez', 'so dessa vez', 'so desta vez', 'uma unica vez',
  'sem repetir', 'sem repeticao', 'nao repete', 'nao se repete',
]


const NEGACOES: readonly string[] = ['nao', 'nem', 'nunca', 'jamais']

export interface VeredictoDeRepeticao {
  
  justificada: boolean
  
  marcador: string
}

const NEGADO: VeredictoDeRepeticao = { justificada: false, marcador: '' }


function normalizar(bruto: string): string {
  return bruto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}


function contem(acolchoado: string, expressao: string): boolean {
  return acolchoado.includes(` ${expressao} `)
}


function falaPedeRepeticao(fala: string): boolean {
  const acolchoado = ` ${normalizar(fala)} `
  if (CONTRADICOES.some((c) => contem(acolchoado, c))) return false
  const casados = MARCADORES_DE_REPETICAO.filter((m) => contem(acolchoado, m))
  if (!casados.length) return false
  let resto = acolchoado
  for (const m of casados) {
    while (contem(resto, m)) resto = resto.replace(` ${m} `, ' ')
  }
  return !NEGACOES.some((n) => contem(resto, n))
}


function alguemPediuRepeticao(falas: readonly string[]): boolean {
  return falas.some(falaPedeRepeticao)
}


function normalizarFalas(falaDoDono: string | readonly string[] | null | undefined): string[] {
  if (typeof falaDoDono === 'string') return falaDoDono.trim() ? [falaDoDono] : []
  if (Array.isArray(falaDoDono)) return falaDoDono.filter((f) => typeof f === 'string' && f.trim())
  return []
}

export function avaliarJustificativaDeRepeticao(
  bruto: string | null | undefined,
  falaDoDono?: string | readonly string[] | null,
): VeredictoDeRepeticao {
  if (typeof bruto !== 'string') return NEGADO
  const aparado = bruto.trim()
  if (!aparado || aparado.length > JUSTIFICATIVA_MAX) return NEGADO
  const falas = normalizarFalas(falaDoDono)
  if (falas.length && !alguemPediuRepeticao(falas)) return NEGADO

  const acolchoado = ` ${normalizar(aparado)} `
  if (CONTRADICOES.some((c) => contem(acolchoado, c))) return NEGADO

  const casados = MARCADORES_DE_REPETICAO.filter((m) => contem(acolchoado, m))
  if (!casados.length) return NEGADO

  
  let resto = acolchoado
  for (const m of casados) {
    while (contem(resto, m)) resto = resto.replace(` ${m} `, ' ')
  }
  if (NEGACOES.some((n) => contem(resto, n))) return NEGADO

  const marcador = casados.reduce((maior, m) => (m.length > maior.length ? m : maior), '')
  return { justificada: true, marcador }
}
