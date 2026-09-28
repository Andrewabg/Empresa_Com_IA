import { claimMemoryJob, finishMemoryJob, requeueMemoryJob } from '@/data/memoryJobs'
import { reflectConversation } from './reflector'
import { reflectTaskLearnings } from './reflectTask'
import { reflectAccount as reflectAccountImpl } from './reflectAccount'
import { reflectJuridico as reflectJuridicoImpl } from './reflectJuridico'
import { reflectAtendimento as reflectAtendimentoImpl } from './reflectAtendimento'
import { reflectBrand as reflectBrandImpl } from './reflectBrand'
import { reflectDesign as reflectDesignImpl } from './reflectDesign'
import { reflectPeca as reflectPecaImpl } from './reflectPeca'
import { reflectKit as reflectKitImpl } from './reflectKit'
import { entrevistaCommit as entrevistaCommitImpl } from '@/server/onboarding/entrevistaCommitJob'
import { runAtribuicaoJob as runAtribuicaoJobImpl } from './runAtribuicaoJob'
import { consolidateDay } from './rollup'
import { markReflected as markReflectedImpl } from '@/data/messages'


type ReflectOutcome = { reflected: boolean; error?: boolean; permanent?: boolean }

export interface RunMemoryJobDeps {
  reflect?: (conversationId: string) => Promise<ReflectOutcome>
  reflectTask?: (taskId: string) => Promise<ReflectOutcome>
  reflectAccount?: (ref: string) => Promise<ReflectOutcome>
  reflectJuridico?: (ref: string) => Promise<ReflectOutcome>
  reflectAtendimento?: (ref: string) => Promise<ReflectOutcome>
  reflectBrand?: (ref: string) => Promise<ReflectOutcome>
  reflectDesign?: (ref: string) => Promise<ReflectOutcome>
  reflectPeca?: (ref: string) => Promise<ReflectOutcome>
  reflectKit?: (ref: string) => Promise<ReflectOutcome>
  entrevistaCommit?: (ref: string) => Promise<ReflectOutcome>
  atribuicao?: (ref: string) => Promise<{ medido: boolean }>
  rollup?: () => Promise<void>
  markReflected?: (conversationId: string) => Promise<void>
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}


export async function runMemoryJob(id: string, deps: RunMemoryJobDeps = {}): Promise<void> {
  const reflect = deps.reflect ?? ((cid: string) => reflectConversation(cid))
  const reflectTask = deps.reflectTask ?? ((tid: string) => reflectTaskLearnings(tid))
  const reflectAccount = deps.reflectAccount ?? ((r) => reflectAccountImpl(r))
  const reflectJuridico = deps.reflectJuridico ?? ((r) => reflectJuridicoImpl(r))
  const reflectAtendimento = deps.reflectAtendimento ?? ((r) => reflectAtendimentoImpl(r))
  const reflectBrand = deps.reflectBrand ?? ((r) => reflectBrandImpl(r))
  const reflectDesign = deps.reflectDesign ?? ((r) => reflectDesignImpl(r))
  const reflectPeca = deps.reflectPeca ?? ((r) => reflectPecaImpl(r))
  const reflectKit = deps.reflectKit ?? ((r) => reflectKitImpl(r))
  const entrevistaCommit = deps.entrevistaCommit ?? ((r) => entrevistaCommitImpl(r))
  const atribuicao = deps.atribuicao ?? ((r) => runAtribuicaoJobImpl(r))
  const rollup = deps.rollup ?? (async () => { await consolidateDay() })
  const markReflected = deps.markReflected ?? markReflectedImpl

  const claimed = await claimMemoryJob(id, ['queued'])
  if (!claimed) return 

  let failure: string | null = null
  let permanent = false 
  try {
    if (claimed.kind === 'reflect') {
      const res = await reflect(claimed.ref)
      if (res?.error) { failure = 'reflectConversation retornou error'; permanent = !!res.permanent }
    } else if (claimed.kind === 'reflect_task') {
      const res = await reflectTask(claimed.ref)
      if (res?.error) { failure = 'reflectTaskLearnings retornou error'; permanent = !!res.permanent }
    } else if (claimed.kind === 'reflect_account') {
      const res = await reflectAccount(claimed.ref)
      if (res?.error) { failure = 'reflectAccount retornou error'; permanent = !!res.permanent }
    } else if (claimed.kind === 'reflect_juridico') {
      const res = await reflectJuridico(claimed.ref)
      if (res?.error) { failure = 'reflectJuridico retornou error'; permanent = !!res.permanent }
    } else if (claimed.kind === 'reflect_atendimento') {
      const res = await reflectAtendimento(claimed.ref)
      if (res?.error) { failure = 'reflectAtendimento retornou error'; permanent = !!res.permanent }
    } else if (claimed.kind === 'reflect_brand') {
      const res = await reflectBrand(claimed.ref)
      if (res?.error) { failure = 'reflectBrand retornou error'; permanent = !!res.permanent }
    } else if (claimed.kind === 'reflect_design') {
      const res = await reflectDesign(claimed.ref)
      if (res?.error) { failure = 'reflectDesign retornou error'; permanent = !!res.permanent }
    } else if (claimed.kind === 'reflect_peca') {
      const res = await reflectPeca(claimed.ref)
      if (res?.error) { failure = 'reflectPeca retornou error'; permanent = !!res.permanent }
    } else if (claimed.kind === 'reflect_kit') {
      const res = await reflectKit(claimed.ref)
      if (res?.error) { failure = 'reflectKit retornou error'; permanent = !!res.permanent }
    } else if (claimed.kind === 'entrevista_commit') {
      const res = await entrevistaCommit(claimed.ref)
      if (res?.error) { failure = 'entrevistaCommit retornou error'; permanent = !!res.permanent }
    } else if (claimed.kind === 'attribution') {
      await atribuicao(claimed.ref) 
    } else {
      await rollup()
    }
  } catch (err) {
    failure = msg(err) 
  }

  
  const deadLetter = async (reason: string, attempts: number) => {
    await finishMemoryJob(id, 'dead', reason)
    
    
    
    
    
    
    
    
    
    
    
    
    
    const motivo = permanent ? 'falha permanente' : `falhou ${attempts}x`
    console.warn(`[runMemoryJob] dead-letter: job ${claimed.kind} ${motivo} (ref=${claimed.ref}; motivo=${reason})`)
  }

  try {
    if (!failure) {
      await finishMemoryJob(id, 'done')
      return
    }
    const attempts = claimed.attempts + 1
    
    
    if (permanent || attempts >= claimed.max_attempts) {
      await deadLetter(failure, attempts)
    } else {
      await requeueMemoryJob(id, attempts, failure)
    }
  } catch (err) {
    console.warn('[runMemoryJob] falha ao finalizar/re-enfileirar (cold-requeue recupera):', msg(err))
  }
}
