import { getOrCreateOnboardingSession, saveOnboardingSession } from '@/data/onboardingSession'
import { setSetting, getSetting } from '@/data/settings'
import { classificarPerfil, textoSubstantivo } from '@/lib/onboarding/roteamento'
import { classificarPerfilLLM } from './classificarPerfilLLM'
import { slotsSemente, NOME_EMPRESA_ID, nucleoCoberto, perguntaDoSlot } from '@/lib/onboarding/perfis'
import { semearComFicha } from '@/lib/onboarding/semear'
import { getFichaEmpresa } from '@/data/fichaEmpresa'
import type { FatoEmpresa } from '@/lib/memory/fichaEmpresa'
import { nucleoParaCargos, NUCLEO_BASE } from '@/lib/onboarding/nucleoPorCargo'
import { listAgents } from '@/data/agents'
import {
  proximoSlot,
  entrevistaConcluida,
  trocarStatus,
  podeEspelhar,
  atingiuTetoEspelho,
  contarEspelho,
  progressoNucleo,
  deveLadder,
  contarLadder,
} from '@/lib/onboarding/slots'
import { onboardingDirective } from '@/lib/onboarding/directive'
import { detectarQueroCadastrarEmpresa, detectarNaoTenhoEmpresa } from '@/lib/onboarding/conversao'
import { detectarDrift } from '@/lib/onboarding/aderencia'
import { estabelecerIdentidadeEmpresa } from './estabelecerIdentidade'
import type { Fase, OnboardingSession, Perfil, Slot } from '@/lib/onboarding/types'
import {
  persistirNotaEmpresa,
  contaComoPersistido,
  registrarEntrevista,
  type PersistNotaKind,
  type RegistrarEntrevistaDeps,
  type RegistrarEntrevistaInput,
  type RegistrarEntrevistaResult,
} from './registrarEntrevista'
import { enqueueMemoryJob } from '@/data/memoryJobs'
import { extrairRespostaSlot, type ExtracaoSlot } from './extrairRespostaSlot'
import { gravarFatoDoSlot, type UpsertFato } from './gravarNaFicha'
import { isSnoozed, coverage } from '../interview/coverage'
import { withTimeout } from '@/lib/withTimeout'


export interface ConduzirTurnoDeps {
  detectar: (texto: string) => boolean
  estabelecer: (input: { companyName: string; mission?: string }) => Promise<void>
  lerProvisional: () => Promise<string | null>
  lerCompanyName: () => Promise<string | null>
  classificarPorLLM: (texto: string) => Promise<Perfil | null>
  detectarSemEmpresa: (texto: string) => boolean
  limparProvisional: () => Promise<void>
  
  estaAdiado: () => Promise<boolean>
  
  reprocessar: (session: OnboardingSession) => Promise<OnboardingSession>
  
  nucleoJaCoberto: () => Promise<boolean>
  
  fecharEspelho: (session: OnboardingSession, slot: Slot) => Promise<OnboardingSession>
  
  cargosInstalados: () => Promise<string[]>
  
  lerFichaEmpresa: () => Promise<FatoEmpresa[]>
}


const TETO_REPROCESSAR_MS = 3_000


const TETO_FECHAR_ESPELHO_MS = TETO_REPROCESSAR_MS

const defaultConduzirDeps: ConduzirTurnoDeps = {
  detectar: detectarQueroCadastrarEmpresa,
  estabelecer: estabelecerIdentidadeEmpresa,
  lerProvisional: () => getSetting('company_identity_provisional'),
  lerCompanyName: () => getSetting('company_name'),
  classificarPorLLM: (texto) => classificarPerfilLLM(texto),
  detectarSemEmpresa: detectarNaoTenhoEmpresa,
  limparProvisional: () => setSetting('company_identity_provisional', 'false'),
  estaAdiado: () => isSnoozed(),
  reprocessar: reprocessarPendentes,
  fecharEspelho: fecharPorTetoEspelho,
  nucleoJaCoberto: async () => nucleoCoberto((await coverage()).covered),
  cargosInstalados: async () => (await listAgents()).filter((a) => a.enabled).map((a) => a.id),
  lerFichaEmpresa: () => getFichaEmpresa(),
}


