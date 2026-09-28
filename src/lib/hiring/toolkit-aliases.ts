





export function normalizarTermo(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '') 
    .toLowerCase()
}


function escRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}


const ALIAS: Record<string, string[]> = {
  
  googlesheets:   ['google sheets', 'google planilha', 'planilha google', 'planilha'],
  googlecalendar: ['google agenda', 'google calendar', 'agenda google', 'agenda'],
  googledrive:    ['google drive', 'drive google', 'drive'],
  gmail:          ['e-mail', 'email', 'gmail', 'correio eletronico'],
  googledocs:     ['google docs', 'docs google', 'documento google'],
  googleforms:    ['google forms', 'formulario google'],
  googleanalytics:['google analytics', 'analytics'],

  
  slack:          ['slack'],
  discord:        ['discord'],
  telegram:       ['telegram'],
  whatsapp:       ['whatsapp', 'zap', 'zaps', 'wpp'],
  zoom:           ['zoom', 'reuniao zoom'],
  googlemeet:     ['google meet', 'google meeting', 'meet'],    

  
  notion:         ['notion'],
  trello:         ['trello'],
  clickup:        ['clickup', 'click up'],
  asana:          ['asana'],
  jira:           ['jira'],
  monday:         ['monday', 'monday.com'],
  

  
  hubspot:        ['hubspot', 'hub spot'],
  rd_station:     ['rd station', 'rdstation', 'rd', 'resultados digitais'],
  pipedrive:      ['pipedrive', 'pipe drive'],
  salesforce:     ['salesforce', 'sales force'],
  ploomes:        ['ploomes'],
  bitrix24:       ['bitrix', 'bitrix24'],

  
  shopify:        ['shopify'],
  stripe:         ['stripe'],
  pagseguro:      ['pagseguro', 'pag seguro'],
  mercadopago:    ['mercado pago', 'mercadopago'],
  nuvemshop:      ['nuvemshop', 'nuvem shop', 'tiendanube'],

  
  metaads:        ['meta ads', 'facebook ads', 'instagram ads', 'anuncios meta', 'anuncio facebook'],
  instagram:      ['instagram', 'insta'],
  facebook:       ['facebook'],  
  youtube:        ['youtube'],
  mailchimp:      ['mailchimp', 'mail chimp'],
  activecampaign: ['active campaign', 'activecampaign'],
  brevo:          ['brevo', 'sendinblue'],

  
  airtable:       ['airtable', 'air table'],
  dropbox:        ['dropbox', 'drop box'],
  github:         ['github', 'git hub', 'repositorio github'],
  typeform:       ['typeform', 'type form', 'formulario typeform'],
}





const COMPILED: [string, RegExp][] = Object.entries(ALIAS).flatMap(([slug, aliases]) => {
  
  const sorted = [...aliases].sort((a, b) => b.length - a.length)
  return sorted.map((alias) => {
    const normed = normalizarTermo(alias)
    
    
    const rx = new RegExp(`(^|\\P{L})${escRx(normed)}($|\\P{L})`, 'u')
    return [slug, rx] as [string, RegExp]
  })
})


export function matchAliases(texto: string): string[] {
  const normed = normalizarTermo(texto)
  const found = new Set<string>()
  for (const [slug, rx] of COMPILED) {
    if (!found.has(slug) && rx.test(normed)) {
      found.add(slug)
    }
  }
  return [...found]
}
