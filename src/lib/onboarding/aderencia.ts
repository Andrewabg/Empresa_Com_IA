
import { palavrasDe } from './texto'
import { NOME_EMPRESA_ID } from './perfis'
import { IDS_PRE_EMPRESA } from './preEmpresa'


export const LEXICO_TOPICO: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  [NOME_EMPRESA_ID, ['nome da empresa', 'chama a empresa', 'chama sua empresa']],
  ['o-que-faz', ['o que a empresa faz', 'o que voce faz', 'ramo', 'segmento', 'atua']],
  ['publico', ['publico', 'cliente', 'persona', 'quem compra', 'quem contrata', 'atende quem']],
  ['oferta', ['produto', 'servico', 'oferec', 'vende', 'portfolio', 'catalogo', 'entrega o que']],
  ['receita', ['preco', 'ticket', 'fatur', 'cobra', 'plano', 'mensalidade', 'margem', 'receita', 'ganha dinheiro', 'monetiz']],
  ['metas', ['meta', 'objetivo', 'foco', 'trimestre', 'crescer', 'conquistar', 'alcancar', 'proximos meses', 'proximo ano']],
  ['processos', ['processo', 'fluxo', 'etapa', 'passo a passo', 'da venda a entrega', 'operacao roda']],
  ['pessoas', ['equipe', 'time', 'funcionario', 'socio', 'colaborador', 'quem faz o que', 'quantas pessoas']],
  ['ferramentas', ['ferramenta', 'sistema', 'plataforma', 'canal', 'canais', 'crm', 'whatsapp', 'instagram', 'planilha']],
  ['posicionamento', ['diferenc', 'concorrenc', 'concorrente', 'posicionament', 'unico', 'melhor que']],
  ['restricoes', ['nunca deve', 'nao pode', 'limite', 'regra', 'restric', 'proibi', 'compliance', 'evitar']],
])


export const LEXICO_PRE_EMPRESA: ReadonlyMap<string, readonly string[]> = new Map<string, readonly string[]>([
  ['projeto-ideia', ['o que voce quer montar', 'qual e a ideia', 'quer montar', 'pretende montar', 'quer criar', 'ideia do negocio']],
  ['projeto-publico', ['pra quem', 'para quem', 'quem voce quer atender', 'atender quem', 'publico', 'cliente', 'quem vai comprar']],
  ['projeto-estagio', ['em que pe', 'ja testou', 'ja vendeu', 'ja fez', 'ja colocou de pe', 'ate agora', 'estagio', 'validou']],
])


export function ultimaPergunta(texto: string): string {
  const t = (texto ?? '').trim()
  if (!t.includes('?')) return t
  
  const ateUltimaInterrogacao = t.slice(0, t.lastIndexOf('?') + 1)
  const partes = ateUltimaInterrogacao.split(/(?<=[.!?])\s+/).filter(Boolean)
  return partes[partes.length - 1] ?? ateUltimaInterrogacao
}


function pontuar(normalizado: string, marcas: readonly string[]): number {
  let n = 0
  for (const marca of marcas) if (normalizado.includes(marca)) n++
  return n
}


export function topicoDaPergunta(
  texto: string,
  lexico: ReadonlyMap<string, readonly string[]> = LEXICO_TOPICO,
): string | null {
  const normalizado = palavrasDe(ultimaPergunta(texto)).join(' ')
  if (!normalizado) return null

  let vencedor: string | null = null
  let maior = 0
  let segundo = 0
  for (const [id, marcas] of lexico) {
    const p = pontuar(normalizado, marcas)
    if (p > maior) { segundo = maior; maior = p; vencedor = id }
    else if (p > segundo) segundo = p
  }
  if (maior >= 2 && maior > segundo) return vencedor
  if (maior === 1 && segundo === 0) return vencedor
  return null
}


export function detectarDrift(
  textoDoTurno: string,
  slotEmJogo: string | null | undefined,
  acionaveis: readonly string[],
): string | null {
  
  
  const deProjeto =
    IDS_PRE_EMPRESA.includes(slotEmJogo ?? '') || acionaveis.some((id) => IDS_PRE_EMPRESA.includes(id))
  const alvo = topicoDaPergunta(textoDoTurno, deProjeto ? LEXICO_PRE_EMPRESA : LEXICO_TOPICO)
  if (!alvo || alvo === slotEmJogo) return null
  return acionaveis.includes(alvo) ? alvo : null
}
