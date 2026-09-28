







import { serverDb } from '@/server/supabase'
import { instagramSpec } from '@/server/canais/registry'
import {
  enviarDmIg, instagramAdapter, responderComentario as responderComentarioDefault,
  type DestinoIg, type ConteudoIg,
} from '@/server/canais/providers/instagram'
import { INSTAGRAM_MAX_CHARS, INSTAGRAM_MAX_CHARS_BOTAO } from '@/lib/instagram/limitesDaMeta'
import { interpolar, textoDaRespostaPublica, type VariaveisIg } from '@/lib/instagram/interpolar'
import { TEXTOS_GATILHO_IG, legendaRecusaDesconhecida } from '@/lib/instagram/copyGatilho'
import { BUCKET_MIDIA } from '@/server/canais/media'
import {
  claimJobIg as claimDefault, concluirSeIntacto as concluirDefault,
  finishJobIg as finishDefault, requeueJobIg as requeueDefault,
  tocarHeartbeatJobIg as tocarDefault, devolverJobEncerradoIg as devolverEncerradoDefault,
} from '@/data/igJobs'
import {
  getRun as getRunDefault, getAutomacao as getAutomacaoDefault,
  listPassos as listPassosDefault, atualizarRun as atualizarRunDefault,
  incrementarContador as incrementarDefault, marcarPassoEntregue as marcarEntregueDefault,
  marcarRunEnviando as marcarEnviandoDefault, marcarDesfechoDoRun as marcarDesfechoDefault,
} from '@/data/igAutomacoes'
import { getCanal as getCanalDefault } from '@/data/canais'
import { recordEvent as recordEventDefault } from '@/data/events'
import { BACKOFF_PADRAO_MS, legendaTemMensagemCrua } from '@/lib/canais/erroMeta'


const TTL_URL_S = 3600


export const TIMEOUT_URL_ASSINADA_MS = 20_000


export async function urlAssinadaDaImagem(
  path: string, deps: { db?: typeof serverDb; tetoMs?: number } = {},
): Promise<string | null> {
  const teto = deps.tetoMs ?? TIMEOUT_URL_ASSINADA_MS
  let relogio: ReturnType<typeof setTimeout> | undefined
  try {
    const db = (deps.db ?? serverDb)()
    
    
    
    const desistir = new Promise<null>((r) => { relogio = setTimeout(() => r(null), teto) })
    const assinar = db.storage.from(BUCKET_MIDIA).createSignedUrl(path, TTL_URL_S)
      .then(({ data, error }) => (error || !data?.signedUrl ? null : data.signedUrl))
    const url = await Promise.race([assinar, desistir])
    if (url === null) console.warn('[instagram/runtime] a imagem do passo não ficou pronta a tempo:', path)
    return url
  } catch { return null } finally { if (relogio) clearTimeout(relogio) }
}

export interface RunIgJobDeps {
  claim?: typeof claimDefault
  getRun?: typeof getRunDefault
  getAutomacao?: typeof getAutomacaoDefault
  listPassos?: typeof listPassosDefault
  getCanal?: typeof getCanalDefault
  resolverCreds?: (canalId: string) => Promise<Record<string, string>>
  enviarDm?: typeof enviarDmIg
  responderComentario?: typeof responderComentarioDefault
  agendarJob?: (runId: string, passo: number, naoAntesIso: string) => Promise<{ jobId: string; novo: boolean }>
  concluirSeIntacto?: typeof concluirDefault
  finish?: typeof finishDefault
  requeue?: typeof requeueDefault
  
  devolverEncerrado?: typeof devolverEncerradoDefault
  tocar?: typeof tocarDefault
  atualizarRun?: typeof atualizarRunDefault
  
  marcarEntregue?: typeof marcarEntregueDefault
  
  marcarEnviando?: typeof marcarEnviandoDefault
  
  marcarDesfecho?: typeof marcarDesfechoDefault
  incrementar?: typeof incrementarDefault
  
  registrarEvento?: typeof recordEventDefault
  urlAssinada?: (path: string) => Promise<string | null>
  now?: () => string
  fire?: (jobId: string) => void
}

