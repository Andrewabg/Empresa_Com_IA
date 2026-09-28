






import { createHash } from 'node:crypto'
import { proximaExecucao, validarAgenda, type AgendaSpec } from '@/lib/rotinas/agenda'
import { rotear } from '@/lib/fontes/roteamento'
import { mudouMaterialmente } from '@/lib/fontes/mudanca'
import {
  listarConsultasVencidas, claimConsulta, registrarExecucao,
  salvarHashDoAgregado, registrarErroDaFonte, registrarErroDaConsulta,
  sincronizarAlarmeDaFonte, alternarConsulta,
  contarFalhasConsecutivas, reagendarConsulta, podarExecucoesVelhas, type ConsultaRow,
} from '@/data/fontes'
import { listPending } from '@/data/approvals'
import { NotConfiguredError } from '@/server/brain/runtime'
import { withTimeout } from '@/lib/withTimeout'
import { serverDb } from '@/server/supabase'
import { getSecret } from '@/server/secrets'
import { getSetting } from '@/data/settings'
import { readBudgetGate } from '@/data/cost'
import { estourouBudget } from '@/lib/cost-guard'
import { validarTz, TZ_DEFAULT } from '@/server/proativo/dispatcher'
import { adaptadorBanco } from './adaptadores/banco'
import { motivoDaRecusa } from './recusa'
import {
  AVISO_ORCAMENTO_PAUSOU_FONTE, AVISO_DADO_PESSOAL_DESATIVOU_CONSULTA,
  ERRO_CREDENCIAL_AUSENTE, ERRO_NOTA_PATH_NAO_CONFIGURADO, RECUSA_DADO_PESSOAL,
  ERRO_DESTILACAO_FALHOU, ERRO_ESCRITA_NO_CEREBRO, ERRO_CEREBRO_NAO_CONFIGURADO,
  AVISO_NOTA_ESPERA_APROVACAO, AVISO_CONSULTA_CORTADA, RECUSA_NOTA_EDITADA_A_MAO,
  mensagemDeErroDaFonte,
} from '@/lib/fontes/mensagens'
import { RecusaDoNucleo } from './recusaDoNucleo'
import { copyDaFalhaDoModelo } from './erroDoModelo'
import { destilar as destilarReal } from './destilador'
import { escreverNotaViva, notaFoiEditadaAMao } from './notaViva'
import type { Agregado } from '@/lib/fontes/tipos'



export { RecusaDoNucleo } from './recusaDoNucleo'


function falhouPorDadoPessoal(e: unknown): boolean {
  return e instanceof RecusaDoNucleo && e.motivo === 'dado_pessoal'
}


type PassoDaConsulta = 'banco' | 'destilacao' | 'escrita'


function erroParaODono(e: unknown, msg: string, passo: PassoDaConsulta): string {
  if (e instanceof RecusaDoNucleo) return e.message
  
  
  
  
  
  if (passo === 'destilacao') return copyDaFalhaDoModelo(e, ERRO_DESTILACAO_FALHOU)
  if (e instanceof NotConfiguredError) return ERRO_CEREBRO_NAO_CONFIGURADO
  if (passo === 'escrita') return ERRO_ESCRITA_NO_CEREBRO
  return mensagemDeErroDaFonte(msg)
}


export const TETO_DESTILAR_MS = 20_000


export const TETO_ESCREVER_MS = 25_000


const RASTRO_INTERROMPIDO_ANTES_DE_DESTILAR = 'interrompido pelo teto de tempo do tique antes de destilar'
const RASTRO_INTERROMPIDO_ANTES_DE_ESCREVER = 'interrompido pelo teto de tempo do tique antes de escrever'


export const MAX_TENTATIVAS_SEGUIDAS = 3


export const REAGENDAMENTO_RAPIDO_MS = 15 * 60_000


export const TETO_DO_TICK_MS = 60_000

export interface FontesResultado {
  rodadas: number
  escritas: number
  semMudanca: number
  falhas: number
  
  aguardandoAprovacao: number
  
  interrompidoPorTempo?: boolean
  
  orcamentoEstourou?: boolean
}