async function semeanteComFicha(
  deps: ConduzirTurnoDeps,
  opts: { incluirNome?: boolean; nucleoIds?: readonly string[] },
): Promise<Slot[]> {
  const crus = slotsSemente('tem_empresa', opts)
  try {
    return semearComFicha(crus, await deps.lerFichaEmpresa())
  } catch (err) {
    console.warn('[conduzirTurno] leitura da Ficha falhou (semente crua):', err)
    return crus
  }
}


async function nucleoDoTime(deps: ConduzirTurnoDeps): Promise<string[]> {
  try {
    return nucleoParaCargos(await deps.cargosInstalados())
  } catch (err) {
    console.warn('[conduzirTurno] leitura dos cargos falhou (núcleo cai no base):', err)
    return [...NUCLEO_BASE]
  }
}


async function companyNameVazio(deps: ConduzirTurnoDeps): Promise<boolean | null> {
  try {
    return ((await deps.lerCompanyName()) ?? '').trim() === ''
  } catch {
    return null
  }
}


async function marcarIdentidadeProvisoria(deps: ConduzirTurnoDeps): Promise<void> {
  if ((await companyNameVazio(deps)) !== true) return
  await setSetting('company_identity_provisional', 'true')
}


export interface ResultadoTurno {
  directive?: string          
  needed: boolean             
  fase: Fase
  cobertos: number
  total: number
  
  slotAtivo?: string
  
  recemRoteado?: boolean
}


const FASES_ATIVAS: Fase[] = ['abertura', 'roteamento', 'entrevista']


