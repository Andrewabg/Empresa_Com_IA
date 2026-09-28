

import { getPersonaCampos } from '@/data/treino'
import { compilarPersona } from '@/lib/treino/persona'

export async function carregarPersonaBlock(
  agentId: string,
  deps: { getCampos?: typeof getPersonaCampos } = {},
): Promise<string> {
  const getCampos = deps.getCampos ?? getPersonaCampos
  return compilarPersona(await getCampos(agentId))
}
