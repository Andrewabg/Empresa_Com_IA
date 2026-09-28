





import { auditarConta, type ContaSnapshot, type AuditResultado } from '@/lib/google-ads/audit'
import { minerarNgrams, ordenarDesperdicio, ordenarMauPagador } from '@/lib/google-ads/ngram'
import { projetarFimDeMes, type PacingMensalInput, type PacingMensal } from '@/lib/google-ads/pacing'
import type { SearchTermRow } from '@/lib/google-ads/types'

export interface RaioXInput {
  conta: ContaSnapshot
  searchTerms: SearchTermRow[]
  
  pacing: PacingMensalInput | null
  
  cpaTeto: number | null
}

export interface DesperdicioItem { fragmento: string; clicks: number; cost: number }
export interface MauPagadorItem { fragmento: string; clicks: number; cost: number; conversions: number; cpa: number }

export interface RaioX {
  score: number
  achados: AuditResultado['achados']
  
  desperdicio: DesperdicioItem[]
  totalDesperdicio: number
  
  mauPagador: MauPagadorItem[]
  pacing: PacingMensal | null
  cpaTeto: number | null
}


export function montarRaioX(input: RaioXInput): RaioX {
  const audit = auditarConta(input.conta)
  const aggs = minerarNgrams(input.searchTerms)

  const desperdicioAggs = ordenarDesperdicio(aggs).slice(0, 8)
  const desperdicio: DesperdicioItem[] = desperdicioAggs.map((a) => ({ fragmento: a.fragmento, clicks: a.clicks, cost: a.cost }))
  const totalDesperdicio = desperdicioAggs.reduce((s, a) => s + a.cost, 0)

  const mauPagador: MauPagadorItem[] = input.cpaTeto != null
    ? ordenarMauPagador(aggs)
        .filter((a) => (a.cpa as number) > (input.cpaTeto as number))
        .slice(0, 3)
        .map((a) => ({ fragmento: a.fragmento, clicks: a.clicks, cost: a.cost, conversions: a.conversions, cpa: a.cpa as number }))
    : []

  const pacing = input.pacing ? projetarFimDeMes(input.pacing) : null

  return { score: audit.score, achados: audit.achados, desperdicio, totalDesperdicio, mauPagador, pacing, cpaTeto: input.cpaTeto }
}






function reais(n: number): string {
  return `R$ ${Math.round(n).toLocaleString('pt-BR')}`
}


const ACHADO_LEIGO: Record<string, string> = {
  sem_conversao: 'Sua conta não está registrando as vendas (rastreamento de conversão desligado). É o problema mais grave: sem isso o Google otimiza no escuro e você não sabe o que dá retorno.',
  anuncio_reprovado: 'Há anúncio reprovado — ele para de aparecer e você perde clientes sem saber.',
  sem_negativas: 'Você não tem lista de palavras negativas: está pagando por buscas que nunca viram cliente.',
  conflito_keyword: 'Há palavras concorrendo entre si (conflito/duplicata) — você dá lance contra si mesmo e encarece o clique.',
  grupos_fora_stag: 'Os grupos de anúncio estão mal organizados (fora do padrão de tema único), o que derruba a qualidade e sobe o custo.',
  sem_enhanced_conversions: 'Dá pra deixar o rastreamento mais preciso (Enhanced Conversions) e o Google mira melhor.',
}


