
import { readLicenseCache } from '@/server/license/cache'
import { getLicenseState, lojaLiberada } from '@/lib/license-state'


export async function criacaoSobMedidaLiberada(): Promise<boolean> {
  return lojaLiberada(getLicenseState(await readLicenseCache(), Date.now()))
}
