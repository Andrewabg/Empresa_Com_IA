



export interface OrigemLabels {
  agente: string | null
  contato: string | null
  canal: string | null
}

export function formatarOrigem(labels: OrigemLabels): string | null {
  const partes: string[] = []
  if (labels.agente) partes.push(`pedido por ${labels.agente}`)
  if (labels.contato) partes.push(`cliente ${labels.contato}`)
  if (labels.canal) partes.push(labels.canal)
  return partes.length ? partes.join(' · ') : null
}
