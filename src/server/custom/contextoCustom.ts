// src/server/custom/contextoCustom.ts — monta o CustomCtxV2 base. Usado por tools, webhooks e rotinas.
import { serverDb } from '@/server/supabase'
import { getSetting } from '@/data/settings'
import { getSecretCustom, setSecretCustom } from './segredos'
import { construirAcoes } from './acoes'
import type { CustomCtxV2 } from './contrato'

export function construirCtxCustom(ids: { agentId: string | null; operatorId: string | null; conversationId: string | null }): CustomCtxV2 {
  return {
    agentId: ids.agentId,
    operatorId: ids.operatorId,
    conversationId: ids.conversationId,
    db: serverDb,
    getSetting,
    getSecret: getSecretCustom,
    setSecret: setSecretCustom,
    acoes: construirAcoes(),
  }
}
