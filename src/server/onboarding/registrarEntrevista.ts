import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import simpleGit from 'simple-git'
import { getBrain, GIT_IDLE_TIMEOUT_MS } from '@/server/brain/runtime'
import { reconcileResilient } from '@/server/brain/reconcileResilient'
import { NoteWriter } from '@/server/brain/noteWriter'
import { withCloneLock } from '@/server/brain/cloneLock'
import { topicTag, TOPICS } from '@/server/interview/topics'
import { getOrCreateOnboardingSession, saveOnboardingSession } from '@/data/onboardingSession'
import { enqueueMemoryJob, type MemoryJobKind } from '@/data/memoryJobs'
import { aplicarExtracao, proximoSlot } from '@/lib/onboarding/slots'
import { NOME_EMPRESA_ID } from '@/lib/onboarding/perfis'
import { ehTopicoPreEmpresa } from '@/lib/onboarding/preEmpresa'
import { ehTopicoValido, TOPIC_IDS_VALIDOS } from '@/lib/onboarding/topicoValido'
import { motivoSeguro } from '@/lib/sanitizarErro'
import { gravarFatoDoSlot, type UpsertFato } from './gravarNaFicha'
import type { OnboardingSession, Profundidade, SlotStatus } from '@/lib/onboarding/types'


export type PersistNotaKind = 'noop' | 'igual' | 'invalido' | 'commit' | 'pr'


const KINDS_PERSISTIDOS: PersistNotaKind[] = ['commit', 'pr', 'igual']


export function contaComoPersistido(kind: PersistNotaKind): boolean {
  return KINDS_PERSISTIDOS.includes(kind)
}


function lerBytes(abs: string): Buffer | null {
  try {
    return existsSync(abs) ? readFileSync(abs) : null
  } catch {
    return null
  }
}


export async function pathSujoNoGit(dir: string, path: string): Promise<boolean> {
  try {
    const git = simpleGit(dir, { timeout: { block: GIT_IDLE_TIMEOUT_MS } })
    return (await git.status(['--', path])).files.length > 0
  } catch {
    return true
  }
}


export interface PersistirNotaDeps {
  getBrain: typeof getBrain
  reconcile: typeof reconcileResilient
  pathSujo: (dir: string, path: string) => Promise<boolean>
}

const PERSIST_DEPS_PADRAO: PersistirNotaDeps = {
  getBrain,
  reconcile: reconcileResilient,
  pathSujo: pathSujoNoGit,
}


export async function persistirNotaEmpresa(
  topicId: string,
  conteúdo: string,
  deps: PersistirNotaDeps = PERSIST_DEPS_PADRAO,
): Promise<PersistNotaKind> {
  
  
  if (!ehTopicoValido(topicId)) return 'invalido'
  const topic = TOPICS.find((t) => t.id === topicId)
  const label = topic?.label ?? topicId
  const path = `empresa/${topicId}.md`
  
  
  
  
  const brain = await deps.getBrain()
  return withCloneLock(async () => {
    const abs = join(brain.repo.dir, path)
    const antes = lerBytes(abs)
    const writer = new NoteWriter(brain.repo)
    writer.persist({
      mode: 'set',
      body: conteúdo,
      intent: { path, title: label, suggestedTags: [topicTag(topicId)], authorAgent: 'jarvis', confidence: 1, type: 'semantic' },
    })
    const depois = lerBytes(abs)
    
    
    if (antes !== null && depois !== null && antes.equals(depois) && !(await deps.pathSujo(brain.repo.dir, path))) {
      
      
      
      
      
      
      try {
        await deps.reconcile(brain.db, brain.repo, brain.sync, brain.embedder.version())
      } catch (err) {
        console.warn('[persistirNotaEmpresa] reconcile do ramo `igual` falhou (indexação adiada):', motivoSeguro(err))
      }
      return 'igual'
    }
    const result = await brain.committer.commitFile(path, `entrevista: ${label}`)
    if (result.kind === 'commit') {
      await deps.reconcile(brain.db, brain.repo, brain.sync, brain.embedder.version())
    } else if (result.kind === 'pr') {
      
      
      
      
      const { registrarPrDoCerebro } = await import('../brain/aprovacoesDoCerebro')
      await registrarPrDoCerebro({ path, titulo: label, corpo: conteúdo, ref: result.ref })
    }
    return result.kind
  })
}

export interface RegistrarEntrevistaInput {
  operatorId: string
  conversationId?: string
  topicId: string
  conteúdo: string          
  valor: string             
  profundidade: Profundidade
  precisaConfirmar: boolean
  
  falaDoDono?: string
}

export interface RegistrarEntrevistaResult {
  status: 'registrado' | 'pendente_commit' | 'aguardando_confirmacao' | 'topico_invalido'
  slotStatus: SlotStatus
  
