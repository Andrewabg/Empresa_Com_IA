



export interface RegraOuro { id: string; texto: string; at: string }
export const REGRAS_OURO_CAP = 7


export function aplicarRegrasOuro(lista: RegraOuro[]): RegraOuro[] {
  return lista.length > REGRAS_OURO_CAP ? lista.slice(lista.length - REGRAS_OURO_CAP) : lista
}

export function renderRegrasOuro(lista: RegraOuro[]): string {
  const regras = lista.map((r) => r.texto.trim()).filter(Boolean)
  if (!regras.length) return ''
  return ['\n\n## REGRAS DE OURO (invioláveis)', ...regras.map((r, i) => `${i + 1}. ${r}`)].join('\n')
}
