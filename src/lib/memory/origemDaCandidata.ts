

export type OrigemCandidata = 'dono' | 'agente' | 'terceiro' | 'sistema'


export const ORIGENS_DURAVEIS = ['dono', 'agente'] as const satisfies readonly OrigemCandidata[]


export function validarOrigemDeclarada(origem: string | null | undefined): OrigemCandidata {
  const normalizado = (origem ?? '').trim().toLowerCase()
  const validas: readonly string[] = ['dono', 'agente', 'terceiro', 'sistema']
  return (validas.includes(normalizado) ? normalizado : 'terceiro') as OrigemCandidata
}


export function podeVirarMemoriaDuravel(origem: string | null | undefined): boolean {
  if (origem === null || origem === undefined) return true
  return (ORIGENS_DURAVEIS as readonly string[]).includes(origem)
}


export function hashDoConteudo(texto: string): string {
  const norm = texto.trim().toLowerCase().replace(/\s+/g, ' ')
  let h = 0x811c9dc5
  for (let i = 0; i < norm.length; i++) {
    h ^= norm.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
