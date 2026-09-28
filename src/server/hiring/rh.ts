
import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

import { getSecret, SECRET_KEYS } from '../secrets'
import { NotConfiguredError } from '../brain/runtime'
import { applyBriefPatch, slugsUsaveis, type BriefPatch, type FerramentaBrief, type HiringBrief, type HiringMode } from '@/lib/hiring/brief'
import { hiringCoverage } from '@/lib/hiring/coverage'
import { getSession, patchBrief, setSpecDraft, bumpSpecGen } from '@/data/hiringSessions'
import { getAgentRow, type AgentRow } from '@/data/agents'
import { resolverToolkits, slugifyMencao, type ResolvedToolkit, type ResolverDeps } from './resolver'
import { montarCandidato, type CandidatoDeps } from './candidato'
import { projetarAgenteAtual } from './revisao'
import { generateAgentSpec, type ArchitectDeps } from '../agent/architect'
import { listarAcoesConectadas } from '../actions/actions'
import { listConnectedToolkitSlugs, checkToolkitConnections } from '../config/connections'
import {
  HIRING_TOOLKIT_DATA_TYPE,
  HIRING_CANDIDATO_DATA_TYPE,
  type ToolkitCardData,
  type CandidatoCardData,
  type CandidatoAntes,
} from '../agent/wireTypes'


export const RH_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


const MAX_SYSTEM_PROMPT_CHARS = 20_000


const GEN_CAP = 25


export type HiringEmitPart =
  | { type: typeof HIRING_TOOLKIT_DATA_TYPE; data: { toolkit: ToolkitCardData }; transient: true }
  | { type: typeof HIRING_CANDIDATO_DATA_TYPE; data: { candidato: CandidatoCardData }; transient: true }

export interface RhBuildDeps {
  
  resolver?: ResolverDeps
  
  architect?: ArchitectDeps
  
  candidato?: CandidatoDeps
  
  revisao?: {
    getAgentRow?: (id: string) => Promise<AgentRow | null>
    listConnected?: () => Promise<string[]>
    nameBySlug?: () => Promise<Map<string, string>>
  }
  
  model?: string
}




export function refreshBriefConexoes(brief: HiringBrief, slugsConectados: string[]): HiringBrief {
  const ativos = new Set(slugsConectados.map((s) => s.toUpperCase()))
  let out = brief
  for (const f of brief.ferramentas) {
    const promovivel = f.status === 'sugerido' || f.status === 'aguardando_conexao' || f.status === 'pendente'
    if (promovivel && ativos.has(f.slug.toUpperCase())) {
      out = applyBriefPatch(out, { ferramenta: { ...f, status: 'conectada' } })
    }
  }
  return out
}


export function renderBriefing(brief: HiringBrief): string {
  const linhas: string[] = []
  if (brief.papel) linhas.push(`Papel: ${brief.papel}`)
  if (brief.missao) linhas.push(`Missão: ${brief.missao}`)
  if (brief.resultado) linhas.push(`Resultado bem feito: ${brief.resultado}`)
  if (brief.tom) linhas.push(`Tom desejado: ${brief.tom}`)
  if (brief.nome) linhas.push(`Nome sugerido pelo dono: ${brief.nome}`)

  if (brief.semFerramentas) {
    linhas.push('Ferramentas: nenhuma — o dono confirmou que este agente não precisa de ferramentas externas.')
  } else if (brief.ferramentas.length) {
    linhas.push('Ferramentas (status literal do enum — use como fonte da verdade):')
    for (const f of brief.ferramentas) {
      linhas.push(`- ${f.name} (slug: ${f.slug}) — status: ${f.status}`)
    }
  }

  if (brief.fronteiras.length) {
    linhas.push('Fronteiras (o agente NUNCA pode):')
    for (const fr of brief.fronteiras) linhas.push(`- ${fr}`)
  }
  if (brief.fronteirasPadrao) {
    linhas.push('Fronteiras: o dono aceitou o padrão — toda ação que altera algo pede aprovação humana.')
  }
  return linhas.join('\n')
}



