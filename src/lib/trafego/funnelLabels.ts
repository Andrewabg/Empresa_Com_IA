



export const FUNNEL_STAGE_LABELS: Record<string, string> = {
  impressions: 'Impressões',
  link_click: 'Cliques no link',
  landing_page_view: 'Visitas à página',
  add_to_cart: 'Carrinho',
  initiate_checkout: 'Checkout',
  add_payment_info: 'Pagamento',
  purchase: 'Compras',
  video_view: 'Views de vídeo',
}


export function funnelLabel(key: string): string {
  return FUNNEL_STAGE_LABELS[key] ?? key
}