export async function conduzirTurno(
  args: {
    operatorId: string
    conversationId?: string
    userText?: string
    kickoff: boolean
  },
  deps: ConduzirTurnoDeps = defaultConduzirDeps,
): Promise<ResultadoTurno> {
  try {
    
    let session = await getOrCreateOnboardingSession(args.operatorId, args.conversationId)

    
    
    
    
    let eraProvisional = false
    try {
      eraProvisional = (await deps.lerProvisional()) === 'true'
    } catch {
      eraProvisional = false
    }

    
    
    
    
    
    
    if (eraProvisional && (await companyNameVazio(deps)) === false) {
      try {
        await deps.limparProvisional()
        eraProvisional = false
      } catch (err) {
        console.warn('[conduzirTurno] auto-cura da flag provisória falhou (turno segue):', err)
      }
    }

    
    
    
    
    
    try {
      session = await withTimeout(deps.reprocessar(session), TETO_REPROCESSAR_MS, 'reprocessarPendentes')
    } catch (err) {
      console.warn('[conduzirTurno] retry dos pendentes estourou o teto (a fila durável cobre):', err)
    }

    
    
    
    
    
    
    
    
    if (session.fase === 'adiada') {
      let adiado = true
      try {
        adiado = await deps.estaAdiado()
      } catch (err) {
        console.warn('[conduzirTurno] leitura do relógio do adiamento falhou (segue adiada):', err)
      }
      if (!adiado) {
        
        
        
        
        
        
        
        let jaCoberto = false
        try {
          jaCoberto = await deps.nucleoJaCoberto()
        } catch (err) {
          console.warn('[conduzirTurno] checagem de cobertura do núcleo falhou (ressuscita):', err)
        }
        const entrevistaEmCurso = session.perfil === 'tem_empresa' && session.slots.length > 0
        session = { ...session, fase: jaCoberto ? 'concluida' : entrevistaEmCurso ? 'entrevista' : 'abertura' }
      }
    }

    
    
    
    let recemRoteado = false

    
    const querRotear =
      (session.fase === 'abertura' || session.fase === 'roteamento') &&
      !args.kickoff &&
      !!args.userText &&
      args.userText.trim() !== ''
    if (querRotear) {
      const userText = args.userText as string
      
      
      
      
      
      
      
      let perfil = classificarPerfil(userText)
      if (!perfil && session.perfil == null && textoSubstantivo(userText)) {
        try {
          perfil = (await deps.classificarPorLLM(userText)) ?? 'tem_empresa'
        } catch (err) {
          
          
          console.warn('[conduzirTurno] classificação por LLM falhou (assume tem_empresa):', err)
          perfil = 'tem_empresa'
        }
      }
      if (perfil) {
        const semente = slotsSemente(perfil)
        if (perfil === 'tem_empresa') {
          
          
          
          
          
          const incluirNome = eraProvisional && !(((await deps.lerCompanyName()) ?? '').trim())
          session = {
            ...session,
            perfil,
            slots: await semeanteComFicha(deps, { incluirNome, nucleoIds: await nucleoDoTime(deps) }),
            fase: 'entrevista',
            conversationId: args.conversationId ?? session.conversationId,
          }
          recemRoteado = true
        } else {
          
          
          await marcarIdentidadeProvisoria(deps)
          
          
          
          
          
          const temRoteiro = semente.length > 0
          session = {
            ...session,
            perfil,
            slots: semente,
            fase: temRoteiro ? 'entrevista' : 'concluida',
            conversationId: args.conversationId ?? session.conversationId,
          }
          
          
          if (temRoteiro) recemRoteado = true
        }
      }
    }

    
    
    
    if (
      (session.perfil === 'curioso' || session.perfil === 'sem_empresa') &&
      session.fase === 'abertura' &&
      !args.kickoff &&
      !!args.userText?.trim()
    ) {
      
      
      
      if (session.perfil === 'sem_empresa') {
        const slots = session.slots.length ? session.slots : slotsSemente('sem_empresa')
        session = { ...session, slots, fase: 'entrevista' }
        recemRoteado = true
      } else {
        session = { ...session, fase: 'concluida' }
      }
    }

    
    
    
    
    
    
    
    
    
    
    
    
    if (
      (session.fase === 'concluida' || session.fase === 'entrevista') &&
      (session.perfil === 'curioso' || session.perfil === 'sem_empresa' || session.perfil === 'revendedor') &&
      deps.detectar(args.userText ?? '')
    ) {
      const companyNameVazio = !((await deps.lerCompanyName()) ?? '').trim()
      session = {
        ...session,
        perfil: 'tem_empresa',
        slots: await semeanteComFicha(deps, { incluirNome: companyNameVazio, nucleoIds: await nucleoDoTime(deps) }),
        fase: 'entrevista',
      }
      recemRoteado = true
    }

    
    
    
    
    
    if (
      session.fase === 'entrevista' &&
      session.perfil === 'tem_empresa' &&
      !args.kickoff &&
      deps.detectarSemEmpresa(args.userText ?? '')
    ) {
      await marcarIdentidadeProvisoria(deps)
      session = { ...session, perfil: 'sem_empresa', slots: [], fase: 'concluida' }
    }

    
    
    
    
    
    
    let slot = proximoSlot(session)
    if (session.fase === 'entrevista' && slot && podeEspelhar(slot)) {
      if (atingiuTetoEspelho(slot)) {
        try {
          session = await withTimeout(deps.fecharEspelho(session, slot), TETO_FECHAR_ESPELHO_MS, 'fecharPorTetoEspelho')
        } catch (err) {
          
          
          console.warn('[conduzirTurno] fechamento por teto de re-espelhos falhou (o turno seguinte re-tenta):', err)
        }
      } else {
        session = contarEspelho(session, slot.id)
      }
      slot = proximoSlot(session)
    }

    
    if (session.fase === 'entrevista' && entrevistaConcluida(session)) {
      
      
      
      
      
      
      
      if (eraProvisional && session.perfil === 'tem_empresa') {
        const nomeSlot = session.slots.find((s) => s.id === NOME_EMPRESA_ID)
        const nomeSlotValor = (nomeSlot?.valor ?? '').trim()
        const companyName = nomeSlotValor || ((await deps.lerCompanyName()) ?? '').trim()
        const missionSlot = session.slots.find((s) => s.id === 'o-que-faz')
        const mission = (missionSlot?.valor ?? '').trim() || undefined
        try {
          await deps.estabelecer(mission ? { companyName, mission } : { companyName })
        } catch (err) {
          console.warn('[conduzirTurno] estabelecer identidade na conversão falhou (turno segue):', err)
        }
      }
      session = { ...session, fase: 'concluida', reflectCutpointAt: new Date().toISOString() }
    }

    
    

    
    
    
    
    
    const vaiAprofundar =
      session.fase === 'entrevista' && !!slot && !podeEspelhar(slot) && deveLadder(slot)
    if (vaiAprofundar && slot) session = contarLadder(session, slot.id)

    
    const faseAtiva = FASES_ATIVAS.includes(session.fase)
    const directive = faseAtiva
      ? onboardingDirective(session, slot, { recemRoteado, aprofundar: vaiAprofundar })
      : undefined

    
    const needed = directive !== undefined && directive !== ''

    
    await saveOnboardingSession(session)

    
    const { cobertos, total } = progresso(session)
    
    return { directive, needed, fase: session.fase, cobertos, total, slotAtivo: faseAtiva ? slot?.id : undefined, recemRoteado }
  } catch {
    
    return { needed: false, fase: 'abertura', cobertos: 0, total: 0 }
  }
}


