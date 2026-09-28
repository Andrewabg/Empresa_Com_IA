
import { getMensagem as getMsgDefault, listMensagensConversa, type MensagemExternaRow, aprovarRascunho as aprovarDefault, updateMensagemStatus as updDefault, insertMensagemExterna as insertDefault } from '@/data/mensagensExternas'
import { getConversa as getConvDefault, touchConversaOut as touchOutDefault } from '@/data/conversasExternas'
import { getCanal as getCanalDefault, type CanalRow } from '@/data/canais'
import { getContato as getContatoDefault } from '@/data/contatos'
import { enqueueMemoryJob } from '@/data/memoryJobs'
import { enviarTexto, enviarTextoEmBolhas, enviarMidia as enviarMidiaDispatch, enviarInterativo as enviarInterativoDispatch, type BolhaEnviada } from './dispatch'
import { validarMidiaSaida } from '@/lib/canais/midiaSaida'
import { validarInterativo, interativoParaTexto } from '@/lib/canais/interativo'
import { planoDeEnvioDoRascunho } from '@/lib/canais/rascunhoInterativo'
import { getCanalMidiaBySlug, type CanalMidiaRow } from '@/data/canalMidia'
import { baixarDoBucket } from './media'
import { prepararArquivoCatalogo, enviarPreparado, kindDoArquivo, type PreparoArquivo } from './arquivoCatalogo'
import { getProvider } from './registry'
import { precisaJanela } from '@/lib/canais/janela'
import { agenteDaConversa } from '@/lib/canais/agenteDaConversa'
import { legendaSemRetentativa } from '@/lib/canais/erroMeta'
import { historicoParaMensagens } from '@/server/canais/runtime'
import { inserirCasoMarcado, inserirCasoMarcacao } from '@/server/treino/casoProducer'
import type { EnvioResultado, EnvioFalha, MidiaSaida, Interativo } from './types'


export interface AnexoOperador {
  kind: 'image' | 'document' | 'audio'
  mime: string
  nome: string
  bytes: Uint8Array
  storagePath: string
}


function midiaSaidaDoAnexo(a: AnexoOperador, legenda: string): MidiaSaida {
  if (a.kind === 'image') return { tipo: 'imagem', bytes: a.bytes, mime: a.mime, nome: a.nome, ...(legenda ? { legenda } : {}) }
  if (a.kind === 'audio') return { tipo: 'audio', bytes: a.bytes, mime: a.mime, voz: false }
  return { tipo: 'documento', bytes: a.bytes, mime: a.mime, nome: a.nome, ...(legenda ? { legenda } : {}) }
}

export interface InboxDeps {
  getMensagem: typeof getMsgDefault
  getConversa: typeof getConvDefault
  getCanal: typeof getCanalDefault
  getContato: typeof getContatoDefault
  sendText: (canal: CanalRow, para: string, texto: string) => Promise<EnvioResultado | EnvioFalha>
  enviarEmBolhas: (canal: CanalRow, para: string, texto: string) => Promise<BolhaEnviada[]>
  enviarMidia: (canal: CanalRow, para: string, m: MidiaSaida) => Promise<EnvioResultado | EnvioFalha>
  
  enviarInterativo?: (canal: CanalRow, para: string, i: Interativo) => Promise<{ res: EnvioResultado | EnvioFalha; comoTexto: boolean }>
  aprovarRascunho: typeof aprovarDefault
  updateMensagemStatus: typeof updDefault
  insertMensagemExterna: typeof insertDefault
  touchConversaOut: typeof touchOutDefault
  
  enqueueReflexao: (mensagemId: string) => Promise<void>
  now: () => string
  
  inserirCasoMarcado?: typeof inserirCasoMarcado
  
  inserirCasoMarcacao?: typeof inserirCasoMarcacao
  
  getMidiaPublica?: (canalId: string, slug: string) => Promise<CanalMidiaRow | null>
  
  baixarMidiaPublica?: (bucket: string, path: string) => Promise<{ bytes: Uint8Array; mime: string } | null>
}