export function renderRaioX(r: RaioX, opts: { demo: boolean; negocio: string; contaAtiva?: boolean }): string {
  const linhas: string[] = []

  if (opts.demo) {
    linhas.push('🔬 RAIO-X DA CONTA — MODO DEMONSTRAÇÃO')
    linhas.push(`Esta é uma análise de EXEMPLO, com uma conta fictícia (${opts.negocio}), só pra você ver como eu trabalho. NÃO é a sua conta real — ela entra assim que o Google liberar o acesso de leitura.`)
  } else {
    linhas.push('🔬 RAIO-X DA CONTA (dados reais)')
    linhas.push(`Conta: ${opts.negocio}.`)
    if (opts.contaAtiva === false) {
      linhas.push('Estou conectado na sua conta, mas ela não tem campanha ativa gastando agora. Então o que dá pra ver hoje é a FUNDAÇÃO/estrutura — quando você ativar uma campanha, eu passo a enxergar desperdício, custo por cliente e ritmo de gasto de verdade.')
    }
  }
  linhas.push('')

  
  linhas.push(`NOTA DE SAÚDE: ${r.score}/100.`)
  if (r.achados.length) {
    linhas.push('O que está puxando a nota pra baixo (mais grave primeiro):')
    for (const a of r.achados) {
      const txt = ACHADO_LEIGO[a.chave] ?? a.chave
      linhas.push(`- ${txt}`)
    }
  } else {
    linhas.push('Fundamentos em ordem — sem problema estrutural grave.')
  }
  linhas.push('')

  
  if (r.desperdicio.length) {
    linhas.push(`DINHEIRO QUEIMADO: ${reais(r.totalDesperdicio)} em palavras que gastam e não trazem cliente. As piores:`)
    for (const d of r.desperdicio) {
      linhas.push(`- "${d.fragmento}" — ${reais(d.cost)} em ${d.clicks} cliques, zero venda. Candidata a palavra negativa.`)
    }
  } else {
    linhas.push('DINHEIRO QUEIMADO: nada relevante — não há palavra gastando alto sem retorno.')
  }
  linhas.push('')

  
  if (r.cpaTeto != null && r.mauPagador.length) {
    linhas.push(`ACIMA DO SEU TETO (custo por cliente máximo ${reais(r.cpaTeto)}): estas trazem cliente, mas caro demais:`)
    for (const m of r.mauPagador) {
      linhas.push(`- "${m.fragmento}" — cada cliente custa ${reais(m.cpa)} (teto ${reais(r.cpaTeto)}). Reveja lance ou palavra antes de escalar.`)
    }
    linhas.push('')
  }

  
  if (r.pacing) {
    const p = r.pacing
    const pct = Math.round(p.utilizacao * 100)
    if (p.status === 'acima') linhas.push(`RITMO DE GASTO: no ritmo atual você fecha o mês em ${reais(p.projecao)} — ${pct}% da meta. Vai ESTOURAR o orçamento; segure o passo ou suba a meta com consciência.`)
    else if (p.status === 'sub') linhas.push(`RITMO DE GASTO: projeção de ${reais(p.projecao)} no mês — ${pct}% da meta. Está SOBRANDO verba; há espaço pra escalar o que funciona.`)
    else linhas.push(`RITMO DE GASTO: projeção de ${reais(p.projecao)} no mês — ${pct}% da meta. No trilho.`)
    linhas.push('')
  }

  
  linhas.push('PRÓXIMOS PASSOS (na ordem certa):')
  const passos: string[] = []
  if (r.achados.some((a) => a.chave === 'sem_conversao')) passos.push('1. Ligar o rastreamento de conversão — sem isso, nada mais funciona direito.')
  if (r.achados.some((a) => a.chave === 'anuncio_reprovado')) passos.push('Resolver o anúncio reprovado pra voltar a aparecer.')
  if (r.desperdicio.length) passos.push(`Negativar as palavras de desperdício e recuperar ~${reais(r.totalDesperdicio)}/mês.`)
  if (r.achados.some((a) => a.chave === 'sem_negativas')) passos.push('Subir uma lista de palavras negativas universal.')
  if (r.mauPagador.length) passos.push('Rever as palavras acima do teto (lance/estrutura) antes de escalar.')
  if (!passos.length) passos.push('Escalar com disciplina o que já prova retorno abaixo do teto.')
  passos.forEach((p, i) => linhas.push(p.startsWith('1.') ? p : `${i + 1}. ${p}`))
  linhas.push('')
  linhas.push('Cada mudança na conta eu te apresento pra aprovar antes de aplicar — nada vai ao ar sem o seu ok.')

  return linhas.join('\n')
}
