









export interface PedidoComAlvo {
  id: string
  
  path?: string
}


export function outrosNoMesmoAlvo(pedidos: readonly PedidoComAlvo[], id: string): number {
  const alvo = pedidos.find((p) => p.id === id)?.path?.trim()
  if (!alvo) return 0
  return pedidos.filter((p) => p.id !== id && p.path?.trim() === alvo).length
}


export function avisoDeMesmoAlvo(quantidade: number, caminho: string | undefined): string | null {
  if (quantidade < 1 || !caminho) return null
  const plural = quantidade === 1 ? 'Outro pedido pendente escreve' : `Outros ${quantidade} pedidos pendentes escrevem`
  return `${plural} no mesmo arquivo (${caminho}). Cada um foi escrito contra a versão anterior dele, então aprovar este não resolve os outros.`
}
