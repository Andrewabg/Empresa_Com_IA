
import { clampBody } from './brain-merge-audit'
import { PARA_ORDER } from './brain-nav'


export const REGRAS_MERGE = [
  '- O material candidato é uma SEÇÃO coerente de um documento (não um fato solto). Decida "merge" APENAS se ela for claramente a MESMA seção/tópico de uma nota existente (mesma entidade E mesmo assunto); caso contrário "create" uma nota nova. Ao mesclar, preserve TODOS os números e condições das DUAS.',
  '- Uma entidade do mundo real = UMA entrada. Se a candidata detalha alguém/algo já citado na nota, FUNDA na entrada existente; NUNCA crie um segundo item pra mesma pessoa/coisa.',
  '- PRESERVE todos os fatos da nota existente. Só remova um fato se a candidata o CONTRADIZ explicitamente.',
  '- É PROIBIDO usar placeholder/TODO/"completar depois"/"se necessário"/"etc". Se não sabe um detalhe, OMITA o item — nunca invente um marcador.',
  '- Merge é ADITIVO por padrão: o "body" resultante contém tudo que a nota tinha + o que a candidata acrescenta, deduplicado.',
  '- Contradição: vence a de maior confidence; empate -> a mais recente; explique no "reason".',
].join('\n')


export function buildSiblingMergePrompt(irmas: { titulo: string; corpo: string }[]): string {
  return [
    'Você é o Curador do Segundo Cérebro. Recebe SEÇÕES-IRMÃS candidatas do MESMO documento, com títulos iguais ou aparentados.',
    'Se são o MESMO tópico/seção, funda numa nota ÚNICA, coesa e auto-contida, preservando TODOS os números e condições de TODAS. Se são tópicos DISTINTOS que só coincidem no título, responda acao "manter_separado".',
    'REGRAS DE FIDELIDADE (críticas):',
    REGRAS_MERGE,
    'Seções-irmãs:',
    irmas.map((s, i) => `--- irmã ${i + 1}: ${s.titulo} ---\n${s.corpo}`).join('\n\n'),
    'Responda: acao ("merge" | "manter_separado"), titulo (o título da nota resultante), corpo (markdown completo, não um diff; vazio se manter_separado), tags (união curada; [] se manter_separado).',
  ].join('\n\n')
}

export interface RelatedNote {
  id: string
  path: string
  body: string
  
  
  title?: string
  tags?: string[]
}


export interface PastaExistente { folder: string; count: number }


export function derivePastas(paths: string[]): PastaExistente[] {
  const counts = new Map<string, number>()
  for (const p of paths) {
    const norm = p.replaceAll('\\', '/').replace(/^\/+/, '')
    const slash = norm.lastIndexOf('/')
    const folder = slash === -1 ? '(raiz)' : norm.slice(0, slash)
    counts.set(folder, (counts.get(folder) ?? 0) + 1)
  }
  const rank = (folder: string) => {
    const topo = folder.split('/')[0]
    const i = PARA_ORDER.indexOf(topo as (typeof PARA_ORDER)[number])
    return i === -1 ? PARA_ORDER.length : i
  }
  return [...counts.entries()]
    .map(([folder, count]) => ({ folder, count }))
    .sort((a, b) => rank(a.folder) - rank(b.folder) || a.folder.localeCompare(b.folder))
}






const RELATED_BODY_BUDGET = 1200

const CRITIC_BODY_BUDGET = 2000

