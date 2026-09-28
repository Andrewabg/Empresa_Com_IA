







import type { DesfechoRecente } from './tipos'

function fnv1a(s: string): string {
  let h = 0x811c9dc5 
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0 
  }
  return h.toString(16)
}


export interface FatosNegocioParaFingerprint {
  tarefasConcluidas?: number
  tarefasFalhadas?: number
  atendimentosAguardando?: number
  rotinasQueRodaram?: number
  prazosNaJanela?: number
}


export function fingerprintFatos(
  memoriasNovas: number,
  desfechos: DesfechoRecente[],
  negocio: FatosNegocioParaFingerprint = {},
): string {
  const norm = desfechos.map((d) => `${d.status}|${d.titulo}`).sort()
  const s = JSON.stringify([
    memoriasNovas,
    norm,
    negocio.tarefasConcluidas,
    negocio.tarefasFalhadas,
    negocio.atendimentosAguardando,
    negocio.rotinasQueRodaram,
    negocio.prazosNaJanela,
  ])
  
  
  return `${s.length}:${fnv1a(s)}`
}
