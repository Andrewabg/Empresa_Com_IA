
import { chaveSuspeitaDoMotivo } from '@/lib/cerebro/inacessivel'
import type { MotivoFalhaModelo } from '@/lib/modelo/falhaDoModelo'


export type ChaveEssencial = 'openai_api_key' | 'github_token' | 'github_repo'


export type NivelDeDesconfianca = 'warn' | 'conta'


function nivelDoMotivoDoModelo(motivo: string | null | undefined): NivelDeDesconfianca | null {
  const m = motivo as MotivoFalhaModelo | null | undefined
  if (m === 'chave_invalida') return 'warn'
  if (m === 'sem_credito' || m === 'sem_acesso') return 'conta'
  return null
}


export function desconfiancaDaChave(input: {
  chave: ChaveEssencial
  
  motivoCerebro?: string | null
  
  motivoModelo?: string | null
  testadaNestaSessao: boolean
  pareceConectada: boolean
}): NivelDeDesconfianca | null {
  if (!input.pareceConectada || input.testadaNestaSessao) return null
  if (input.chave === 'openai_api_key') return nivelDoMotivoDoModelo(input.motivoModelo)
  return chaveSuspeitaDoMotivo(input.motivoCerebro) === input.chave ? 'warn' : null
}


const VEREDICTOS_POR_CHAVE: Record<ChaveEssencial, readonly string[]> = {
  openai_api_key: ['modelo_alerta'],
  github_token: ['brain_sync_ok', 'brain_sync_motivo'],
  github_repo: ['brain_sync_ok', 'brain_sync_motivo'],
}


export function veredictosAZerar(chavesSalvas: readonly string[]): string[] {
  const fora: string[] = []
  for (const chave of chavesSalvas) {
    for (const v of VEREDICTOS_POR_CHAVE[chave as ChaveEssencial] ?? []) {
      if (!fora.includes(v)) fora.push(v)
    }
  }
  return fora
}