export const RH_PERSONA = `Você é o RH desta empresa: o entrevistador que ajuda o dono a contratar um funcionário de IA sob medida.

## Identidade
Caloroso, direto e 100% amigável pra quem não é técnico. Você conduz uma entrevista curta pra entender o que o dono precisa e transforma isso num candidato pronto pra aprovação.

## Princípios
- UMA pergunta por vez — conversa, não interrogatório.
- Zero jargão técnico. NUNCA exponha JSON, slugs ou nomes crus de API — fale sempre o nome de exibição (ex.: "Google Sheets", nunca "googlesheets").
- NUNCA invente integração: se resolverFerramentas não achar, seja honesto e pergunte se o dono quer seguir sem ela (registrando como indisponível).
- Registre TODA resposta útil com registrarBrief (papel, missão, resultado, tom, nome, fronteira, flags) — o que não é registrado se perde.
- Quando o dono citar apps/serviços, chame resolverFerramentas com as menções literais dele.
- Conectar ferramenta é decisão do dono NO CARD que aparece na conversa — iniciarConexao só sinaliza a intenção; NUNCA prometa que conectou.
- A DIRETIVA DO TURNO (mensagem de sistema) manda: ela diz o que ainda falta cobrir e a hora de gerar o candidato.

## Fronteiras
- Você NÃO contrata: o dono aprova o candidato no card (botão Contratar). NUNCA diga que o agente já foi criado.
- Não trate de assuntos fora da contratação — redirecione com gentileza.`



function cardDeFerramenta(f: FerramentaBrief, extra?: Partial<ToolkitCardData>): ToolkitCardData {
  
  
  
  
  return { slug: f.slug, name: f.name, status: f.status, validado: true, ...extra }
}


function pushToolkitCard(emitFila: HiringEmitPart[], card: ToolkitCardData): void {
  emitFila.push({ type: HIRING_TOOLKIT_DATA_TYPE, data: { toolkit: card }, transient: true })
}


export async function toolkitsConectadosFormatoValidate(): Promise<string[]> {
  const actions = await listarAcoesConectadas()
  return [...new Set(actions.map(
    (a: { slug: string; toolkit?: { slug?: string } }) => (a.toolkit?.slug ?? a.slug.split('_')[0]).toUpperCase(),
  ))]
}


async function nameBySlugFromReport(): Promise<Map<string, string>> {
  const r = await checkToolkitConnections().catch(() => null)
  return new Map((r?.toolkits ?? []).map((t) => [t.slug, t.name]))
}

