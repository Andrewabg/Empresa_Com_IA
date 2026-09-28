




export const MIN_IMPRESSOES_ASSET = 1000

export const MARGEM_PIOR = 0.20

export const MIN_RSA_BOAS = 2

export type VeredictoAsset = 'coletando' | 'manter' | 'substituir'
export interface AssetPerf {
  impressoes: number
  cliques: number
}


export function avaliarAsset(asset: AssetPerf, baselineCtr: number): VeredictoAsset {
  if (asset.impressoes < MIN_IMPRESSOES_ASSET) return 'coletando'
  if (baselineCtr <= 0) return 'manter'
  const ctr = asset.cliques / asset.impressoes
  if (ctr <= baselineCtr * (1 - MARGEM_PIOR)) return 'substituir'
  return 'manter'
}


export function precisaMaisRsa(qtdRsaBoas: number): boolean {
  return qtdRsaBoas < MIN_RSA_BOAS
}