export async function defaultInboxDeps(): Promise<InboxDeps> {
  return {
    getMensagem: getMsgDefault,
    getConversa: getConvDefault,
    getCanal: getCanalDefault,
    getContato: getContatoDefault,
    sendText: (canal, para, texto) => enviarTexto(canal, para, texto),
    enviarEmBolhas: (canal, para, texto) => enviarTextoEmBolhas(canal, para, texto),
    enviarMidia: (canal, para, m) => enviarMidiaDispatch(canal, para, m),
    enviarInterativo: (canal, para, i) => enviarInterativoDispatch(canal, para, i),
    aprovarRascunho: aprovarDefault,
    updateMensagemStatus: updDefault,
    insertMensagemExterna: insertDefault,
    touchConversaOut: touchOutDefault,
    enqueueReflexao: async (mensagemId) => {
      try { await enqueueMemoryJob('reflect_atendimento', mensagemId) } catch (e) { console.warn('[inbox] enqueue reflexão falhou (não-fatal):', e) }
    },
    now: () => new Date().toISOString(),
    inserirCasoMarcado,
    inserirCasoMarcacao,
    getMidiaPublica: (canalId, slug) => getCanalMidiaBySlug(canalId, slug, true),
    baixarMidiaPublica: baixarDoBucket,
  }
}


export const AVISO_SEM_ENVIO_DE_BOTOES =
  'o rascunho propunha botões e não houve como entregá-los, então a resposta sai sem eles'


function opcoesDoRascunho(midia: MensagemExternaRow['midia']): Interativo | null {
  const bruto = midia?.kind === 'interativo' ? midia.dados : midia?.opcoes
  if (!bruto) return null
  const v = validarInterativo(bruto)
  return v.ok ? v.valor : null
}

export type AcaoResultado =
  | {
      ok: true
      
      aviso?: string
    }
  | {
      ok: false
      reason:
        | 'bad_request' | 'janela_expirada' | 'envio_falhou' | 'anexo_invalido'
        | 'canal_nao_envia_arquivo' | 'arquivo_indisponivel'
      
      detalhe?: string
    }

async function resolverDestino(conversaId: string, d: InboxDeps) {
  const conversa = await d.getConversa(conversaId)
  if (!conversa) return null
  const canal = await d.getCanal(conversa.canal_id)
  const contato = await d.getContato(conversa.contato_id)
  if (!canal || !contato) return null
  
  
  
  
  
  
  
  
  
  
  
  
  return { conversa, canal, contato }
}

