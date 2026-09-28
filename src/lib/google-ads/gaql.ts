




export type JanelaGaql = 'LAST_7_DAYS' | 'LAST_14_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH'


export function queryCampanhas(janela: JanelaGaql): string {
  return [
    'SELECT campaign.id, campaign.name, campaign.status,',
    'metrics.cost_micros, metrics.clicks, metrics.impressions,',
    'metrics.conversions, metrics.conversions_value, metrics.ctr,',
    'metrics.search_impression_share',
    'FROM campaign',
    `WHERE segments.date DURING ${janela}`,
    "AND campaign.status != 'REMOVED'",
    'ORDER BY metrics.cost_micros DESC',
  ].join(' ')
}


export function querySearchTerms(janela: JanelaGaql): string {
  return [
    'SELECT search_term_view.search_term, metrics.clicks, metrics.cost_micros,',
    'metrics.conversions, metrics.conversions_value, metrics.impressions',
    'FROM search_term_view',
    `WHERE segments.date DURING ${janela}`,
    'ORDER BY metrics.cost_micros DESC',
  ].join(' ')
}



export function queryAdGroups(janela: JanelaGaql): string {
  return [
    'SELECT ad_group.id, ad_group.name, ad_group.status, campaign.id,',
    'metrics.cost_micros, metrics.clicks, metrics.conversions',
    'FROM ad_group',
    `WHERE segments.date DURING ${janela}`,
    "AND ad_group.status != 'REMOVED'",
  ].join(' ')
}
