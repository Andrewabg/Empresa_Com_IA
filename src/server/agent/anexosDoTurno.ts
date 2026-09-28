
import { getArtifact as realGetArtifact, moverArtifactParaConversa as realMover, type ArtifactRow, type MoverArtifactArgs } from '../../data/artifacts'
import { isAnexoDeConversa } from '../../lib/artifacts'
import { mediaTypePelaExtensao, type KindAnexo } from '../../lib/conversa/anexo'
import type { AnexoResolvido } from '../../lib/conversa/partes'
import { serverDb } from '../supabase'


export interface AnexoDoTurno extends AnexoResolvido {
  
  id: string
  kind: KindAnexo
}


export type MotivoRecusaAnexo = 'posse' | 'download'

export type ResultadoAnexosDoTurno =
  | { ok: true; anexos: AnexoDoTurno[] }
  | { ok: false; motivo: MotivoRecusaAnexo }

export interface AnexosDoTurnoDeps {
  getArtifact: (id: string) => Promise<ArtifactRow | null>
  moverArtifactParaConversa: (args: MoverArtifactArgs) => Promise<boolean>
  
  baixarBytes: (storageRef: string) => Promise<Uint8Array | null>
}

const DEFAULT_DEPS: AnexosDoTurnoDeps = {
  getArtifact: realGetArtifact,
  moverArtifactParaConversa: realMover,
  baixarBytes: async (storageRef) => {
    const { data, error } = await serverDb().storage.from('artifacts').download(storageRef)
    if (error || !data) {
      console.warn('[anexosDoTurno] download do anexo falhou:', error?.message)
      return null
    }
    return new Uint8Array(await data.arrayBuffer())
  },
}


export const TETO_DOWNLOAD_MS = 8_000

interface Falha { falha: MotivoRecusaAnexo }

function ehFalha(x: AnexoDoTurno | Falha): x is Falha {
  return (x as Falha).falha !== undefined
}


async function resolverUm(
  id: string,
  args: { conversationId: string; operatorId: string; agentId: string },
  deps: AnexosDoTurnoDeps,
): Promise<AnexoDoTurno | Falha> {
  const art = await deps.getArtifact(id)
  
  
  
  if (!art || !isAnexoDeConversa(art)) return { falha: 'posse' }

  
  
  
  
  if (art.conversation_id !== args.conversationId) {
    const movido = await deps.moverArtifactParaConversa({
      artifactId: art.id,
      operatorId: args.operatorId,
      agentId: args.agentId,
      paraConversaId: args.conversationId,
    })
    if (!movido) return { falha: 'posse' }
  }

  const ref = art.storage_ref
  const mediaType = ref ? mediaTypePelaExtensao(ref) : null
  if (!ref || !mediaType) return { falha: 'download' }

  const bytes = await deps.baixarBytes(ref)
  if (!bytes || bytes.byteLength === 0) return { falha: 'download' }

  return {
    id: art.id,
    kind: art.kind === 'imagem' ? 'imagem' : 'documento',
    nome: art.title || 'arquivo',
    mediaType,
    bytes,
  }
}


export async function resolverAnexosDoTurno(
  args: {
    anexoIds: string[]
    conversationId: string
    operatorId: string
    agentId: string
    
    timeoutMs?: number
  },
  deps?: Partial<AnexosDoTurnoDeps>,
): Promise<ResultadoAnexosDoTurno> {
  if (args.anexoIds.length === 0) return { ok: true, anexos: [] }
  const d = { ...DEFAULT_DEPS, ...deps }
  const teto = args.timeoutMs ?? TETO_DOWNLOAD_MS

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const trabalho = Promise.all(args.anexoIds.map((id) => resolverUm(id, args, d)))
    const estouro = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), teto)
    })
    const r = await Promise.race([trabalho, estouro])
    if (r === 'timeout') {
      console.warn(`[anexosDoTurno] download estourou ${teto}ms — turno recusado`)
      return { ok: false, motivo: 'download' }
    }
    
    
    const primeira = r.find(ehFalha)
    if (primeira) return { ok: false, motivo: (primeira as Falha).falha }
    return { ok: true, anexos: r as AnexoDoTurno[] }
  } catch (e) {
    
    console.warn('[anexosDoTurno] falha ao resolver os anexos do turno:', e)
    return { ok: false, motivo: 'download' }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
