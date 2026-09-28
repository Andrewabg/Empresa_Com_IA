
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import simpleGit from 'simple-git'


const MARCAS_DE_REBASE = ['rebase-merge', 'rebase-apply'] as const


const TETO_PADRAO_MS = 20_000


export function temRebaseEmCurso(dir: string): boolean {
  return MARCAS_DE_REBASE.some((marca) => existsSync(join(dir, '.git', marca)))
}


export type CuraDoRebase = 'nada' | 'curado' | 'reclonar'


export interface CuraDeps {
  
  rodar?: (comando: string[]) => Promise<unknown>
  
  temMarca?: () => boolean
}


export async function curarRebaseTravado(
  dir: string,
  timeoutMs = TETO_PADRAO_MS,
  deps: CuraDeps = {},
): Promise<CuraDoRebase> {
  const temMarca = deps.temMarca ?? (() => temRebaseEmCurso(dir))
  const rodar = deps.rodar ?? ((comando: string[]) => simpleGit(dir, { timeout: { block: timeoutMs } }).raw(comando))
  if (!temMarca()) return 'nada'
  
  
  for (const comando of [['rebase', '--abort'], ['am', '--abort']]) {
    try {
      await rodar(comando)
    } catch (err) {
      console.warn(`[rebaseTravado] "git ${comando.join(' ')}" não passou:`, err instanceof Error ? err.message : err)
    }
    if (!temMarca()) {
      console.warn('[rebaseTravado] rebase interrompido encontrado no clone do Cérebro e abortado.')
      return 'curado'
    }
  }
  console.warn('[rebaseTravado] a marca de rebase sobreviveu ao abort; o clone precisa ser refeito.')
  return 'reclonar'
}
