










export const CHIP_SEM_CONEXAO = 'pronta para usar'


export const EXPLICACAO_SEM_CONEXAO =
  'Esta ferramenta não pede login nem chave. Quem depende dela já pode usar agora, sem você conectar nada.'


export function catalogoDeToolkits(conectados: string[], semLogin: string[]): string[] {
  const vistos = new Set<string>()
  const saida: string[] = []
  for (const bruto of [...conectados, ...semLogin]) {
    const slug = String(bruto ?? '').trim().toUpperCase()
    if (!slug || vistos.has(slug)) continue
    vistos.add(slug)
    saida.push(slug)
  }
  return saida
}
