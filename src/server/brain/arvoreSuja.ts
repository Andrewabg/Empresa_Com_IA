
import { spawnSync } from 'node:child_process'
import simpleGit from 'simple-git'


const TETO_PADRAO_MS = 20_000


export function temMudancaNaoCommitada(dir: string): boolean {
  try {
    const saida = execGitStatus(dir)
    return saida.trim().length > 0
  } catch {
    
    return false
  }
}


function execGitStatus(dir: string): string {
  
  
  const r = spawnSync('git', ['-C', dir, 'status', '--porcelain', '--untracked-files=no'], {
    encoding: 'utf8',
    windowsHide: true,
  })
  if (r.status !== 0) throw new Error(r.stderr || 'git status falhou')
  return r.stdout ?? ''
}


export type CuraDaArvore = 'nada' | 'curado' | 'reclonar'


export interface CuraDaArvoreDeps {
  
  rodar?: (comando: string[]) => Promise<unknown>
  
  temSujeira?: () => boolean
}


export async function curarArvoreSuja(
  dir: string,
  timeoutMs = TETO_PADRAO_MS,
  deps: CuraDaArvoreDeps = {},
): Promise<CuraDaArvore> {
  const temSujeira = deps.temSujeira ?? (() => temMudancaNaoCommitada(dir))
  const rodar = deps.rodar ?? ((comando: string[]) => simpleGit(dir, { timeout: { block: timeoutMs } }).raw(comando))
  if (!temSujeira()) return 'nada'
  try {
    
    
    await rodar(['reset', '--hard'])
  } catch (err) {
    console.warn('[arvoreSuja] "git reset --hard" não passou:', err instanceof Error ? err.message : err)
  }
  if (!temSujeira()) {
    console.warn('[arvoreSuja] mudança não commitada encontrada no clone do Cérebro e descartada; o clone voltou ao HEAD.')
    return 'curado'
  }
  console.warn('[arvoreSuja] a mudança não commitada sobreviveu ao reset; o clone precisa ser refeito.')
  return 'reclonar'
}
