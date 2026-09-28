












import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { generateBackgroundObject } from '@/server/cost/backgroundLLM'
import { recordCost } from '@/data/cost'
import { planejarConsolidacao, type Veredito } from '@/lib/treino/consolidar'
import { aplicarRegrasOuro, type RegraOuro } from '@/lib/treino/regrasOuro'
import { getPersonaCampos, setPersonaCampos } from '@/data/treino'
import { searchBase, setEntradaEnabled } from '@/data/baseConhecimento'
import { salvarEntradaBase } from '@/server/canais/baseActions'
import { embedTexto } from '@/server/canais/embed'



const VereditoSchema = z.object({
  acao: z.enum(['ADD', 'UPDATE', 'DELETE', 'NOOP']),
  alvoId: z.string().nullable(),
  texto: z.string().nullable(),
  motivo: z.string(),
})



export interface ConsolidarRegraDeps {
  generate?: typeof generateBackgroundObject
  getCampos?: typeof getPersonaCampos
  setCampos?: typeof setPersonaCampos
  recordCost?: typeof recordCost
  novoId?: () => string
  at?: () => string
}


export async function consolidarRegraOuro(
  agentId: string,
  candidato: { texto: string },
  deps: ConsolidarRegraDeps = {},
): Promise<{ lista: RegraOuro[]; idAfetado: string | null }> {
  const generate = deps.generate ?? generateBackgroundObject
  const getCampos = deps.getCampos ?? getPersonaCampos
  const setCampos = deps.setCampos ?? setPersonaCampos
  const record = deps.recordCost ?? recordCost
  const novoId = deps.novoId ?? (() => randomUUID())
  const at = deps.at ?? (() => new Date().toISOString())

  const campos = await getCampos(agentId)
  const atuais: RegraOuro[] = campos.regras_de_ouro ?? []

  const listagem = atuais.length
    ? atuais.map((r) => `${r.id}: ${r.texto}`).join('\n')
    : '(nenhuma regra ainda)'
  const prompt = [
    'Você mantém o conjunto de REGRAS DE OURO (invioláveis) de um atendente. O conjunto é',
    'pequeno (no máximo 7) — decida como incorporar a regra CANDIDATA sem inflar nem duplicar.',
    '',
    'Regras atuais (id: texto):',
    listagem,
    '',
    `Regra candidata: "${candidato.texto}"`,
    '',
    'Escolha UMA ação:',
    '- ADD: a candidata é uma regra NOVA e distinta. Devolva `texto` = a candidata; `alvoId` null.',
    '- UPDATE: a candidata refina/complementa UMA regra existente. Devolva `texto` = o texto',
    '  FUNDIDO (uma só regra clara) e `alvoId` = o id da regra existente.',
    '- DELETE: a candidata CONTRADIZ uma regra existente (recência vence). Devolva `alvoId` =',
    '  o id da regra contradita e `texto` = a candidata (que a substitui).',
    '- NOOP: a candidata é redundante (já coberta). `alvoId` e `texto` null.',
    '',
    'Sempre preencha `motivo` com uma justificativa curta.',
  ].join('\n')

  const { object, usage, model } = await generate({ schema: VereditoSchema, prompt })
  await record({
    kind: 'chat',
    model,
    promptTokens: usage.inputTokens ?? 0,
    completionTokens: usage.outputTokens ?? 0,
    cachedTokens: usage.cachedInputTokens ?? 0,
    agent: agentId,
    tool: 'treinoConsolida',
  })

  const plano = planejarConsolidacao(
    object as Veredito,
    atuais.map((r) => ({ id: r.id, texto: r.texto })),
  )

  let nova: RegraOuro[]
  let idAfetado: string | null
  switch (plano.tipo) {
    case 'add': {
      const id = novoId()
      nova = [...atuais, { id, texto: plano.texto, at: at() }]
      idAfetado = id
      break
    }
    case 'update': {
      nova = atuais.map((r) => (r.id === plano.alvoId ? { ...r, texto: plano.texto, at: at() } : r))
      idAfetado = plano.alvoId
      break
    }
    case 'supersede': {
      const id = novoId()
      nova = [...atuais.filter((r) => r.id !== plano.alvoId), { id, texto: plano.texto, at: at() }]
      idAfetado = id
      break
    }
    case 'noop':
    default: {
      nova = atuais
      idAfetado = null
      break
    }
  }

  nova = aplicarRegrasOuro(nova)

  if (idAfetado !== null) {
    await setCampos(agentId, { ...campos, regras_de_ouro: nova })
  }

  return { lista: nova, idAfetado }
}




