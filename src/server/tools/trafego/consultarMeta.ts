




















import { validarConsulta, CAMPOS_DE_ID_DO_NIVEL } from '@/lib/trafego/graph/catalogo'
import { montarPath } from '@/lib/trafego/graph/montarPath'
import { linhaDaBancada } from '@/lib/trafego/graph/linhaDaBancada'
import { ateQuando, ehThrottle, throttleAtivo, THROTTLE_SETTING_KEY } from '@/lib/trafego/graph/throttle'
import {
  CURSOR_RE, DATA_RE, LINHAS_DA_AMOSTRA, OBJETO_RE, PRAZO_DA_CONSULTA_MS, PRAZO_DA_PAGINA_MS,
  type ConsultaMeta, type ConsultaValida,
} from '@/lib/trafego/graph/tipos'
import type { ContextoCarregado, Investigacao } from '@/lib/trafego/graph/investigacao'
import { registrarLeitura } from '@/lib/trafego/graph/ledger'
import {
  AVISO_PERTO_DO_TETO, ESTADO_VAZIO, GUARDA_DA_META, MOTIVO_CONVERSA_INTERROMPIDA, MOTIVO_ERRO_INTERNO,
  MOTIVO_PRAZO_DA_CONSULTA, RECUSA_CONSULTA_INVALIDA, RECUSA_SEM_CONTA, RECUSA_TETO_DE_LEITURAS,
  avisoDeThrottle, estadoCortou, estadoCortouNaPausa, estadoFalhou, motivoDaFalha,
} from '@/lib/trafego/graph/mensagens'
import { segundaOpiniao } from '@/lib/trafego/graph/segundaOpiniao'
import { frameDaConta } from '@/lib/trafego/graph/contextoDaConta'
import { renderTabela } from '@/lib/bancada/renderTabela'
import { RECUSA_BANCADA_CHEIA } from '@/lib/bancada/mensagens'
import type { Bancada } from '@/lib/bancada/tipos'
import { campoSeguro } from '@/lib/fontes/sanitizar'
import { normalize } from '@/lib/trafego/normalize'
import type { MetricShape } from '@/lib/trafego/types'
import { metaGraphGetDetalhado, resolverContaMetaads, getComposioClient, type GraphResposta } from '@/server/actions/composio'
import { runAction } from '@/server/actions/actions'
import { getSetting as getSettingDefault, setSetting as setSettingDefault } from '@/data/settings'
import { substituirSnapshotsConsulta, listSnapshotsDasEntidades as listSnapsDefault, type SnapshotRow } from '@/data/trafego'
import { obterBancada as obterBancadaDefault, registrarTabela, reservarLinhas, liberarReserva } from '@/server/bancada/bancadaDoTurno'
import { carregarHistorico as carregarHistoricoDefault } from '@/server/bancada/carregarHistorico'
import { obterInvestigacao as obterInvestigacaoDefault, reservarChamada } from '@/server/bancada/investigacaoDoTurno'
import { carregarContextoDaConta } from '@/server/bancada/contextoDaConta'
import { resolverContaParaAcao } from './buscarMetricas'

export interface ConsultarMetaCtx { operatorId?: string; actingAgentId?: string; hojeISO: string }
export interface ConsultarMetaDeps {
  graphGet?: (path: string, opts: { connectedAccountId?: string | null; signal?: AbortSignal }) => Promise<GraphResposta>
  getSetting?: (key: string) => Promise<string | null>
  setSetting?: (key: string, value: string) => Promise<void>
  resolverConta?: (agent: string) => Promise<string | null>
  resolverConnectedAccount?: () => Promise<string | null>
  carregarHistorico?: (b: Bancada, ctx: { operatorId?: string; hojeISO: string }) => Promise<unknown>
  carregarContexto?: (b: Bancada, ctx: { operatorId?: string; contaId: string | null; agoraMs: number }) => Promise<ContextoCarregado>
  substituirSnapshots?: typeof substituirSnapshotsConsulta
  listSnapshotsDasEntidades?: typeof listSnapsDefault
  obterBancada?: () => Bancada
  obterInvestigacao?: typeof obterInvestigacaoDefault
  agora?: () => number
  abortSignal?: AbortSignal
}

type Paginacao = { cursors?: { after?: unknown }; next?: unknown }


function baseDaTabela(c: ConsultaValida): string {
  const partes: string[] = [c.aresta]
  if (c.levelGraph) partes.push(c.levelGraph)
  if (c.tipoDoNo) partes.push(c.tipoDoNo)
  if (c.periodo && 'preset' in c.periodo) partes.push(c.periodo.preset)
  if (c.periodo && 'since' in c.periodo) partes.push(`${c.periodo.since}_${c.periodo.until}`)
  if (c.incremento !== 'total') partes.push(c.incremento)
  if (c.breakdowns.length) partes.push(c.breakdowns.join('_'))
  return partes.join(' ')
}