export async function reprocessarPendentes(
  session: OnboardingSession,
  persistir: (topicId: string, conteúdo: string) => Promise<PersistNotaKind> = persistirNotaEmpresa,
  deps: { upsertFato?: UpsertFato; now?: () => string } = {},
): Promise<OnboardingSession> {
  const pendentes = session.slots
    .filter((s) => s.status === 'pendente_commit')
    .map((s) => ({ slot: s, corpo: [s.conteudoPendente, s.valor].find((c) => (c ?? '').trim() !== '') }))
    .filter((p): p is { slot: Slot; corpo: string } => p.corpo !== undefined)
  if (pendentes.length === 0) return session
  let atual = session
  for (const p of pendentes) {
    try {
      const kind = await persistir(p.slot.id, p.corpo)
      if (kind === 'invalido') {
        console.warn('[conduzirTurno] slot com topicId fora da lista publicada — encerrado como adiado:', p.slot.id)
        atual = trocarStatus(atual, p.slot.id, 'adiado', false)
        continue
      }
      if (!contaComoPersistido(kind)) continue
      atual = trocarStatus(atual, p.slot.id, 'coberto', true) 
      
      
      
      const now = deps.now ?? (() => new Date().toISOString())
      await gravarFatoDoSlot({ topicId: p.slot.id, valor: p.slot.valor ?? '', at: now() }, deps.upsertFato)
    } catch {
      
    }
  }
  return atual
}


export async function fecharPorTetoEspelho(
  session: OnboardingSession,
  slot: Slot,
  registrar: (
    input: RegistrarEntrevistaInput,
    deps: RegistrarEntrevistaDeps,
  ) => Promise<RegistrarEntrevistaResult> = registrarEntrevista,
): Promise<OnboardingSession> {
  let atual = session
  
  
  const corpo = [slot.conteudoPendente, slot.valor].find((c) => (c ?? '').trim() !== '') ?? ''
  await registrar(
    {
      operatorId: session.operatorId,
      conversationId: session.conversationId,
      topicId: slot.id,
      conteúdo: corpo,
      valor: (slot.valor ?? '').trim(),
      profundidade: slot.profundidade,
      precisaConfirmar: false,
    },
    {
      getSession: async () => atual,
      saveSession: async (s) => {
        atual = s
      },
      persistirNota: persistirNotaEmpresa,
      enqueue: enqueueMemoryJob,
    },
  )
  return atual
}


function progresso(session: OnboardingSession): { cobertos: number; total: number } {
  return progressoNucleo(session)
}


const TOOL_DA_ENTREVISTA = 'registrarEntrevista'


export type CapturaSemTool = 'capturado' | 'sem_valor' | 'ignorado'


const CAPTURAVEL: Slot['status'][] = ['vazio', 'aguardando_confirmacao']