  message?: string
}


const MSG_PENDENTE =
  'Guardei a resposta, mas ainda NÃO consegui gravar no Cérebro (falha temporária). ' +
  'Já agendei nova tentativa automática. NÃO diga ao operador que salvou; siga a conversa naturalmente.'


const MSG_FORA_DE_ORDEM =
  'Guardei o valor, mas NÃO o cravei: este não é o tópico que está em jogo. ' +
  'Espelhe-o para o operador em UMA frase e peça a confirmação ("é isso?"). ' +
  'Só depois do "sim" dele chame a tool de novo. NÃO diga que salvou.'


const MSG_TOPICO_INVALIDO =
  'NÃO registrei: o topicId não existe. Refaça a chamada AGORA usando um id da lista válida ' +
  `(${TOPIC_IDS_VALIDOS.join(', ')}). Não peça a informação de novo ao operador e NÃO diga que salvou.`


export interface RegistrarEntrevistaDeps {
  getSession: (operatorId: string, conversationId?: string) => Promise<OnboardingSession>
  saveSession: (session: OnboardingSession) => Promise<void>
  persistirNota: (topicId: string, conteúdo: string) => Promise<PersistNotaKind>
  enqueue: (kind: MemoryJobKind, ref: string) => Promise<{ enqueued: boolean }>
  
  upsertFato?: UpsertFato
  
  now?: () => string
}

const DEPS_PADRAO: RegistrarEntrevistaDeps = {
  getSession: getOrCreateOnboardingSession,
  saveSession: saveOnboardingSession,
  persistirNota: persistirNotaEmpresa,
  enqueue: enqueueMemoryJob,
}


export async function registrarEntrevista(
  input: RegistrarEntrevistaInput,
  deps: RegistrarEntrevistaDeps = DEPS_PADRAO,
): Promise<RegistrarEntrevistaResult> {
  
  
  
  if (!ehTopicoValido(input.topicId)) {
    console.warn('[registrarEntrevista] topicId fora da lista publicada — nada gravado:', input.topicId)
    return { status: 'topico_invalido', slotStatus: 'vazio', message: MSG_TOPICO_INVALIDO }
  }

  const session = await deps.getSession(input.operatorId, input.conversationId)

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const alvo = session.slots.find((s) => s.id === input.topicId)
  const emJogo = proximoSlot(session)?.id
  const foraDeOrdem =
    !input.precisaConfirmar && emJogo !== undefined && emJogo !== input.topicId && alvo?.status === 'vazio'
  const precisaConfirmar = input.precisaConfirmar || foraDeOrdem

  
  
  
  
  
  
  const semNota = input.topicId === NOME_EMPRESA_ID || ehTopicoPreEmpresa(input.topicId)

  
  let persistido = false
  if (!precisaConfirmar) {
    if (semNota) {
      persistido = true 
    } else {
      try {
        persistido = contaComoPersistido(await deps.persistirNota(input.topicId, input.conteúdo))
      } catch (err) {
        
        
        
        
        
        
        console.warn(
          '[registrarEntrevista] escrita no Cérebro falhou (slot fica pendente_commit + retry na fila):',
          motivoSeguro(err),
        )
      }
    }
  }

  const next = aplicarExtracao(session, {
    topicId: input.topicId,
    valor: input.valor,
    conteudo: input.conteúdo,
    profundidade: input.profundidade,
    precisaConfirmar,
    persistido,
    falaDoDono: input.falaDoDono,
  })

  
  
  
  
  await deps.saveSession(next)

  const slotStatus = next.slots.find((s) => s.id === input.topicId)?.status ?? 'vazio'

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  if (slotStatus === 'coberto' || slotStatus === 'pendente_commit') {
    const now = deps.now ?? (() => new Date().toISOString())
    await gravarFatoDoSlot({ topicId: input.topicId, valor: input.valor, at: now() }, deps.upsertFato)
  }

  
  
  
  
  if (!precisaConfirmar && !persistido) {
    try {
      await deps.enqueue('entrevista_commit' as MemoryJobKind, `${input.operatorId}:${input.topicId}`)
    } catch (err) {
      
      
      console.warn('[registrarEntrevista] enfileirar o retry falhou (o turno seguinte re-tenta):', motivoSeguro(err))
    }
  }

  const status: RegistrarEntrevistaResult['status'] = precisaConfirmar
    ? 'aguardando_confirmacao'
    : persistido ? 'registrado' : 'pendente_commit'
  if (status === 'pendente_commit') return { status, slotStatus, message: MSG_PENDENTE }
  
  
  if (foraDeOrdem) return { status, slotStatus, message: MSG_FORA_DE_ORDEM }
  return { status, slotStatus }
}
