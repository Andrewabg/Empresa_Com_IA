



import type { PendenteBriefing } from './tipos'


export function limparTitulo(titulo: string): string {
  return titulo.replace(/\s*\[\d{6,}\]\s*$/, '').trim()
}

export function montarLinhaAcionavel(pendentes: PendenteBriefing[]): string {
  const n = pendentes.length
  if (n === 0) return 'Nada precisa de você agora.'
  if (n === 1) {
    const p = pendentes[0]
    const titulo = limparTitulo(p.titulo) || 'uma ação'
    const quem = p.agente && p.agente.trim() ? ` (${p.agente.trim()})` : ''
    return `Tem 1 aprovação esperando seu sinal: ${titulo}${quem}.`
  }
  
  
  
  const maisRecente = limparTitulo(pendentes[n - 1].titulo) || 'uma ação'
  return `Tem ${n} aprovações esperando seu sinal — a mais recente é ${maisRecente}.`
}
