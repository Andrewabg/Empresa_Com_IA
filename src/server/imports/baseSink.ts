

import { salvarEntradaBase } from '@/server/canais/baseActions'
import type { FatoDestilado } from './distiller'

export interface BaseSinkDeps { salvar?: typeof salvarEntradaBase }


export async function enfileirarFatosNaBase(
  baseAgentId: string | null,
  fatos: FatoDestilado[],
  deps: BaseSinkDeps = {},
): Promise<number> {
  const salvar = deps.salvar ?? salvarEntradaBase
  let n = 0
  for (const f of fatos) {
    try {
      const r = await salvar({
        titulo: f.titulo,
        conteudo: f.corpo,
        agent_id: baseAgentId,
        tipo: 'fato',
        enabled: false,
        origem: 'aprendizado',
      })
      if (r.ok) n++
    } catch (e) {
      console.warn('[baseSink] fato pulado (fail-open):', e)
    }
  }
  return n
}