export async function aprovarRascunhoAction(
  input: { mensagemId: string; texto: string },
  d: InboxDeps,
): Promise<AcaoResultado> {
  const msg = await d.getMensagem(input.mensagemId)
  if (!msg || msg.status !== 'rascunho') return { ok: false, reason: 'bad_request' }
  const texto = input.texto.trim()
  if (!texto) return { ok: false, reason: 'bad_request' }
  const destino = await resolverDestino(msg.conversa_id, d)
  if (!destino) return { ok: false, reason: 'bad_request' }
  const janela24h = getProvider(destino.canal.provider)?.adapter.capabilities.janela24h ?? true
  if (precisaJanela(janela24h, destino.conversa.ultima_msg_in_at, d.now())) return { ok: false, reason: 'janela_expirada' }

  
  
  
  
  const slug = msg.midia?.slug ?? null
  let preparo: Extract<PreparoArquivo, { ok: true }> | null = null
  let linhaArquivo: CanalMidiaRow | null = null
  if (slug) {
    const rotulo = msg.midia?.rotulo || slug
    linhaArquivo = await (d.getMidiaPublica ?? ((c: string, s: string) => getCanalMidiaBySlug(c, s, true)))(destino.canal.id, slug)
    if (!linhaArquivo) {
      return { ok: false, reason: 'arquivo_indisponivel', detalhe: `"${rotulo}" não está mais liberado para envio. Reative o arquivo no /config ou tire a menção a ele do texto.` }
    }
    
    const p = await prepararArquivoCatalogo(linhaArquivo, '', d.baixarMidiaPublica ?? baixarDoBucket)
    if (!p.ok) return { ok: false, reason: 'arquivo_indisponivel', detalhe: p.legenda }
    preparo = p
  }

  
  
  
  
  
  
  
  
  
  
  
  const propostas = opcoesDoRascunho(msg.midia)
  if (propostas && !d.enviarInterativo) console.warn(`[canais/inbox] ${AVISO_SEM_ENVIO_DE_BOTOES}. mensagem=${msg.id}`)
  const opcoes = d.enviarInterativo ? propostas : null
  const plano = planoDeEnvioDoRascunho({
    textoAprovado: texto,
    textoOriginal: (msg.texto_rascunho ?? msg.texto ?? '').trim(),
    corpoDasOpcoes: opcoes ? opcoes.corpo : null,
  })

  
  
  
  let interativo: Interativo | null = null
  if (opcoes) {
    const revalidado = plano.corpoFinal !== null && plano.corpoFinal !== opcoes.corpo
      ? validarInterativo({ ...opcoes, corpo: plano.corpoFinal })
      : ({ ok: true, valor: opcoes } as const)
    if (!revalidado.ok) return { ok: false, reason: 'bad_request', detalhe: revalidado.erros.join(' ') }
    interativo = revalidado.valor
  }

  let externalIdDoTexto: string | undefined
  if (plano.enviarTexto) {
    const envio = await d.sendText(destino.canal, destino.contato.external_id, texto)
    if (!envio.ok) return { ok: false, reason: 'envio_falhou', detalhe: legendaSemRetentativa(envio.erro) }
    externalIdDoTexto = envio.externalId
  }

  
  
  
  
  
  
  
  
  
  
  
  
  let envioSoOpcoes: { externalId?: string; comoTexto: boolean } | null = null
  if (interativo && !plano.enviarTexto) {
    const { res, comoTexto } = await d.enviarInterativo!(destino.canal, destino.contato.external_id, interativo)
    
    
    if (!res.ok) return { ok: false, reason: 'envio_falhou', detalhe: legendaSemRetentativa(res.erro) }
    envioSoOpcoes = { externalId: res.externalId, comoTexto }
  }

  await d.aprovarRascunho(
    msg.id, texto, 'enviada',
    externalIdDoTexto ?? envioSoOpcoes?.externalId,
    
    
    envioSoOpcoes && interativo
      ? {
          kind: 'interativo',
          dados: interativo as unknown as Record<string, unknown>,
          texto_estruturado: interativoParaTexto(interativo),
          como_texto: envioSoOpcoes.comoTexto,
        }
      : undefined,
  )
  await d.touchConversaOut(msg.conversa_id, d.now())

  
  
  let aviso: string | undefined
  if (preparo && linhaArquivo) {
    const ent = await enviarPreparado(destino.canal, destino.contato.external_id, preparo, d.enviarMidia)
    const midia = {
      kind: ent.ok ? ent.kind : kindDoArquivo(linhaArquivo.mime),
      mime: ent.ok ? ent.mime : linhaArquivo.mime,
      storage_path: linhaArquivo.storage_path, slug: linhaArquivo.slug, rotulo: linhaArquivo.rotulo,
    }
    await d.insertMensagemExterna({
      conversa_id: msg.conversa_id, direcao: 'out', autor: 'agente', texto: '', midia,
      ...(ent.ok ? { status: 'enviada' as const, external_id: ent.externalId } : { status: 'falhou' as const, erro: ent.legenda }),
    })
    if (!ent.ok) aviso = `O texto foi enviado, mas o arquivo não saiu: ${ent.legenda}`
  }

  
  
  
  if (interativo && plano.enviarTexto && d.enviarInterativo) {
    const { res, comoTexto } = await d.enviarInterativo(destino.canal, destino.contato.external_id, interativo)
    await d.insertMensagemExterna({
      conversa_id: msg.conversa_id, direcao: 'out', autor: 'agente',
      texto: interativoParaTexto(interativo),
      midia: { kind: 'interativo', dados: interativo as unknown as Record<string, unknown>, texto_estruturado: interativoParaTexto(interativo), como_texto: comoTexto },
      ...(res.ok ? { status: 'enviada' as const, external_id: res.externalId } : { status: 'falhou' as const, erro: res.erro }),
    })
    if (!res.ok) aviso = `O texto foi enviado, mas as opções não saíram: ${res.erro}`
  }
  
  const editado = texto !== (msg.texto_rascunho ?? msg.texto).trim()
  if (editado) {
    await d.enqueueReflexao(msg.id)
    
    try {
      const historico = await listMensagensConversa(msg.conversa_id, 30)
      await (d.inserirCasoMarcado ?? inserirCasoMarcado)({
        agentId: agenteDaConversa(destino.conversa.agent_id, destino.canal.agent_id),
        canalId: destino.canal.id,
        conversaId: msg.conversa_id,
        mensagemId: msg.id,
        mensagens: historicoParaMensagens(historico),
        ficha: destino.contato.ficha ?? { perfil: {}, aprendizados: [] },
        agora: d.now(),
        rascunho: (msg.texto_rascunho ?? '').trim(),
        final: texto.trim(),
      })
    } catch (e) { console.warn('[treino] caso marcado fail-open:', e) }
  }
  return aviso ? { ok: true, aviso } : { ok: true }
}

