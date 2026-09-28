
import { z } from 'zod'
import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSecret, SECRET_KEYS } from '../secrets'
import { NotConfiguredError } from '../brain/runtime'
import { buscarCerebro, type NotaCitada } from '../tools/buscarCerebro'
import { getCompanyProfile } from '@/data/settings'
import { listarAcoesConectadas } from '../actions/actions'
import { catalogoDeToolkits } from '@/lib/connections/semAuth'
import { listNoAuthToolkitSlugs } from '@/server/config/noAuthToolkits'
import { listSkillCatalog } from './skills/catalog'
import { validateSkillSlug } from '@/lib/skill-md'
import { recordCost } from '@/data/cost'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


export const REQUIRED_PROMPT_SECTIONS = [
  'Identidade',
  'Princípios',
  'Ferramentas',
  'Aprovações',     
  'Reporte',        
  'Fronteiras',     
  'Tom',
] as const








export const AgentSpecSchema = z.object({
  name: z.string(),
  role: z.string(),
  system_prompt: z.string(),
  tools: z.object({
    buscarCerebro: z.boolean(),
    proporMemoria: z.boolean(),
    composio: z.boolean(),
    emitirArtefato: z.boolean(), 
    gerarImagem: z.boolean(),    
  }),
  composio_toolkits: z.array(z.string()),
  brain_read_scopes: z.array(z.string()),
  skills: z.array(z.string()), 
  
  
  
  
  skill_nova: z.object({
    autorar: z.boolean(),
    slug: z.string(),
    description: z.string(),
    instructions: z.string(),
  }),
  budget: z.object({
    per_task_usd: z.number(),
    per_invocation_steps: z.number(),
  }),
})
export type AgentSpec = z.infer<typeof AgentSpecSchema>

export class AgentSpecError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgentSpecError'
  }
}


export function validateAgentSpec(raw: unknown, availableToolkits: string[], availableSkills: string[]): AgentSpec {
  let spec: AgentSpec
  try {
    spec = AgentSpecSchema.parse(raw)
  } catch (err) {
    throw new AgentSpecError(`spec inválido (shape): ${err instanceof Error ? err.message : String(err)}`)
  }
  
  for (const [k, v] of [['name', spec.name], ['role', spec.role], ['system_prompt', spec.system_prompt]] as const) {
    if (!String(v).trim()) throw new AgentSpecError(`campo "${k}" vazio`)
  }
  const lower = spec.system_prompt.toLowerCase()
  const missing = REQUIRED_PROMPT_SECTIONS.filter((s) => !lower.includes(`## ${s.toLowerCase()}`))
  if (missing.length) {
    throw new AgentSpecError(`system_prompt não cobre as seções obrigatórias: ${missing.join(', ')}`)
  }
  const allowed = new Set(availableToolkits.map((t) => t.toUpperCase()))
  const extra = spec.composio_toolkits.map((t) => t.toUpperCase()).filter((t) => !allowed.has(t))
  if (extra.length) {
    throw new AgentSpecError(`composio_toolkits fora dos disponíveis (least-privilege): ${extra.join(', ')}`)
  }
  
  
  
  
  
  
  
  spec.skills = [...new Set(spec.skills.map((s) => s.trim()).filter(Boolean))]
  const allowedSkills = new Set(availableSkills)
  const extraSkills = spec.skills.filter((s) => !allowedSkills.has(s))
  if (extraSkills.length) throw new AgentSpecError(`skills fora das disponíveis: ${extraSkills.join(', ')}`)
  
  
  
  
  
  
  
  if (spec.skill_nova.autorar) {
    spec.skill_nova.slug = spec.skill_nova.slug.trim()
    const motivo =
      !validateSkillSlug(spec.skill_nova.slug) ? `slug inválido: "${spec.skill_nova.slug}"`
      : !spec.skill_nova.description.trim() ? 'description vazio'
      : !spec.skill_nova.instructions.trim() ? 'instructions vazio'
      : null
    if (motivo) {
      console.warn(`[validateAgentSpec] skill_nova inválida (${motivo}) — degradando para autorar=false; a contratação segue sem a skill nova.`)
      spec.skill_nova.autorar = false
    }
  }
  
  if (!(spec.budget.per_invocation_steps >= 1)) spec.budget.per_invocation_steps = 8
  if (!(spec.budget.per_task_usd > 0)) spec.budget.per_task_usd = 2
  
  
  
  
  spec.tools.buscarCerebro = true
  return spec
}