function maisTarde(agoraIso: string, ms: number): string {
  return new Date(Date.parse(agoraIso) + ms).toISOString()
}


export function partesDoPasso(conteudo: ConteudoIg): ConteudoIg[] {
  const partes: ConteudoIg[] = []
  const botoes = conteudo.botoes && conteudo.botoes.length > 0 ? conteudo.botoes : undefined
  const teto = botoes ? INSTAGRAM_MAX_CHARS_BOTAO : INSTAGRAM_MAX_CHARS
  const pedacos = conteudo.texto ? instagramAdapter.prepararTexto(conteudo.texto, teto) : []
  for (const [i, texto] of pedacos.entries()) {
    partes.push(i === 0 && botoes ? { texto, botoes } : { texto })
  }
  
  
  
  
  
  if (partes.length === 0 && botoes) partes.push({ botoes })
  if (conteudo.imagemUrl) partes.push({ imagemUrl: conteudo.imagemUrl })
  return partes
}


const URL_SO_PARA_CONTAR = 'https://exemplo.invalido/contagem'


export function passoViraVariasMensagens(
  passo: { texto: string | null; imagem_path: string | null; botoes: unknown },
  vars: VariaveisIg,
): boolean {
  const c: ConteudoIg = {}
  if (passo.texto) c.texto = interpolar(passo.texto, vars)
  if (passo.imagem_path) c.imagemUrl = URL_SO_PARA_CONTAR
  if (Array.isArray(passo.botoes) && passo.botoes.length > 0) c.botoes = passo.botoes as ConteudoIg['botoes']
  return partesDoPasso(c).length > 1
}


function legendaDaFalha(acao: string, legendaDoAdapter: string, codigo?: number | null): string {
  
  
  
  
  if (codigo === 190) return TEXTOS_GATILHO_IG.tokenMorto
  if (acao === 'exige_template') return TEXTOS_GATILHO_IG.foraDaJanela
  if (acao === 'avisar_dono') return TEXTOS_GATILHO_IG.bloqueada
  if (acao === 'backoff') return TEXTOS_GATILHO_IG.limiteMeta
  
  
  
  if (legendaTemMensagemCrua(legendaDoAdapter)) return legendaRecusaDesconhecida(codigo ?? null)
  return legendaDoAdapter
}

export async function runIgJob(jobId: string, deps: RunIgJobDeps = {}): Promise<void> {
  
  
  
  
  
  try {
    await executarIgJob(jobId, deps)
  } catch (err) {
    console.warn('[instagram/runtime] runIgJob falhou (backstop do heartbeat recupera):', err)
  }
}

