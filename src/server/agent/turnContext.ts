
import { AsyncLocalStorage } from 'node:async_hooks'
import type { PainelBlocoPatch } from '@/lib/trafego/types'
import type { EstudioPatch } from '@/lib/estudio/types'
import type { JuridicoPatch } from '@/lib/juridico/types'
import type { Papel } from '@/lib/equipe'
import type { RecusaDeAtoDeDono } from '@/lib/turno/papelDoTurno'
import type { NotaCitada } from '../tools/buscarCerebro'
import type { Bancada } from '@/lib/bancada/tipos'
import type { Investigacao } from '@/lib/trafego/graph/investigacao'

export interface TurnContext {
  conversationId?: string | null
  
  conversaExternaId?: string | null
  actingAgentId?: string
  operatorId?: string
  
  papel?: Papel
  
  terceiroIngerido?: boolean
  
  leuTerceiro?: boolean
  
  recusasSemPessoa?: RecusaDeAtoDeDono[]
  
  taskId?: string
  
  falaDoDono?: string
  
  falasDoDono?: readonly string[]
  
  campanhaId?: string
  planoIndex?: number
  
  origemSolicitante?: string
  
  painelSink?: PainelBlocoPatch[]
  
  estudioSink?: EstudioPatch[]
  
  juridicoSink?: JuridicoPatch[]
  
  citationsSink?: NotaCitada[]
  
  bancada?: Bancada
  
  investigacao?: Investigacao
}

const storage = new AsyncLocalStorage<TurnContext>()


export function runWithTurnContext<T>(ctx: TurnContext, fn: () => Promise<T>): Promise<T> {
  const pai = storage.getStore()
  const terceiroIngerido = ctx.terceiroIngerido === true || pai?.terceiroIngerido === true
  const leuTerceiro = ctx.leuTerceiro === true || pai?.leuTerceiro === true
  return storage.run({ ...ctx, terceiroIngerido, ...(leuTerceiro ? { leuTerceiro } : {}) }, fn)
}

export function getTurnContext(): TurnContext {
  return storage.getStore() ?? {}
}


export function falasDoDonoDoTurno(): readonly string[] {
  const ctx = getTurnContext()
  if (ctx.falasDoDono?.length) return ctx.falasDoDono
  return ctx.falaDoDono ? [ctx.falaDoDono] : []
}


export function marcarTerceiroIngerido(): void {
  const atual = storage.getStore()
  if (atual) atual.terceiroIngerido = true
}


export function marcarLeuTerceiro(): void {
  const atual = storage.getStore()
  if (atual) atual.leuTerceiro = true
}


export function execucaoLeuTerceiro(): boolean {
  const atual = storage.getStore()
  return atual?.terceiroIngerido === true || atual?.leuTerceiro === true
}
