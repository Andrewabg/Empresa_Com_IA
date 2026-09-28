
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { requireOperatorApi } from '@/server/auth/apiAuth'
import { getAgentRow } from '@/data/agents'
import { createArtifact, getArtifactByStorageRef } from '@/data/artifacts'
import { getConversationForOperator, roomConversation, type Conversation } from '@/data/messages'
import { recordCost } from '@/data/cost'
import { ANEXO_PREFIX } from '@/lib/artifacts'
import {
  validarAnexo,
  resumoDePdf,
  COPY_RECUSA,
  COPY_FALHA_ANEXO,
  type EtapaFalhaAnexo,
  type KindAnexo,
} from '@/lib/conversa/anexo'
import { textoSeguroParaBanco } from '@/lib/textoDoBanco'
import { generateBackgroundVision } from '@/server/cost/backgroundLLM'
import { extrairTextoPdf } from '@/server/juridico/extrairPdf'
import { pdfNumPages } from '@/server/imports/adapters/pdfOcr'
import { serverDb } from '@/server/supabase'


class FalhaDeAnexo extends Error {
  constructor(readonly etapa: EtapaFalhaAnexo, motivo: string) {
    super(`${etapa}: ${motivo}`)
    this.name = 'FalhaDeAnexo'
  }
}


const MAX_ENVELOPE_BYTES = 11 * 1024 * 1024


const MAX_PAGINAS_PDF = 20


const VISAO_MAX_OUTPUT = 300


const VISAO_TIMEOUT_MS = 12_000


const PROMPT_VISAO_ANEXO =
  'Você recebe UMA imagem que o dono da empresa anexou numa conversa com um agente. ' +
  'Descreva em até 3 linhas, em português: o que é a imagem, o que está ESCRITO nela ' +
  '(transcreva os textos e números visíveis) e o essencial visual (elementos, cores, ' +
  'hierarquia). NÃO invente nada que não esteja na imagem. Responda só a descrição, ' +
  'sem preâmbulo.'