const ReflexaoRegrasSchema = z.object({
  regras: z.array(z.object({ texto: z.string() })),
})

export interface ReconsolidarRegraDeps {
  generate?: typeof generateBackgroundObject
  getCampos?: typeof getPersonaCampos
  setCampos?: typeof setPersonaCampos
  recordCost?: typeof recordCost
  novoId?: () => string
  at?: () => string
}


export async function reconsolidarRegrasOuro(
  agentId: string,
  deps: ReconsolidarRegraDeps = {},
): Promise<{ mudou: boolean }> {
  const generate = deps.generate ?? generateBackgroundObject
  const getCampos = deps.getCampos ?? getPersonaCampos
  const setCampos = deps.setCampos ?? setPersonaCampos
  const record = deps.recordCost ?? recordCost
  const novoId = deps.novoId ?? (() => randomUUID())
  const at = deps.at ?? (() => new Date().toISOString())

  const campos = await getCampos(agentId)
  const atuais: RegraOuro[] = campos.regras_de_ouro ?? []

  
  if (atuais.length < 2) return { mudou: false }

  const listagem = atuais.map((r, i) => `${i + 1}. ${r.texto}`).join('\n')
  const prompt = [
    'Você mantém o conjunto de REGRAS DE OURO (invioláveis) de um atendente. Ao longo do',
    'tempo, regras redundantes/sobrepostas se acumulam. Sua tarefa: devolver o conjunto',
    'DEDUPADO/FUNDIDO — funda regras redundantes ou sobrepostas numa só, clara; mantenha',
    'DISTINTAS as regras invioláveis genuinamente diferentes; NUNCA invente regras novas',
    'nem adicione conteúdo que não estava nas atuais; no máximo 7 regras.',
    '',
    'Regras atuais:',
    listagem,
    '',
    'Devolva `regras` = a lista final (cada item só com `texto`).',
  ].join('\n')

  const { object, usage, model } = await generate({ schema: ReflexaoRegrasSchema, prompt })
  await record({
    kind: 'chat',
    model,
    promptTokens: usage.inputTokens ?? 0,
    completionTokens: usage.outputTokens ?? 0,
    cachedTokens: usage.cachedInputTokens ?? 0,
    agent: agentId,
    tool: 'treinoReflexao',
  })

  const retornadas = (object as z.infer<typeof ReflexaoRegrasSchema>).regras ?? []
  
  const disponiveis = [...atuais]
  const nova: RegraOuro[] = retornadas
    .map((r) => r.texto.trim())
    .filter(Boolean)
    .map((texto) => {
      const idx = disponiveis.findIndex((r) => r.texto.trim() === texto)
      if (idx >= 0) {
        const [preservada] = disponiveis.splice(idx, 1)
        return preservada
      }
      return { id: novoId(), texto, at: at() }
    })

  const finalizada = aplicarRegrasOuro(nova)

  
  const igual =
    finalizada.length === atuais.length &&
    finalizada.every((r, i) => r.texto.trim() === atuais[i].texto.trim())
  if (igual) return { mudou: false }

  await setCampos(agentId, { ...campos, regras_de_ouro: finalizada })
  return { mudou: true }
}



