










import { lerCredenciais } from '@/server/google-ads/client'
import { getSetting } from '@/data/settings'


const SETTING_CONECTADO = 'google_ads_conectado'

const SETTING_CUSTOMER_ID = 'google_ads_customer_id'


export function formatarCustomerId(id: string): string {
  if (!/^\d{10}$/.test(id)) return id
  return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}`
}


export interface EstadoConexaoGoogle {
  conectado: boolean
  customerId: string | null
  fonte: 'local' | 'hub' | null
}


export interface EstadoConexaoDeps {
  lerCredenciaisImpl?: typeof lerCredenciais
  getSettingImpl?: typeof getSetting
}


export async function estadoConexaoGoogleAds(
  deps: EstadoConexaoDeps = {},
): Promise<EstadoConexaoGoogle> {
  const lerCreds = deps.lerCredenciaisImpl ?? lerCredenciais
  const getSet = deps.getSettingImpl ?? getSetting

  
  const creds = await lerCreds()
  if (creds) {
    return { conectado: true, customerId: creds.customerId, fonte: 'local' }
  }

  
  const [conectado, customerId] = await Promise.all([
    getSet(SETTING_CONECTADO),
    getSet(SETTING_CUSTOMER_ID),
  ])
  if (conectado === 'true' && customerId) {
    return { conectado: true, customerId, fonte: 'hub' }
  }

  return { conectado: false, customerId: null, fonte: null }
}
