









import { getSetting as defaultGetSetting, setSetting as defaultSetSetting } from '@/data/settings'
import {
  parseFatos,
  serializeFatos,
  upsertFato,
  upsertFatoSemRebaixar,
  removerFato,
  type FatoEmpresa,
  CAP_FATOS,
} from '@/lib/memory/fichaEmpresa'





export const FICHA_SETTING_KEY = 'company_facts'





export interface FichaDeps {
  getSetting?: (key: string) => Promise<string | null>
  setSetting?: (key: string, value: string) => Promise<void>
}

function resolveDeps(deps?: FichaDeps) {
  return {
    get: deps?.getSetting ?? defaultGetSetting,
    set: deps?.setSetting ?? defaultSetSetting,
  }
}











let fichaWriteLock: Promise<unknown> = Promise.resolve()
function withFichaLock<T>(fn: () => Promise<T>): Promise<T> {
  
  const resultado = fichaWriteLock.then(fn, fn)
  
  fichaWriteLock = resultado.then(
    () => undefined,
    () => undefined,
  )
  return resultado
}






async function lerFatosStrict(deps?: FichaDeps): Promise<FatoEmpresa[]> {
  const { get } = resolveDeps(deps)
  return parseFatos(await get(FICHA_SETTING_KEY))
}


export async function getFichaEmpresa(deps?: FichaDeps): Promise<FatoEmpresa[]> {
  try {
    return await lerFatosStrict(deps)
  } catch {
    return []
  }
}


export async function saveFichaEmpresa(fatos: FatoEmpresa[], deps?: FichaDeps): Promise<void> {
  const { set } = resolveDeps(deps)
  await set(FICHA_SETTING_KEY, serializeFatos(fatos))
  invalidateFichaEmpresaCache()
}


export async function upsertFatoEmpresa(fato: FatoEmpresa, deps?: FichaDeps): Promise<void> {
  
  return withFichaLock(async () => {
    const atual = await lerFatosStrict(deps)
    const atualizado = upsertFato(atual, fato, { cap: CAP_FATOS })
    await saveFichaEmpresa(atualizado, deps)
  })
}


export async function upsertFatoEmpresaSemRebaixar(fato: FatoEmpresa, deps?: FichaDeps): Promise<void> {
  return withFichaLock(async () => {
    const atual = await lerFatosStrict(deps)
    const atualizado = upsertFatoSemRebaixar(atual, fato, { cap: CAP_FATOS })
    if (atualizado === atual) return 
    await saveFichaEmpresa(atualizado, deps)
  })
}


export async function removerFatoEmpresa(id: string, deps?: FichaDeps): Promise<void> {
  return withFichaLock(async () => {
    const atual = await lerFatosStrict(deps)
    const atualizado = removerFato(atual, id)
    await saveFichaEmpresa(atualizado, deps)
  })
}


export function invalidateFichaEmpresaCache(): void {
  
}