async function executarIgJob(jobId: string, deps: RunIgJobDeps): Promise<void> {
  const claim = deps.claim ?? claimDefault
  const getRun = deps.getRun ?? getRunDefault
  const getAutomacao = deps.getAutomacao ?? getAutomacaoDefault
  const listPassos = deps.listPassos ?? listPassosDefault
  const enviarDm = deps.enviarDm ?? enviarDmIg
  const responder = deps.responderComentario ?? responderComentarioDefault
  const agendarJob = deps.agendarJob ?? (async (r: string, p: number, n: string) => {
    const { agendarJobIg } = await import('@/data/igJobs')
    return agendarJobIg(r, p, n)
  })
  const concluir = deps.concluirSeIntacto ?? concluirDefault
  const finish = deps.finish ?? finishDefault
  const requeue = deps.requeue ?? requeueDefault
  const devolverEncerrado = deps.devolverEncerrado ?? devolverEncerradoDefault
  const tocar = deps.tocar ?? tocarDefault
  const atualizarRun = deps.atualizarRun ?? atualizarRunDefault
  const marcarEntregue = deps.marcarEntregue ?? marcarEntregueDefault
  const marcarEnviando = deps.marcarEnviando ?? marcarEnviandoDefault
  const marcarDesfecho = deps.marcarDesfecho ?? marcarDesfechoDefault
  const incrementar = deps.incrementar ?? incrementarDefault
  const registrarEvento = deps.registrarEvento ?? recordEventDefault
  const urlAssinada = deps.urlAssinada ?? ((p: string) => urlAssinadaDaImagem(p))
  const now = deps.now ?? (() => new Date().toISOString())
  const fire = deps.fire ?? ((id: string) => { void runIgJob(id) })

  
  
  const job = await claim(jobId, ['queued'])
  if (!job) return

  const agora = now()

  try {
    
    
    
    
    
    const run = await getRun(job.run_id)
    if (!run) {
      if (await finish(job.id, 'dead', 'run inexistente', job.claim_id)) {
        await rastroDoFim(`job:${job.id}`, TEXTOS_GATILHO_IG.sumiuDoBanco)
      }
      return
    }
    const automacao = await getAutomacao(run.automacao_id)
    if (!automacao) {
      if (await finish(job.id, 'dead', 'automação inexistente', job.claim_id)) {
        await rastroDoFim(`run:${run.id}`, TEXTOS_GATILHO_IG.sumiuDoBanco)
      }
      return
    }

    const creds = deps.resolverCreds
      ? await deps.resolverCreds(run.canal_id)
      : await instagramSpec.resolverCreds((await (deps.getCanal ?? getCanalDefault)(run.canal_id))!)

    const vars = { usuario: run.ig_username, palavra: run.palavra_casada }
    const passos = await listPassos(run.automacao_id)

    
    
    
    
    
    
    
    
    
    
    
    
    if (!(await tocar(job.id, job.claim_id))) {
      console.warn('[instagram/runtime] job já é de outro runner; parando antes de escrever:', job.id)
      return
    }

    
    if (job.passo === 0) {
      
      
      
      
      
      
      
      
      const publicaJaTentada = run.ultimo_passo_entregue != null
      if (!publicaJaTentada) {
        if (automacao.resposta_publica && automacao.resposta_publica_texto && run.origem === 'comentario') {
          const r = await responder(run.origem_id, textoDaRespostaPublica(automacao.resposta_publica_texto, vars), creds)
          
          
          if (r.ok) await contar(automacao.id, 'respostas_publicas')
          else console.warn('[instagram/runtime] resposta pública falhou:', r.erro)
        }
        try { await marcarEntregue(run.id, 0) }
        catch (e) { console.warn('[instagram/runtime] registro do passo 0 falhou (não-fatal):', e) }
      }
      const primeiro = passos[0]
      if (!primeiro) {
        await desfechoDoRun(run.id, { status: 'falhou', erro_mensagem: TEXTOS_GATILHO_IG.semPassos, concluido_em: agora })
        await finish(job.id, 'dead', TEXTOS_GATILHO_IG.semPassos, job.claim_id)
        await rastroDoFim(`run:${run.id}`, TEXTOS_GATILHO_IG.semPassos, automacao.agent_id)
        return
      }
      await encadear(run.id, primeiro.posicao, maisTarde(agora, primeiro.atraso_s * 1000), job, agora)
      return
    }

    
    
    
    
    
    const passo = passos.find((p) => p.posicao === job.passo)
    if (!passo) {
      
      await pararNoMeio(run.id, TEXTOS_GATILHO_IG.sequenciaMudouNoMeio, job)
      return
    }

    
    
    
    
    if (automacao.status !== 'ativa') {
      await pararNoMeio(run.id, TEXTOS_GATILHO_IG.pausadaNoMeio, job)
      return
    }

    
    
    
    
    
    
    try { await marcarEnviando(run.id) }
    catch (e) { console.warn('[instagram/runtime] marca de "enviando" falhou (não-fatal):', e) }

    
    
    
    
    
    
    
    const primeiraPosicao = passos[0]?.posicao ?? job.passo
    const entregueAte = run.ultimo_passo_entregue
    const essencialJaEntregue = entregueAte != null && job.passo <= entregueAte

    
    
    
    
    
    
    
    
    
    
    if (essencialJaEntregue) {
      console.warn('[instagram/runtime] passo já entregue voltou para a fila; não reenviando:', job.id, job.passo)
      if (!job.passo_completo && passoViraVariasMensagens(passo, vars)) {
        try { await atualizarRun(run.id, { erro_mensagem: TEXTOS_GATILHO_IG.parteExtraIncerta }) }
        catch (e) { console.warn('[instagram/runtime] rastro da parte extra falhou (não-fatal):', e) }
      }
      await seguirParaOProximo(run.id, passos, job, agora)
      return
    }

    
    
    
    
    
    
    
    
    
    
    
    
    
    const primeiroEnvioDoRun = job.passo <= primeiraPosicao
    const destinoDireto: DestinoIg = { tipo: 'usuario', id: run.ig_user_id }
    const destino: DestinoIg = run.origem === 'comentario' && primeiroEnvioDoRun
      ? { tipo: 'comentario', comentarioId: run.origem_id }
      : destinoDireto

    const conteudo: ConteudoIg = {}
    if (passo.texto) conteudo.texto = interpolar(passo.texto, vars)
    if (passo.imagem_path) {
      const url = await urlAssinada(passo.imagem_path)
      
      
      
      
      if (url) {
        conteudo.imagemUrl = url
      } else if (conteudo.texto) {
        
        try { await atualizarRun(run.id, { erro_mensagem: TEXTOS_GATILHO_IG.imagemSemUrl }) }
        catch (e) { console.warn('[instagram/runtime] rastro da imagem sem URL falhou:', e) }
      } else {
        await desfechoDoRun(run.id, { status: 'falhou', erro_mensagem: TEXTOS_GATILHO_IG.passoSoImagemSemUrl, concluido_em: agora })
        await finish(job.id, 'dead', TEXTOS_GATILHO_IG.passoSoImagemSemUrl, job.claim_id)
        await rastroDoFim(`run:${run.id}`, TEXTOS_GATILHO_IG.passoSoImagemSemUrl, automacao.agent_id)
        return
      }
    }
    if (Array.isArray(passo.botoes) && passo.botoes.length > 0) conteudo.botoes = passo.botoes

    
    
    const [essencial, ...acessorios] = partesDoPasso(conteudo)
    const r = await enviarDm(destino, essencial ?? {}, creds)

    if (!r.ok) {
      const legenda = legendaDaFalha(r.acao ?? 'retry', r.erro, r.codigo)
      const permanente = r.retryable === false
      const semTentativas = job.attempts + 1 >= job.max_attempts
      if (permanente || semTentativas) {
        await desfechoDoRun(run.id, {
          status: 'falhou',
          erro_codigo: r.codigo != null ? String(r.codigo) : null,
          erro_mensagem: permanente ? legenda : TEXTOS_GATILHO_IG.desistiu,
          concluido_em: agora,
        })
        
        
        
        await finish(job.id, 'dead', r.erro, job.claim_id)
        await rastroDoFim(`run:${run.id}`, permanente ? legenda : TEXTOS_GATILHO_IG.desistiu, automacao.agent_id)
        return
      }
      const espera = r.retryAfterMs ?? BACKOFF_PADRAO_MS
      await requeue(job.id, job.attempts + 1, r.erro, maisTarde(agora, espera), job.claim_id)
      return
    }

    
    
    
    
    
    
    
    
    
    
    
    try { await marcarEntregue(run.id, job.passo) }
    catch (e) { console.warn('[instagram/runtime] registro da entrega falhou (não-fatal):', e) }

    
    
    for (const parte of acessorios) {
      
      
      
      
      
      
      let aindaMeu = true
      try { aindaMeu = await tocar(job.id, job.claim_id) }
      catch (e) { console.warn('[instagram/runtime] toque entre as partes falhou (não-fatal):', e) }
      if (!aindaMeu) {
        console.warn('[instagram/runtime] job já é de outro runner; parando as partes extras:', job.id)
        break
      }
      let entregue = false
      try {
        
        const extra = await enviarDm(destinoDireto, parte, creds)
        entregue = extra.ok
        if (!extra.ok) console.warn('[instagram/runtime] parte acessória falhou:', extra.erro)
      } catch (e) {
        console.warn('[instagram/runtime] parte acessória lançou:', e)
      }
      if (!entregue) {
        try { await atualizarRun(run.id, { erro_mensagem: TEXTOS_GATILHO_IG.acessorioNaoEntregue }) }
        catch (e) { console.warn('[instagram/runtime] rastro do acessório falhou:', e) }
        
        
        break
      }
    }

    await contar(automacao.id, 'dms_enviadas')

    await seguirParaOProximo(run.id, passos, job, agora)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (job.attempts + 1 >= job.max_attempts) {
      
      
      
      
      
      
      
      if (!(await finish(job.id, 'dead', msg, job.claim_id))) {
        console.warn('[instagram/runtime] desisti, mas o job já é de outro runner; sem desfecho:', job.id)
        return
      }
      
      
      
      await desfechoDoRun(job.run_id, { status: 'falhou', erro_mensagem: TEXTOS_GATILHO_IG.desistiu, concluido_em: agora })
      
      
      await rastroDoFim(`run:${job.run_id}`, TEXTOS_GATILHO_IG.desistiu)
    } else {
      await requeue(job.id, job.attempts + 1, msg, maisTarde(agora, BACKOFF_PADRAO_MS), job.claim_id)
    }
  }

  
  async function desfechoDoRun(
    runId: string,
    patch: Parameters<typeof marcarDesfecho>[1],
  ): Promise<void> {
    try {
      if (!(await marcarDesfecho(runId, patch))) {
        console.warn('[instagram/runtime] desfecho recusado: o disparo já tinha um', runId, patch.status)
      }
    } catch (e) {
      console.warn('[instagram/runtime] desfecho do run falhou (não-fatal):', runId, e)
    }
  }

  
  async function pararNoMeio(runId: string, motivo: string, atual: NonNullable<typeof job>): Promise<void> {
    await desfechoDoRun(runId, { status: 'interrompido', erro_mensagem: motivo, concluido_em: agora })
    await finish(atual.id, 'done', undefined, atual.claim_id)
  }

  
  async function rastroDoFim(chave: string, motivo: string, agente?: string): Promise<void> {
    try {
      await registrarEvento({
        id: `ig_run_morto:${chave}`,
        type: 'action',
        label: `${TEXTOS_GATILHO_IG.eventoRunMorto} ${motivo}`,
        ...(agente ? { agent: agente } : {}),
      })
    } catch (e) {
      console.warn('[instagram/runtime] rastro do fim do run falhou (fail-open):', e)
    }
  }

  
  async function contar(automacaoId: string, coluna: 'dms_enviadas' | 'respostas_publicas'): Promise<void> {
    try {
      await incrementar(automacaoId, coluna)
    } catch (e) {
      console.warn('[instagram/runtime] contador falhou (não-fatal):', coluna, e)
    }
  }

  
  async function seguirParaOProximo(
    runId: string,
    passosDoRun: Awaited<ReturnType<typeof listPassos>>,
    atual: NonNullable<typeof job>,
    agoraIso: string,
  ): Promise<void> {
    const proximo = passosDoRun.find((p) => p.posicao > atual.passo)
    if (!proximo) {
      if (!(await concluirOuVoltar(atual))) return
      await desfechoDoRun(runId, { status: 'concluido', concluido_em: agoraIso })
      return
    }
    await encadear(runId, proximo.posicao, maisTarde(agoraIso, proximo.atraso_s * 1000), atual, agoraIso)
  }

  
  async function concluirOuVoltar(atual: NonNullable<typeof job>): Promise<boolean> {
    const intacto = await concluir(atual.id, atual.nao_antes, atual.claim_id)
    if (intacto) return true
    
    
    await devolverEncerrado(atual.id, atual.passo, atual.attempts, 'empurrado durante o run', atual.claim_id)
    return false
  }

  
  async function encadear(runId: string, passo: number, quando: string, atual: NonNullable<typeof job>, agoraIso: string): Promise<void> {
    if (!(await concluirOuVoltar(atual))) return
    const { jobId: proximoId } = await agendarJob(runId, passo, quando)
    
    
    if (Date.parse(quando) <= Date.parse(agoraIso)) fire(proximoId)
  }
}
