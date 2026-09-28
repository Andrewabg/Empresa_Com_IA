

const LABELS: Record<string, string> = {
  GMAIL_SEND_EMAIL: 'Enviar e-mail (Gmail)',
  GOOGLECALENDAR_CREATE_EVENT: 'Criar evento (Google Calendar)',
  SLACK_POST_MESSAGE: 'Postar mensagem (Slack)',
  NOTION_CREATE_PAGE: 'Criar página (Notion)',
}

export function summarizeAction(slug: string, args?: Record<string, unknown>): string {
  
  if (slug === 'METAADS_UPDATE_CAMPAIGN') {
    const id = typeof args?.campaign_id === 'string' ? args.campaign_id : '?'
    const status = typeof args?.status === 'string' ? args.status : undefined
    if (status === 'PAUSED') return `Pausar campanha [${id}]`
    if (status === 'ACTIVE') return `Reativar campanha [${id}]`
    
    const budgetCents =
      typeof args?.daily_budget === 'string' ? Number(args.daily_budget)
      : typeof args?.lifetime_budget === 'string' ? Number(args.lifetime_budget)
      : undefined
    if (budgetCents !== undefined) {
      const budgetLabel = Number.isFinite(budgetCents)
        ? ` → R$ ${(budgetCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : ''
      return `Ajustar orçamento da campanha [${id}]${budgetLabel}`
    }
    return `Atualizar campanha [${id}]`
  }
  if (LABELS[slug]) return LABELS[slug]
  
  const words = String(slug ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  if (words.length === 0) return 'Ação externa'
  const phrase = words.join(' ')
  return phrase.charAt(0).toUpperCase() + phrase.slice(1)
}
