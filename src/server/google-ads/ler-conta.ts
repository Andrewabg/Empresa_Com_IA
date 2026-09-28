





import type { RaioXInput } from '@/lib/google-ads/raio-x'
import type { Ficha } from '@/lib/google-ads/ficha'
import type { ClienteGoogleAds } from './client'
import { querySearchTerms } from '@/lib/google-ads/gaql'
import {
  queryConversionActions,
  queryAnunciosReprovados,
  queryNegativas,
  queryGruposStag,
  queryCustomerInfo,
  parseConversionActions,
  parseAnunciosReprovados,
  parseNegativas,
  parseGruposStag,
  parseNomeConta,
  montarSnapshot,
} from './snapshot'

export interface LerContaRealResult {
  input: RaioXInput
  
  negocio: string
  
  contaAtiva: boolean
}

export interface LerContaRealDeps {
  cliente: ClienteGoogleAds
  
  ficha: Ficha | null
}


export async function lerContaReal(deps: LerContaRealDeps): Promise<LerContaRealResult | null> {
  const { cliente, ficha } = deps

  const [rConv, rReprov, rNeg, rStag, rCust, rTerms] = await Promise.all([
    cliente.searchStreamRaw(queryConversionActions()),
    cliente.searchStreamRaw(queryAnunciosReprovados()),
    cliente.searchStreamRaw(queryNegativas()),
    cliente.searchStreamRaw(queryGruposStag()),
    cliente.searchStreamRaw(queryCustomerInfo()),
    cliente.searchStreamTerms(querySearchTerms('LAST_30_DAYS')),
  ])

  
  if (rConv.estado !== 'conectado') return null

  const conta = montarSnapshot({
    conversionActions: parseConversionActions(rConv.batches),
    anunciosReprovados: parseAnunciosReprovados(rReprov.batches),
    negativas: parseNegativas(rNeg.batches),
    gruposStag: parseGruposStag(rStag.batches),
  })

  const searchTerms = rTerms.estado === 'conectado' ? rTerms.linhas : []
  const negocio = parseNomeConta(rCust.batches) || 'sua conta de Google Ads'
  const cpaTeto = ficha?.cpaTetoRealista ?? null
  const contaAtiva = searchTerms.some((t) => t.clicks > 0)

  const input: RaioXInput = {
    conta,
    searchTerms,
    pacing: null,
    cpaTeto,
  }
  return { input, negocio, contaAtiva }
}