function slotCapturavel(session: OnboardingSession, slotId: string): boolean {
  const alvo = session.slots.find((s) => s.id === slotId)
  return !!alvo && CAPTURAVEL.includes(alvo.status)
}

export interface CapturarSemToolArgs {
  operatorId: string
  conversationId?: string
  
  slotId: string
  
  userText: string
  
  toolNames?: string[]
}


export interface CapturarSemToolDeps {
  getSession?: (operatorId: string, conversationId?: string) => Promise<OnboardingSession>
  extrair?: (args: { pergunta: string; resposta: string }) => Promise<ExtracaoSlot>
  registrar?: (input: RegistrarEntrevistaInput) => Promise<RegistrarEntrevistaResult>
}


export interface RegistrarAderenciaArgs {
  operatorId: string
  conversationId?: string
  
  slotId: string | null
  
  textoDoTurno: string
}

export interface RegistrarAderenciaDeps {
  getSession?: (operatorId: string, conversationId?: string) => Promise<OnboardingSession>
  saveSession?: (session: OnboardingSession) => Promise<void>
}


export async function registrarAderencia(
  args: RegistrarAderenciaArgs,
  deps: RegistrarAderenciaDeps = {},
): Promise<'sem_desvio' | 'anotado' | 'ignorado'> {
  try {
    if (!args.slotId || !(args.textoDoTurno ?? '').trim()) return 'ignorado'
    const getSession = deps.getSession ?? getOrCreateOnboardingSession
    const session = await getSession(args.operatorId, args.conversationId)
    if (session.fase !== 'entrevista') return 'ignorado'

    const acionaveis = session.slots
      .filter((s) => s.status === 'vazio' || s.status === 'aguardando_confirmacao')
      .map((s) => s.id)
    const desvio = detectarDrift(args.textoDoTurno, args.slotId, acionaveis)
    if ((session.perguntaEmJogo ?? undefined) === (desvio ?? undefined)) return desvio ? 'anotado' : 'sem_desvio'

    const saveSession = deps.saveSession ?? saveOnboardingSession
    const { perguntaEmJogo: _antigo, ...base } = session
    await saveSession(desvio ? { ...base, perguntaEmJogo: desvio } : base)
    return desvio ? 'anotado' : 'sem_desvio'
  } catch (err) {
    console.warn('[registrarAderencia] anotação de aderência falhou (o turno já foi entregue):', err)
    return 'ignorado'
  }
}

export async function capturarSemTool(
  args: CapturarSemToolArgs,
  deps: CapturarSemToolDeps = {},
): Promise<CapturaSemTool> {
  try {
    
    if ((args.toolNames ?? []).includes(TOOL_DA_ENTREVISTA)) return 'ignorado'
    
    
    if (!args.slotId || !textoSubstantivo(args.userText ?? '')) return 'ignorado'

    
    
    const getSession = deps.getSession ?? getOrCreateOnboardingSession
    const session = await getSession(args.operatorId, args.conversationId)
    if (!slotCapturavel(session, args.slotId)) return 'ignorado'

    
    const extrair = deps.extrair ?? extrairRespostaSlot
    const { valor, profundidade } = await extrair({
      pergunta: perguntaDoSlot(args.slotId),
      resposta: args.userText,
    })
    if (!valor || valor.trim() === '') return 'sem_valor'

    
    
    
    
    
    
    if (!slotCapturavel(await getSession(args.operatorId, args.conversationId), args.slotId)) return 'ignorado'

    
    
    
    const registrar = deps.registrar ?? registrarEntrevista
    await registrar({
      operatorId: args.operatorId,
      conversationId: args.conversationId,
      topicId: args.slotId,
      conteúdo: args.userText.trim(),
      valor: valor.trim(),
      profundidade,
      precisaConfirmar: true,
      falaDoDono: args.userText,
    })
    return 'capturado'
  } catch (err) {
    console.warn('[capturarSemTool] rede de segurança falhou (o turno já foi entregue):', err)
    return 'ignorado'
  }
}