function elegivelParaSnapshot(c: ConsultaValida): c is ConsultaValida & { levelGraph: 'campaign' | 'adset' | 'ad' } {
  return c.aresta === 'insights' && c.breakdowns.length === 0 && c.incremento === 'total' && c.levelGraph !== null
}

function texto(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : typeof v === 'number' ? String(v) : null
}


function maisTarde(...xs: Array<string | null | undefined>): string | undefined {
  let melhor: string | undefined
  let ms = -Infinity
  for (const x of xs) {
    const t = x ? Date.parse(x) : NaN
    if (Number.isFinite(t) && t > ms) { ms = t; melhor = x as string }
  }
  return melhor
}


async function memoDeSucesso(inv: Investigacao, chave: 'contaId' | 'connectedAccountId', resolver: () => Promise<string | null>): Promise<string | null> {
  const p = (inv[chave] ??= resolver().catch(() => null))
  const v = await p
  if (v === null && inv[chave] === p) inv[chave] = undefined
  return v
}

export async function consultarMeta(input: ConsultaMeta, ctx: ConsultarMetaCtx, deps: ConsultarMetaDeps = {}): Promise<{ output: string }> {
  try {
    return await consultar(input, ctx, deps)
  } catch (e) {
    console.warn('[consultarMeta] falhou (não-fatal):', e instanceof Error ? e.message : e)
    return { output: estadoFalhou(MOTIVO_ERRO_INTERNO) }
  }
}