export interface GenerateAgentSpecInput {
  cargo: string
  instrução: string
  toolsDesejadas?: string[]
  manager_id?: string | null
  
  briefing?: string
}

export interface ArchitectDeps {
  
  generate?: (args: { prompt: string }) => Promise<unknown>
  searchBrain?: (query: string, k?: number) => Promise<NotaCitada[]>
  companyTone?: () => Promise<string | null>
  availableComposioToolkits?: () => Promise<string[]>
  
  availableSkills?: () => Promise<{ slug: string; name: string; description: string }[]>
}

function buildMetaPrompt(args: {
  input: GenerateAgentSpecInput
  identidade: NotaCitada[]
  tone: string | null
  toolkits: string[]
  skills: { slug: string; name: string; description: string }[]
}): string {
  const { input, identidade, tone, toolkits, skills } = args
  const identTxt = identidade.length
    ? identidade.map((n) => `- (${n.caminho}) ${n.título ?? ''}: ${n.trecho}`).join('\n')
    : '(nenhuma nota de identidade encontrada — seja conservador e peça contexto via buscarCerebro)'
  const skillsTxt = skills.length
    ? skills.map((s) => `- ${s.slug}: ${s.description}`).join('\n')
    : '(nenhuma skill na biblioteca)'
  
  
  const briefingTxt = input.briefing?.trim()
    ? `
BRIEFING DA ENTREVISTA COM O DONO:
${input.briefing.trim()}
Este briefing veio de entrevista direta com o dono — ele tem PRECEDÊNCIA sobre inferências suas; respeite ferramentas listadas (composio_toolkits = exatamente os slugs disponíveis abaixo) e fronteiras à risca.
`
    : ''
  return `Você é o ARQUITETO DE AGENTES desta empresa. Gere o SPEC de um novo funcionário de IA.

CARGO PEDIDO: ${input.cargo}
MISSÃO/INSTRUÇÃO: ${input.instrução}
TOOLKITS EXTERNOS DISPONÍVEIS (Composio, least-privilege — escolha SÓ o necessário; alguns não precisam de conta conectada, como COMPOSIO_SEARCH para buscar na web): ${toolkits.length ? toolkits.join(', ') : '(nenhum disponível)'}
${input.toolsDesejadas?.length ? `TOOLS SUGERIDAS PELO OPERADOR: ${input.toolsDesejadas.join(', ')}` : ''}

SKILLS DISPONÍVEIS (escolha as do cargo — equipe o subconjunto EXATO; prefira ≥1, a mais próxima do cargo):
${skillsTxt}

IDENTIDADE DA EMPRESA (do Segundo Cérebro — fundamente nela, NÃO invente):
${identTxt}

TOM DESTA EMPRESA: ${tone ?? '(não definido — use um tom profissional e caloroso)'}
${briefingTxt}
REGRAS DO SPEC:
1. "system_prompt" DEVE ser rico e estruturado com EXATAMENTE estes cabeçalhos markdown, nesta ordem:
   ${REQUIRED_PROMPT_SECTIONS.map((s) => `## ${s}`).join(' · ')}
   - ## Identidade: quem é o agente, o cargo e a missão, ancorado na identidade da empresa.
   - ## Princípios: SEMPRE fundamentar fatos no Cérebro via buscarCerebro e CITAR fontes; NUNCA inventar — se faltar fato, perguntar.
   - ## Ferramentas: como usa as internas (buscarCerebro, proporMemoria) e as externas concedidas.
   - ## Aprovações: toda ação que muda o mundo (enviar, criar, alterar externamente) vira PROPOSTA de aprovação humana; NUNCA prometer feito antes de aprovado.
   - ## Reporte: como reporta o resultado ao gerente de forma objetiva.
   - ## Fronteiras: o que este agente NÃO faz (fora do cargo).
   - ## Tom: adota o tom da empresa.
2. "tools": ligue só o necessário. buscarCerebro=true quase sempre. composio=true SÓ se o cargo precisa de ações externas. emitirArtefato=true para cargos que produzem entregáveis de TEXTO (contrato, proposta, copy, relatório, código); gerarImagem=true SÓ para cargos que produzem IMAGENS.
3. "composio_toolkits": subconjunto EXATO dos toolkits disponíveis acima que o cargo precisa (vazio se composio=false).
4. "brain_read_scopes": pastas/tags do Cérebro que o cargo lê (ex.: "juridico/", "vendas/"). Vazio = lê tudo.
5. "skills": subconjunto EXATO dos slugs disponíveis acima que o cargo usa (ex.: um Jurídico equipa "contrato-prestacao-servico"). Prefira equipar ao menos a skill mais próxima; [] só se NENHUMA serve.
6. "skill_nova": se ALGUMA skill do catálogo serve ao cargo, autorar:false e equipe a existente (regra forte: PREFIRA equipar; autorar é exceção). SÓ quando NENHUMA skill do catálogo chega perto do cargo, autore uma nova: autorar:true, slug (lowercase-hífen, ≤64), description (1 linha: o que faz e QUANDO usar), instructions (markdown de uma boa skill: ## Objetivo, ## Quando usar, ## Passos, ## Qual verbo chamar — ex.: emitirArtefato/gerarImagem/buscarCerebro). Quando autorar:false, deixe slug/description/instructions como strings vazias.
7. "budget": { per_task_usd, per_invocation_steps } sensatos para o cargo (ex.: 1–3 USD, 6–10 passos).
8. "name": um nome humano curto para o agente; "role": o cargo.
9. Inclua SEMPRE todos os campos do JSON: tools com os 5 booleanos (buscarCerebro/proporMemoria/composio/emitirArtefato/gerarImagem), composio_toolkits, brain_read_scopes e skills como arrays (vazios se não se aplicar), skill_nova com autorar (boolean) + slug/description/instructions (strings, vazias se autorar:false), e budget com per_task_usd e per_invocation_steps numéricos.
Devolva SOMENTE o objeto do spec.`
}

export async function generateAgentSpec(
  input: GenerateAgentSpecInput,
  deps: ArchitectDeps = {},
): Promise<AgentSpec> {
  const searchBrain = deps.searchBrain ?? ((q: string, k?: number) => buscarCerebro(q, k ?? 5))
  const companyTone = deps.companyTone ?? (async () => (await getCompanyProfile()).voiceTone)
  const availableToolkitsFn =
    deps.availableComposioToolkits ??
    (async () => {
      const actions = await listarAcoesConectadas()
      
      
      
      
      
      
      const conectados = [
        ...new Set(
          actions.map((a: { slug: string; toolkit?: { slug?: string } }) =>
            (a.toolkit?.slug ?? a.slug).toUpperCase(),
          ),
        ),
      ]
      
      
      
      
      
      
      
      return catalogoDeToolkits(conectados, await listNoAuthToolkitSlugs())
    })
  const availableSkillsFn = deps.availableSkills ?? (async () => listSkillCatalog())

  const [identidade, tone, toolkits, skillCatalog] = await Promise.all([
    searchBrain(`identidade missão valores tom da empresa para o cargo ${input.cargo}`, 6),
    companyTone(),
    availableToolkitsFn(),
    availableSkillsFn(),
  ])
  const skillSlugs = skillCatalog.map((s) => s.slug)

  const prompt = buildMetaPrompt({ input, identidade, tone, toolkits, skills: skillCatalog })

  const generate =
    deps.generate ??
    (async ({ prompt: p }: { prompt: string }) => {
      const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
      if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
      const openai = createOpenAI({ apiKey })
      const { object, usage } = await generateObject({ model: openai(MODEL), schema: AgentSpecSchema, prompt: p })
      
      
      
      try {
        await recordCost({
          kind: 'chat',
          model: MODEL,
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          cachedTokens: usage.cachedInputTokens ?? 0,
          agent: 'architect',
        })
      } catch {
        
      }
      return object
    })

  const raw = await generate({ prompt })
  return validateAgentSpec(raw, toolkits, skillSlugs)
}
