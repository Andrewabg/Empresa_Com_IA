



import { searchBase as searchBaseDefault } from '@/data/baseConhecimento'
import { embedTexto } from './embed'
import { montarBlocoConhecimento, queryDeRecuperacao, ultimaMensagemCliente } from '@/lib/treino/recuperacao'
import { PUSH_K, SIM_CUTOFF_FATO } from '@/lib/canais/recuperacaoBudget'
import { filtrarPorRelevancia } from '@/lib/canais/relevancia'
import { topicoSensivel } from '@/lib/canais/escalacao'
import { expandirBase } from './expansaoBase'

const BASE_INDISPONIVEL =
  '## Conhecimento aplicável\n' +
  'Base indisponível agora. NÃO invente fatos da empresa; se precisar de um dado que não ' +
  'tem certeza, use `escalarHumano`.'

const NUDGE_SENSIVEL =
  '\n\n⚠️ A mensagem parece envolver assunto sensível (reembolso/cancelamento/jurídico). Se você não ' +
  'tem um playbook EXPLÍCITO da base que resolva com segurança, use `escalarHumano` em vez de improvisar.'

export interface RecuperarDeps {
  embed?: (t: string) => Promise<number[]>
  searchBase?: typeof searchBaseDefault
  expandir?: typeof expandirBase
  k?: number
}


export async function recuperarEInjetar(
  agentId: string,
  mensagens: { role: string; content: string }[],
  deps: RecuperarDeps = {},
): Promise<string> {
  const pergunta = queryDeRecuperacao(mensagens)
  if (!pergunta) return ''
  const embed = deps.embed ?? embedTexto
  const searchBase = deps.searchBase ?? searchBaseDefault
  try {
    
    const embedding = await embed(pergunta, undefined, agentId)
    const res = await searchBase({ pergunta, embedding, agentId, k: deps.k ?? PUSH_K })
    const filtrados = filtrarPorRelevancia(res, SIM_CUTOFF_FATO)
    
    
    
    const vizinhos = filtrados.length
      ? await (deps.expandir ?? expandirBase)(
          filtrados.map((r) => ({ id: r.id, titulo: r.titulo, conteudo: r.conteudo })),
          agentId,
        )
      : []
    let bloco = montarBlocoConhecimento([
      ...filtrados.map((r) => ({ titulo: r.titulo, conteudo: r.conteudo, tipo: r.tipo })),
      ...vizinhos.map((v) => ({ titulo: v.titulo, conteudo: v.conteudo, tipo: v.tipo })),
    ])
    
    
    const ultima = ultimaMensagemCliente(mensagens)
    if (ultima && topicoSensivel(ultima)) bloco += NUDGE_SENSIVEL
    return bloco
  } catch {
    return BASE_INDISPONIVEL
  }
}