async function consultar(input: ConsultaMeta, ctx: ConsultarMetaCtx, deps: ConsultarMetaDeps): Promise<{ output: string }> {
  const v = validarConsulta(input)
  if (!v.ok) return { output: `${RECUSA_CONSULTA_INVALIDA}\n${v.erros.map((e) => `- ${e}`).join('\n')}` }
  const c = v.consulta
  const agora = deps.agora ?? (() => Date.now())
  const agoraISO = () => new Date(agora()).toISOString()
  const getSetting = deps.getSetting ?? getSettingDefault
  const setSetting = deps.setSetting ?? setSettingDefault
  const agent = ctx.actingAgentId ?? 'gestor-trafego'

  const bancada = (deps.obterBancada ?? obterBancadaDefault)()
  const inv = (deps.obterInvestigacao ?? obterInvestigacaoDefault)()
  
  const pausaMaisLonga = (...valores: Array<string | null | undefined>) => {
    let melhor = { ativo: false, minutosRestantes: 0 }
    for (const v of valores) { const t = throttleAtivo(v, agoraISO()); if (t.ativo && t.minutosRestantes > melhor.minutosRestantes) melhor = t }
    return melhor
  }
  
  const th = pausaMaisLonga(await getSetting(THROTTLE_SETTING_KEY).catch(() => null), inv.throttleAte)
  if (th.ativo) return { output: avisoDeThrottle(th.minutosRestantes, true) }

  
  await (deps.carregarHistorico ?? ((b, x) => carregarHistoricoDefault(b, x)))(bancada, { operatorId: ctx.operatorId, hojeISO: ctx.hojeISO }).catch(() => null)

  const reserva = c.aresta === 'detalhes' ? 1 : c.limite
  if (!reservarLinhas(bancada, reserva)) return { output: RECUSA_BANCADA_CHEIA }
  let reservaAtiva = true
  const soltar = () => { if (reservaAtiva) { liberarReserva(bancada, reserva); reservaAtiva = false } }
  try {
    const resolverConta = deps.resolverConta ?? ((a: string) => resolverContaParaAcao(a, runAction, getSetting))
    
    
    const contaResolvida = await memoDeSucesso(inv, 'contaId', () => resolverConta(agent))
    
    const contaId = contaResolvida && OBJETO_RE.test(contaResolvida) ? contaResolvida : null
    if (c.objeto === 'conta' && !contaId) return { output: RECUSA_SEM_CONTA }
    const resolverCa = deps.resolverConnectedAccount ?? (async () => { const cli = await getComposioClient(); return cli ? resolverContaMetaads(cli) : null })
    const caId = await memoDeSucesso(inv, 'connectedAccountId', resolverCa)
    const graphGet = deps.graphGet ?? ((p: string, o: { connectedAccountId?: string | null; signal?: AbortSignal }) => metaGraphGetDetalhado(p, o))

    
    const registrarPausa = async (s: { minutos: number; estimado: boolean }): Promise<string> => {
      const novo = ateQuando(agoraISO(), s.minutos)
      inv.throttleAte = maisTarde(inv.throttleAte, novo)
      const gravado = await getSetting(THROTTLE_SETTING_KEY).catch(() => null)
      const gravadoValido = throttleAtivo(gravado, agoraISO()).ativo ? gravado : null
      const ate = maisTarde(gravadoValido, inv.throttleAte, novo) as string
      inv.throttleAte = ate
      await setSetting(THROTTLE_SETTING_KEY, ate).catch(() => {})
      return ate === novo ? avisoDeThrottle(s.minutos, s.estimado) : avisoDeThrottle(throttleAtivo(ate, agoraISO()).minutosRestantes, true)
    }

    const cruas: Array<Record<string, unknown>> = []
    const avisos: string[] = []
    let after: string | undefined
    let cortou = false
    let sobPausa = false
    let motivoFalha: string | null = null
    let gets = 0
    const fim = agora() + PRAZO_DA_CONSULTA_MS

    
    const sairSemTabela = (output: string, falhou = true): { output: string } => {
      if (gets > 0) registrarLeitura(inv.ledger, { tabela: '', porque: c.porque, linhas: 0, cortou, falhou }, agora())
      return { output }
    }

    for (;;) {
      if (deps.abortSignal?.aborted) { motivoFalha = MOTIVO_CONVERSA_INTERROMPIDA; break }
      
      const pausa = throttleAtivo(inv.throttleAte, agoraISO())
      if (pausa.ativo) {
        const aviso = avisoDeThrottle(pausa.minutosRestantes, true)
        if (cruas.length === 0) return sairSemTabela(aviso)
        sobPausa = true; cortou = true; avisos.push(aviso); break
      }
      const restante = fim - agora()
      if (restante <= 0) { motivoFalha = MOTIVO_PRAZO_DA_CONSULTA; break }
      const vaga = reservarChamada(inv)
      if (!vaga.ok) {
        if (cruas.length === 0) return sairSemTabela(RECUSA_TETO_DE_LEITURAS)
        cortou = true; break
      }
      if (vaga.avisar) avisos.push(AVISO_PERTO_DO_TETO)
      const path = montarPath({ ...c, limite: Math.max(1, c.limite - cruas.length) }, c.objeto === 'conta' ? contaId : null, after)
      const sinais = [AbortSignal.timeout(Math.min(PRAZO_DA_PAGINA_MS, restante)), ...(deps.abortSignal ? [deps.abortSignal] : [])]
      gets += 1
      const res = await graphGet(path, { connectedAccountId: caId, signal: AbortSignal.any(sinais) })

      const sinal = ehThrottle(res.ok ? null : { code: res.code }, res.headers ?? {})
      if (sinal.throttle) {
        sobPausa = true
        const aviso = await registrarPausa(sinal)
        if (!res.ok && cruas.length === 0) return sairSemTabela(aviso)
        avisos.push(aviso)
        
        if (!res.ok) { cortou = true; break }
      }
      if (!res.ok) { motivoFalha = deps.abortSignal?.aborted ? MOTIVO_CONVERSA_INTERROMPIDA : motivoDaFalha(res); break }

      if (c.aresta === 'detalhes') {
        if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) cruas.push(res.data as Record<string, unknown>)
        break
      }
      const corpoDaResposta = res.data as { data?: unknown; paging?: Paginacao } | null
      const pagina = corpoDaResposta?.data
      let transbordou = false
      if (Array.isArray(pagina)) {
        for (const r of pagina) {
          if (!r || typeof r !== 'object' || Array.isArray(r)) continue
          if (cruas.length < c.limite) cruas.push(r as Record<string, unknown>)
          else transbordou = true
        }
      }
      const paging = corpoDaResposta?.paging
      const temMais = Boolean(paging?.next)             
      
      
      if (sinal.throttle || !temMais) { if (temMais || transbordou) cortou = true; break }
      if (cruas.length >= c.limite) { cortou = true; break }
      const proximo = paging?.cursors?.after
      if (typeof proximo !== 'string' || !CURSOR_RE.test(proximo)) { cortou = true; break }
      after = proximo
    }

    
    const avisoDeCorte = (n: number) => (sobPausa ? estadoCortouNaPausa(n) : estadoCortou(n))
    
    
    
    
    if (cruas.length === 0) {
      if (motivoFalha) return sairSemTabela([estadoFalhou(motivoFalha), ...avisos].join('\n'))
      
      if (cortou) return sairSemTabela([avisoDeCorte(0), ...avisos].join('\n'), false)
      return sairSemTabela([ESTADO_VAZIO, ...avisos].join('\n'), false)
    }
    if (motivoFalha) { cortou = true; avisos.push(estadoFalhou(motivoFalha)) }

    const tabela = linhaDaBancada(cruas)
    
    soltar()
    const reg = registrarTabela(bancada, { colunas: tabela.colunas, linhas: tabela.linhas, porque: c.porque }, baseDaTabela(c))
    
    
    if (!reg.ok) return sairSemTabela(RECUSA_BANCADA_CHEIA)
    registrarLeitura(inv.ledger, { tabela: reg.nome, porque: c.porque, linhas: tabela.linhas.length, cortou, falhou: Boolean(motivoFalha) }, agora())

    const carregarCtx = deps.carregarContexto ?? ((b, x) => carregarContextoDaConta(b, x))
    const semContexto = (): ContextoCarregado => ({ texto: '', frame: frameDaConta(undefined) })
    let contexto: ContextoCarregado
    if (contaId) {
      const p = (inv.contexto ??= carregarCtx(bancada, { operatorId: ctx.operatorId, contaId, agoraMs: agora() }).catch(semContexto))
      contexto = await p
      
      if (!contexto.texto && inv.contexto === p) inv.contexto = undefined
    } else {
      
      contexto = await carregarCtx(bancada, { operatorId: ctx.operatorId, contaId: null, agoraMs: agora() }).catch(semContexto)
    }

    if (ctx.operatorId && elegivelParaSnapshot(c)) {
      const [campoId, campoNome] = CAMPOS_DE_ID_DO_NIVEL[c.levelGraph]
      const snaps = cruas.flatMap((r) => {
        const id = texto(r[campoId]); const ini = texto(r.date_start); const fimP = texto(r.date_stop)
        if (!id || !ini || !fimP || !DATA_RE.test(ini) || !DATA_RE.test(fimP)) return []
        return [{
          operator_id: ctx.operatorId!, source: 'metaads', level: c.levelGraph, entity_id: id, entity_name: texto(r[campoNome]),
          period_start: ini, period_end: fimP, metrics: normalize(r, contexto.frame.conversaoTypes) as Record<string, unknown>, granularity: 'consulta' as const,
        }]
      })
      if (snaps.length) {
        await (deps.substituirSnapshots ?? substituirSnapshotsConsulta)(snaps)
          .catch((e) => console.warn('[consultarMeta] snapshot consulta falhou (não-fatal):', e instanceof Error ? e.message : e))
      }
    }

    let opiniao = ''
    if (ctx.operatorId && c.aresta === 'insights' && (c.levelGraph === 'campaign' || c.levelGraph === 'adset')) {
      const [campoId, campoNome] = CAMPOS_DE_ID_DO_NIVEL[c.levelGraph]
      const entidades = cruas.map((r) => ({ id: texto(r[campoId]) ?? '', nome: texto(r[campoNome]) })).filter((e) => e.id)
      const ids = [...new Set(entidades.map((e) => e.id))].slice(0, 200)
      const lidos = await (deps.listSnapshotsDasEntidades ?? listSnapsDefault)(ctx.operatorId, c.levelGraph, ids, ['window']).catch(() => [] as SnapshotRow[])
      const ultimo = new Map<string, MetricShape>()
      for (const s of lidos) if (!ultimo.has(s.entity_id)) ultimo.set(s.entity_id, s.metrics as MetricShape)
      opiniao = segundaOpiniao(entidades, ultimo, { baseline: bancada.baseline ?? null, frame: contexto.frame })
    }

    
    
    
    const entregarContexto = contexto.texto !== '' && (contaId ? !inv.contextoEntregue : !inv.contextoDegradadoEntregue)
    if (entregarContexto) { if (contaId) inv.contextoEntregue = true; else inv.contextoDegradadoEntregue = true }
    const t = bancada.tabelas.get(reg.nome)!
    const amostra = renderTabela(t.colunas.map((x) => x.nome), t.linhas, { maxLinhas: LINHAS_DA_AMOSTRA, maxChars: 4_000 })
    const corpo = [
      `Leitura: ${campoSeguro(c.porque)}`,
      `Tabela ${reg.nome}: ${t.linhas.length} linhas. Colunas: ${t.colunas.map((x) => `${x.nome} (${x.tipo})`).join(', ')}.`,
      cortou ? avisoDeCorte(t.linhas.length) : null,
      `Amostra (até ${LINHAS_DA_AMOSTRA} linhas; o resto está na bancada, use calcular):`,
      amostra.texto,
      opiniao || null,
    ].filter((s): s is string => Boolean(s)).join('\n')
    const partes = [`${GUARDA_DA_META}\n«meta»\n${corpo}\n«/meta»`]
    if (entregarContexto) partes.push(contexto.texto)
    partes.push(...avisos)
    return { output: partes.join('\n') }
  } finally {
    soltar()
  }
}