export function buildRhTools(sessionId: string, emitFila: HiringEmitPart[], deps: RhBuildDeps): ToolsInput {
  
  
  let fila: Promise<unknown> = Promise.resolve()
  const serializado = <T>(corpo: () => Promise<T>): Promise<T> => {
    const p = fila.then(corpo, corpo)
    fila = p.catch(() => {})
    return p
  }

  const registrarBrief = createTool({
    id: 'registrarBrief',
    description:
      'Registra no briefing da contratação o que o dono respondeu. Use após CADA resposta útil. Campos de texto: papel (cargo do agente), missao (o que ele faz), resultado (como é o trabalho bem feito), tom, nome (sugestão de nome), fronteira (uma regra do que ele NUNCA faz). Flags: semFerramentas (o dono confirmou que não precisa de ferramentas), fronteirasPadrao (aceitou o padrão: toda ação que altera algo pede aprovação). Ferramentas NÃO entram por aqui — use resolverFerramentas.',
    inputSchema: z.object({
      papel: z.string().optional().describe('O cargo/função do agente, ex.: "Cobrador".'),
      missao: z.string().optional().describe('O que o agente faz, na fala do dono.'),
      resultado: z.string().optional().describe('Como é o resultado bem feito.'),
      tom: z.string().optional().describe('Tom de comunicação desejado.'),
      nome: z.string().optional().describe('Sugestão de nome do agente.'),
      fronteira: z.string().optional().describe('Uma regra do que o agente NUNCA pode fazer.'),
      semFerramentas: z.boolean().optional().describe('true = o dono confirmou que NÃO precisa de ferramentas externas.'),
      fronteirasPadrao: z.boolean().optional().describe('true = o dono aceitou o padrão de aprovação (todo write pede aprovação).'),
    }),
    execute: (patch: BriefPatch) =>
      serializado(async () => {
        const session = await getSession(sessionId)
        if (!session) return { ok: false, erro: 'sessao_inexistente' }
        const next = applyBriefPatch(session.brief, patch)
        await patchBrief(sessionId, next)
        return { ok: true, faltam: hiringCoverage(next, session.mode).missing }
      }),
  })

  const resolverFerramentas = createTool({
    id: 'resolverFerramentas',
    description:
      'Resolve apps/serviços que o dono citou ("planilha", "o zap", "RD") em integrações reais e mostra o card de cada uma pro dono decidir. Passe as menções LITERAIS do dono. marcarIndisponivel: menções que o dono CONFIRMOU seguir sem integração (após você avisar que não existe). Sem match = seja honesto; nunca invente.',
    inputSchema: z.object({
      mencoes: z.array(z.string()).describe('Menções literais de apps/serviços na fala do dono.'),
      marcarIndisponivel: z.array(z.string()).optional().describe('Menções confirmadas pelo dono como sem integração (registra como indisponivel).'),
    }),
    execute: ({ mencoes, marcarIndisponivel }: { mencoes: string[]; marcarIndisponivel?: string[] }) =>
      serializado(async () => {
        const session = await getSession(sessionId)
        if (!session) return { erro: 'sessao_inexistente' }
        let next = session.brief
        const resolvidos: { slug: string; name: string }[] = []
        const semMatch: string[] = []
        const vistos = new Set<string>()

        
        
        for (const mencao of mencoes) {
          const achados: ResolvedToolkit[] = await resolverToolkits([mencao], deps.resolver)
          if (!achados.length) {
            semMatch.push(mencao)
            continue
          }
          for (const r of achados) {
            next = applyBriefPatch(next, {
              ferramenta: { mencao, slug: r.slug, name: r.name, status: 'sugerido' },
            })
            if (vistos.has(r.slug)) continue
            vistos.add(r.slug)
            resolvidos.push({ slug: r.slug, name: r.name })
            
            
            const efetivo = next.ferramentas.find((f) => f.slug === r.slug)
            pushToolkitCard(emitFila, {
              slug: r.slug,
              name: r.name,
              ...(r.icon ? { icon: r.icon } : {}),
              ...(r.activation ? { activation: r.activation } : {}),
              status: efetivo?.status ?? 'sugerido',
              validado: r.validado,
            })
          }
        }

        
        
        
        for (const m of marcarIndisponivel ?? []) {
          const sintetico = slugifyMencao(m)
          if (!sintetico) continue
          next = applyBriefPatch(next, {
            ferramenta: { mencao: m, slug: `indisponivel:${sintetico}`, name: m, status: 'indisponivel' },
          })
          const efetivo = next.ferramentas.find((f) => f.slug === `indisponivel:${sintetico}`)
          if (efetivo) pushToolkitCard(emitFila, cardDeFerramenta(efetivo, { validado: false }))
        }

        if (next !== session.brief) await patchBrief(sessionId, next)
        return { resolvidos, semMatch }
      }),
  })

  const iniciarConexao = createTool({
    id: 'iniciarConexao',
    description:
      'Sinaliza que o dono quer conectar uma ferramenta AGORA: o card dela entra em modo de conexão pro dono concluir com um clique. NÃO conecta nada sozinho — a conexão é o clique do dono no card. Use o slug retornado por resolverFerramentas.',
    inputSchema: z.object({ slug: z.string().describe('Slug da ferramenta já resolvida (veja resolverFerramentas).') }),
    execute: ({ slug }: { slug: string }) =>
      serializado(async () => {
        const session = await getSession(sessionId)
        if (!session) return { erro: 'sessao_inexistente' }
        const ferr = session.brief.ferramentas.find((f) => f.slug === slug)
        if (!ferr) {
          return { erro: 'ferramenta_desconhecida', detalhe: 'Este slug não está no briefing — resolva com resolverFerramentas antes.' }
        }
        const next = applyBriefPatch(session.brief, { ferramenta: { ...ferr, status: 'aguardando_conexao' } })
        await patchBrief(sessionId, next)
        const efetivo = next.ferramentas.find((f) => f.slug === slug) ?? ferr
        pushToolkitCard(emitFila, cardDeFerramenta(efetivo))
        return { ok: true, status: efetivo.status, aviso: 'O dono conclui a conexão no card — não prometa que já conectou.' }
      }),
  })

  const gerarCandidato = createTool({
    id: 'gerarCandidato',
    description:
      'Gera o CANDIDATO (o funcionário de IA pronto pra aprovação) a partir do briefing coberto. Só funciona quando a diretiva do turno disser que a cobertura está completa — antes disso a tool recusa. NÃO contrata: o dono aprova no card.',
    inputSchema: z.object({}),
    execute: () =>
      serializado(async () => {
        const session = await getSession(sessionId)
        if (!session) return { erro: 'sessao_inexistente' }
        
        if (session.spec_gen_count >= GEN_CAP) return { erro: 'muitas_geracoes' }
        const brief = session.brief
        const cov = hiringCoverage(brief, session.mode)
        if (!cov.done) return { erro: 'cobertura_incompleta', faltam: cov.missing }

        
        
        
        
        
        await bumpSpecGen(sessionId)

        
        
        
        
        
        const usaveis = brief.semFerramentas ? [] : slugsUsaveis(brief)

        try {
          
          
          
          
          
          
          const baseFn = deps.architect?.availableComposioToolkits ?? toolkitsConectadosFormatoValidate
          const archDeps: ArchitectDeps = {
            ...deps.architect,
            availableComposioToolkits: async () => {
              let base: string[] = []
              try {
                base = await baseFn()
              } catch {
                base = [] 
              }
              return [...new Set([...base.map((s) => s.toUpperCase()), ...usaveis.map((s) => s.toUpperCase())])]
            },
          }
          const spec = await generateAgentSpec(
            {
              cargo: brief.papel ?? 'Especialista',
              instrução: brief.missao ?? '',
              toolsDesejadas: usaveis,
              briefing: renderBriefing(brief),
            },
            archDeps,
          )
          if (spec.system_prompt.length > MAX_SYSTEM_PROMPT_CHARS) {
            return { erro: 'geracao_falhou', detalhe: 'A persona gerada veio grande demais — tente gerar de novo.' }
          }
          
          
          let antes: CandidatoAntes | undefined
          if (session.mode === 'revisao' && session.agent_id) {
            try {
              const getRow = deps.revisao?.getAgentRow ?? getAgentRow
              const alvo = await getRow(session.agent_id)
              if (alvo) {
                const connected = await (deps.revisao?.listConnected ?? (() => listConnectedToolkitSlugs()))().catch(() => [])
                const nameBySlug = deps.revisao?.nameBySlug
                  ? await deps.revisao.nameBySlug()
                  : await nameBySlugFromReport()
                antes = projetarAgenteAtual(alvo, { connectedSlugs: connected, nameBySlug })
              }
            } catch (err) {
              console.warn('[gerarCandidato] projeção do "antes" falhou (segue sem diff):', err)
            }
          }
          const candidato = await montarCandidato(spec, brief, deps.candidato, antes)
          await setSpecDraft(sessionId, spec, candidato)
          emitFila.push({ type: HIRING_CANDIDATO_DATA_TYPE, data: { candidato }, transient: true })
          return { ok: true, candidato: { nome: candidato.nome, papel: candidato.papel, missao: candidato.missao } }
        } catch (err) {
          console.warn('[gerarCandidato] geração falhou (RH avisa e oferece retry):', err instanceof Error ? err.message : err)
          return { erro: 'geracao_falhou' }
        }
      }),
  })

  return { registrarBrief, resolverFerramentas, iniciarConexao, gerarCandidato } as unknown as ToolsInput
}




export function buildRhAgent(
  apiKey: string,
  sessionId: string,
  _mode: HiringMode,
  emitFila: HiringEmitPart[],
  deps: RhBuildDeps = {},
): Agent {
  const openai = createOpenAI({ apiKey })
  return new Agent({
    id: 'rh',
    name: 'RH',
    instructions: RH_PERSONA,
    model: openai(deps.model ?? RH_MODEL),
    tools: buildRhTools(sessionId, emitFila, deps),
  })
}


export async function getRhAgent(
  sessionId: string,
  mode: HiringMode,
  emitFila: HiringEmitPart[],
  deps: RhBuildDeps = {},
): Promise<Agent> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  return buildRhAgent(apiKey, sessionId, mode, emitFila, deps)
}
