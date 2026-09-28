
import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import { requireOperatorApi, requireDonoApi } from '@/server/auth/apiAuth'
import { validarAutomacao, motivoQueImpedeAtivar } from '@/lib/instagram/validarAutomacao'
import { TEXTOS_REVISAO_IG } from '@/lib/instagram/revisaoAntesDeAtivar'
import { TEXTOS_RASTRO_IG } from '@/lib/instagram/copyRastro'
import { TEXTOS_EDICAO_IG } from '@/lib/instagram/copyEdicao'
import { statusAoSalvar } from '@/lib/instagram/estadoDaAutomacao'
import { TEXTOS_ROTA_IG } from '@/lib/instagram/copyRota'
import { recordEvent } from '@/data/events'
import {
  getAutomacao, atualizarAutomacao, substituirPassos, arquivarAutomacao,
  listPassos, type PatchAutomacao, type IgAutomacaoStatus, type IgAutomacaoRow,
} from '@/data/igAutomacoes'
import type { NextCookieStore } from '@/server/supabase'

const STATUS_EDITAVEL: IgAutomacaoStatus[] = ['rascunho', 'ativa', 'arquivada']


const EXIGE_DONO: IgAutomacaoStatus[] = ['ativa', 'arquivada']


const RASTRO_POR_STATUS: Partial<Record<IgAutomacaoStatus, string>> = {
  ativa: TEXTOS_RASTRO_IG.ativada,
  rascunho: TEXTOS_RASTRO_IG.pausada,
  arquivada: TEXTOS_RASTRO_IG.arquivada,
}


async function registrarAto(automacao: IgAutomacaoRow, label: string): Promise<void> {
  try {
    await recordEvent({ id: randomUUID(), type: 'action', label, agent: automacao.agent_id })
  } catch (e) {
    console.warn('[instagram/automacoes/[id]] não deu para registrar o ato (fail-open):', e)
  }
}

export async function GET(_r: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const auth = await requireOperatorApi(await cookies())
    if (auth instanceof Response) return auth
    return await ler(ctx)
  } catch (e) {
    
    
    console.warn('[instagram/automacoes/[id]] GET falhou:', e)
    return Response.json({ error: TEXTOS_ROTA_IG.falhaAbrir }, { status: 500 })
  }
}

async function ler(ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const automacao = await getAutomacao(id)
  if (!automacao) return Response.json({ error: TEXTOS_ROTA_IG.naoEncontrada }, { status: 404 })
  return Response.json({ automacao, passos: await listPassos(id) })
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const cookieStore = await cookies()
    const auth = await requireOperatorApi(cookieStore)
    if (auth instanceof Response) return auth
    return await editar(request, ctx, cookieStore)
  } catch (e) {
    console.warn('[instagram/automacoes/[id]] PUT falhou:', e)
    return Response.json({ error: TEXTOS_ROTA_IG.falhaSalvar }, { status: 500 })
  }
}