export async function marcarErroAtendimento(
  input: { mensagemId: string; nota?: string },
  d: InboxDeps,
): Promise<AcaoResultado> {
  const msg = await d.getMensagem(input.mensagemId)
  if (!msg || msg.status !== 'enviada' || msg.autor !== 'agente') return { ok: false, reason: 'bad_request' }
  const destino = await resolverDestino(msg.conversa_id, d)
  if (!destino) return { ok: false, reason: 'bad_request' }
  const historico = await listMensagensConversa(msg.conversa_id, 30)
  await (d.inserirCasoMarcacao ?? inserirCasoMarcacao)({
    agentId: agenteDaConversa(destino.conversa.agent_id, destino.canal.agent_id),
    canalId: destino.canal.id,
    conversaId: msg.conversa_id,
    mensagemId: msg.id,
    mensagens: historicoParaMensagens(historico),
    ficha: destino.contato.ficha ?? { perfil: {}, aprendizados: [] },
    agora: d.now(),
    respostaEnviada: msg.texto,
    nota: input.nota,
  })
  return { ok: true }
}

export async function descartarRascunhoAction(
  input: { mensagemId: string },
  d: InboxDeps,
): Promise<AcaoResultado> {
  const msg = await d.getMensagem(input.mensagemId)
  if (!msg || msg.status !== 'rascunho') return { ok: false, reason: 'bad_request' }
  await d.updateMensagemStatus(msg.id, 'descartada', undefined)
  return { ok: true }
}

export async function enviarComoOperador(
  input: { conversaId: string; texto: string; anexo?: AnexoOperador },
  d: InboxDeps,
): Promise<AcaoResultado> {
  const texto = input.texto.trim()
  
  if (!texto && !input.anexo) return { ok: false, reason: 'bad_request' }
  const destino = await resolverDestino(input.conversaId, d)
  if (!destino) return { ok: false, reason: 'bad_request' }
  const janela24h = getProvider(destino.canal.provider)?.adapter.capabilities.janela24h ?? true
  if (precisaJanela(janela24h, destino.conversa.ultima_msg_in_at, d.now())) return { ok: false, reason: 'janela_expirada' }

  if (input.anexo) {
    const m = midiaSaidaDoAnexo(input.anexo, texto)
    const v = validarMidiaSaida({ tipo: m.tipo, mime: m.mime, bytes: m.bytes.length, legenda: texto || undefined })
    if (!v.ok) return { ok: false, reason: 'anexo_invalido', detalhe: v.legenda }
    const envio = await d.enviarMidia(destino.canal, destino.contato.external_id, m)
    if (!envio.ok) {
      return envio.erro === 'nao_suportado'
        ? { ok: false, reason: 'canal_nao_envia_arquivo' }
        : { ok: false, reason: 'envio_falhou', detalhe: legendaSemRetentativa(envio.erro) }
    }
    await d.insertMensagemExterna({
      conversa_id: input.conversaId, direcao: 'out', autor: 'operador',
      texto, status: 'enviada', external_id: envio.externalId,
      midia: { kind: input.anexo.kind, mime: input.anexo.mime, storage_path: input.anexo.storagePath },
    })
    await d.touchConversaOut(input.conversaId, d.now())
    return { ok: true }
  }

  
  const bolhas = await d.enviarEmBolhas(destino.canal, destino.contato.external_id, texto)
  let algumaOk = false
  let falhaFinal: EnvioFalha | undefined
  for (const b of bolhas) {
    if (b.res.ok) {
      algumaOk = true
      await d.insertMensagemExterna({
        conversa_id: input.conversaId, direcao: 'out', autor: 'operador',
        texto: b.texto, status: 'enviada', external_id: b.res.externalId,
      })
    } else {
      falhaFinal = b.res
      await d.insertMensagemExterna({
        conversa_id: input.conversaId, direcao: 'out', autor: 'operador',
        texto: b.texto, status: 'falhou', erro: b.res.erro,
      })
    }
  }
  if (algumaOk) await d.touchConversaOut(input.conversaId, d.now())
  
  
  
  
  
  
  
  return falhaFinal && !algumaOk
    ? { ok: false, reason: 'envio_falhou', detalhe: legendaSemRetentativa(falhaFinal.erro) }
    : { ok: true }
}
