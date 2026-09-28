



import { casarPalavraChave, automacaoMudaPorPalavras } from '@/lib/instagram/palavraChave'
import {
  listAutomacoesAtivasPorMidia as listAutomacoesDefault,
  listPassos as listPassosDefault,
  criarRun as criarRunDefault,
  incrementarContador as incrementarDefault,
  type IgOrigem,
} from '@/data/igAutomacoes'
import { agendarJobIg as agendarJobDefault } from '@/data/igJobs'
import { ligarComentarioAoRun as ligarComentarioDefault } from '@/data/igComentarios'
import { recordEvent as recordEventDefault } from '@/data/events'
import {
  TEXTOS_GATILHO_IG, legendaAutomacaoFalhou, legendaPalavraForaDoTeto,
} from '@/lib/instagram/copyGatilho'
import { runIgJob } from './runtime'

export interface DispararInput {
  canalId: string
  midiaId: string
  origem: IgOrigem
  
  origemId: string
  
  comentarioId?: string | null
  igUserId: string
  igUsername: string | null
  texto: string
  agoraIso: string
}

export interface DispararDeps {
  listAutomacoes?: typeof listAutomacoesDefault
  listPassos?: typeof listPassosDefault
  criarRun?: typeof criarRunDefault
  agendarJob?: typeof agendarJobDefault
  incrementar?: typeof incrementarDefault
  ligarComentario?: typeof ligarComentarioDefault
  
  registrarEvento?: typeof recordEventDefault
  
  fire?: (jobId: string) => void
}


function diaDe(agoraIso: string): string {
  return agoraIso.slice(0, 10)
}


async function rastro(
  aut: { id: string; agent_id?: string | null },
  label: string,
  prefixo: string,
  agoraIso: string,
  registrarEvento: typeof recordEventDefault = recordEventDefault,
): Promise<void> {
  try {
    await registrarEvento({
      id: `${prefixo}:${aut.id}:${diaDe(agoraIso)}`,
      type: 'action',
      label,
      ...(aut.agent_id ? { agent: aut.agent_id } : {}),
    })
  } catch (err) {
    console.warn('[instagram/executar] rastro da automação falhou (fail-open):', aut.id, err)
  }
}

export async function dispararPorComentario(
  input: DispararInput,
  deps: DispararDeps = {},
): Promise<{ runsCriados: number }> {
  const listAutomacoes = deps.listAutomacoes ?? listAutomacoesDefault
  const listPassos = deps.listPassos ?? listPassosDefault
  const criarRun = deps.criarRun ?? criarRunDefault
  const agendarJob = deps.agendarJob ?? agendarJobDefault
  const incrementar = deps.incrementar ?? incrementarDefault
  const ligarComentario = deps.ligarComentario ?? ligarComentarioDefault
  const registrarEvento = deps.registrarEvento ?? recordEventDefault
  const fire = deps.fire ?? ((jobId: string) => { void runIgJob(jobId) })

  
  
  
  
  let automacoes: Awaited<ReturnType<typeof listAutomacoes>>
  try {
    automacoes = await listAutomacoes(input.canalId, input.midiaId)
  } catch (e) {
    console.warn('[instagram/executar] consulta de automações falhou:', input.midiaId, e)
    try {
      await registrarEvento({
        
        
        
        id: `ig_sem_consulta:${input.canalId}:${diaDe(input.agoraIso)}`,
        type: 'action',
        label: TEXTOS_GATILHO_IG.eventoNaoConsultou,
      })
    } catch (err) {
      console.warn('[instagram/executar] rastro da consulta falhou (fail-open):', err)
    }
    return { runsCriados: 0 }
  }
  let runsCriados = 0

  for (const aut of automacoes) {
    try {
      
      
      const palavra = aut.palavras.length === 0
        ? null
        : casarPalavraChave(input.texto, aut.palavras, aut.modo_casamento)
      if (aut.palavras.length > 0 && palavra === null) {
        
        
        
        
        
        
        
        
        
        if (automacaoMudaPorPalavras(aut.palavras)) {
          await rastro(aut, legendaPalavraForaDoTeto(aut.nome ?? ''), 'ig_palavra_fora_do_teto', input.agoraIso, registrarEvento)
        }
        continue
      }

      
      
      const passos = await listPassos(aut.id)
      if (passos.length === 0) continue

      const run = await criarRun({
        automacaoId: aut.id,
        canalId: input.canalId,
        origem: input.origem,
        origemId: input.origemId,
        igUserId: input.igUserId,
        igUsername: input.igUsername,
        textoOrigem: input.texto,
        palavraCasada: palavra,
      })
      if (!run) continue 

      
      
      
      const { jobId } = await agendarJob(run.id, 0, input.agoraIso)

      
      
      
      fire(jobId)

      
      
      
      try {
        await incrementar(aut.id, 'disparos')
      } catch (e) {
        console.warn('[instagram/executar] contador de disparos falhou (não-fatal):', aut.id, e)
      }

      
      
      
      
      
      if (input.comentarioId && runsCriados === 0) {
        try {
          await ligarComentario(input.comentarioId, run.id)
        } catch (e) {
          console.warn('[instagram/executar] elo comentário para run falhou (não-fatal):', input.comentarioId, e)
        }
      }
      runsCriados++
    } catch (e) {
      
      console.warn('[instagram/executar] automação fail-open:', aut.id, e)
      
      
      
      await rastro(aut, legendaAutomacaoFalhou(aut.nome ?? ''), 'ig_automacao_falhou', input.agoraIso, registrarEvento)
    }
  }

  return { runsCriados }
}
