

import type { Ficha } from '@/lib/google-ads/ficha'
import { mergeAccountMemory, type AccountMemory } from '@/lib/trafego/accountMemory'
import { getAccountMemory as _getAccountMemory, upsertAccountMemory as _upsertAccountMemory } from '@/data/accountMemory'





export interface FichaStoreDeps {
  
  getAccountMemory: (operatorId: string, accountId: string) => Promise<AccountMemory>
  
  upsertAccountMemory: (operatorId: string, accountId: string, mem: AccountMemory) => Promise<void>
  
  agora: () => string
}


export const defaultDeps: FichaStoreDeps = {
  getAccountMemory: _getAccountMemory,
  upsertAccountMemory: _upsertAccountMemory,
  agora: () => new Date().toISOString(),
}






export async function getFichaGoogle(
  operatorId: string,
  accountId: string,
  deps: FichaStoreDeps = defaultDeps,
): Promise<Ficha | null> {
  const mem = await deps.getAccountMemory(operatorId, accountId)
  return mem.perfil.fichaGoogle ?? null
}






export async function salvarFichaGoogle(
  operatorId: string,
  accountId: string,
  ficha: Ficha,
  deps: FichaStoreDeps = defaultDeps,
): Promise<void> {
  const mem = await deps.getAccountMemory(operatorId, accountId)
  const atualizada = mergeAccountMemory(mem, { fichaGoogle: ficha }, { origem: 'gael', at: deps.agora() })
  await deps.upsertAccountMemory(operatorId, accountId, atualizada)
}






export async function registrarDecisao(
  operatorId: string,
  accountId: string,
  texto: string,
  deps: FichaStoreDeps = defaultDeps,
): Promise<void> {
  const mem = await deps.getAccountMemory(operatorId, accountId)
  const atualizada = mergeAccountMemory(mem, { aprendizados: [texto] }, { origem: 'gael', at: deps.agora() })
  await deps.upsertAccountMemory(operatorId, accountId, atualizada)
}