export function buildMergePrompt(input: {
  candidate: { raw_content: string; suggested_type?: string | null; suggested_tags?: string[] }
  related: RelatedNote[]
  
  
  pastasExistentes?: PastaExistente[]
}): string {
  const cand = input.candidate
  const bloco = [
    'Você é o Curador do Segundo Cérebro. Decida o que fazer com a memória candidata.',
    'Ações: "ignore" (ruído/duplicata exata), "create" (inédito), "merge" (já existe nota relacionada).',
    'REGRAS DE MERGE (críticas):',
    REGRAS_MERGE,
  ]

  
  if (input.pastasExistentes && input.pastasExistentes.length > 0) {
    bloco.push(
      [
        'CONVENÇÃO PARA (escolha do "path" numa nota nova):',
        '- Projetos/… = esforços ATIVOS com prazo/objetivo (ex.: uma campanha, um lançamento).',
        '- Areas/… = responsabilidades CONTÍNUAS sem fim (ex.: financeiro, comercial, pessoas).',
        '- Recursos/… = temas/referências de interesse (ex.: playbooks, estudos).',
        '- Arquivo/… = inativo, guardado só para consulta.',
        '- empresa/… = identidade da empresa (entrevista inicial). NÃO é depósito geral: memória de TRABALHO de agente vai para Projetos/Areas/Recursos.',
        'REUSE uma pasta EXISTENTE que case com o assunto; só crie pasta nova se NENHUMA servir.',
        'Tamanho de pasta NÃO é critério: escolha pelo assunto, nunca por ser a pasta com mais notas.',
      ].join('\n'),
      `Pastas existentes (pasta · nº de notas):\n${input.pastasExistentes.map(p => `- ${p.folder} · ${p.count}`).join('\n')}`,
    )
  }

  
  const sinais: string[] = []
  if (cand.suggested_type) sinais.push(`tipo sugerido: ${cand.suggested_type}`)
  if (cand.suggested_tags && cand.suggested_tags.length > 0) sinais.push(`tags sugeridas: ${cand.suggested_tags.join(', ')}`)
  bloco.push(`Candidata:\n${cand.raw_content}${sinais.length > 0 ? `\n(${sinais.join('; ')})` : ''}`)

  
  bloco.push(
    `Notas relacionadas (trechos do meio podem vir omitidos — marcados "[N chars omitidos]"):\n${
      input.related.map(r => {
        const rotulo = [r.title ? `título: ${r.title}` : null, r.tags && r.tags.length > 0 ? `tags: ${r.tags.join(', ')}` : null].filter(Boolean).join(' · ')
        return `- (${r.id}) ${r.path}:${rotulo ? `\n  ${rotulo}` : ''}\n${clampBody(r.body, RELATED_BODY_BUDGET)}`
      }).join('\n\n') || '(nenhuma)'
    }`,
    'REUSE rótulos/tags já existentes nas notas relacionadas quando o assunto for o mesmo (converge a taxonomia; não crie sinônimos).',
    'Em "merge", "body" é o corpo COMPLETO da nota resultante (markdown), não um diff. Se um corpo relacionado veio truncado, PRESERVE integralmente as seções mostradas e mantenha o conteúdo omitido (não apague o que não viu).',
  )

  return bloco.join('\n\n')
}


export function buildRetryPrompt(previousPrompt: string, violations: string[], corpoIntegro?: string): string {
  const blocos = [
    previousPrompt,
    'A TENTATIVA ANTERIOR FOI REJEITADA. Problemas detectados:',
    violations.map(x => `- ${x}`).join('\n'),
  ]
  if (corpoIntegro) {
    blocos.push(
      `CORPO ÍNTEGRO DA NOTA ALVO (acima ele apareceu truncado; este é o texto COMPLETO, use ESTE como base):\n${corpoIntegro}`,
      'NUNCA escreva "[N chars omitidos]" nem qualquer marca de corte no "body": o corte é só do que te mostramos, e agora você tem o texto inteiro.',
    )
  }
  blocos.push('Refaça o "body" corrigindo SÓ esses problemas. NÃO derrube nenhum fato que já estava na nota. NÃO use placeholders. NÃO duplique entidades.')
  return blocos.join('\n\n')
}

export function buildCriticPrompt(i: { before: string; candidate: string; proposed: string }): string {
  
  return [
    'Você audita um MERGE de nota do Segundo Cérebro. Compare e responda com rigor.',
    `NOTA ANTES:\n${clampBody(i.before, CRITIC_BODY_BUDGET) || '(vazia)'}`,
    `MEMÓRIA CANDIDATA:\n${i.candidate}`,
    `CORPO PROPOSTO (resultado do merge):\n${clampBody(i.proposed, CRITIC_BODY_BUDGET)}`,
    [
      'Aponte: fatos da nota antiga que SUMIRAM no proposto (lost_facts);',
      'entidades (pessoa/coisa) citadas mais de uma vez como itens distintos (duplicated_entities);',
      'marcadores/placeholders/TODO (placeholders); fatos contraditos sem justificativa (contradictions).',
      'verdict: "clean" se nada disso; "fixable" se há problema corrigível num retry; "escalate" se é arriscado e precisa de humano.',
    ].join(' '),
  ].join('\n\n')
}
