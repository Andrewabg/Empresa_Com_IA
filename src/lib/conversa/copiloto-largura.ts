


export function chaveDaLargura(cockpit: string): string {
  return `awave:copiloto-expandido:${cockpit}`
}

export const LARGURA_NORMAL = 'min(420px, 34%)'
export const LARGURA_EXPANDIDA = 'min(920px, 62%)'

export function larguraDoCopiloto(expandido: boolean): string {
  return expandido ? LARGURA_EXPANDIDA : LARGURA_NORMAL
}


export function rotuloDaLargura(expandido: boolean): { label: string; title: string } {
  return expandido
    ? { label: 'Recolher', title: 'Recolher a conversa e devolver espaço ao painel' }
    : { label: 'Expandir', title: 'Expandir a conversa' }
}
