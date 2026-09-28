











import {
  lerCredenciais as _lerCredenciais,
  criarClienteGoogleAds as _criarClienteGoogleAds,
  type ClienteGoogleAds,
  type CredsGoogleAds,
} from './client'
import { criarClienteHubBroker as _criarClienteHubBroker } from './hub-broker'
import { getSetting as _getSetting } from '@/data/settings'
import { getSecret as _getSecret } from '@/server/secrets'
import { getHubUrl } from '@/server/hub/client'


export interface ResolverDeps {
  lerCredenciaisImpl?: () => Promise<CredsGoogleAds | null>
  criarClienteLocalImpl?: (creds: CredsGoogleAds, deps?: { fetch?: typeof fetch }) => ClienteGoogleAds
  criarClienteBrokerImpl?: (
    cfg: { hubUrl: string; licenseKey: string; customerId: string },
    deps?: { fetch?: typeof fetch },
  ) => ClienteGoogleAds
  getSettingImpl?: (key: string) => Promise<string | null>
  getSecretImpl?: (key: string) => Promise<string | null>
  hubUrl?: string
  fetchImpl?: typeof fetch
}

export interface ClienteResolvido {
  cliente: ClienteGoogleAds
  customerId: string
  fonte: 'local' | 'hub'
}


export async function resolverClienteGoogleAds(deps: ResolverDeps = {}): Promise<ClienteResolvido | null> {
  const lerCredenciais = deps.lerCredenciaisImpl ?? _lerCredenciais
  const criarClienteLocal = deps.criarClienteLocalImpl ?? _criarClienteGoogleAds
  const criarClienteBroker = deps.criarClienteBrokerImpl ?? _criarClienteHubBroker
  const getSetting = deps.getSettingImpl ?? _getSetting
  const getSecret = deps.getSecretImpl ?? _getSecret
  const hubUrl = deps.hubUrl ?? getHubUrl()
  const fetchImpl = deps.fetchImpl

  
  const creds = await lerCredenciais()
  if (creds) {
    return {
      cliente: criarClienteLocal(creds, { fetch: fetchImpl }),
      customerId: creds.customerId,
      fonte: 'local',
    }
  }

  
  const [conectado, customerId, licenseKey] = await Promise.all([
    getSetting('google_ads_conectado'),
    getSetting('google_ads_customer_id'),
    getSecret('license_key'),
  ])

  if (conectado === 'true' && customerId && licenseKey) {
    return {
      cliente: criarClienteBroker({ hubUrl, licenseKey, customerId }, { fetch: fetchImpl }),
      customerId,
      fonte: 'hub',
    }
  }

  return null
}
