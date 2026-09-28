import { timingSafeEqual } from 'node:crypto'
import { runPromocaoPorUso, resultadoVazioDaPromocao } from '@/server/memory/promocaoHeartbeat'
import { podarSinalAntesDe } from '@/data/sinalDeUso'
import { corteDaPodaDoSinal } from '@/lib/memory/sinalDeUso'
import { fusoDoDonoMemoizado } from '@/server/config/fusoDoDonoMemo'
import { getSecret, SECRET_KEYS } from '@/server/secrets'
import { runHeartbeat } from '@/server/agent/executor/heartbeat'
import { runMemoryHeartbeat } from '@/server/memory/memoryHeartbeat'
import { drenarCandidatas } from '@/server/memory/drenarCandidatas'
import { runLicenseHeartbeat } from '@/server/license/heartbeat'
import { fetchCatalog } from '@/server/hub/catalog'
import { hydrateToolkitRegistry } from '@/server/config/toolkitRegistry'
import { backfillFicha, type BackfillFichaResult } from '@/server/onboarding/backfillFicha'
import { runAtendimentoHeartbeat } from '@/server/canais/heartbeat'
import { runProativoHeartbeat } from '@/server/proativo/dispatcher'
import { runVigilanciaTrafego } from '@/server/proativo/vigilanciaTrafego'
import { runVigilanciaPrazos } from '@/server/proativo/vigilanciaPrazos'
import { runVigilanciaDeclarada } from '@/server/proativo/vigilanciaDeclarada'
import { runAtribuicaoHeartbeat } from '@/server/memory/runAtribuicaoHeartbeat'
import { runImportHeartbeat } from '@/server/imports/heartbeat'
import { purgeSessoesVelhas } from '@/data/hiringSessions'
import { podarTransicoes } from '@/data/taskTransitions'
import { podarNotificacoesVelhas } from '@/data/notificacoes'
import { podarLembretesVelhos } from '@/data/lembretes'
import { anonimizarCustomEnviosVelhos } from '@/data/customEnvios'
import { runBrainReconcileHeartbeat, type BrainReconcileResult } from '@/server/brain/heartbeatReconcile'
import { runReindexHeartbeat, type ReindexHeartbeatResult } from '@/server/brain/reindex'
import { runBrainSyncHealth, type BrainSyncResult } from '@/server/brain/brainSyncHealth'
import { reembedEpisodicHeartbeat, type ReembedResult } from '@/server/memory/reembedEpisodic'
import { reembedBaseHeartbeat, type ReembedBaseResult } from '@/server/canais/reembedBase'
import { runTreinoHeartbeat } from '@/server/treino/heartbeat'
import { runRotinasHeartbeat } from '@/server/rotinas/heartbeat'
import { runInstagramHeartbeat, type InstagramHeartbeatResult } from '@/server/instagram/heartbeat'
import { runFontesHeartbeat, type FontesResultado } from '@/server/fontes/heartbeat'
import { runEntregasHeartbeat } from '@/server/entregas/heartbeat'
import { runCustomAutomationHeartbeat } from '@/server/custom/automationHeartbeat'
import { setSetting, getSetting } from '@/data/settings'
import {
  CHAVE_ULTIMO_HEARTBEAT, CHAVE_CONCLUSOES_DOS_BRACOS, mesclarConclusoesDosBracos, type IdDeBraco,
} from '@/lib/saudeDoMotor'
import { insertNotificacao } from '@/data/notificacoes'
import {
  resumoDoLint, acaoDoAvisoDoLint, chaveDeDedupDoLint, serializarResumoDoLint,
  CHAVE_LINT_ALTAS_AVISADAS, CHAVE_LINT_ULTIMO_RESUMO, TIPO_AVISO_LINT_ACERVO,
} from '@/lib/brain/lintDoAcervo'
import { avisarRecusasDeOrigem } from '@/server/brain/candidatasElegiveis'

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export async function POST(request: Request) {
  const secret = await getSecret(SECRET_KEYS.cron_secret)
  if (!secret) return Response.json({ error: 'not_configured' }, { status: 503 })

  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token || !constantTimeEqual(token, secret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    
    
    
    
    
    
    
    const concluidos: Partial<Record<IdDeBraco, string>> = {}
    const concluiu = (id: IdDeBraco) => { concluidos[id] = new Date().toISOString() }
    
    
    
    
    
    
    
    let res: Awaited<ReturnType<typeof runHeartbeat>> = { started: 0, reenqueued: 0, revived: 0 }
    let maestroFalhou = false
    try { res = await runHeartbeat(); concluiu('maestro') } catch (e) { maestroFalhou = true; console.warn('[heartbeat] maestro fail-open:', e) }
    let memory: Awaited<ReturnType<typeof runMemoryHeartbeat>> = { reflectEnqueued: 0, rollupEnqueued: 0, fired: 0, requeued: 0 }
    try { memory = await runMemoryHeartbeat(); concluiu('memoria') } catch (e) { console.warn('[heartbeat] memória fail-open:', e) }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const lintAviso = { altas: 0, medido: false, avisou: false, resincronizou: false, falhou: false }
    try {
      const lint = memory.health?.lint
      if (lint) {
        lintAviso.medido = true
        lintAviso.altas = lint.altas
        
        
        try { await setSetting(CHAVE_LINT_ULTIMO_RESUMO, serializarResumoDoLint(lint, new Date().toISOString())) }
        catch (e) { console.warn('[heartbeat] resumo do lint para o painel fail-open:', e) }

        const bruto = await getSetting(CHAVE_LINT_ALTAS_AVISADAS)
        const jaAvisadas = bruto === null ? null : Number(bruto)
        
        
        const acao = acaoDoAvisoDoLint(lint.altas, jaAvisadas)
        if (acao === 'resincronizar') {
          await setSetting(CHAVE_LINT_ALTAS_AVISADAS, String(lint.altas))
          lintAviso.resincronizou = true
        } else if (acao === 'avisar') {
          const resumo = resumoDoLint(lint)
          if (resumo) {
            const r = await insertNotificacao({
              tipo: TIPO_AVISO_LINT_ACERVO, urgencia: 'imediata',
              titulo: resumo.titulo, corpo: resumo.corpo,
              
              
              
              dedupKey: chaveDeDedupDoLint(lint),
            })
            await setSetting(CHAVE_LINT_ALTAS_AVISADAS, String(lint.altas))
            lintAviso.avisou = r.created
          }
        }
      }
      concluiu('avisoDoLint')
    } catch (e) { lintAviso.falhou = true; console.warn('[heartbeat] aviso do lint do acervo fail-open:', e) }
    
    
    let curadoria: Awaited<ReturnType<typeof drenarCandidatas>> = { drenadas: 0, falhou: false, portaoFalhou: false, recusas: [] }
    try { curadoria = await drenarCandidatas(); concluiu('curadoria') } catch (e) { console.warn('[heartbeat] curadoria fail-open:', e) }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    let origemRecusada: Awaited<ReturnType<typeof avisarRecusasDeOrigem>> = { total: 0, novas: 0, avisou: false, falhou: false }
    try { origemRecusada = await avisarRecusasDeOrigem(); concluiu('origemRecusada') } catch (e) {
      origemRecusada = { total: 0, novas: 0, avisou: false, falhou: true }
      console.warn('[heartbeat] aviso de origem recusada fail-open:', e)
    }
    
    
    
    let promocao = resultadoVazioDaPromocao()
    try { promocao = await runPromocaoPorUso(); concluiu('promocaoPorUso') }
    catch (e) { console.warn('[heartbeat] promoção por uso fail-open:', e) }
    
    
    
    
    
    let fichaBackfill: BackfillFichaResult = { status: 'noop' }
    try { fichaBackfill = await backfillFicha() } catch (e) { console.warn('[heartbeat] backfill da Ficha fail-open:', e) }
    
    
    
    let atendimento = { fired: 0, revived: 0, aposentados: 0, agendados: 0, tocados: 0, saude: 0, podados: 0 }
    try { atendimento = await runAtendimentoHeartbeat(); concluiu('atendimento') } catch (e) { console.warn('[heartbeat] atendimento fail-open:', e) }
    
    
    
    let proativo: Awaited<ReturnType<typeof runProativoHeartbeat>> = { enviadas: 0, seguradas: 0, suprimidas: 0, falhas: 0, bloqueadasPeloTeto: 0, revividas: 0, briefing: 'nao_rodou' }
    try { proativo = await runProativoHeartbeat(); concluiu('proativo') } catch (e) { console.warn('[heartbeat] proativo fail-open:', e) }
    let vigilancia = { operadores: 0, alertados: 0, sincronizados: 0 }
    try { vigilancia = await runVigilanciaTrafego(); concluiu('vigilanciaTrafego') } catch (e) { console.warn('[heartbeat] vigilancia fail-open:', e) }
    
    
    
    
    let prazos = { alertados: 0 }
    try { prazos = await runVigilanciaPrazos(); concluiu('prazos') } catch (e) { console.warn('[heartbeat] prazos fail-open:', e) }

    
    
    let vigiado = { disparados: 0, expiradas: 0 }
    try { vigiado = await runVigilanciaDeclarada(); concluiu('vigiado') } catch (e) { console.warn('[heartbeat] vigiado fail-open:', e) }
    let atribuicao = { operadores: 0, enfileirados: 0 }
    try { atribuicao = await runAtribuicaoHeartbeat(); concluiu('atribuicao') } catch (e) { console.warn('[heartbeat] atribuicao fail-open:', e) }
    
    
    
    let importStatus = { processed: 0, curated: 0 }
    try { importStatus = await runImportHeartbeat(); concluiu('importacao') } catch (e) { console.warn('[heartbeat] import fail-open:', e) }
    let treino = { rodados: 0, refletidos: 0 }
    try { treino = await runTreinoHeartbeat(); concluiu('treino') } catch (e) { console.warn('[heartbeat] treino fail-open:', e) }
    
    
    
    
    let rotinas = { disparadas: 0, puladas: 0, encerradas: 0, falhas: 0 }
    try { rotinas = await runRotinasHeartbeat(); concluiu('rotinas') } catch (e) { console.warn('[heartbeat] rotinas fail-open:', e) }
    
    
    
    
    let instagram: InstagramHeartbeatResult = { disparados: 0, revividos: 0, retomados: 0, desistidos: 0, aposentados: 0, expiradas: 0, conexao: 0 }
    try { instagram = await runInstagramHeartbeat(); concluiu('instagram') } catch (e) { console.warn('[heartbeat] instagram fail-open:', e) }
    
    
    
    let fontes: FontesResultado = { rodadas: 0, escritas: 0, semMudanca: 0, falhas: 0, aguardandoAprovacao: 0 }
    try { fontes = await runFontesHeartbeat(); concluiu('fontes') } catch (e) { console.warn('[heartbeat] fontes fail-open:', e) }
    
    
    let entregas = { conduzidas: 0, artesPedidas: 0 }
    try { entregas = await runEntregasHeartbeat(); concluiu('entregas') } catch (e) { console.warn('[heartbeat] entregas fail-open:', e) }
    
    
    
    let customAutomation = { processados: 0, falhas: 0, rotinasRodadas: 0, revividos: 0, purgados: 0 }
    try { customAutomation = await runCustomAutomationHeartbeat(); concluiu('automacaoCustom') } catch (e) { console.warn('[heartbeat] custom automation fail-open:', e) }
    
    
    
    
    
    
    let brainReconcile: BrainReconcileResult = { status: 'skipped' }
    let reembedEpisodic: ReembedResult = { status: 'skipped' }
    let reembedBase: ReembedBaseResult = { status: 'skipped' }
    let brainSync: BrainSyncResult = { status: 'skipped' }
    let reindex: ReindexHeartbeatResult = { status: 'skipped' }
    
    
    
    
    
    const podas = { notificacoes: 0, lembretes: 0, transicoes: 0, sinalDeUso: 0, customEnviosAnonimizados: 0, notificacoesFalhou: false, lembretesFalhou: false, transicoesFalhou: false, sinalDeUsoFalhou: false, customEnviosAnonimizadosFalhou: false }
    const corteDaPoda = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const settled = await Promise.allSettled([
      (async () => { await runLicenseHeartbeat(); concluiu('licenca') })(),
      (async () => {
        await fetchCatalog()
        await hydrateToolkitRegistry()
        concluiu('catalogo')
      })(),
      
      
      (async () => { await purgeSessoesVelhas(); concluiu('purgaContratacoes') })(),
      
      
      
      (async () => {
        try { podas.transicoes = await podarTransicoes(); concluiu('podaTransicoes') }
        catch (e) { podas.transicoesFalhou = true; console.warn('[heartbeat] poda do livro de transições fail-open:', e) }
      })(),
      
      
      (async () => {
        try {
          const corte = corteDaPodaDoSinal(new Date().toISOString(), await fusoDoDonoMemoizado())
          if (corte) podas.sinalDeUso = await podarSinalAntesDe(corte)
          concluiu('podaSinalDeUso')
        } catch (e) { podas.sinalDeUsoFalhou = true; console.warn('[heartbeat] poda do sinal de uso fail-open:', e) }
      })(),
      
      
      
      
      
      (async () => {
        try { podas.notificacoes = await podarNotificacoesVelhas(corteDaPoda); concluiu('podaNotificacoes') }
        catch (e) { podas.notificacoesFalhou = true; console.warn('[heartbeat] poda da caixa de saída fail-open:', e) }
      })(),
      (async () => {
        try { podas.lembretes = await podarLembretesVelhos(corteDaPoda); concluiu('podaLembretes') }
        catch (e) { podas.lembretesFalhou = true; console.warn('[heartbeat] poda da agenda de lembretes fail-open:', e) }
      })(),
      
      
      
      
      
      (async () => {
        try { podas.customEnviosAnonimizados = await anonimizarCustomEnviosVelhos(corteDaPoda); concluiu('anonimizacaoCustomEnvios') }
        catch (e) { podas.customEnviosAnonimizadosFalhou = true; console.warn('[heartbeat] anonimização dos envios transacionais fail-open:', e) }
      })(),
      
      
      
      (async () => { brainReconcile = await runBrainReconcileHeartbeat(); concluiu('reconcileCerebro') })(),
      
      
      
      (async () => { reembedEpisodic = await reembedEpisodicHeartbeat(); concluiu('reembedEpisodico') })(),
      
      
      
      
      (async () => { reembedBase = await reembedBaseHeartbeat(); concluiu('reembedBase') })(),
      
      
      
      (async () => { brainSync = await runBrainSyncHealth(); concluiu('sincroniaCerebro') })(),
      
      
      
      
      
      (async () => { reindex = await runReindexHeartbeat(); concluiu('reindexCerebro') })(),
    ])
    
    
    for (const r of settled) {
      
      
      
      if (r.status === 'rejected') console.warn('[heartbeat] braço paralelo fail-open:', r.reason)
    }
    
    
    
    
    try {
      const bracosBruto = await getSetting(CHAVE_CONCLUSOES_DOS_BRACOS)
      await setSetting(
        CHAVE_CONCLUSOES_DOS_BRACOS,
        mesclarConclusoesDosBracos(bracosBruto, concluidos, new Date().toISOString()),
      )
    } catch (e) { console.warn('[heartbeat] ponto dos braços fail-open:', e) }
    
    
    
    
    try { await setSetting(CHAVE_ULTIMO_HEARTBEAT, new Date().toISOString()) }
    catch (e) { console.warn('[heartbeat] marca de última passada fail-open:', e) }
    return Response.json({ ok: true, ...res, maestroFalhou, memory, lintAviso, curadoria, origemRecusada, promocao, fichaBackfill, atendimento, proativo, vigilancia, prazos, vigiado, atribuicao, importStatus, treino, rotinas, instagram, fontes, entregas, customAutomation, brainReconcile, reembedEpisodic, reembedBase, brainSync, reindex, podas })
  } catch (err) {
    console.error('[POST /api/heartbeat]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
