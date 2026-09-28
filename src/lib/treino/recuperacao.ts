


import { MAX_TURNS_QUERY, MAX_QUERY_CHARS } from '@/lib/canais/recuperacaoBudget'

export interface ItemBase { titulo: string; conteudo: string; tipo?: 'fato' | 'playbook' }

const NOTA_VAZIO =
  '## Conhecimento aplicável\n' +
  'Nada encontrado na base sobre este assunto. Responda SÓ com o que a base/ficha sustenta; ' +
  'se não houver como sustentar a resposta, use `escalarHumano` e NÃO invente.'

export function ultimaMensagemCliente(mensagens: { role: string; content: string }[]): string | null {
  for (let i = mensagens.length - 1; i >= 0; i--) {
    if (mensagens[i].role === 'user') return mensagens[i].content
  }
  return null
}


export function queryDeRecuperacao(mensagens: { role: string; content: string }[], maxTurns: number = MAX_TURNS_QUERY): string | null {
  const ditas = mensagens.filter((m) => m.role === 'user').map((m) => m.content)
  if (!ditas.length) return null
  const ultimas = ditas.slice(-Math.max(1, maxTurns))
  let out = ultimas.join('\n')
  if (out.length > MAX_QUERY_CHARS) out = out.slice(out.length - MAX_QUERY_CHARS)
  return out
}

export function montarBlocoConhecimento(itens: ItemBase[]): string {
  const fatos = itens.filter((i) => i.tipo !== 'playbook')
  const play = itens.filter((i) => i.tipo === 'playbook')
  if (!fatos.length && !play.length) return NOTA_VAZIO
  const linhas: string[] = []
  if (fatos.length) {
    linhas.push('## Conhecimento aplicável (fatos da empresa)')
    for (const f of fatos) linhas.push(`- ${f.titulo}: ${f.conteudo}`)
  }
  if (play.length) {
    if (linhas.length) linhas.push('')
    linhas.push('## Como responder aqui (playbook)')
    for (const p of play) linhas.push(`- ${p.titulo}: ${p.conteudo}`)
  }
  return linhas.join('\n')
}
