
import { getDirecaoArte as getDirecaoImpl } from '@/data/brandVoice'
import { getBrand as getBrandImpl } from '@/data/brands'
import type { MarcaNaPeca } from './compositor'

export interface LerMarcaDeps {
  getDirecaoArte?: typeof getDirecaoImpl
  getBrand?: typeof getBrandImpl
  baixar?: (artifactId: string) => Promise<Buffer | null>
}

export async function lerMarcaDaPeca(
  ids: { operatorId: string; brandId: string },
  deps: LerMarcaDeps = {},
): Promise<MarcaNaPeca> {
  const getDirecaoArte = deps.getDirecaoArte ?? getDirecaoImpl
  const getBrand = deps.getBrand ?? getBrandImpl
  const baixar = deps.baixar

  const [direcao, brand] = await Promise.all([
    getDirecaoArte(ids.operatorId, ids.brandId).catch(() => null),
    getBrand(ids.operatorId, ids.brandId).catch(() => null),
  ])
  const abrir = (id?: string): Promise<Buffer | null> =>
    id && baixar ? baixar(id).catch(() => null) : Promise.resolve(null)
  const [logo, logoMono] = await Promise.all([
    abrir(direcao?.logoArtifactId),
    abrir(direcao?.logoMonoArtifactId),
  ])
  return { logo, logoMono, nome: brand?.nome ?? null, fonteDeCorpo: direcao?.tipografia?.corpo ?? null }
}
