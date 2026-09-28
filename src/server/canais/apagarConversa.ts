























import { getConversa as getConversaDefault, deleteConversa as deleteConversaDefault, type ConversaExternaRow } from '@/data/conversasExternas'
import { listStoragePathsConversa as listStoragePathsDefault } from '@/data/mensagensExternas'
import { serverDb } from '@/server/supabase'
import { BUCKET_MIDIA } from './media'

export interface ApagarConversaDeps {
  getConversa: (id: string) => Promise<ConversaExternaRow | null>
  listStoragePaths: (conversaId: string) => Promise<string[]>
  deleteConversa: (id: string) => Promise<void>
  
  removerObjetos: (paths: string[]) => Promise<void>
}

export async function defaultApagarConversaDeps(): Promise<ApagarConversaDeps> {
  return {
    getConversa: getConversaDefault,
    listStoragePaths: listStoragePathsDefault,
    deleteConversa: deleteConversaDefault,
    removerObjetos: async (paths) => {
      const { error } = await serverDb().storage.from(BUCKET_MIDIA).remove(paths)
      if (error) throw new Error(error.message)
    },
  }
}

export type ApagarConversaResultado =
  | { ok: true }
  | { ok: false; reason: 'nao_encontrada' | 'nao_fechada' }

export async function apagarConversa(
  conversaId: string,
  d: ApagarConversaDeps,
): Promise<ApagarConversaResultado> {
  const conversa = await d.getConversa(conversaId)
  if (!conversa) return { ok: false, reason: 'nao_encontrada' }
  if (conversa.status !== 'fechada') return { ok: false, reason: 'nao_fechada' }

  const paths = await d.listStoragePaths(conversaId)
  await d.deleteConversa(conversaId)

  if (paths.length > 0) {
    try {
      await d.removerObjetos(paths)
    } catch (e) {
      console.warn('[apagarConversa] objeto(s) não removido(s) do bucket (linha já apagada):', e)
    }
  }
  return { ok: true }
}
