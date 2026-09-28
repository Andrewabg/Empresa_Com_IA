





export function colunaAusente(erro: { code?: string | null } | null | undefined): boolean {
  return erro?.code === 'PGRST204' || erro?.code === '42703'
}


const jaAvisado = new Set<string>()

export function avisarSchemaVelho(onde: string): void {
  if (jaAvisado.has(onde)) return
  jaAvisado.add(onde)
  console.warn(`[schema] ${onde}: o banco desta instalação ainda não tem as colunas novas desta fila; seguindo com o comportamento anterior. Aplique as migrations pendentes.`)
}