function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout de ${ms}ms`)), ms)
    promessa.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}


async function resolverAgente(proposto: string): Promise<string> {
  try {
    const row = await getAgentRow(proposto)
    return row && row.enabled ? proposto : 'jarvis'
  } catch {
    return proposto
  }
}


async function resolverConversa(
  operatorId: string,
  agentId: string,
  proposta: string | undefined,
): Promise<Conversation> {
  if (proposta) {
    const propria = await getConversationForOperator(proposta, operatorId)
    if (propria && (!propria.agent_id || propria.agent_id === agentId)) return propria
  }
  return roomConversation(operatorId, agentId)
}


async function resumirAnexo(args: {
  conteudo: Uint8Array
  kind: KindAnexo
  mediaType: string
  agentId: string
}): Promise<string | null> {
  try {
    if (args.kind === 'documento') {
      
      
      return resumoDePdf(await extrairTextoPdf(args.conteudo.slice()))
    }
    const r = await comTimeout(
      generateBackgroundVision({
        prompt: PROMPT_VISAO_ANEXO,
        image: args.conteudo,
        mediaType: args.mediaType,
        maxOutputTokens: VISAO_MAX_OUTPUT,
      }),
      VISAO_TIMEOUT_MS,
    )
    await recordCost({
      kind: 'chat',
      model: r.model,
      promptTokens: r.usage.inputTokens ?? 0,
      completionTokens: r.usage.outputTokens ?? 0,
      cachedTokens: r.usage.cachedInputTokens ?? 0,
      agent: args.agentId,
      tool: 'anexoResumo',
    })
    const texto = textoSeguroParaBanco(r.text ?? '').trim()
    return texto.length > 0 ? texto : null
  } catch (err) {
    console.warn('[POST /api/conversa/anexos] resumo do anexo falhou (segue sem):', err)
    return null
  }
}

export async function POST(request: Request) {
  const auth = await requireOperatorApi(await cookies())
  if (auth instanceof Response) return auth

  
  
  
  
  
  
  
  const declarado = request.headers.get('content-length') ?? ''
  if (!/^\d+$/.test(declarado)) {
    return NextResponse.json(
      { error: 'Não consegui medir o tamanho desse arquivo. Tente enviar de novo.' },
      { status: 411 },
    )
  }
  if (Number(declarado) > MAX_ENVELOPE_BYTES) {
    return NextResponse.json({ error: COPY_RECUSA.tamanho, motivo: 'tamanho' }, { status: 413 })
  }

  let file: File
  let agentProposto = 'jarvis'
  let conversaProposta: string | undefined
  try {
    const form = await request.formData()
    const f = form.get('file')
    if (!(f instanceof File)) {
      return NextResponse.json({ error: 'Envie o arquivo no campo "file".' }, { status: 400 })
    }
    file = f
    const a = form.get('agentId')
    if (typeof a === 'string' && a.trim()) agentProposto = a.trim()
    const c = form.get('conversationId')
    if (typeof c === 'string' && c.trim()) conversaProposta = c.trim()
  } catch {
    return NextResponse.json({ error: 'multipart/form-data inválido' }, { status: 400 })
  }

  
  
  const valido = validarAnexo({ name: file.name, mime: file.type, size: file.size })
  if (!valido.ok) {
    return NextResponse.json({ error: valido.copy, motivo: valido.motivo }, { status: 400 })
  }

  try {
    const conteudo = new Uint8Array(await file.arrayBuffer())

    
    
    if (valido.kind === 'documento') {
      const paginas = await pdfNumPages(conteudo)
      if (paginas > MAX_PAGINAS_PDF) {
        return NextResponse.json(
          {
            error: `Esse PDF tem ${paginas} páginas e aqui na conversa eu leio até ${MAX_PAGINAS_PDF}. ` +
              'Para um documento longo, use o Cérebro: lá a empresa aprende o arquivo inteiro.',
            motivo: 'paginas',
          },
          { status: 400 },
        )
      }
    }

    const agentId = await resolverAgente(agentProposto)
    const conversa = await resolverConversa(auth.id, agentId, conversaProposta)

    
    
    
    const hash = createHash('sha256').update(conteudo).digest('hex').slice(0, 16)
    const path = `${ANEXO_PREFIX}${conversa.id}/${hash}.${valido.ext}`
    const { error } = await serverDb()
      .storage.from('artifacts')
      .upload(path, Buffer.from(conteudo), { contentType: valido.mediaType, upsert: true })
    if (error) throw new FalhaDeAnexo('guardar', error.message)

    
    
    const existente = await getArtifactByStorageRef(conversa.id, path)
    if (existente) {
      return NextResponse.json({
        id: existente.id,
        kind: existente.kind,
        title: existente.title,
        bytes: file.size,
        conversationId: conversa.id,
      })
    }

    const summary = await resumirAnexo({
      conteudo,
      kind: valido.kind,
      mediaType: valido.mediaType,
      agentId,
    })

    
    
    
    
    
    let artifact: Awaited<ReturnType<typeof createArtifact>>
    try {
      artifact = await createArtifact({
        conversation_id: conversa.id,
        agent_id: 'operador',
        kind: valido.kind,
        title: valido.nome,
        storage_ref: path,
        summary,
      })
    } catch (err) {
      throw new FalhaDeAnexo('registrar', err instanceof Error ? err.message : String(err))
    }

    
    
    return NextResponse.json({
      id: artifact.id,
      kind: artifact.kind,
      title: artifact.title,
      bytes: file.size,
      conversationId: conversa.id,
    })
  } catch (err) {
    console.error('[POST /api/conversa/anexos]', err)
    const etapa = err instanceof FalhaDeAnexo ? err.etapa : 'servidor'
    return NextResponse.json({ error: COPY_FALHA_ANEXO[etapa], motivo: etapa }, { status: 500 })
  }
}