export interface ConsolidarPlaybookDeps {
  generate?: typeof generateBackgroundObject
  embed?: typeof embedTexto
  searchBase?: typeof searchBase
  salvar?: typeof salvarEntradaBase
  setEntradaEnabled?: typeof setEntradaEnabled
  recordCost?: typeof recordCost
  k?: number
}


export async function consolidarPlaybook(
  agentId: string,
  candidato: { titulo: string; conteudo: string },
  deps: ConsolidarPlaybookDeps = {},
): Promise<{ ok: boolean; id?: string }> {
  const generate = deps.generate ?? generateBackgroundObject
  const embed = deps.embed ?? embedTexto
  const buscar = deps.searchBase ?? searchBase
  const salvar = deps.salvar ?? salvarEntradaBase
  const desativar = deps.setEntradaEnabled ?? setEntradaEnabled
  const record = deps.recordCost ?? recordCost

  const embedding = await embed(candidato.conteudo)
  const similares = await buscar({
    pergunta: candidato.conteudo,
    embedding,
    agentId,
    tipo: 'playbook',
    k: deps.k ?? 5,
  })

  const listagem = similares.length
    ? similares.map((s) => `${s.id}: ${s.titulo} — ${s.conteudo}`).join('\n')
    : '(nenhum playbook similar)'
  const prompt = [
    'Você mantém o PLAYBOOK de atendimento (situação → como agir) de um atendente. Decida',
    'como incorporar a entrada CANDIDATA em relação às entradas SIMILARES já existentes.',
    '',
    'Entradas similares (id: título — conteúdo):',
    listagem,
    '',
    `Candidata — título: "${candidato.titulo}"; conteúdo: "${candidato.conteudo}"`,
    '',
    'Escolha UMA ação:',
    '- ADD: a candidata cobre uma situação NOVA e distinta. `alvoId` e `texto` null.',
    '- UPDATE: a candidata refina/complementa UMA entrada existente. Devolva `alvoId` = o id',
    '  dela e `texto` = o conteúdo FUNDIDO (que vira o novo conteúdo).',
    '- DELETE: a candidata CONTRADIZ uma entrada existente (recência vence). Devolva `alvoId`',
    '  = o id da entrada contradita e `texto` = o conteúdo da candidata (que a substitui).',
    '- NOOP: a candidata é redundante (já coberta). `alvoId` e `texto` null.',
    '',
    'Sempre preencha `motivo` com uma justificativa curta.',
  ].join('\n')

  const { object, usage, model } = await generate({ schema: VereditoSchema, prompt })
  await record({
    kind: 'chat',
    model,
    promptTokens: usage.inputTokens ?? 0,
    completionTokens: usage.outputTokens ?? 0,
    cachedTokens: usage.cachedInputTokens ?? 0,
    agent: agentId,
    tool: 'treinoConsolida',
  })

  const plano = planejarConsolidacao(
    object as Veredito,
    similares.map((s) => ({ id: s.id, texto: s.conteudo })),
  )

  switch (plano.tipo) {
    case 'add':
      return await salvar({
        titulo: candidato.titulo,
        conteudo: candidato.conteudo,
        agent_id: agentId,
        enabled: true,
        origem: 'aprendizado',
        tipo: 'playbook',
      })
    case 'update':
      return await salvar({
        id: plano.alvoId,
        titulo: candidato.titulo,
        conteudo: plano.texto,
        agent_id: agentId,
        enabled: true,
        origem: 'aprendizado',
        tipo: 'playbook',
      })
    case 'supersede':
      await desativar(plano.alvoId, false)
      return await salvar({
        titulo: candidato.titulo,
        conteudo: plano.texto,
        agent_id: agentId,
        enabled: true,
        origem: 'aprendizado',
        tipo: 'playbook',
      })
    case 'noop':
    default:
      return { ok: true, id: undefined }
  }
}