export interface FontesHeartbeatDeps {
  listarVencidas: (agoraIso: string) => Promise<ConsultaRow[]>
  claim: (id: string, esperada: string, nova: string, agora: string) => Promise<boolean>
  carregarFonte: (id: string) => Promise<{ id: string; tipo: string; secret_ref: string; ativa: boolean } | null>
  lerSegredo: (nome: string) => Promise<string | null>
  obter: (credencial: string, corpo: string) => Promise<Agregado>
  destilar: (rotulo: string, a: Agregado) => Promise<{ corpoDaNota: string; fatos: { rotulo: string; valor: string }[] }>
  escrever: (input: { path: string; titulo: string; corpo: string; fatos: { rotulo: string; valor: string }[] }) => Promise<'salvo' | 'virou_pedido' | 'noop'>
  
  salvarHash: (consultaId: string, hash: string, agregado?: Agregado) => Promise<void>
  registrarExecucao: (input: { consultaId: string; registros: number; mudou: boolean; erro?: string | null }) => Promise<void>
  
  registrarErro: (fonteId: string, erro: string | null) => Promise<void>
  
  registrarErroDaConsulta: (consultaId: string, erro: string | null) => Promise<void>
  
  sincronizarAlarme: (fonteId: string) => Promise<void>
  
  haPrPendente: (notaPath: string) => Promise<boolean>
  
  notaEditadaAMao: (notaPath: string) => Promise<boolean>
  
  alternarConsulta: (id: string, ativa: boolean) => Promise<void>
  
  contarFalhasConsecutivas: (consultaId: string) => Promise<number>
  
  reagendarConsulta: (id: string, novaProximaIso: string) => Promise<void>
  getTz: () => Promise<string>
  now: () => string
  
  checkBudget?: () => Promise<{ spentUsd: number; budgetUsd: number }>
  
  tetoMs?: number
  
  tetoDestilarMs?: number
  
  tetoEscreverMs?: number
  
  agoraMs?: () => number
  
  podarExecucoes?: () => Promise<number>
}



const SEP = '\x1f'

export function hashDoAgregado(a: Agregado): string {
  
  
  const linhas = a.linhas.map((l) => a.colunas.map((c) => String(l[c] ?? '')).join(SEP)).sort()
  return createHash('sha256').update([a.colunas.join(SEP), ...linhas].join('\n')).digest('hex')
}


async function reagendarLogo(d: FontesHeartbeatDeps, consultaId: string): Promise<void> {
  try {
    const nova = new Date(new Date(d.now()).getTime() + REAGENDAMENTO_RAPIDO_MS).toISOString()
    await d.reagendarConsulta(consultaId, nova)
  } catch (e) {
    console.warn('[fontes] reagendamento após corte por tempo falhou (fail-open):', consultaId, e)
  }
}

async function defaultDeps(): Promise<FontesHeartbeatDeps> {
  return {
    listarVencidas: (agora) => listarConsultasVencidas(agora),
    claim: claimConsulta,
    carregarFonte: async (id) => {
      const { data } = await serverDb().from('fontes').select().eq('id', id).maybeSingle()
      return (data ?? null) as { id: string; tipo: string; secret_ref: string; ativa: boolean } | null
    },
    lerSegredo: getSecret,
    obter: (cred, corpo) => adaptadorBanco.obter(cred, corpo),
    destilar: (rotulo, a) => destilarReal(rotulo, a),
    escrever: (input) => escreverNotaViva(input),
    salvarHash: salvarHashDoAgregado,
    registrarExecucao,
    registrarErro: registrarErroDaFonte,
    registrarErroDaConsulta,
    sincronizarAlarme: sincronizarAlarmeDaFonte,
    
    
    
    haPrPendente: async (notaPath) => {
      const pendentes = await listPending().catch(() => [])
      return pendentes.some((a) => a.kind === 'brain_pr' && a.path === notaPath)
    },
    notaEditadaAMao: (notaPath) => notaFoiEditadaAMao(notaPath),
    alternarConsulta,
    contarFalhasConsecutivas,
    reagendarConsulta,
    
    
    
    getTz: async () => validarTz((await getSetting('operator_timezone')) ?? TZ_DEFAULT),
    now: () => new Date().toISOString(),
    podarExecucoes: () => podarExecucoesVelhas(),
  }
}