async function editar(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
  cookieStore: NextCookieStore,
): Promise<Response> {
  const { id } = await ctx.params

  const corpo = (await request.json().catch(() => ({}))) as Record<string, unknown>

  
  
  let status: IgAutomacaoStatus | undefined
  if (corpo.status !== undefined) {
    if (typeof corpo.status !== 'string' || !STATUS_EDITAVEL.includes(corpo.status as IgAutomacaoStatus)) {
      return Response.json({ error: TEXTOS_ROTA_IG.estadoInvalido }, { status: 400 })
    }
    status = corpo.status as IgAutomacaoStatus
    if (EXIGE_DONO.includes(status)) {
      const authDono = await requireDonoApi(cookieStore)
      if (authDono instanceof Response) return authDono
    }
  }

  
  
  const baseadoEm = typeof corpo.baseadoEm === 'string' ? corpo.baseadoEm : null
  const ehAtalhoDeStatus = status !== undefined
    && Object.keys(corpo).filter((k) => k !== 'baseadoEm').length === 1

  const automacao = await getAutomacao(id)
  if (!automacao) return Response.json({ error: TEXTOS_ROTA_IG.naoEncontrada }, { status: 404 })

  
  
  
  
  
  if (ehAtalhoDeStatus && status === 'ativa') {
    if (!baseadoEm) {
      return Response.json({ error: TEXTOS_REVISAO_IG.semConferencia }, { status: 400 })
    }
    if (baseadoEm !== automacao.updated_at) {
      return Response.json({ error: TEXTOS_REVISAO_IG.mudouDepoisDaConferencia }, { status: 409 })
    }
  }

  
  
  
  
  
  
  
  
  
  if (ehAtalhoDeStatus && status !== undefined) {
    if (status === 'ativa') {
      const motivo = motivoQueImpedeAtivar(automacao, await listPassos(id))
      if (motivo) return Response.json({ error: motivo }, { status: 400 })
    }
    await atualizarAutomacao(id, { status })
    
    
    
    const legenda = status === automacao.status ? undefined : RASTRO_POR_STATUS[status]
    if (legenda) await registrarAto(automacao, legenda)
    return Response.json({ ok: true })
  }

  const v = validarAutomacao(corpo)
  if (!v.ok) return Response.json({ error: v.erro }, { status: 400 })

  
  
  
  
  
  
  
  const statusForcado = statusAoSalvar(automacao.status)
  const rebaixandoPorEdicao = automacao.status === 'ativa'

  
  
  const patch: PatchAutomacao = {
    nome: v.valor.nome,
    
    
    gatilho: v.valor.gatilho,
    midia_id: v.valor.midiaId,
    story_id: v.valor.storyId,
    palavras: v.valor.palavras,
    modo_casamento: v.valor.modoCasamento,
    resposta_publica: v.valor.respostaPublica,
    resposta_publica_texto: v.valor.respostaPublicaTexto,
    
    
    
    
    expira_em: null,
    
    
    
    
    
    
    ...(v.valor.midiaPermalink !== undefined ? { midia_permalink: v.valor.midiaPermalink } : {}),
    ...(v.valor.midiaThumbUrl !== undefined ? { midia_thumb_url: v.valor.midiaThumbUrl } : {}),
    ...(statusForcado ? { status: statusForcado } : (status ? { status } : {})),
  }

  
  
  
  
  

  
  
  
  
  
  
  if (rebaixandoPorEdicao) await atualizarAutomacao(id, { status: 'rascunho' })

  try {
    
    
    
    await substituirPassos(id, v.valor.passos)
    await atualizarAutomacao(id, patch)
  } catch (e) {
    
    
    
    
    if (rebaixandoPorEdicao) {
      console.warn('[instagram/automacoes/[id]] salvamento falhou com a automação já desligada:', e)
      return Response.json(
        { error: TEXTOS_EDICAO_IG.saiuDoArAoFalharSalvamento, rebaixada: true },
        { status: 500 },
      )
    }
    throw e
  }

  await registrarAto(automacao, TEXTOS_RASTRO_IG.conteudoEditado)
  
  
  
  
  
  
  const nuncaEstavaNoAr = patch.status === 'rascunho' && automacao.status !== 'ativa'
  const legendaFinal = patch.status && patch.status !== automacao.status && !nuncaEstavaNoAr
    ? RASTRO_POR_STATUS[patch.status]
    : undefined
  if (legendaFinal) await registrarAto(automacao, legendaFinal)
  return Response.json({ ok: true, ...(rebaixandoPorEdicao ? { rebaixada: true } : {}) })
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const auth = await requireDonoApi(await cookies())
    if (auth instanceof Response) return auth
    return await arquivar(ctx)
  } catch (e) {
    console.warn('[instagram/automacoes/[id]] DELETE falhou:', e)
    return Response.json({ error: TEXTOS_ROTA_IG.falhaArquivar }, { status: 500 })
  }
}

async function arquivar(ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await ctx.params
  const automacao = await getAutomacao(id)
  if (!automacao) return Response.json({ error: TEXTOS_ROTA_IG.naoEncontrada }, { status: 404 })
  await arquivarAutomacao(id)
  await registrarAto(automacao, TEXTOS_RASTRO_IG.arquivada)
  return Response.json({ ok: true })
}
