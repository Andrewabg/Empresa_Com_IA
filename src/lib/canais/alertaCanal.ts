


export type AlertaCanal = { nivel: 'aviso'; codigo: 'proposito_geral'; texto: string } | null


export function alertaPropositoGeral(input: {
  agenteEhPrincipal: boolean
  provider: string
}): AlertaCanal {
  if (!input.agenteEhPrincipal) return null
  if (input.provider !== 'whatsapp_cloud') return null
  return {
    nivel: 'aviso',
    codigo: 'proposito_geral',
    texto:
      'Este número está ligado ao seu assistente pessoal. A Meta não permite assistente de IA de propósito geral como função principal de um número WhatsApp Business — o número pode ser suspenso. Ligue um atendente com escopo definido (Sofia, Davi) e deixe o assistente pessoal no Telegram.',
  }
}