export async function runFontesHeartbeat(deps?: FontesHeartbeatDeps): Promise<FontesResultado> {
  const d = deps ?? (await defaultDeps())
  const out: FontesResultado = { rodadas: 0, escritas: 0, semMudanca: 0, falhas: 0, aguardandoAprovacao: 0 }
  const tetoMs = d.tetoMs ?? TETO_DO_TICK_MS
  const tetoDestilarMs = d.tetoDestilarMs ?? TETO_DESTILAR_MS
  const tetoEscreverMs = d.tetoEscreverMs ?? TETO_ESCREVER_MS
  const agoraMs = d.agoraMs ?? (() => Date.now())

  let vencidas: ConsultaRow[]
  try {
    vencidas = await d.listarVencidas(d.now())
  } catch (e) {
    console.warn('[fontes] leitura fail-open:', e)
    return out
  }
  if (!vencidas.length) return out

  
  
  
  
  
  try {
    const { spentUsd, budgetUsd } = await (d.checkBudget ?? readBudgetGate)()
    if (estourouBudget(spentUsd, budgetUsd)) {
      for (const fonteId of new Set(vencidas.map((c) => c.fonte_id))) {
        await d.registrarErro(fonteId, AVISO_ORCAMENTO_PAUSOU_FONTE).catch(() => {})
      }
      return { ...out, orcamentoEstourou: true }
    }
  } catch (e) {
    console.warn('[fontes] leitura de budget falhou (fail-open, segue):', e)
  }

  
  
  
  const tz = validarTz(await d.getTz().catch(() => TZ_DEFAULT))
  const inicio = agoraMs()
  
  
  const tetoEstourou = () => agoraMs() - inicio >= tetoMs
  
  const cabeNoTique = (custoMs: number) => agoraMs() - inicio + custoMs < tetoMs

  
  
  
  
  
  try {
    await (d.podarExecucoes ?? podarExecucoesVelhas)()
  } catch (e) {
    console.warn('[fontes] poda de fonte_execucoes falhou (fail-open):', e)
  }

  for (const c of vencidas) {
    if (tetoEstourou()) {
      
      
      out.interrompidoPorTempo = true
      console.warn('[fontes] teto de tempo do tique atingido; o resto do lote fica para o próximo.')
      break
    }

    
    
    
    
    if (!c.aprovada_em) continue

    
    
    
    let passo: PassoDaConsulta = 'banco'

    
    const marcarAlarme = async (texto: string) => {
      await d.registrarErroDaConsulta(c.id, texto).catch((e) =>
        console.warn('[fontes] alarme da consulta falhou (não-fatal):', c.id, e))
      await d.registrarErro(c.fonte_id, texto).catch(() => {})
    }

    
    const limparAlarme = async () => {
      await d.registrarErroDaConsulta(c.id, null).catch((e) =>
        console.warn('[fontes] limpar alarme da consulta falhou (não-fatal):', c.id, e))
      await d.sincronizarAlarme(c.fonte_id).catch(() => {})
    }

    
    
    
    
    
    try {
      const agora = d.now()
      const veredito = validarAgenda(c.agenda as AgendaSpec)
      if (!veredito.ok) throw new RecusaDoNucleo(`agenda inválida: ${veredito.erro}`)
      const proxima = proximaExecucao(c.agenda as AgendaSpec, agora, tz)
      if (!(await d.claim(c.id, c.proxima_execucao, proxima, agora))) continue

      out.rodadas++
      const fonte = await d.carregarFonte(c.fonte_id)
      if (!fonte || !fonte.ativa) continue
      const credencial = await d.lerSegredo(fonte.secret_ref)
      if (!credencial) throw new RecusaDoNucleo(ERRO_CREDENCIAL_AUSENTE)

      
      
      
      
      
      
      const recusa = motivoDaRecusa(c.corpo, c.nota_path ?? '')
      
      
      if (recusa) throw new RecusaDoNucleo(recusa, recusa === RECUSA_DADO_PESSOAL ? 'dado_pessoal' : 'configuracao')

      const agregado = await d.obter(credencial, c.corpo)
      const hash = hashDoAgregado(agregado)

      
      const encerrarComAlarmeDaLeitura = agregado.cortado
        ? () => marcarAlarme(AVISO_CONSULTA_CORTADA)
        : limparAlarme

      if (c.ultimo_agregado_hash === hash) {
        out.semMudanca++
        
        
        
        
        await encerrarComAlarmeDaLeitura()
        await d.registrarExecucao({ consultaId: c.id, registros: agregado.linhas.length, mudou: false })
        continue
      }

      
      
      
      
      
      
      
      
      
      if (!mudouMaterialmente(c.ultimo_agregado ?? null, agregado)) {
        out.semMudanca++
        await d.salvarHash(c.id, hash)
        await encerrarComAlarmeDaLeitura()
        await d.registrarExecucao({ consultaId: c.id, registros: agregado.linhas.length, mudou: false })
        continue
      }

      
      
      
      
      
      
      
      
      if (!c.nota_path) {
        throw new RecusaDoNucleo(ERRO_NOTA_PATH_NAO_CONFIGURADO)
      }

      
      
      
      
      
      if (await d.haPrPendente(c.nota_path)) {
        out.aguardandoAprovacao++
        await marcarAlarme(AVISO_NOTA_ESPERA_APROVACAO)
        await d.registrarExecucao({ consultaId: c.id, registros: agregado.linhas.length, mudou: false })
        continue
      }

      
      
      
      
      
      const editadaAMao = await d.notaEditadaAMao(c.nota_path).catch((e) => {
        console.warn('[fontes] leitura da nota antes de destilar falhou (fail-open):', c.id, e)
        return false
      })
      if (editadaAMao) throw new RecusaDoNucleo(RECUSA_NOTA_EDITADA_A_MAO)

      
      
      
      
      
      if (!cabeNoTique(tetoDestilarMs)) {
        out.interrompidoPorTempo = true
        await reagendarLogo(d, c.id)
        await d.registrarExecucao({
          consultaId: c.id, registros: agregado.linhas.length, mudou: false,
          erro: RASTRO_INTERROMPIDO_ANTES_DE_DESTILAR,
        }).catch(() => {})
        console.warn('[fontes] teto de tempo do tique atingido antes de destilar; a consulta foi reagendada.')
        break
      }
      passo = 'destilacao'
      
      
      const destilado = await withTimeout(d.destilar(c.rotulo, agregado), tetoDestilarMs, 'destilar fonte')
      const { paraFicha, paraNota } = rotear(destilado)

      
      
      
      
      
      if (!cabeNoTique(tetoEscreverMs)) {
        out.interrompidoPorTempo = true
        await reagendarLogo(d, c.id)
        await d.registrarExecucao({
          consultaId: c.id, registros: agregado.linhas.length, mudou: false,
          erro: RASTRO_INTERROMPIDO_ANTES_DE_ESCREVER,
        }).catch(() => {})
        console.warn('[fontes] teto de tempo do tique atingido antes de escrever; a consulta foi reagendada.')
        break
      }
      passo = 'escrita'
      const resultado = await withTimeout(
        d.escrever({ path: c.nota_path, titulo: c.rotulo, corpo: paraNota, fatos: paraFicha }),
        tetoEscreverMs, 'escrever nota da fonte',
      )
      const comprometido = resultado === 'salvo'

      if (comprometido) {
        await d.salvarHash(c.id, hash, agregado)
        out.escritas++
      }
      
      
      
      
      if (resultado === 'virou_pedido') await marcarAlarme(AVISO_NOTA_ESPERA_APROVACAO)
      else await encerrarComAlarmeDaLeitura()
      await d.registrarExecucao({ consultaId: c.id, registros: agregado.linhas.length, mudou: comprometido })
    } catch (e) {
      out.falhas++
      const msg = e instanceof Error ? e.message : String(e)

      
      
      
      
      
      
      
      if (falhouPorDadoPessoal(e)) {
        await d.alternarConsulta(c.id, false).catch((err) =>
          console.warn('[fontes] desativar consulta por dado pessoal falhou (não-fatal):', c.id, err))
        
        
        
        await marcarAlarme(AVISO_DADO_PESSOAL_DESATIVOU_CONSULTA)
        await d.registrarExecucao({ consultaId: c.id, registros: 0, mudou: false, erro: msg }).catch(() => {})
        console.warn('[fontes] consulta desativada por dado pessoal (fail-open):', c.id)
        continue
      }

      
      
      
      
      
      
      
      
      await marcarAlarme(erroParaODono(e, msg, passo))
      await d.registrarExecucao({ consultaId: c.id, registros: 0, mudou: false, erro: msg }).catch(() => {})
      console.warn('[fontes] consulta falhou (fail-open):', c.id, msg)

      
      
      
      
      
      
      
      
      
      
      try {
        const falhasSeguidas = await d.contarFalhasConsecutivas(c.id)
        if (falhasSeguidas <= MAX_TENTATIVAS_SEGUIDAS) {
          const novaProxima = new Date(new Date(d.now()).getTime() + REAGENDAMENTO_RAPIDO_MS).toISOString()
          await d.reagendarConsulta(c.id, novaProxima)
        }
      } catch (erroDeReagendamento) {
        console.warn(
          '[fontes] reagendamento rápido falhou (fail-open, mantém a próxima ocorrência normal):',
          c.id, erroDeReagendamento,
        )
      }
    }
  }
  return out
}
