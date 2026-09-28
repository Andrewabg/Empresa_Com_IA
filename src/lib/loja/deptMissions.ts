
const MISSOES: Readonly<Record<string, string>> = {
  'Marketing & Conteúdo': 'Quem faz sua marca aparecer',
  'Vendas & Atendimento': 'Quem vende e responde enquanto você dorme',
  'Financeiro & Dados': 'Quem cuida do caixa e enxerga os números',
  'Operações, Gente & Jurídico': 'Quem faz a casa rodar redonda',
  Outros: 'Especialistas além dos departamentos',
}

export function missaoDoDepartamento(titulo: string): string | null {
  return MISSOES[titulo] ?? null
}
