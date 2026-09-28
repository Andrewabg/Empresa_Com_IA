









export interface LaudoDoTexto {
  headlineExata: boolean
  
  headlineLida: string
  apoioExato: boolean
  quebraRespeitada: boolean
  ctaExato: boolean
  inventouTexto: boolean
  oQueInventou: string
}


export interface TextoPedido {
  headline?: string
  subheadline?: string
  cta?: string
}

const pediu = (s: string | undefined): boolean => !!s && !!s.trim()


export function reprovaDoTexto(laudo: LaudoDoTexto, pedido: TextoPedido): string | null {
  if (pediu(pedido.headline)) {
    if (!laudo.headlineExata) return `a headline saiu diferente (li "${laudo.headlineLida}")`
    
    
    if (pedido.headline!.includes('\n') && !laudo.quebraRespeitada) return 'a headline quebrou em outro lugar'
  }
  if (pediu(pedido.subheadline) && !laudo.apoioExato) return 'a linha de apoio saiu diferente'
  if (pediu(pedido.cta) && !laudo.ctaExato) return 'a chamada saiu diferente'
  
  
  if (laudo.inventouTexto) return `apareceu texto que ninguém pediu (${laudo.oQueInventou || 'sem transcrição'})`
  return null
}


export function pedidoDoDocumento(blocos: Record<string, string | undefined> | undefined): TextoPedido {
  return {
    ...(blocos?.headline ? { headline: blocos.headline } : {}),
    ...(blocos?.subheadline ? { subheadline: blocos.subheadline } : {}),
    ...(blocos?.cta ? { cta: blocos.cta } : {}),
  }
}
