
import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import { createTool } from '@mastra/core/tools'
import { createOpenAI } from '@ai-sdk/openai'
import { createHash } from 'node:crypto'
import { z } from 'zod'

import { getSecret, SECRET_KEYS } from '../secrets'
import { NotConfiguredError } from '../brain/runtime'
import { buscarCerebro, applyScopes, type NotaCitada } from '../tools/buscarCerebro'
import { makeLerNotaTool, makeListarNotasTool } from '../tools/acervo'
import { buscarNoTranscript, janelaDoAchado } from '../../data/messages'
import { toModelSafeTrechos } from '@/lib/memory/trechosTranscript'
import { pareceTextoDeSocorro } from '@/lib/conversa/fechamentoDoTurno'
import { SEARCH_RECALL_K, TETO_BUSCA_DELIBERADA_CHARS, K_MAXIMO_DA_BUSCA } from '@/lib/memory/recallBudget'
import { aplicarOrcamento } from '@/lib/memory/orcamentoDoPrompt'
import { proporMemoria } from '../tools/proporMemoria'
import { emitirArtefato } from '../tools/emitirArtefato'
import { gerarImagem } from '../tools/gerarImagem'
import { registrarConhecimento } from '../interview/registrar'
import { registrarEntrevista } from '../onboarding/registrarEntrevista'
import type { Profundidade } from '@/lib/onboarding/types'
import { adiarOnboarding } from '../onboarding/adiarOnboarding'
import { TOPIC_IDS_VALIDOS, TOPIC_IDS_CONHECIMENTO } from '@/lib/onboarding/topicoValido'
import { JARVIS_PERSONA, PRIMARY_PERSONA_VERSION, personaWithTone, personaWithDirectives, personaWithPendingTools, personaWithToolSearch, personaWithMemoryContract, personaWithActionContract } from './persona'
import { personaWithIdentity } from '@/lib/agent-identity'
import type { PendingToolNames } from './persona'
import type { ToolSearchProcessor } from '@mastra/core/processors'
import { agentPendingToolkits, isActionAllowed } from '@/lib/toolkit-gating'
import { listConnectedToolkitSlugs, toolkitDisplayName } from '../config/connections'
import { ASSISTANT_NAME } from '@/lib/brand'
import { getCompanyProfile } from '@/data/settings'
import { catalogoComposioDoAgente } from './catalogoDoAgente'
import { makeCustomMastraTools } from '../custom/mastraCustomTools'
import { metaGraphGet } from '../actions/composio'
import { makeComposioToolSearch } from './toolSearch'
import type { AgentRow, AgentSeed, AgentTools } from '@/data/agents'
import { ensurePrimaryAgent, ensureSeedRoster, getAgentRow } from '@/data/agents'
import { contratarAgente, delegarTarefa } from './hiring'
import { consultarFuncionario } from './consultar'
import { cercarRespostaDoColega } from '@/lib/conversa/respostaDoColega'
import { recordCost } from '@/data/cost'
import { planejarObjetivoTool } from './maestro/planejarObjetivo'
import { SEED_COO_AGENT } from './maestro/cooPersona'
import { syncInstalledCargos } from './store/syncInstalledCargos'
import { syncPrimaryAgent } from './store/syncPrimaryPersona'
import { getTurnContext } from './turnContext'
import { podeAtoDeDono, recusarAtoDeDono, podeAgirSobreOLido } from '@/lib/turno/papelDoTurno'
import { applyStyleAdjustment } from '../tools/ajustarEstilo'
import { aplicarAjusteNotificacoes } from '../proativo/prefs'
import { executarLembretes, type LembretesInput } from '../proativo/lembretesOps'
import { executarRotinas, type RotinasInput } from '../rotinas/rotinasOps'
import { executarVigilancia, type VigilanciaInput } from '../proativo/vigilanciaDeclarada'
import { proporDiretriz, anotarAprendizado } from '../tools/registrarDiretriz'
import { buildSkillsWorkspaceForSkills } from './skills/workspace'
import { getDirectives } from '@/data/agentDirectives'
import { memoizeAsyncByKey } from '../cache/ttlMemoize'
import type { Diretriz } from '@/lib/directives'
import { buscarMetricas } from '../tools/trafego/buscarMetricas'
import { montarBloco } from '../tools/trafego/montarBloco'
import { removerBloco } from '../tools/trafego/removerBloco'
import { recomendar } from '../tools/trafego/recomendar'
import { gerarRelatorio } from '../tools/trafego/gerarRelatorio'
import { anotarMemoriaConta } from '../tools/trafego/anotarMemoriaConta'
import { proporEscritaMeta } from '../tools/trafego/proporAcaoMeta'
import { proporPlano } from '../tools/trafego/proporPlano'
import { proporLancarCriativo } from '../tools/trafego/proporLancarCriativo'
import { proporCorrigirConjunto } from '../tools/trafego/proporCorrigirConjunto'
import { proporDesfazer } from '../tools/trafego/proporDesfazer'
import { proporSegmentacao } from '../tools/trafego/proporSegmentacao'
import { calcular } from '../tools/trafego/calcular'
import { consultarMeta } from '../tools/trafego/consultarMeta'
import type { ConsultaMeta } from '@/lib/trafego/graph/tipos'
import { learningStageFromAdset } from '@/lib/trafego/normalize'
import type { BlocoType } from '@/lib/trafego/types'
import { descricoesDeTools, DESCRICAO_DO_CALCULAR } from '@/lib/trafego/descricoesDeTools'
import { gerarPeca } from '../tools/estudio/gerarPeca'
import { pedirArte } from '../tools/estudio/pedirArte'
import { ajustarCopy } from '../tools/estudio/ajustarCopy'
import { recomporCriativo } from '../tools/design/recomporCriativo'
import { remixarCriativo } from '../tools/design/remixarCriativo'
import { produzirCampanha } from '../tools/estudio/produzirCampanha'
import { produzirArtesDaCampanha } from '../tools/estudio/produzirArtesDaCampanha'
import { abrirEntrega, COPY_ABRIR_ENTREGA } from '../entregas/abrirEntrega'
import { normalizarPedido } from '@/lib/entrega/pedido'
import { TETO_DE_PECAS_POR_ENTREGA } from '@/lib/entrega/estimativa'
import { avisoDoTeto } from '@/lib/entrega/copy'
import { pedirCopy } from '../tools/trafego/pedirCopy'
import { pedirCriativo } from '../tools/trafego/pedirCriativo'
import { revisarPeca } from '../tools/estudio/revisarPeca'
import { atualizarFichaMarca } from '../tools/estudio/atualizarFichaMarca'
import { ingerirMarca } from '../tools/estudio/ingerirMarca'
import { minerarVozDoPublico } from '../tools/estudio/minerarVozDoPublico'
import { guardarSwipe } from '../tools/estudio/guardarSwipe'
import { analisarConcorrente } from '../tools/estudio/analisarConcorrente'
import { planejarCampanha } from '../tools/estudio/planejarCampanha'
import type { BrandVoicePatch } from '@/lib/estudio/brandVoice'
import { gerarCriativo } from '../tools/design/gerarCriativo'
import { finalizarCriativo } from '../tools/design/finalizarCriativo'
import { revisarCriativo } from '../tools/design/revisarCriativo'
import { ingerirIdentidadeVisual } from '../tools/design/ingerirIdentidadeVisual'
import { atualizarDirecaoArte } from '../tools/design/atualizarDirecaoArte'
import { iniciarBriefing } from '../tools/design/iniciarBriefing'
import { atualizarBrief } from '../tools/design/atualizarBrief'
import { gerarContrato } from '../tools/juridico/gerarContrato'
import { analisarContrato } from '../tools/juridico/analisarContrato'
import { revisarContrato } from '../tools/juridico/revisarContrato'
import { finalizarContrato } from '../tools/juridico/finalizarContrato'
import { salvarComoModelo } from '../tools/juridico/salvarComoModelo'
import { atualizarFichaJuridica } from '../tools/juridico/atualizarFichaJuridica'
import { ingerirFichaJuridica } from '../tools/juridico/ingerirFichaJuridica'
import { extrairPrazos } from '../tools/juridico/extrairPrazos'
import { listTasksByAgent } from '@/data/tasks'
import { formatAgentDetail } from '@/lib/roster'
import { proporEntradaBaseDoCerebro } from '../canais/baseActions'
import { getCanal } from '@/data/canais'
import { entrevistaFichaTool } from '../tools/google-ads/entrevistaFicha'
import { analisarContaTool } from '../tools/google-ads/analisarConta'
import { listarAutomacoesIg } from '../tools/instagram/listarAutomacoes'
import { lerDesempenhoIg } from '../tools/instagram/lerDesempenho'



import { RECORRENCIAS } from '@/lib/proativo/recorrencia'
import { FREQUENCIAS } from '@/lib/rotinas/agenda'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1'


export const JARVIS_INSTRUCTIONS = JARVIS_PERSONA


export function toModelSafeNotas(notas: NotaCitada[]): Array<Omit<NotaCitada, 'caminho' | 'id' | 'fonte'>> {
  
  
  return notas.map(({ caminho: _caminho, id: _id, fonte: _fonte, ...rest }) => rest)
}


const AVISO_BUSCA_CORTADA =
  'A busca achou mais material do que cabe numa resposta só, então parte ficou de fora. O que veio são as memórias mais relevantes, e NÃO é tudo o que existe sobre isso. Se faltar o que você procura, busque de novo com termos mais específicos.'


function makeBuscarCerebroTool(scopes?: string[], episodicAgentId?: string | null) {
  return createTool({
    id: 'buscarCerebro',
    description:
      'Busca no Segundo Cérebro por notas relevantes a uma pergunta. Retorna notas citadas (título, trecho, agente, quando). Use para ir MAIS FUNDO do que já veio nos blocos de memória do contexto (documento, histórico, nota específica). Cite as fontes pelo TÍTULO, nunca invente caminhos de arquivo.',
    inputSchema: z.object({
      query: z.string().describe('Pergunta ou termos a buscar nas memórias.'),
      k: z.number().int().positive().max(K_MAXIMO_DA_BUSCA).optional().describe(`Número máximo de notas (padrão ${SEARCH_RECALL_K}; até ${K_MAXIMO_DA_BUSCA} para perguntas que cruzam vários documentos).`),
    }),
    
    execute: async ({ query, k }) => {
      
      const notes = await buscarCerebro(query, k ?? SEARCH_RECALL_K, undefined, episodicAgentId ?? null)
      
      const filtradas = applyScopes(notes, scopes, { episodicAgentId })
      
      
      
      if (!filtradas.length) {
        return {
          status: 'sem_memoria',
          instrucao: 'Nenhuma memória encontrada sobre isso. Se for um fato da empresa ou do operador, PERGUNTE — NÃO invente.',
        }
      }
      
      
      
      
      const { mantidas, cortadas, charsUsados } = aplicarOrcamento(filtradas, TETO_BUSCA_DELIBERADA_CHARS)
      const charsPedidos = filtradas.reduce((soma, n) => soma + (n.trecho ?? '').length, 0)
      
      
      
      
      
      const mantidasPorId = new Map(mantidas.map((n) => [n.id, n]))
      
      
      
      
      
      
      
      
      
      const encurtadas = filtradas.filter((n) => {
        const m = mantidasPorId.get(n.id)
        return m ? (m.trecho ?? '').length < (n.trecho ?? '').length : false
      }).length
      const houveCorte = cortadas > 0 || charsUsados < charsPedidos
      if (houveCorte) {
        
        
        
        console.warn(
          `[buscarCerebro] retorno cortado por orçamento (${charsUsados} de ${TETO_BUSCA_DELIBERADA_CHARS} chars; ${cortadas} nota(s) fora, ${encurtadas} encurtada(s)).`,
        )
      }
      
      
      
      const ctx = getTurnContext()
      
      
      
      
      if (ctx.citationsSink) ctx.citationsSink.push(...filtradas.filter((n) => mantidasPorId.has(n.id)))
      const seguras = toModelSafeNotas(mantidas)
      
      
      
      
      if (!houveCorte) return seguras
      return {
        status: 'ok_parcial',
        notas: seguras,
        
        
        
        notas_omitidas: cortadas,
        notas_encurtadas: encurtadas,
        instrucao: AVISO_BUSCA_CORTADA,
      }
    },
  })
}


function makeBuscarConversasTool() {
  return createTool({
    id: 'buscarConversas',
    description:
      'Busca no HISTÓRICO das suas conversas com o dono pelo que foi REALMENTE escrito (texto original, não resumo). Use quando ele se referir a algo já combinado ("como a gente tinha falado", "aquele número que te passei") e isso não estiver no contexto atual. Busca por PALAVRA: use os termos que ele provavelmente digitou, e separe sinônimos com OR (ex.: "comissão OR percentual"). Diferente de buscarCerebro, que busca nas notas do Segundo Cérebro. ' +
      'AO RESPONDER: fale como quem LEMBRA, não como quem cita documento. Vá direto ao dado, sem preâmbulo de origem — nada de "Fonte:", "Segundo a conversa anterior" ou "conforme o histórico", nem no começo nem no fim. A PROVA DE ORIGEM É A INTERFACE: o operador já vê os trechos citados num painel abaixo da sua resposta, então escrever a fonte no texto é repetição. Só mencione QUANDO foi dito se isso mudar a resposta (ex.: ele decidiu duas coisas diferentes em momentos diferentes), e aí em linguagem natural ("quando vocês fecharam o comercial, você disse…").',
    inputSchema: z.object({
      query: z.string().describe('Termos que provavelmente foram digitados. Aceita OR entre sinônimos.'),
      apenasEstaConversa: z.boolean().optional().describe('true = procura só na conversa atual. Default: todas as suas conversas com o dono.'),
    }),
    execute: async ({ query, apenasEstaConversa }) => {
      const ctx = getTurnContext()
      const operatorId = ctx.operatorId
      const agentId = ctx.actingAgentId
      
      if (!operatorId || !agentId) {
        return {
          status: 'sem_memoria',
          instrucao: 'Não consegui consultar o histórico agora. Se for um fato do dono, PERGUNTE — NÃO invente.',
        }
      }
      try {
        const brutos = await buscarNoTranscript({
          operatorId,
          agentId,
          query,
          limite: 5,
          conversationId: apenasEstaConversa ? ctx.conversationId ?? null : null,
        })
        
        
        
        
        const achados = brutos.filter((a) => !pareceTextoDeSocorro(a.content))
        if (!achados.length) {
          return {
            status: 'sem_memoria',
            instrucao: 'Nada encontrado no histórico com esses termos. Tente sinônimos do que ele teria digitado, ou PERGUNTE — NÃO invente.',
          }
        }
        
        const melhor = achados[0]
        let vizinhanca: Awaited<ReturnType<typeof janelaDoAchado>> = []
        try {
          vizinhanca = await janelaDoAchado({ operatorId, agentId, messageId: melhor.message_id, raio: 2 })
        } catch {  }
        
        
        
        
        if (ctx.citationsSink) {
          ctx.citationsSink.push(
            ...achados.map((a) => ({
              id: a.message_id,
              título: a.conversa_titulo ?? 'Conversa anterior',
              
              trecho: (a.snippet || a.content).replace(/<<|>>/g, ''),
              caminho: a.role === 'user' ? 'você disse' : 'você respondeu',
              agente: null,
              quando: a.created_at,
              origem: 'episodic' as const,
            })),
          )
        }
        
        
        
        const daqui = ctx.conversationId
        const semAutoCitacao = achados.map((a) =>
          a.conversation_id === daqui ? { ...a, conversa_titulo: null } : a,
        )
        return {
          status: 'ok',
          trechos: toModelSafeTrechos(semAutoCitacao),
          contexto_do_melhor: vizinhanca.length ? toModelSafeTrechos(vizinhanca) : undefined,
        }
      } catch (e) {
        console.warn('[buscarConversas] falha (o turno segue):', e)
        return {
          status: 'sem_memoria',
          instrucao: 'Não consegui consultar o histórico agora. Se for um fato do dono, PERGUNTE — NÃO invente.',
        }
      }
    },
  })
}


const proporMemoriaTool = createTool({
  id: 'proporMemoria',
  description:
    'Propõe registrar uma nova memória no Segundo Cérebro. O Curador decide criar/mesclar/ignorar; memórias sensíveis viram uma proposta que pede aprovação humana (status pending_approval).',
  inputSchema: z.object({
    título: z.string().describe('Título curto da memória.'),
    conteúdo: z.string().describe('Conteúdo da memória.'),
    tipo: z.string().describe('Tipo da nota (ex.: semantic, episodic).'),
    tags: z.array(z.string()).optional().describe('Tags opcionais.'),
  }),
  execute: async ({ título, conteúdo, tipo, tags }) => {
    return await proporMemoria({ título, conteúdo, tipo, tags })
  },
})


const rascunharMemoriaTool = createTool({
  id: 'rascunharMemoria',
  description:
    'Mostra ao operador um RASCUNHO de memória com botões Registrar/Descartar. NÃO grava — a memória só é salva quando o operador tocar Registrar. NUNCA diga que já salvou. Use esta tool (em vez de afirmar que registrou) sempre que quiser guardar um fato com o operador.',
  inputSchema: z.object({
    título: z.string().describe('Título curto da memória.'),
    conteúdo: z.string().describe('Conteúdo da memória.'),
    tipo: z.string().describe('Tipo da nota. Use "fato" para um FATO atômico e durável da empresa (comissão, ticket médio, CNPJ, público-alvo, política, prazo, dado de conta): ao ser aprovado ele entra no bloco "Fatos da empresa" sempre-on. Para conhecimento textual ou amplo use "semantic"; anotação de conversa use "episodic".'),
    tags: z.array(z.string()).optional().describe('Tags opcionais.'),
  }),
  
  execute: async ({ título, conteúdo, tipo, tags }) => {
    return { shown: true, título, conteúdo, tipo, tags }
  },
})


const registrarConhecimentoTool = createTool({
  id: 'registrarConhecimento',
  description: `Registra conhecimento canônico da empresa no Segundo Cérebro (captura tagueada da entrevista). Use durante a entrevista de bootstrap, com o id do tópico. topicId válido: ${TOPIC_IDS_CONHECIMENTO.join(', ')} (aqui NÃO vale nome-empresa — esse id é só da registrarEntrevista).`,
  inputSchema: z.object({
    
    
    
    
    topicId: z.enum(TOPIC_IDS_CONHECIMENTO).describe('Id do tópico canônico (ex.: o-que-faz, oferta, metas).'),
    conteúdo: z.string().describe('O que o operador respondeu, em texto.'),
  }),
  execute: async ({ topicId, conteúdo }) => {
    
    
    const ctx = getTurnContext()
    return registrarConhecimento({ topicId, conteúdo, operatorId: ctx.operatorId, conversationId: ctx.conversationId ?? undefined })
  },
})


const registrarEntrevistaTool = createTool({
  id: 'registrarEntrevista',
  description: `Registra o que o operador respondeu num tópico da primeira conversa (nascimento guiado). Use SEMPRE após uma resposta substantiva, com o id do tópico. Passe: topicId, conteudo (a nota redigida/normalizada), valor_extraido (o resumo do fato p/ o slot), profundidade (0-3: quão específica/concreta foi a resposta) e precisa_confirmar (true quando ainda precisa de uma confirmação do operador antes de gravar de vez). topicId válido: ${TOPIC_IDS_VALIDOS.join(', ')} (use nome-empresa para o nome da empresa).`,
  inputSchema: z.object({
    
    
    topicId: z.enum(TOPIC_IDS_VALIDOS).describe('Id do tópico canônico (ex.: o-que-faz, publico, oferta, nome-empresa).'),
    conteudo: z.string().describe('O corpo da nota — o que o operador respondeu, redigido/normalizado.'),
    valor_extraido: z.string().describe('Resumo curto do fato, p/ o slot da sessão.'),
    profundidade: z.number().int().min(0).max(3).describe('Profundidade da resposta: 0 vazio/genérico, 3 concreto e específico.'),
    precisa_confirmar: z.boolean().describe('true = ainda aguarda a confirmação do operador antes de gravar (não persiste ainda).'),
  }),
  execute: async ({ topicId, conteudo, valor_extraido, profundidade, precisa_confirmar }) => {
    const ctx = getTurnContext()
    if (!ctx.operatorId) return { status: 'aguardando_confirmacao', message: 'Sem operador no contexto; não consegui salvar a entrevista.' }
    return await registrarEntrevista({
      operatorId: ctx.operatorId,
      conversationId: ctx.conversationId ?? undefined,
      topicId,
      conteúdo: conteudo,
      valor: valor_extraido,
      profundidade: profundidade as Profundidade,
      precisaConfirmar: precisa_confirmar,
      
      
      falaDoDono: ctx.falaDoDono,
    })
  },
})


const adiarEntrevistaTool = createTool({
  id: 'adiarEntrevista',
  description: 'Adia a entrevista de bootstrap quando o operador pede para deixar para depois. Não insista após chamar.',
  inputSchema: z.object({ motivo: z.string().optional().describe('Por que o operador adiou (opcional).') }),
  execute: async ({ motivo }) => {
    const ctx = getTurnContext()
    return await adiarOnboarding({ operatorId: ctx.operatorId, motivo })
  },
})


const contratarAgenteTool = createTool({
  id: 'contratarAgente',
  description: 'Contrata um novo agente (funcionário de IA): gera uma persona completa para o cargo e o adiciona ao organograma. Use quando o operador pedir para contratar/criar um especialista.',
  inputSchema: z.object({
    cargo: z.string().describe('O cargo/função, ex.: Jurídico, Social Media.'),
    instrução: z.string().describe('O que esse agente deve fazer / sua missão.'),
    tools: z.array(z.string()).optional().describe('Tools/toolkits sugeridos (opcional).'),
  }),
  execute: async ({ cargo, instrução, tools }) => {
    const ctx = getTurnContext()
    return await contratarAgente({ cargo, instrução, tools }, { actingAgentId: ctx.actingAgentId })
  },
})



const delegarTarefaTool = createTool({
  id: 'delegarTarefa',
  description: 'Delega uma tarefa a um agente do organograma. A tarefa roda em BACKGROUND — NÃO espere o resultado aqui; quando pronto, ele fica registrado na conversa do painel e em Tarefas (não prometa avisar na hora). Use o id do agente.',
  inputSchema: z.object({
    agentId: z.string().describe('Id do agente que vai executar.'),
    objetivo: z.string().describe('O que fazer, numa frase clara.'),
    budget: z.number().positive().optional().describe('Teto de custo em USD (opcional).'),
  }),
  execute: async ({ agentId, objetivo, budget }) => {
    const ctx = getTurnContext()
    if (!podeAgirSobreOLido(ctx)) return { status: 'error' as const, summary: recusarAtoDeDono(ctx, 'delegarTarefa') }
    return await delegarTarefa({ agentId, objetivo, budget }, { conversationId: ctx.conversationId, actingAgentId: ctx.actingAgentId, operatorId: ctx.operatorId })
  },
})


const emitirArtefatoTool = createTool({
  id: 'emitirArtefato',
  description:
    'Emite um DELIVERABLE para o operador (documento, html, codigo ou dados). Use quando o pedido resulta num texto/arquivo pronto (contrato, landing page HTML, snippet, JSON). O artefato abre num painel ao lado — NÃO cole o conteúdo inteiro na resposta, só resuma.',
  inputSchema: z.object({
    kind: z.enum(['documento', 'html', 'codigo', 'dados']).describe('Tipo do deliverable.'),
    título: z.string().describe('Título curto do artefato.'),
    conteúdo: z.string().describe('O conteúdo completo do deliverable.'),
  }),
  execute: async ({ kind, título, conteúdo }) => {
    const ctx = getTurnContext()
    const res = await emitirArtefato({ kind, título, conteúdo }, { conversationId: ctx.conversationId, taskId: ctx.taskId, agentId: ctx.actingAgentId ?? 'jarvis' })
    return res.output
  },
})


const gerarImagemTool = createTool({
  id: 'gerarImagem',
  description: 'Gera uma IMAGEM a partir de uma descrição. O resultado chega ao operador no canal onde ele está (painel do chat ou foto no Telegram). Use para logos, ilustrações, imagens de marketing.',
  inputSchema: z.object({
    prompt: z.string().describe('Descrição da imagem a gerar.'),
    tamanho: z.enum(['1024x1024', '1024x1536', '1536x1024']).optional().describe('Tamanho da imagem (padrão: 1024x1024).'),
  }),
  execute: async ({ prompt, tamanho }) => {
    const ctx = getTurnContext()
    const res = await gerarImagem({ prompt, tamanho }, { conversationId: ctx.conversationId, taskId: ctx.taskId, agentId: ctx.actingAgentId ?? 'jarvis' })
    return res.output
  },
})


const ajustarEstiloTool = createTool({
  id: 'ajustarEstilo',
  description:
    'Ajusta COMO você se comunica com este usuário quando ele comenta sobre seu estilo (ex.: "seja mais direto", "para de ser formal", "seja mais arrogante", "pode brincar mais"). NÃO use para conteúdo — só para tom/jeito. Os dials vão de -2 a +2 (0 = neutro). Você vê o estado atual injetado nas instruções; calcule o NOVO valor-alvo absoluto.',
  inputSchema: z.object({
    dials: z.object({
      diretude: z.number().int().min(-2).max(2),
      formalidade: z.number().int().min(-2).max(2),
      calor: z.number().int().min(-2).max(2),
      humor: z.number().int().min(-2).max(2),
      assertividade: z.number().int().min(-2).max(2),
      verbosidade: z.number().int().min(-2).max(2),
    }).partial().optional(),
    notas: z.string().optional().describe('Preferências duráveis em texto livre (apelidos, manias). Reescreve as notas atuais.'),
    motivo: z.string().describe('1 frase do que mudou (vira a proveniência do painel).'),
  }),
  execute: async ({ dials, notas, motivo }) => {
    const ctx = getTurnContext()
    if (!ctx.operatorId) return { ok: false, message: 'Sem operador no contexto; não consegui salvar o estilo.' }
    await applyStyleAdjustment(ctx.operatorId, { dials, notas, motivo })
    return { ok: true, message: 'Estilo atualizado. Vou falar assim a partir de agora.' }
  },
})



const ajustarNotificacoesTool = createTool({
  id: 'ajustarNotificacoes',
  description:
    'Ajusta O QUE e QUANDO o dono é notificado no canal dele (Telegram). Use quando ele pedir coisas como "para de me avisar quando tarefa concluir", "me avisa na hora quando X", "briefing às 8h", "não me perturba depois das 21h", "me responde em áudio quando eu mandar voz" (resposta em voz é OPT-IN — desligada por default, ele LIGA pedindo), "no máximo 5 avisos por dia" (tetoDiario — o que passar do teto sempre vai para o resumo diário, nunca se perde). REGRA DURA: preencha APENAS os campos que o dono pediu EXPLICITAMENTE nesta mensagem — NUNCA inclua quietHours, porTipo, respostaVoz ou tetoDiario que ele não mencionou (mudaria configurações sem permissão). Ao confirmar, cite SOMENTE o que a tool retornou como ajustado — não descreva o resto da configuração. Valores por tipo: imediata | briefing | off. Tipos: aprovacao, atendimento_escalado, tarefa_falhou, tarefa_concluida, plano_falhou, plano_concluido, lembrete.',
  inputSchema: z.object({
    porTipo: z.record(z.string(), z.enum(['imediata', 'briefing', 'off'])).optional(),
    quietHours: z.object({ inicio: z.string(), fim: z.string() }).optional().describe('janela de silêncio, HH:MM locais'),
    briefingHora: z.string().optional().describe('hora do briefing diário, HH:MM'),
    respostaVoz: z.boolean().optional().describe('responder com áudio quando o dono manda áudio no Telegram — OPT-IN, desligado por default (true liga quando o dono pedir, false desliga)'),
    tetoDiario: z.number().int().positive().optional().describe('quantas interrupções imediatas o dono aceita por dia (padrão de fábrica: 3); o que passar do teto vai para o resumo diário, nunca se perde'),
  }),
  execute: async ({ porTipo, quietHours, briefingHora, respostaVoz, tetoDiario }) => {
    const ctx = getTurnContext()
    if (!podeAtoDeDono(ctx)) return { ok: false, message: recusarAtoDeDono(ctx, 'ajustarNotificacoes') }
    const r = await aplicarAjusteNotificacoes({ porTipo, quietHours, briefingHora, respostaVoz, tetoDiario })
    return { ok: r.ok, message: r.resumo }
  },
})



const gerenciarLembretesTool = createTool({
  id: 'gerenciarLembretes',
  description:
    'Cria, lista, adia ou cancela LEMBRETES do dono ("me lembra amanhã às 9h de revisar as campanhas"). Converta a linguagem natural do usuário em dueAt ISO-8601 COM offset no fuso configurado do dono (default America/Sao_Paulo). Recorrência: OMITA o campo a menos que o dono peça repetição EXPLÍCITA ("todo dia", "todo dia útil", "toda semana", "todo mês") — pedido pontual ("em 2 minutos", "amanhã às 9h") NUNCA leva recorrência. Ao mandar recorrencia, mande TAMBÉM porqueRepete com as palavras do PRÓPRIO dono que pedem a repetição, copiadas da mensagem dele: sem elas eu marco o lembrete uma vez só e digo isso a ele. "Todo dia útil" é dias_uteis (segunda a sexta, sem feriado). Para cancelar, use o NÚMERO do lembrete na listagem (1, 2, 3…) — liste antes se não souber a posição. Se o dono puser um FIM na repetição ("até sexta", "até o fim do ano", "pelas próximas 4 semanas"), preencha terminaEm com a data do ÚLTIMO dia, em AAAA-MM-DD; o toque desse dia ainda acontece. Sem terminaEm a repetição não acaba nunca. O lembrete chega no canal do dono na hora marcada — inclusive de madrugada (horário explícito fura o silêncio). Para ADIAR um lembrete que ainda NAO tocou ("adia para as 15h", "deixa para amanha"), use acao=adiar com o NUMERO dele na listagem e o dueAt novo: isso REMARCA o mesmo lembrete e preserva o contexto em que ele nasceu, que cancelar e criar de novo perderia. Se ele JA tocou e o dono quer ser cutucado outra vez, ai e acao=criar com o mesmo texto.',
  inputSchema: z.object({
    acao: z.enum(['criar', 'listar', 'cancelar', 'adiar']),
    texto: z.string().optional(),
    dueAt: z.string().optional().describe('ISO-8601 com offset, ex.: 2026-07-05T09:00:00-03:00'),
    recorrencia: z.enum(RECORRENCIAS).optional(),
    porqueRepete: z.string().optional().describe('Só com recorrencia: o trecho CURTO da mensagem do dono que pede a repetição, copiado como ele escreveu (ex.: "todo dia às 9h", "toda segunda"). Não invente e não reescreva; se ele não disse nada que se repita, não mande recorrencia.'),
    terminaEm: z.string().optional().describe('Só com recorrencia: o ÚLTIMO dia em que a repetição toca, AAAA-MM-DD (ex.: 2026-12-31). Omita quando a repetição não tem fim.'),
    lembreteId: z.string().optional().describe('Ao cancelar ou adiar: o NÚMERO do lembrete na listagem (1..N).'),
  }),
  execute: async (input) => {
    const ctx = getTurnContext()
    if (!podeAtoDeDono(ctx)) return { ok: false, message: recusarAtoDeDono(ctx, 'gerenciarLembretes') }
    return executarLembretes(input as LembretesInput)
  },
})



const gerenciarRotinasTool = createTool({
  id: 'gerenciarRotinas',
  description:
    'Cria, lista, pausa, retoma ou remove ROTINAS: trabalho que um FUNCIONÁRIO repete sozinho na hora marcada ("toda segunda às 8h o Rui gera o relatório da semana", "todo dia às 7h me manda o resumo", "todo dia útil às 8h"). DIFERENÇA CRÍTICA pro gerenciarLembretes: lembrete só CUTUCA o dono com um texto; rotina PÕE UM AGENTE PRA TRABALHAR de verdade e entrega o resultado. Se o dono quer que algo SEJA FEITO de tempos em tempos, é rotina; se ele só quer ser avisado, é lembrete. O horário é o de PAREDE do dono (ex.: "08:00"), não converta para UTC. Frequências: diaria, dias_uteis (segunda a sexta, sem feriado), semanal (um dia ou vários, via diasSemana) e mensal. Informe o funcionário pelo nome; sem nome, a rotina fica com você. Rotina se repete por definição: mande porqueRepete com as palavras do PRÓPRIO dono que dizem o ritmo, copiadas da mensagem dele, senão eu não crio. Se ele não disse nada que se repita, era pedido de uma vez só e o certo é gerenciarLembretes. Se o dono puser um FIM ("até o fim do ano", "durante três meses", "até 31/12"), preencha terminaEm com a data do ÚLTIMO dia, em AAAA-MM-DD; a execução desse dia ainda acontece e depois a rotina se encerra sozinha. Sem terminaEm ela roda para sempre. Para pausar/retomar/remover use o NÚMERO da rotina na listagem (liste antes se não souber).',
  inputSchema: z.object({
    acao: z.enum(['criar', 'listar', 'pausar', 'retomar', 'remover']),
    agente: z.string().optional().describe('Nome ou id do funcionário que executa. Ausente = você.'),
    titulo: z.string().optional().describe('Nome curto da rotina (opcional — sai do pedido).'),
    pedido: z.string().optional().describe('O que deve ser feito, como se pedisse a um funcionário.'),
    frequencia: z.enum(FREQUENCIAS).optional(),
    hora: z.string().optional().describe('Horário local do dono, HH:MM (ex.: 08:00).'),
    diaSemana: z.number().optional().describe('0=domingo … 6=sábado. Só na frequência semanal.'),
    diasSemana: z.array(z.number()).optional().describe('0=domingo … 6=sábado. Use quando o dono pedir mais de um dia ("segunda e quinta").'),
    diaMes: z.number().optional().describe('1..31. Só na frequência mensal.'),
    terminaEm: z.string().optional().describe('Último dia em que a rotina roda, AAAA-MM-DD (ex.: 2026-12-31). Omita quando ela não tem fim.'),
    porqueRepete: z.string().optional().describe('O trecho CURTO da mensagem do dono que diz o ritmo, copiado como ele escreveu (ex.: "toda segunda", "todo dia útil"). Não invente e não reescreva; sem ele a rotina não é criada.'),
    rotina: z.string().optional().describe('Ao pausar/retomar/remover: o NÚMERO da rotina na listagem (1..N).'),
  }),
  execute: async (input) => {
    const ctx = getTurnContext()
    if (!podeAtoDeDono(ctx)) return { ok: false, message: recusarAtoDeDono(ctx, 'gerenciarRotinas') }
    return executarRotinas(input as RotinasInput, { actingAgentId: ctx.actingAgentId })
  },
})



const vigiarTool = createTool({
  id: 'vigiar',
  description:
    'Cria uma VIGILÂNCIA permanente sobre o que chega dos clientes (ex.: "me avisa se alguém falar em cancelar", "me chama quando um cliente perguntar sobre reembolso"). O casamento é por PALAVRA ou FRASE no texto da mensagem, em QUALQUER conversa do atendimento — NÃO existe filtro por remetente. NÃO prometa vigiar UMA pessoa específica (ex.: "quando o Fulano responder"): não há como. Se o dono pedir isso, explique a limitação e ofereça vigiar uma PALAVRA que a conversa provavelmente vai usar. Diferente do lembrete (que é por hora) e da rotina (que põe um funcionário para trabalhar): a vigilância espera um acontecimento. Ela avisa no máximo 3 vezes, espera 24 horas entre um aviso e outro, e vence em 90 dias. Se o dono quiser algo em uma hora certa, use gerenciarLembretes. HOJE só vigio o que chega do ATENDIMENTO (mensagens de clientes por WhatsApp/Instagram) — não vigio tarefa terminando, mudança no Cérebro, nem métrica de campanha; se pedirem isso, recuse e explique que ainda não faço. Para cancelar/listar use o NÚMERO da vigilância na listagem (liste antes se não souber).',
  inputSchema: z.object({
    acao: z.enum(['criar', 'listar', 'cancelar']),
    descricao: z.string().optional().describe('O que avisar, em uma frase (ex.: "cliente falou em cancelar").'),
    palavras: z.array(z.string()).optional().describe('Palavras ou frases que, aparecendo na mensagem do cliente, disparam o aviso.'),
    fonte: z.enum(['atendimento', 'tarefa', 'cerebro']).optional().describe('De onde vigiar. Hoje só "atendimento" funciona — os outros ainda não têm vigia; se o dono pedir um dos outros, recuse explicando.'),
    vigilanciaId: z.string().optional().describe('Ao cancelar: o NÚMERO da vigilância na listagem (1..N).'),
  }),
  execute: async (input) => {
    const ctx = getTurnContext()
    if (!podeAtoDeDono(ctx)) return { ok: false, message: recusarAtoDeDono(ctx, 'vigiar') }
    return executarVigilancia(input as VigilanciaInput, { actingAgentId: ctx.actingAgentId, operatorId: ctx.operatorId })
  },
})


const registrarDiretrizTool = createTool({
  id: 'registrarDiretriz',
  description: 'Propõe uma REGRA DURÁVEL no comportamento de um agente contratado (ex.: "nunca usar emoji nas headlines", "sempre validar preço no Cérebro"). Use quando o operador der uma correção/preferência que vale PRA SEMPRE, não só pra uma tarefa. Informe o id do agente. IMPORTANTE: por segurança, a regra NÃO é aplicada na hora — vira uma APROVAÇÃO que o dono confirma em /aprovações antes de valer (evita que conteúdo colado/recebido fixe uma regra num agente sem o dono ver).',
  inputSchema: z.object({
    agentId: z.string().describe('Id do agente que recebe a regra.'),
    diretriz: z.string().describe('A regra fixa, uma frase imperativa.'),
  }),
  execute: async ({ agentId, diretriz }) => {
    const ctx = getTurnContext()
    return proporDiretriz({ agentId, diretriz, actingAgentId: ctx.actingAgentId })
  },
})


const anotarAprendizadoTool = createTool({
  id: 'anotarAprendizado',
  description: 'Registra um APRENDIZADO seu desta tarefa (o que funcionou, o que evitar) para você melhorar nas próximas. Use quando perceber algo que vale lembrar como profissional.',
  inputSchema: z.object({ aprendizado: z.string().describe('O aprendizado, uma frase.') }),
  execute: async ({ aprendizado }) => {
    const ctx = getTurnContext()
    if (!ctx.actingAgentId) return { ok: false, message: 'Sem agente no contexto.' }
    return anotarAprendizado({ agentId: ctx.actingAgentId, aprendizado })
  },
})


const detalharFuncionarioTool = createTool({
  id: 'detalharFuncionario',
  description:
    'Detalha um funcionário do organograma: persona/missão, cargo, gerente, skills e tarefas recentes. Use o id do agente (veja o quadro EQUIPE ATUAL no contexto). Use para responder com precisão sobre o que alguém faz — NUNCA invente.',
  inputSchema: z.object({ agentId: z.string().describe('Id do agente a detalhar.') }),
  execute: async ({ agentId }) => {
    const row = await getAgentRow(agentId)
    if (!row) return { encontrado: false, message: `Não há funcionário com id "${agentId}" no organograma.` }
    const manager = row.manager_id ? await getAgentRow(row.manager_id) : null
    const tasks = (await listTasksByAgent(row.id)).slice(0, 5)
    return {
      encontrado: true,
      detalhe: formatAgentDetail({
        id: row.id, name: row.name, role: row.role,
        managerName: manager?.name ?? null,
        skills: row.skills ?? [],
        systemPrompt: row.system_prompt,
        recentTasks: tasks.map((t) => ({ objective: t.objective, status: t.status })),
      }),
    }
  },
})


const consultarFuncionarioTool = createTool({
  id: 'consultarFuncionario',
  description:
    'Pergunta SÍNCRONA a um funcionário do organograma e traz a resposta dele AGORA (você fala em nome da empresa: "falei com <nome>, ele disse..."). Use para coisas rápidas do domínio dele. Para trabalho que rende conversa, prefira transferir; para trabalho de fundo, delegue. Informe o id do agente.',
  inputSchema: z.object({
    agentId: z.string().describe('Id do funcionário a consultar.'),
    pergunta: z.string().describe('A pergunta, clara e completa.'),
  }),
  execute: async ({ agentId, pergunta }) => {
    const res = await consultarFuncionario({ agentId, pergunta })
    if (res.ok && res.usage) {
      try {
        
        
        await recordCost({ kind: 'chat', model: res.model ?? MODEL, promptTokens: res.usage.inputTokens ?? 0, completionTokens: res.usage.outputTokens ?? 0, cachedTokens: res.usage.cachedInputTokens, agent: agentId })
      } catch {  }
    }
    
    return res.ok ? { nome: res.nome, resposta: cercarRespostaDoColega(res.resposta) } : { erro: res.message }
  },
})


const transferirTool = createTool({
  id: 'transferir',
  description: 'Encaminha o operador para a SALA de outro funcionário (ele passa a falar direto com esse agente). Use quando o assunto rende uma conversa contínua no domínio do especialista — para conselho rápido prefira consultarFuncionario; para trabalho de fundo, delegarTarefa. Informe o id do agente e um resumo curto do contexto pra ele já receber a par.',
  inputSchema: z.object({
    agentId: z.string().describe('Id do funcionário destino.'),
    resumo: z.string().optional().describe('Resumo curto do que o operador precisa (vira a nota de handoff).'),
  }),
  execute: async ({ agentId, resumo }) => ({ transferir: true, agentId, resumo: resumo ?? '' }),
})


const proporConhecimentoAtendimentoTool = createTool({
  id: 'proporConhecimentoAtendimento',
  description:
    'Propõe adicionar um conhecimento à base de ATENDIMENTO de um canal (WhatsApp) a partir de um fato. Vira um RASCUNHO que o dono revisa e publica em /inbox → Base — NÃO fica público na hora. Use quando o dono pedir pra ensinar algo ao atendente (Sofia/Davi), ex.: "põe isso na base do atendimento", "ensina isso pra Sofia". O canalId é opcional — informe-o para mirar UM canal específico; omita para valer em todo o atendimento.',
  inputSchema: z.object({
    titulo: z.string().describe('Título curto do conhecimento (ex.: "Prazo de entrega").'),
    conteudo: z.string().describe('O fato a ensinar ao atendente, em texto claro.'),
    canalId: z.string().optional().describe('Id do canal (WhatsApp) cuja base recebe. Ausente = todos os canais de atendimento.'),
  }),
  execute: async ({ titulo, conteudo, canalId }) => {
    try {
      
      
      let canalAgentId: string | null = null
      if (canalId) {
        const canal = await getCanal(canalId).catch(() => null)
        canalAgentId = canal?.agent_id ?? null
      }
      const res = await proporEntradaBaseDoCerebro({ titulo, conteudo, canalAgentId })
      if (!res.ok) return { ok: false, message: 'Não consegui criar o rascunho — confira se o título e o conteúdo estão preenchidos.' }
      return { ok: true, message: 'Rascunho criado — revise e publique em /inbox → Base. Ele NÃO fica público até você aprovar.' }
    } catch {
      
      return { ok: false, message: 'Não consegui criar o rascunho agora — tente de novo em instantes.' }
    }
  },
})







const BLOCO_TYPES = ['kpi', 'timeseries', 'table', 'funnel', 'comparison', 'creatives', 'audiences', 'goals', 'health', 'recommendation', 'note', 'drilldown', 'plano', 'historico'] as const


function buscarMetricasTrafegoTool(investigacao: boolean) {
  return createTool({
    id: 'buscarMetricasTrafego',
    description: descricoesDeTools(investigacao).buscarMetricasTrafego,
    inputSchema: z.object({
      periodo: z.object({
        preset: z.string().optional().describe('Janela predefinida: last_7d, last_14d, last_30d, today, this_month…'),
        range: z.object({ since: z.string(), until: z.string() }).optional().describe('Intervalo YYYY-MM-DD (alternativa ao preset).'),
      }).optional(),
      nivel: z.enum(['account', 'campaign', 'adset', 'ad']).optional().describe('Granularidade (padrão account).'),
      entidade: z.string().optional().describe('object_id explícito (act_<id> ou id de entidade). Ausente → descobre a conta.'),
    }),
    execute: async ({ periodo, nivel, entidade }) => {
      const ctx = getTurnContext()
      return await buscarMetricas({ periodo, nivel, entidade }, { actingAgentId: ctx.actingAgentId, operatorId: ctx.operatorId })
    },
  })
}


function proporAcaoMetaTool(investigacao: boolean) {
  return createTool({
    id: 'proporAcaoMeta',
    description: descricoesDeTools(investigacao).proporAcaoMeta,
    inputSchema: z.object({
      tipo: z.enum(['pausar', 'reativar', 'orcamento']).describe('pausar (economiza), reativar (retoma) ou orcamento (ajusta orçamento diário).'),
      nivel: z.enum(['campaign', 'adset', 'ad']).optional().describe('Nível da entidade (padrão "campaign"): "adset" = conjunto, "ad" = anúncio individual.'),
      entityId: z.string().optional().describe(descricoesDeTools(investigacao).entityIdDoProporAcaoMeta),
      campaignId: z.string().optional().describe('Id da campanha (compat; equivale a entityId com nivel="campaign"). Use entityId para adset/ad.'),
      valor: z.number().optional().describe('Novo orçamento diário em REAIS — obrigatório quando tipo="orcamento".'),
      nome: z.string().optional().describe('nome da entidade (p/ a mensagem; opcional).'),
      motivo: z.string().optional().describe('por que (ex.: ROAS 0,3× há 5 dias; opcional).'),
      evidencia: z.string().max(300).optional().describe('O número que PROVA o motivo, em uma frase de até 300 caracteres (ex.: "ROAS 0,8x contra 1,9x do normal da conta, 7 dias"). Vai junto do pedido para o dono decidir sem ter que te perguntar.'),
      statusAtual: z.enum(['ACTIVE', 'PAUSED']).optional().describe(descricoesDeTools(investigacao).statusAtualDoProporAcaoMeta),
    }),
    execute: async ({ tipo, nivel, entityId, campaignId, valor, nome, motivo, evidencia, statusAtual }) => {
      const ctx = getTurnContext()
      
      const resolvedEntityId = entityId ?? campaignId ?? ''
      const resolvedNivel = nivel ?? 'campaign'
      return await proporEscritaMeta(
        { tipo, nivel: resolvedNivel, entityId: resolvedEntityId, valorNovo: valor, nome, motivo, evidencia, statusAtual },
        
        
        
        { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, investigacao },
      )
    },
  })
}


const calcularTool = createTool({
  id: 'calcular',
  description: DESCRICAO_DO_CALCULAR,
  inputSchema: z.object({
    sql: z.string().describe('Uma consulta SQLite de leitura (SELECT/WITH), sem ponto e vírgula no meio.'),
    porque: z.string().max(120).optional().describe('O que você quer descobrir com este cálculo, em até 80 caracteres.'),
    conclusaoParcial: z.string().max(300).optional().describe('O que já ficou FIRME até aqui, em uma frase com o número que sustenta. Use para fixar o que você já concluiu: se o tempo da investigação acabar antes do fim, é isto que você vai poder dizer.'),
  }),
  execute: async ({ sql, porque, conclusaoParcial }, context) => {
    const ctx = getTurnContext()
    const hojeISO = new Date().toISOString().slice(0, 10)
    return await calcular({ sql, porque, conclusaoParcial }, { operatorId: ctx.operatorId, hojeISO }, { abortSignal: context?.abortSignal })
  },
})


const consultarMetaTool = createTool({
  id: 'consultarMeta',
  description:
    'Lê a Meta Ads do jeito que você precisar (somente leitura): métricas por qualquer nível, período, incremento (dia/semana/mês) e detalhamento (idade, gênero, região, posicionamento, dispositivo, horário), ou os objetos em si (campanhas, conjuntos, anúncios, criativos, públicos, detalhes de um id). Use para investigar CAUSA ou decidir (por que caiu, vale escalar, onde está o gasto sem retorno), buscando o dado que SEPARA suas hipóteses; leituras independentes podem ir no mesmo passo. O resultado vira uma tabela na bancada (o nome vem na resposta) para você cruzar com calcular. Campos, detalhamentos e filtros vêm de um catálogo: se pedir algo fora dele, a resposta lista o que existe. Diga sempre em porque, em até 80 caracteres, o que quer descobrir. Estados possíveis: "li e veio vazio", "não consegui ler (motivo)" (nunca conclua a partir de leitura falhada) e "cortei". Teto de 40 leituras por conversa; pergunta de estado ("como está?") vai para gerarRelatorio.',
  inputSchema: z.object({
    objeto: z.string().describe('"conta" para a conta selecionada, ou o id numérico de uma campanha, conjunto, anúncio ou criativo.'),
    aresta: z.enum(['insights', 'campanhas', 'conjuntos', 'anuncios', 'criativos', 'detalhes', 'audiencias']).describe('O que ler: insights (métricas), a lista de objetos filhos, ou detalhes do próprio objeto.'),
    tipo: z.enum(['campanha', 'conjunto', 'anuncio', 'criativo']).optional().describe('Em detalhes de um id: o tipo do objeto.'),
    nivel: z.enum(['campanha', 'conjunto', 'anuncio']).optional().describe('Em insights: uma linha por campanha, conjunto ou anúncio. Ausente = o próprio objeto.'),
    campos: z.array(z.string()).max(40).optional().describe('Nomes de campo do catálogo. Ausente = os campos padrão da aresta.'),
    periodo: z.object({
      preset: z.string().optional().describe('last_7d, last_14d, last_30d, last_90d, this_month, last_month, yesterday, today, maximum...'),
      since: z.string().optional().describe('AAAA-MM-DD'),
      until: z.string().optional().describe('AAAA-MM-DD'),
      incremento: z.enum(['dia', 'semana', 'mes', 'total']).optional().describe('Uma linha por dia, semana, mês-calendário, ou o período inteiro (total, o padrão).'),
    }).optional(),
    breakdowns: z.array(z.string()).max(3).optional().describe('Detalhamento em insights, ex.: ["age","gender"] ou ["publisher_platform","platform_position"].'),
    filtros: z.array(z.object({
      campo: z.string(),
      op: z.enum(['igual', 'contem', 'maior', 'menor', 'em']),
      valor: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]),
    })).max(10).optional(),
    ordenar: z.object({ campo: z.string(), direcao: z.enum(['asc', 'desc']) }).optional().describe('Só em insights, por métrica (ex.: spend desc).'),
    limite: z.number().int().optional().describe('Linhas no máximo (padrão 100, teto 500).'),
    porque: z.string().max(200).describe('O que você quer descobrir com esta leitura, em até 80 caracteres.'),
    fonte: z.literal('meta').optional(),
  }),
  execute: async (input, context) => {
    const ctx = getTurnContext()
    const hojeISO = new Date().toISOString().slice(0, 10)
    return await consultarMeta(input as ConsultaMeta, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, hojeISO }, { abortSignal: context?.abortSignal })
  },
})


function proporPlanoTool(investigacao: boolean) {
  return createTool({
  id: 'proporPlano',
  description:
    'Aplica VÁRIAS ações do plano numa aprovação só — usa quando o relatório tem 2 ou mais recomendações. PROPOSTA (HITL): cria uma aprovação com N ações; ao aprovar, todas executam (best-effort). Anti-compose: dedup automático por entidade+tipo. Passe `acoes` como array de ações (tipo, nivel, entityId, valor). Use `nivel` para especificar o nível (padrão "campaign"): "adset" = conjunto, "ad" = anúncio. Para orçamento, passe também `valor` (novo orçamento diário em R$). NUNCA execute sem aprovação.',
  inputSchema: z.object({
    acoes: z.array(z.object({
      tipo: z.enum(['pausar', 'reativar', 'orcamento']).describe('pausar, reativar ou orcamento (ajusta orçamento diário).'),
      nivel: z.enum(['campaign', 'adset', 'ad']).optional().describe('Nível da entidade (padrão "campaign").'),
      entityId: z.string().describe('Id da entidade — o [id] que aparece no relatório.'),
      valor: z.number().optional().describe('Novo orçamento diário em REAIS — obrigatório quando tipo="orcamento".'),
      nome: z.string().optional().describe('Nome da entidade (opcional, p/ contexto).'),
      motivo: z.string().optional().describe('Motivo da ação (opcional).'),
      evidencia: z.string().max(300).optional().describe('O número que PROVA o motivo desta ação, em até 300 caracteres. Vai no pedido que o dono lê.'),
      statusAtual: z.enum(['ACTIVE', 'PAUSED']).optional().describe(descricoesDeTools(investigacao).statusAtualDoProporAcaoMeta),
    })).describe('Array de ações a incluir no plano. Mínimo 1 item.'),
  }),
  execute: async ({ acoes }) => {
    const ctx = getTurnContext()
    return await proporPlano(
      { acoes: acoes.map((a) => ({ tipo: a.tipo, nivel: a.nivel, entityId: a.entityId, valorNovo: a.valor, nome: a.nome, motivo: a.motivo, evidencia: a.evidencia, statusAtual: a.statusAtual })) },
      { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, investigacao },
    )
  },
  })
}


const proporLancarCriativoTool = createTool({
  id: 'proporLancarCriativo',
  description:
    'LANÇA um criativo aprovado do /design como anúncio PAUSADO num CONJUNTO (adset) que você já leu. Cria uma aprovação HITL (não executa; nasce pausado). Passe adsetId (o [id] do relatório), artifactId (a arte final do Téo), message (texto principal) e link (URL de destino, obrigatória, não invente). Opcionais: cta, pagina, name, headline. Roda em Facebook e Instagram quando a Página tem IG vinculado. Para LANÇAR um criativo aprovado como anúncio, use esta tool.',
  inputSchema: z.object({
    adsetId: z.string().describe('Id do conjunto (adset) onde o anúncio será criado — o [id] do relatório.'),
    artifactId: z.string().describe('Id do artefato de imagem gerado pelo Téo no /design.'),
    message: z.string().describe('Texto principal do anúncio (body copy).'),
    link: z.string().describe('URL de destino (http/https) — obrigatório, não invente.'),
    cta: z.enum([
      'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'BOOK_TRAVEL', 'CONTACT_US',
      'GET_QUOTE', 'SEND_MESSAGE', 'ORDER_NOW', 'DOWNLOAD', 'APPLY_NOW', 'WHATSAPP_MESSAGE',
    ]).optional().describe('Call-to-action do botão (padrão LEARN_MORE).'),
    pagina: z.string().optional().describe('Nome ou id da Página Meta a usar (obrigatório se o token tiver mais de 1 Página).'),
    name: z.string().optional().describe('Nome do anúncio (interno, até 80 chars; gerado automaticamente se omitido).'),
    headline: z.string().optional().describe('Título/headline do anúncio (opcional).'),
  }),
  execute: async ({ adsetId, artifactId, message, link, cta, pagina, name, headline }) => {
    const ctx = getTurnContext()
    return await proporLancarCriativo(
      { adsetId, artifactId, message, link, cta, pagina, name, headline },
      { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId },
    )
  },
})


const proporCorrigirConjuntoTool = createTool({
  id: 'proporCorrigirConjunto',
  description:
    'PROPÕE (não executa) DUPLICAR um conjunto corrigindo a otimização (de cliques/sem-evento pra conversão por compra). Vira aprovação HITL; a cópia nasce PAUSADA e o original fica intacto. Passe adsetId (o [id] do relatório). Use quando um conjunto de vendas/leads otimiza errado.',
  inputSchema: z.object({
    adsetId: z.string().describe('O [id] do conjunto do relatório.'),
  }),
  execute: async ({ adsetId }) => {
    const ctx = getTurnContext()
    return await proporCorrigirConjunto(
      { adsetId },
      { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId },
    )
  },
})


const proporDesfazerTool = createTool({
  id: 'proporDesfazer',
  description:
    'DESFAZ uma acao ja aplicada, voltando a entidade ao estado anterior. Nasce uma aprovacao NOVA (nada muda sem o OK do dono). Passe o approvalId da acao que quer desfazer. Funciona quando a aprovacao original guardou o estado anterior; se ela for antiga demais, eu digo isso.',
  inputSchema: z.object({
    approvalId: z.string().describe('Id da aprovação já aplicada que se quer desfazer.'),
  }),
  execute: async ({ approvalId }) => {
    const r = await proporDesfazer({ approvalId })
    return {
      output: r.ok
        ? 'Proposta de desfazer criada. Aprove em /aprovações para voltar ao estado anterior.'
        : (r.erro ?? 'Não consegui propor o desfazer.'),
    }
  },
})


async function lerTargetingDoConjunto(adsetId: string): Promise<Record<string, unknown> | null> {
  const resp = await metaGraphGet('/' + adsetId + '?fields=targeting').catch(() => null)
  const t = (resp as { targeting?: unknown } | null)?.targeting
  return t !== null && typeof t === 'object' && !Array.isArray(t) ? (t as Record<string, unknown>) : null
}


async function lerAdsetParaSegmentacao(
  adsetId: string,
): Promise<{ id: string; nome: string; learningStage?: string } | null> {
  const resp = await metaGraphGet('/' + adsetId + '?fields=name,learning_stage_info').catch(() => null)
  if (!resp) return null
  const nome = typeof resp.name === 'string' && resp.name ? resp.name : adsetId
  const learningStage = learningStageFromAdset(resp)
  return { id: adsetId, nome, ...(learningStage ? { learningStage } : {}) }
}


const proporSegmentacaoTool = createTool({
  id: 'proporSegmentacao',
  description:
    'PROPOE (nao executa) mudar a FAIXA ETARIA de um conjunto. Cria uma aprovacao que o dono aprova em /aprovacoes; sem aprovacao NADA muda. Passe adsetId (o [id] do relatorio), ageMin e ageMax. So proponha sobre conjunto que voce LEU. Use quando o breakdown por idade mostrar uma faixa gastando sem converter.',
  inputSchema: z.object({
    adsetId: z.string().describe('Id do conjunto (adset) que se quer resegmentar, o [id] do relatorio.'),
    ageMin: z.number().describe('Idade minima, inteiro de 18 a 65.'),
    ageMax: z.number().describe('Idade maxima, inteiro de 18 a 65. O valor 65 significa "65 ou mais".'),
  }),
  execute: async ({ adsetId, ageMin, ageMax }) => {
    const r = await proporSegmentacao(
      { adsetId, ageMin, ageMax },
      { lerTargeting: lerTargetingDoConjunto, lerAdset: lerAdsetParaSegmentacao },
    )
    if (!r.ok) return { output: r.erro ?? 'Nao consegui propor a mudanca de segmentacao.' }
    const base = 'Proposta de segmentacao criada. Aprove em /aprovacoes para aplicar.'
    return { output: r.aviso ? base + ' ' + r.aviso : base }
  },
})


const montarBlocoTool = createTool({
  id: 'montarBloco',
  description:
    'Adiciona ou edita um bloco no painel ao vivo (KPI, série temporal, tabela, funil, comparativo, criativos, públicos, metas, saúde, nota). Sem id = cria; com id = edita aquele bloco. Reordenar = mande `position`. O bloco aparece na hora pro operador.',
  inputSchema: z.object({
    id: z.string().optional().describe('Id do bloco a editar (ausente = cria um novo).'),
    type: z.enum(BLOCO_TYPES).describe('Tipo do bloco.'),
    config: z.record(z.string(), z.unknown()).optional().describe('Dados/opções do bloco (depende do tipo).'),
    annotation: z.string().optional().describe('Anotação livre do bloco (opcional).'),
    position: z.number().int().optional().describe('Ordem no painel (menor = mais acima).'),
    snapshot_id: z.string().optional().describe('Snapshot de métricas a fixar no bloco (opcional).'),
  }),
  execute: async ({ id, type, config, annotation, position, snapshot_id }) => {
    const ctx = getTurnContext()
    return await montarBloco(
      { id, type: type as BlocoType, config, annotation, position, snapshot_id },
      { operatorId: ctx.operatorId },
    )
  },
})


const removerBlocoTool = createTool({
  id: 'removerBloco',
  description: 'Remove um bloco do painel pelo id. Use quando o operador pedir pra tirar um bloco.',
  inputSchema: z.object({ id: z.string().describe('Id do bloco a remover.') }),
  execute: async ({ id }) => {
    const ctx = getTurnContext()
    return await removerBloco({ id }, { operatorId: ctx.operatorId })
  },
})


const recomendarTool = createTool({
  id: 'recomendar',
  description:
    'Adiciona uma RECOMENDAÇÃO priorizada ao painel (diagnóstico + passos + prioridade) — o registro do seu conselho, com o deep-link "Abrir no Gerenciador" como atalho de conferência. Use depois de diagnosticar com buscarMetricasTrafego. Para AGIR (pausar/reativar/orçamento), use proporAcaoMeta — cria a proposta que o dono aprova; não empurre o trabalho pro Gerenciador. Para LANÇAR um criativo aprovado como anúncio, use proporLancarCriativo.',
  inputSchema: z.object({
    id: z.string().optional().describe('Id da recomendação a editar (ausente = cria).'),
    titulo: z.string().describe('Título curto da recomendação.'),
    diagnostico: z.string().describe('O diagnóstico — por que isto importa (vira a anotação).'),
    passos: z.array(z.string()).describe('Passos concretos do plano/diagnóstico (o que fazer e por quê).'),
    prioridade: z.union([z.string(), z.number()]).optional().describe('Prioridade (ex.: alta/média/baixa ou escore impacto×esforço).'),
    escopo: z.object({
      accountId: z.string().optional(),
      level: z.enum(['account', 'campaign', 'adset', 'ad']).optional(),
      entityId: z.string().optional(),
    }).optional().describe('Alvo no Meta (escopo da recomendação; alimenta o atalho de conferência no Gerenciador).'),
    position: z.number().int().optional(),
  }),
  execute: async ({ id, titulo, diagnostico, passos, prioridade, escopo, position }) => {
    const ctx = getTurnContext()
    return await recomendar({ id, titulo, diagnostico, passos, prioridade, escopo, position }, { operatorId: ctx.operatorId })
  },
})


function gerarRelatorioTool(investigacao: boolean) {
  return createTool({
    id: 'gerarRelatorio',
    description: descricoesDeTools(investigacao).gerarRelatorio,
    inputSchema: z.object({
      periodo: z.object({
        preset: z.string().optional().describe('last_7d (padrão), last_30d, this_month…'),
        range: z.object({ since: z.string(), until: z.string() }).optional(),
      }).optional(),
    }),
    execute: async ({ periodo }) => {
      const ctx = getTurnContext()
      const hojeISO = new Date().toISOString().slice(0, 10)
      const r = await gerarRelatorio({ periodo }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, hojeISO, taskId: ctx.taskId, conversationId: ctx.conversationId })
      if (ctx.painelSink && r.patches.length) ctx.painelSink.push(...r.patches)
      return { output: r.output } 
    },
  })
}



const anotarMemoriaContaTool = createTool({
  id: 'anotarMemoriaConta',
  description: 'Grava um FATO/APRENDIZADO DURÁVEL sobre ESTA conta de anúncios (ex.: "responde melhor a vídeo curto", "lookalike 1% teve ROAS baixo"). Use quando concluir algo que vale lembrar entre relatórios. NÃO escreve no Meta.',
  inputSchema: z.object({ texto: z.string().describe('O fato/aprendizado da conta, uma frase.') }),
  execute: async ({ texto }) => {
    const ctx = getTurnContext()
    if (!podeAgirSobreOLido(ctx)) return { ok: false, message: recusarAtoDeDono(ctx, 'anotarMemoriaConta') }
    return anotarMemoriaConta({ texto }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
  },
})









const ajustarCopyTool = createTool({
  id: 'ajustarCopy',
  description: 'Troca o texto de UM campo de uma peça de copy (título, apoio, chamada para ação, fala de uma cena…) sem escrever nada de novo, e por isso sem custo. Prefira esta a revisarPeca quando o pedido for trocar um texto específico. Para mudar o rumo da peça, use revisarPeca.',
  inputSchema: z.object({
    pecaId: z.string().describe('id da peça.'),
    variacao: z.number().describe('índice da variação (0 = a primeira).'),
    blocoId: z.string().describe('id do bloco a trocar, como aparece na peça (b0, b1, …).'),
    texto: z.string().describe('o texto novo daquele campo.'),
  }),
  execute: async ({ pecaId, variacao, blocoId, texto }) => {
    const ctx = getTurnContext()
    const r = await ajustarCopy({ pecaId, variacao, blocoId, texto }, { operatorId: ctx.operatorId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})

const ajustarArteTool = createTool({
  id: 'ajustarArte',
  description: 'SÓ para arte ANTIGA, feita quando o texto era composto por cima da foto (a tool recusa por escrito se não for o caso). Troca texto/layout/cores sem gerar imagem e sem custo. Nas artes de hoje o texto é desenhado junto com a cena: para mudar qualquer coisa nelas use remixarCriativo.',
  inputSchema: z.object({
    pecaId: z.string().describe('id do criativo.'),
    variacao: z.number().optional().describe('índice da variação; sem ele, a escolhida.'),
    slide: z.number().optional().describe('em carrossel, a ordem do slide (1 = capa).'),
    headline: z.string().optional().describe('novo título; string vazia remove o bloco.'),
    subheadline: z.string().optional(),
    cta: z.string().optional(),
    selo: z.string().optional(),
    template: z.string().optional().describe('slug do layout.'),
  }),
  execute: async ({ pecaId, variacao, slide, headline, subheadline, cta, selo, template }) => {
    const ctx = getTurnContext()
    const blocos: Record<string, string> = {}
    if (headline !== undefined) blocos.headline = headline
    if (subheadline !== undefined) blocos.subheadline = subheadline
    if (cta !== undefined) blocos.cta = cta
    if (selo !== undefined) blocos.selo = selo
    const r = await recomporCriativo(
      {
        pecaId,
        ...(typeof variacao === 'number' ? { variacao } : {}),
        ...(typeof slide === 'number' ? { slide } : {}),
        patch: { ...(Object.keys(blocos).length ? { blocos } : {}), ...(template ? { template } : {}) },
      },
      { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, conversationId: ctx.conversationId, taskId: ctx.taskId },
    )
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})















const pedirArteTool = createTool({
  id: 'pedirArte',
  description: 'Manda o designer criar a ARTE de uma peça de copy que já está escrita. Use quando a copy estiver pronta e o operador quiser a peça visual. O trabalho nasce no estúdio do designer; você não recebe a imagem de volta.',
  inputSchema: z.object({
    pecaId: z.string().describe('id da peça de copy que já tem texto escrito.'),
  }),
  execute: async ({ pecaId }) => {
    const ctx = getTurnContext()
    if (!ctx.operatorId) return { output: 'Sem operador no contexto.' }
    const r = await pedirArte({ pecaId, operatorId: ctx.operatorId })
    return { output: r.summary }
  },
})

const produzirCampanhaTool = createTool({
  id: 'produzirCampanha',
  description: 'Coloca a campanha inteira para ser escrita: cada peça do plano vira uma tarefa. Use depois de planejarCampanha, quando o operador aprovar o plano.',
  inputSchema: z.object({
    campanhaId: z.string().describe('id da campanha já planejada.'),
  }),
  execute: async ({ campanhaId }) => {
    const ctx = getTurnContext()
    if (!ctx.operatorId) return { output: 'Sem operador no contexto.' }
    const r = await produzirCampanha({ campanhaId, operatorId: ctx.operatorId })
    return { output: r.summary }
  },
})

const pedirEntregaTool = createTool({
  id: 'pedirEntrega',
  description: 'Abre uma ENTREGA inteira: planeja o pacote e já coloca todas as peças na esteira, de uma vez. Use quando o operador pedir várias peças num pedido só ("campanha de setembro: 3 anúncios, 5 posts e 2 reels"). Para UMA peça use gerarPeca; para planejar SEM produzir use planejarCampanha.',
  inputSchema: z.object({
    objetivo: z.string().describe('o que esta entrega precisa conseguir, nas palavras do operador.'),
    quantidades: z.record(z.string(), z.number()).describe('quantas peças de cada formato, por slug: meta-ad, google-search, reels, tiktok, shorts, ugc, vsl, anuncio-15s, anuncio-30s, anuncio-60s, landing-page, email, post-organico, youtube-longo.'),
    oferta: z.string().optional().describe('o produto, o preço, o que está incluso, o prazo.'),
    publico: z.string().optional().describe('quem compra, o que já tentou, o que teme.'),
    comArte: z.boolean().optional().describe('true = o designer ilustra as peças que levam imagem. Roteiro de vídeo nunca ganha arte.'),
  }),
  execute: async ({ objetivo, quantidades, oferta, publico, comArte }) => {
    const ctx = getTurnContext()
    if (!ctx.operatorId) return { output: 'Sem operador no contexto.' }
    
    
    const { pedido, cortouPeloTeto } = normalizarPedido({ objetivo, quantidades, oferta, publico, comArte })
    const r = await abrirEntrega({ pedido, operatorId: ctx.operatorId, ...(ctx.actingAgentId ? { agentId: ctx.actingAgentId } : {}) })
    const partes = [
      ...(r.campanha ? [COPY_ABRIR_ENTREGA.planejei(r.campanha.nome, r.campanha.bigIdea)] : []),
      r.mensagem,
      ...(cortouPeloTeto ? [avisoDoTeto(cortouPeloTeto, TETO_DE_PECAS_POR_ENTREGA)] : []),
      ...r.avisos,
      ...(r.ok ? [COPY_ABRIR_ENTREGA.acompanhe] : []),
    ]
    return { output: partes.join(' ') }
  },
})

const produzirArtesDaCampanhaTool = createTool({
  id: 'produzirArtesDaCampanha',
  description: 'Pede ao designer a arte de TODAS as peças da campanha que já têm copy escrita. Use quando a campanha estiver redigida e faltar o visual.',
  inputSchema: z.object({
    campanhaId: z.string().describe('id da campanha com as peças já escritas.'),
  }),
  execute: async ({ campanhaId }) => {
    const ctx = getTurnContext()
    if (!ctx.operatorId) return { output: 'Sem operador no contexto.' }
    const r = await produzirArtesDaCampanha({ campanhaId, operatorId: ctx.operatorId })
    return { output: r.summary }
  },
})


const pedirCopyTool = createTool({
  id: 'pedirCopy',
  description: 'Manda a copywriter escrever uma peça nova para renovar um anúncio fadigado. Use numa recomendação de um ANÚNCIO específico do painel. O texto nasce no estúdio dela.',
  inputSchema: z.object({
    blocoId: z.string().describe('id do bloco de recomendação do painel, escopado num anúncio.'),
  }),
  execute: async ({ blocoId }) => {
    const ctx = getTurnContext()
    if (!podeAgirSobreOLido(ctx)) return { output: recusarAtoDeDono(ctx, 'pedirCopy') }
    if (!ctx.operatorId) return { output: 'Sem operador no contexto.' }
    const r = await pedirCopy({ blocoId, operatorId: ctx.operatorId })
    return { output: r.summary }
  },
})


const pedirCriativoTool = createTool({
  id: 'pedirCriativo',
  description: 'Manda o designer criar um criativo NOVO para um anúncio fadigado. Use numa recomendação de um ANÚNCIO específico do painel. A arte nasce no estúdio dele.',
  inputSchema: z.object({
    blocoId: z.string().describe('id do bloco de recomendação do painel, escopado num anúncio.'),
  }),
  execute: async ({ blocoId }) => {
    const ctx = getTurnContext()
    if (!podeAgirSobreOLido(ctx)) return { output: recusarAtoDeDono(ctx, 'pedirCriativo') }
    if (!ctx.operatorId) return { output: 'Sem operador no contexto.' }
    const r = await pedirCriativo({ blocoId, operatorId: ctx.operatorId })
    return { output: r.summary }
  },
})







const gerarPecaTool = createTool({
  id: 'gerarPeca',
  description: 'Cria uma peça de copy (anúncio, reels, tiktok, landing, e-mail, post, youtube…) no Estúdio: escreve variações por ângulo, critica e dá o veredito. Use quando pedirem copy. Se faltar insumo, você recebe as perguntas — pergunte ao operador e chame de novo.',
  inputSchema: z.object({
    formato: z.string().describe('slug do formato: meta-ad, google-search, reels, tiktok, shorts, landing-page, email, post-organico, youtube-longo (ou outro).'),
    brief: z.record(z.string(), z.unknown()).optional().describe('objetivo, oferta, público, ângulo, restrições…'),
    titulo: z.string().optional(),
  }),
  execute: async ({ formato, brief, titulo }) => {
    const ctx = getTurnContext()
    const r = await gerarPeca({ formato, brief, titulo }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, campanhaId: ctx.campanhaId, planoIndex: ctx.planoIndex, origemSolicitante: ctx.origemSolicitante, taskId: ctx.taskId, conversationId: ctx.conversationId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output } 
  },
})

const revisarPecaTool = createTool({
  id: 'revisarPeca',
  description: 'Revisa uma peça existente aplicando um pedido de mudança e APRENDE com ele (nunca mais esquece). Use quando o operador pedir uma alteração.',
  inputSchema: z.object({
    pecaId: z.string().describe('id da peça a revisar.'),
    pedido: z.string().describe('o pedido de mudança do operador, literal.'),
  }),
  execute: async ({ pecaId, pedido }) => {
    const ctx = getTurnContext()
    const r = await revisarPeca({ pecaId, pedido }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, taskId: ctx.taskId, conversationId: ctx.conversationId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output } 
  },
})

const atualizarFichaMarcaTool = createTool({
  id: 'atualizarFichaMarca',
  description: 'Grava uma regra durável na ficha da marca (voz, vocabulário, o que nunca dizer). Use quando o operador ditar uma regra de marca ("a gente nunca fala X", "nosso tom é Y").',
  inputSchema: z.object({
    
    regra: z.string().optional().describe('Uma regra de voz/tom da marca (ex.: "nunca usar gíria").'),
    escopo: z.enum(['voz_mae', 'dialeto']).optional(),
    canal: z.string().optional(),
    
    negocio: z.string().optional().describe('O que a marca é/faz, uma frase.'),
    oferta: z.string().optional().describe('Nome da oferta/produto principal.'),
    publicoDor: z.string().optional().describe('Dor principal do cliente ideal.'),
    publicoDesejo: z.string().optional().describe('Desejo principal do cliente ideal.'),
    personalidade: z.string().optional().describe('Como a marca soa (ex.: "próxima e ousada").'),
    promessaDaChegada: z.string().optional().describe('O que a pessoa ENCONTRA ao clicar no anúncio: a cena que a página de destino abre. O criativo precisa mostrar uma dessas cenas para a chegada confirmar a promessa.'),
  }),
  execute: async ({ regra, escopo, canal, negocio, oferta, publicoDor, publicoDesejo, personalidade, promessaDaChegada }) => {
    const ctx = getTurnContext()
    const patch: BrandVoicePatch = {}
    if (regra) patch.aprendizados = [{ texto: regra, escopo: escopo ?? 'voz_mae', canal: canal ?? null }]
    if (negocio) patch.dna = { ...(patch.dna ?? {}), negocio }
    if (oferta) patch.dna = { ...(patch.dna ?? {}), ofertas: [{ nome: oferta }] }
    if (publicoDor || publicoDesejo) patch.dna = { ...(patch.dna ?? {}), publico: { dores: publicoDor ? [publicoDor] : [], desejos: publicoDesejo ? [publicoDesejo] : [], objecoes: [] } }
    if (promessaDaChegada) patch.dna = { ...(patch.dna ?? {}), promessaDaChegada }
    if (personalidade) patch.voz_mae = { ...(patch.voz_mae ?? {}), personalidade }
    return await atualizarFichaMarca({ patch }, { operatorId: ctx.operatorId })
  },
})


const ingerirMarcaTool = createTool({
  id: 'ingerirMarca',
  description: 'Devora o que a empresa registrou no Cérebro e rascunha o DNA da marca. Use no primeiro contato, ANTES de perguntar.',
  inputSchema: z.object({}),
  execute: async () => {
    const ctx = getTurnContext()
    const r = await ingerirMarca({}, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output } 
  },
})

const minerarVozDoPublicoTool = createTool({
  id: 'minerarVozDoPublico',
  description: 'Minera a VOZ REAL do público a partir de material cru que o operador COLA (reviews, comentários, DMs, transcrições): extrai frases verbatim + vocabulário + dores/desejos/objeções e grava na Ficha. Use quando o operador colar feedback/conversa do público. Se não houver material, você recebe a pergunta — peça o material e chame de novo.',
  inputSchema: z.object({
    material: z.string().describe('O material cru colado (reviews/comentários/DMs/transcrições).'),
  }),
  execute: async ({ material }) => {
    const ctx = getTurnContext()
    const r = await minerarVozDoPublico({ material }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output } 
  },
})

const guardarSwipeTool = createTool({
  id: 'guardarSwipe',
  description: 'Guarda uma REFERÊNCIA que funciona (anúncio/e-mail/página que o operador COLA) no swipe file: desmonta o porquê-funciona (gancho, estrutura, gatilhos, ângulo) + tags. Use quando o operador colar uma peça boa pra guardar de referência. Sem material → você recebe a pergunta.',
  inputSchema: z.object({
    referencia: z.string().describe('A copy da referência, colada (anúncio/e-mail/página).'),
    fonte: z.string().optional().describe('De onde veio (marca/canal/url), opcional.'),
  }),
  execute: async ({ referencia, fonte }) => {
    const ctx = getTurnContext()
    const r = await guardarSwipe({ referencia, fonte }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})

const analisarConcorrenteTool = createTool({
  id: 'analisarConcorrente',
  description: 'Desmonta um CONCORRENTE a partir da copy/página que o operador COLA: ângulo, promessa, gatilhos, fraquezas + registra como a marca se DIFERENCIA (na Ficha) e guarda a desmontagem no swipe file (marcada como concorrente). Use quando o operador colar material de concorrente. Sem material → você recebe a pergunta.',
  inputSchema: z.object({
    material: z.string().describe('A copy/página do concorrente, colada.'),
    fonte: z.string().optional().describe('De onde veio (marca/url), opcional.'),
  }),
  execute: async ({ material, fonte }) => {
    const ctx = getTurnContext()
    const r = await analisarConcorrente({ material, fonte }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.estudioSink && r.patches.length) ctx.estudioSink.push(...r.patches)
    return { output: r.output }
  },
})

const planejarCampanhaTool = createTool({
  id: 'planejarCampanha',
  description: 'Planeja uma campanha inteira (big idea + plano de peças por formato/canal/ângulo) a partir de um brief. NÃO produz — o operador aprova o plano e depois você produz peça a peça. Use quando pedirem uma campanha (não uma peça só). Se faltar o objetivo, você recebe a pergunta — pergunte e chame de novo.',
  inputSchema: z.object({
    brief: z.record(z.string(), z.unknown()).optional().describe('objetivo, oferta, público, canais/nº de peças desejado.'),
  }),
  execute: async ({ brief }) => {
    const ctx = getTurnContext()
    const r = await planejarCampanha({ brief }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})




const iniciarBriefingTool = createTool({
  id: 'iniciarBriefing',
  description: 'ARRANQUE de qualquer anúncio: transforma o pedido cru numa peça-brief pré-preenchida (do Cérebro/DNA/direção, sem inventar) e abre o briefing. Use SEMPRE ao receber um pedido de anúncio — NUNCA gere direto. Depois conduza as lacunas com atualizarBrief e só então gerarCriativo.',
  inputSchema: z.object({
    pedido: z.string().describe('o pedido do operador, literal ("um anúncio da mentoria pro Instagram").'),
  }),
  execute: async ({ pedido }) => {
    const ctx = getTurnContext()
    const r = await iniciarBriefing({ pedido }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, conversationId: ctx.conversationId, campanhaId: ctx.campanhaId, planoIndex: ctx.planoIndex })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})

const atualizarBriefTool = createTool({
  id: 'atualizarBrief',
  description: 'Grava uma resposta do briefing na peça-brief aberta (objetivo, oferta, público, ângulo, restrições, usar rosto, referência, placement). Use ao conduzir o briefing — uma lacuna por vez. NÃO gera nada; só anota.',
  inputSchema: z.object({
    pecaId: z.string().describe('id da peça-brief em aberto (listada na diretiva).'),
    objetivo: z.string().optional().describe('o que a pessoa deve FAZER ao ver o anúncio.'),
    publico: z.string().optional(),
    oferta: z.string().optional().describe('oferta + a UMA mensagem central.'),
    angulo: z.string().optional().describe('ângulo de venda + tom.'),
    restricoes: z.string().optional().describe('o que NÃO fazer / obrigatórios.'),
    usarRosto: z.boolean().optional().describe('usar um rosto real (da referência) na arte.'),
    referenciaId: z.string().optional().describe('id da foto de referência (remix).'),
    placement: z.string().optional().describe('slug do formato/placement (ex.: story, post-quadrado).'),
  }),
  execute: async ({ pecaId, objetivo, publico, oferta, angulo, restricoes, usarRosto, referenciaId, placement }) => {
    const ctx = getTurnContext()
    const r = await atualizarBrief({ pecaId, objetivo, publico, oferta, angulo, restricoes, usarRosto, referenciaId, placement }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})

const gerarCriativoTool = createTool({
  id: 'gerarCriativo',
  description: 'Gera as PROVAS do anúncio a partir do briefing já montado (peça em status brief); passe o pecaId do brief aberto (listado na diretiva). NÃO cria o brief — pra isso use iniciarBriefing.',
  inputSchema: z.object({
    pecaId: z.string().describe('id da peça-brief a produzir (listada na diretiva de briefs em aberto).'),
  }),
  execute: async ({ pecaId }) => {
    const ctx = getTurnContext()
    const r = await gerarCriativo({ pecaId }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, conversationId: ctx.conversationId, taskId: ctx.taskId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})

const finalizarCriativoTool = createTool({
  id: 'finalizarCriativo',
  description: 'Finaliza um criativo em ALTA qualidade: re-renderiza a prova escolhida em high e marca a peça como aprovada. Use quando o operador escolher uma prova ("finaliza a 2", "essa aí").',
  inputSchema: z.object({
    pecaId: z.string().describe('id do criativo.'),
    variacao: z.number().optional().describe('índice da prova escolhida (default: a escolha do veredito).'),
    ajustes: z.string().optional().describe('ajustes finos opcionais ("um pouco mais claro").'),
  }),
  execute: async ({ pecaId, variacao, ajustes }) => {
    const ctx = getTurnContext()
    const r = await finalizarCriativo({ pecaId, variacao, ajustes }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, conversationId: ctx.conversationId, taskId: ctx.taskId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})

const revisarCriativoTool = createTool({
  id: 'revisarCriativo',
  description: 'Revisa um criativo aplicando um pedido de mudança (novas provas dirigidas) e APRENDE a regra visual durável. Use quando o operador pedir alteração numa imagem.',
  inputSchema: z.object({
    pecaId: z.string().describe('id do criativo a revisar.'),
    pedido: z.string().describe('o pedido de mudança, literal.'),
  }),
  execute: async ({ pecaId, pedido }) => {
    const ctx = getTurnContext()
    const r = await revisarCriativo({ pecaId, pedido }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, conversationId: ctx.conversationId, taskId: ctx.taskId })
    if (ctx.estudioSink && r.patches.length) ctx.estudioSink.push(...r.patches)
    return { output: r.output }
  },
})

const remixarCriativoTool = createTool({
  id: 'remixarCriativo',
  description: 'AJUSTA uma arte que já existe mantendo a MESMA imagem: manda a arte de volta ao modelo com o pedido de mudança ("tira o café da mesa", "deixa mais escuro", "muda a headline pra X"). Use SEMPRE que o operador gostou da peça e quer mexer em algo nela. Para um caminho diferente, com outra cena, use revisarCriativo.',
  inputSchema: z.object({
    pecaId: z.string().describe('id do criativo a ajustar.'),
    pedido: z.string().describe('o que mudar, literal, com as palavras do operador.'),
    variacao: z.number().optional().describe('índice da prova a ajustar; sem ele, a escolhida.'),
  }),
  execute: async ({ pecaId, pedido, variacao }) => {
    const ctx = getTurnContext()
    const r = await remixarCriativo(
      { pecaId, pedido, ...(typeof variacao === 'number' ? { variacao } : {}) },
      { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, conversationId: ctx.conversationId, taskId: ctx.taskId },
    )
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})

const ingerirIdentidadeVisualTool = createTool({
  id: 'ingerirIdentidadeVisual',
  description: 'Devora o que a empresa registrou (Cérebro + DNA verbal da marca) e rascunha a DIREÇÃO DE ARTE. Use no primeiro contato, ANTES de perguntar.',
  inputSchema: z.object({}),
  execute: async () => {
    const ctx = getTurnContext()
    const r = await ingerirIdentidadeVisual({}, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})

const atualizarDirecaoArteTool = createTool({
  id: 'atualizarDirecaoArte',
  description: 'Grava uma regra durável na direção de arte da marca (paleta, estilo, mood, proibições). Use quando o operador ditar uma regra visual ("nunca usar fundo escuro", "nossas cores são X e Y").',
  inputSchema: z.object({
    regra: z.string().optional().describe('Regra visual durável (ex.: "nunca usar neon").'),
    estilo: z.string().optional().describe('Estilo fotográfico (ex.: "clean, luz natural").'),
    mood: z.string().optional(),
    iluminacao: z.string().optional(),
    composicao: z.string().optional(),
    assinatura: z.string().optional(),
    proibicao: z.string().optional(),
    cores: z.array(z.object({ nome: z.string(), hex: z.string() })).optional(),
  }),
  execute: async ({ regra, estilo, mood, iluminacao, composicao, assinatura, proibicao, cores }) => {
    const ctx = getTurnContext()
    const r = await atualizarDirecaoArte({ regra, estilo, mood, iluminacao, composicao, assinatura, proibicao, cores }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.estudioSink && r.patch) ctx.estudioSink.push(r.patch)
    return { output: r.output }
  },
})




const gerarContratoTool = createTool({
  id: 'gerarContrato',
  description: 'Redige uma minuta de contrato (prestação de serviços, NDA, PJ, parceria, distrato ou outro) com base nos modelos e na Ficha Jurídica: redator + crítico interno. Dado essencial faltante vira [PENDENTE] — pergunte ao operador depois.',
  inputSchema: z.object({
    tipo: z.string(),
    briefing: z.string(),
    titulo: z.string().optional(),
  }),
  execute: async ({ tipo, briefing, titulo }) => {
    const ctx = getTurnContext()
    const r = await gerarContrato({ tipo, briefing, titulo }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId, taskId: ctx.taskId, conversationId: ctx.conversationId })
    if (ctx.juridicoSink && r.patch) ctx.juridicoSink.push(r.patch)
    return { output: r.output }
  },
})

const analisarContratoTool = createTool({
  id: 'analisarContrato',
  description: 'Analisa um contrato RECEBIDO da Mesa cláusula a cláusula (semáforo crítico/atenção/ok + redlines). Use o id da Mesa.',
  inputSchema: z.object({
    contratoId: z.string(),
    foco: z.string().optional(),
  }),
  execute: async ({ contratoId, foco }) => {
    const ctx = getTurnContext()
    const r = await analisarContrato({ contratoId, foco }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.juridicoSink) { if (r.patch) ctx.juridicoSink.push(r.patch); if (r.patches?.length) ctx.juridicoSink.push(...r.patches) }
    return { output: r.output }
  },
})

const revisarContratoTool = createTool({
  id: 'revisarContrato',
  description: 'Revisa uma minuta NOSSA da Mesa aplicando o pedido do operador; aprende posturas duráveis.',
  inputSchema: z.object({
    contratoId: z.string(),
    pedido: z.string(),
  }),
  execute: async ({ contratoId, pedido }) => {
    const ctx = getTurnContext()
    const r = await revisarContrato({ contratoId, pedido }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.juridicoSink && r.patches.length) ctx.juridicoSink.push(...r.patches)
    return { output: r.output }
  },
})

const finalizarContratoTool = createTool({
  id: 'finalizarContrato',
  description: 'Finaliza um contrato NOSSO e guarda a cópia no Segundo Cérebro.',
  inputSchema: z.object({
    contratoId: z.string(),
  }),
  execute: async ({ contratoId }) => {
    const ctx = getTurnContext()
    const r = await finalizarContrato({ contratoId }, { operatorId: ctx.operatorId, taskId: ctx.taskId, conversationId: ctx.conversationId })
    if (ctx.juridicoSink) { if (r.patch) ctx.juridicoSink.push(r.patch); if (r.patches?.length) ctx.juridicoSink.push(...r.patches) }
    return { output: r.output }
  },
})

const extrairPrazosTool = createTool({
  id: 'extrairPrazos',
  description: 'Deriva/propõe os prazos (renovação, aviso prévio, vencimento) de um contrato pra o operador confirmar no palco.',
  inputSchema: z.object({
    contratoId: z.string(),
  }),
  execute: async ({ contratoId }) => {
    const ctx = getTurnContext()
    const r = await extrairPrazos({ contratoId }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.juridicoSink && r.patch) ctx.juridicoSink.push(r.patch)
    return { output: r.output }
  },
})

const salvarComoModeloTool = createTool({
  id: 'salvarComoModelo',
  description: 'Salva um contrato NOSSO como modelo reutilizável da casa (anonimizado).',
  inputSchema: z.object({
    contratoId: z.string(),
    nome: z.string().optional(),
  }),
  execute: async ({ contratoId, nome }) => {
    const ctx = getTurnContext()
    const r = await salvarComoModelo({ contratoId, nome }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.juridicoSink && r.patch) ctx.juridicoSink.push(r.patch)
    return { output: r.output }
  },
})

const atualizarFichaJuridicaTool = createTool({
  id: 'atualizarFichaJuridica',
  description: 'Anota uma informação/postura durável na Ficha Jurídica da empresa.',
  inputSchema: z.object({
    anotacao: z.string(),
  }),
  execute: async ({ anotacao }) => {
    const ctx = getTurnContext()
    const r = await atualizarFichaJuridica({ anotacao }, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.juridicoSink && r.patch) ctx.juridicoSink.push(r.patch)
    return { output: r.output }
  },
})

const ingerirFichaJuridicaTool = createTool({
  id: 'ingerirFichaJuridica',
  description: 'Devora o que a empresa registrou no Cérebro e rascunha a Ficha Jurídica. Use no primeiro contato, ANTES de perguntar.',
  inputSchema: z.object({}),
  execute: async () => {
    const ctx = getTurnContext()
    const r = await ingerirFichaJuridica({}, { operatorId: ctx.operatorId, actingAgentId: ctx.actingAgentId })
    if (ctx.juridicoSink && r.patch) ctx.juridicoSink.push(r.patch)
    return { output: r.output }
  },
})






const listarAutomacoesIgTool = createTool({
  id: 'listarAutomacoesIg',
  description: 'Lista as automações de Instagram cadastradas, com o gatilho, as palavras-chave e quantas vezes cada uma disparou. Use quando perguntarem o que está no ar ou como as automações vêm indo.',
  inputSchema: z.object({}),
  execute: async () => listarAutomacoesIg(),
})


const lerDesempenhoIgTool = createTool({
  id: 'lerDesempenhoIg',
  description: 'Mostra os disparos de uma automação de Instagram: quem comentou, o que escreveu, e o que falhou. Use quando perguntarem sobre uma automação específica. O id vem de listarAutomacoesIg: chame-a antes se você ainda não tem o id em mãos.',
  inputSchema: z.object({ automacaoId: z.string().describe('id da automação, como devolvido por listarAutomacoesIg.') }),
  execute: async ({ automacaoId }) => lerDesempenhoIg({ automacaoId }),
})


export const SEED_PRIMARY_AGENT: AgentSeed = {
  id: 'jarvis',
  name: ASSISTANT_NAME,
  role: 'Conselheiro',
  system_prompt: JARVIS_PERSONA,
  model: null,
  tools: { buscarCerebro: true, buscarConversas: true, lerAcervo: true, proporMemoria: true, rascunharMemoria: true, composio: true, registrarConhecimento: true, registrarEntrevista: true, adiarEntrevista: true, contratarAgente: true, delegarTarefa: true, emitirArtefato: true, gerarImagem: true, ajustarEstilo: true, ajustarNotificacoes: true, gerenciarLembretes: true, gerenciarRotinas: true, vigilanciaDeclarada: true, registrarDiretriz: true, detalharFuncionario: true, consultarFuncionario: true, transferir: true, proporConhecimentoAtendimento: true },
  enabled: true,
  is_primary: true,
  definition_version: PRIMARY_PERSONA_VERSION, 
}


export function withPrimaryToolDefaults(rowTools: AgentTools): AgentTools {
  
  
  
  
  
  
  
  
  
  return { ...SEED_PRIMARY_AGENT.tools, ...rowTools, rascunharMemoria: true, proporMemoria: true }
}


export function buildAgentTools(
  tools: AgentRow['tools'] | undefined,
  composioTools: Record<string, unknown>,
  scopes?: string[],
  episodicAgentId?: string | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (tools?.buscarCerebro) out.buscarCerebro = makeBuscarCerebroTool(scopes, episodicAgentId)
  if (tools?.buscarConversas) out.buscarConversas = makeBuscarConversasTool()
  if (tools?.lerAcervo) {
    out.lerNota = makeLerNotaTool(scopes)
    out.listarNotas = makeListarNotasTool(scopes)
  }
  if (tools?.proporMemoria) out.proporMemoria = proporMemoriaTool
  if (tools?.rascunharMemoria) out.rascunharMemoria = rascunharMemoriaTool
  if (tools?.contratarAgente) out.contratarAgente = contratarAgenteTool
  if (tools?.delegarTarefa) out.delegarTarefa = delegarTarefaTool
  if (tools?.planejarObjetivo) out.planejarObjetivo = planejarObjetivoTool
  if (tools?.emitirArtefato) out.emitirArtefato = emitirArtefatoTool
  if (tools?.gerarImagem) out.gerarImagem = gerarImagemTool
  if (tools?.composio) {
    
    
    
    
    
    
    
    const allow = tools.composio_toolkits
    if (allow && allow.length) {
      for (const [slug, tool] of Object.entries(composioTools)) {
        if (isActionAllowed(slug, allow)) out[slug] = tool
      }
    } else {
      Object.assign(out, composioTools) 
    }
  }
  if (tools?.registrarConhecimento) out.registrarConhecimento = registrarConhecimentoTool
  if (tools?.registrarEntrevista) out.registrarEntrevista = registrarEntrevistaTool
  if (tools?.adiarEntrevista) out.adiarEntrevista = adiarEntrevistaTool
  if (tools?.ajustarEstilo) out.ajustarEstilo = ajustarEstiloTool
  if (tools?.ajustarNotificacoes) out.ajustarNotificacoes = ajustarNotificacoesTool
  if (tools?.gerenciarLembretes) out.gerenciarLembretes = gerenciarLembretesTool
  if (tools?.gerenciarRotinas) out.gerenciarRotinas = gerenciarRotinasTool
  if (tools?.vigilanciaDeclarada) out.vigiar = vigiarTool
  if (tools?.registrarDiretriz) out.registrarDiretriz = registrarDiretrizTool
  if (tools?.anotarAprendizado) out.anotarAprendizado = anotarAprendizadoTool
  if (tools?.detalharFuncionario) out.detalharFuncionario = detalharFuncionarioTool
  if (tools?.consultarFuncionario) out.consultarFuncionario = consultarFuncionarioTool
  if (tools?.transferir) out.transferir = transferirTool
  if (tools?.proporConhecimentoAtendimento) out.proporConhecimentoAtendimento = proporConhecimentoAtendimentoTool
  if (tools?.painelTrafego) {
    out.buscarMetricasTrafego = buscarMetricasTrafegoTool(Boolean(tools?.investigacao))
    out.montarBloco = montarBlocoTool
    out.removerBloco = removerBlocoTool
    out.recomendar = recomendarTool
    out.gerarRelatorio = gerarRelatorioTool(Boolean(tools?.investigacao))
    out.anotarMemoriaConta = anotarMemoriaContaTool
    
    
    out.pedirCopy = pedirCopyTool
    out.pedirCriativo = pedirCriativoTool
  }
  if (tools?.proporAcaoMeta) {
    out.proporAcaoMeta = proporAcaoMetaTool(Boolean(tools?.investigacao))
    out.proporPlano = proporPlanoTool(Boolean(tools?.investigacao))
    out.proporLancarCriativo = proporLancarCriativoTool
    out.proporCorrigirConjunto = proporCorrigirConjuntoTool
    out.proporDesfazer = proporDesfazerTool
    out.proporSegmentacao = proporSegmentacaoTool
  }
  if (tools?.investigacao) {
    
    
    out.consultarMeta = consultarMetaTool
    out.calcular = calcularTool
  }
  if (tools?.estudioCopy) {
    out.gerarPeca = gerarPecaTool
    out.revisarPeca = revisarPecaTool
    out.atualizarFichaMarca = atualizarFichaMarcaTool
    out.ingerirMarca = ingerirMarcaTool
    out.minerarVozDoPublico = minerarVozDoPublicoTool
    out.guardarSwipe = guardarSwipeTool
    out.analisarConcorrente = analisarConcorrenteTool
    out.planejarCampanha = planejarCampanhaTool
    
    
    out.ajustarCopy = ajustarCopyTool
    out.pedirArte = pedirArteTool
    out.produzirCampanha = produzirCampanhaTool
    out.produzirArtesDaCampanha = produzirArtesDaCampanhaTool
    
    
    
    
    out.pedirEntrega = pedirEntregaTool
  }
  if (tools?.estudioDesign) {
    out.iniciarBriefing = iniciarBriefingTool
    out.atualizarBrief = atualizarBriefTool
    out.gerarCriativo = gerarCriativoTool
    out.finalizarCriativo = finalizarCriativoTool
    out.revisarCriativo = revisarCriativoTool
    out.remixarCriativo = remixarCriativoTool
    out.ajustarArte = ajustarArteTool
    out.ingerirIdentidadeVisual = ingerirIdentidadeVisualTool
    out.atualizarDirecaoArte = atualizarDirecaoArteTool
  }
  if (tools?.escritorioJuridico) {
    out.gerarContrato = gerarContratoTool
    out.analisarContrato = analisarContratoTool
    out.revisarContrato = revisarContratoTool
    out.finalizarContrato = finalizarContratoTool
    out.extrairPrazos = extrairPrazosTool
    out.salvarComoModelo = salvarComoModeloTool
    out.atualizarFichaJuridica = atualizarFichaJuridicaTool
    out.ingerirFichaJuridica = ingerirFichaJuridicaTool
  }
  
  
  if (tools?.painelInstagram) {
    out.listarAutomacoesIg = listarAutomacoesIgTool
    out.lerDesempenhoIg = lerDesempenhoIgTool
  }
  
  
  
  if (tools?.painelGoogle) {
    out.entrevistaFicha = entrevistaFichaTool
    out.analisarConta = analisarContaTool
  }
  
  
  
  
  if (tools?.custom_tools?.length) {
    try {
      for (const [id, tool] of Object.entries(makeCustomMastraTools(tools.custom_tools))) {
        if (!(id in out)) out[id] = tool
        else console.warn(`[buildAgentTools] tool custom "${id}" colide com tool existente — ignorada`)
      }
    } catch (err) {
      
      console.warn('[buildAgentTools] registro custom inválido — tools custom ignoradas:', err)
    }
  }
  return out
}


export function buildAgentFromRow(
  row: Pick<AgentRow, 'id' | 'name' | 'system_prompt' | 'model' | 'tools' | 'brain_read_scopes' | 'skills' | 'is_primary'>,
  apiKey: string,
  tone?: string | null,
  composioTools: Record<string, unknown> = {},
  diretrizes: Diretriz[] = [],
  pending: PendingToolNames = { toConnect: [], toEnable: [] },
  inputProcessors?: ToolSearchProcessor[],
): Agent {
  const openai = createOpenAI({ apiKey })
  
  
  const episodicAgentId = row.is_primary ? null : row.id
  
  
  const baseInstructions = personaWithPendingTools(
    personaWithDirectives(personaWithTone(row.system_prompt, tone), diretrizes),
    pending,
  )
  
  
  const comToolSearch = inputProcessors?.length ? personaWithToolSearch(baseInstructions) : baseInstructions
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const instructions = personaWithIdentity(
    personaWithActionContract(personaWithMemoryContract(comToolSearch)),
    row.name,
  )
  return new Agent({
    id: row.id,
    name: row.name,
    instructions,
    model: openai(row.model ?? MODEL),
    
    
    
    tools: buildAgentTools(row.tools, composioTools, row.brain_read_scopes, episodicAgentId) as ToolsInput,
    
    ...(inputProcessors?.length
      ? { inputProcessors: inputProcessors as ConstructorParameters<typeof Agent>[0]['inputProcessors'] }
      : {}),
    
    
    workspace: buildSkillsWorkspaceForSkills(row.skills ?? []),
  })
}


export function buildJarvisAgent(
  apiKey: string,
  tone?: string | null,
  extraTools: Record<string, unknown> = {},
): Agent {
  
  
  return buildAgentFromRow({ ...SEED_PRIMARY_AGENT, brain_read_scopes: [], skills: [] }, apiKey, tone, extraTools)
}

export function agentCacheKey(
  id: string, apiKey: string, tone: string | null | undefined, composioSig: string | number, updatedAt: string,
  directivesUpdatedAt?: string | null,
): string {
  
  
  
  
  
  
  
  return createHash('sha256')
    .update(`${id}|${apiKey}|${tone?.trim() ?? ''}|${composioSig}|${updatedAt}|${directivesUpdatedAt ?? ''}`)
    .digest('hex')
}


const _agentCache = new Map<string, Promise<Agent>>()








const _directivesMemo = memoizeAsyncByKey((agentId) => getDirectives(agentId), 60_000, Date.now, { timeoutMs: 10_000 })

export function invalidateAgentCache(): void {
  _agentCache.clear()
  _directivesMemo.invalidate()
}

export function invalidateJarvisAgentCache(): void { invalidateAgentCache() }

async function buildAgentCached(row: AgentRow, apiKey: string): Promise<Agent> {
  
  
  
  const [{ voiceTone: tone }, { diretrizes, updatedAt: dirUpdatedAt }] = await Promise.all([
    getCompanyProfile(),
    _directivesMemo.get(row.id), 
  ])
  
  
  
  
  const catalog = await catalogoComposioDoAgente(row.tools)
  
  const required = row.tools?.required_toolkits ?? []
  let pending: PendingToolNames = { toConnect: [], toEnable: [] }
  if (required.length) {
    const connected = await listConnectedToolkitSlugs()
    const { pendingConnect, pendingEnable } = agentPendingToolkits(required, connected, row.tools ?? {})
    pending = { toConnect: pendingConnect.map(toolkitDisplayName), toEnable: pendingEnable.map(toolkitDisplayName) }
  }
  
  
  const composioSig = Object.keys(catalog).sort().join(',')
  const key = agentCacheKey(row.id, apiKey, tone, composioSig, row.updated_at, dirUpdatedAt)
  const hit = _agentCache.get(key)
  if (hit) return hit
  
  
  const inputProcessors = Object.keys(catalog).length
    ? [makeComposioToolSearch(catalog, row.tools?.composio_toolkits)]
    : undefined
  const promise = Promise.resolve(buildAgentFromRow(row, apiKey, tone, {}, diretrizes, pending, inputProcessors))
  _agentCache.set(key, promise)
  promise.catch(() => { if (_agentCache.get(key) === promise) _agentCache.delete(key) })
  return promise
}






let _cooBackfilled = false
async function backfillCoo(): Promise<void> {
  if (_cooBackfilled) return
  try {
    await ensureSeedRoster([SEED_COO_AGENT])
    _cooBackfilled = true
  } catch (err) {
    console.warn('[getPrimaryAgent] backfill do COO falhou (segue sem; nasce no birth também):', err)
  }
}


export async function getPrimaryAgentComLinha(): Promise<{ agent: Agent; row: AgentRow }> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  let row = await ensurePrimaryAgent(SEED_PRIMARY_AGENT)
  row = await syncPrimaryAgent(row) 
  await backfillCoo() 
  await syncInstalledCargos() 
  const withDefaults: AgentRow = { ...row, tools: withPrimaryToolDefaults(row.tools) }
  return { agent: await buildAgentCached(withDefaults, apiKey), row: withDefaults }
}


export async function getPrimaryAgent(): Promise<Agent> {
  return (await getPrimaryAgentComLinha()).agent
}


export async function getAgent(id: string): Promise<Agent> {
  const apiKey = await getSecret(SECRET_KEYS.openai_api_key)
  if (!apiKey) throw new NotConfiguredError(['openai_api_key'])
  await syncInstalledCargos() 
  const row = await getAgentRow(id)
  if (!row) throw new Error(`getAgent: agente '${id}' não existe`)
  return buildAgentCached(row, apiKey)
}


export async function getJarvisAgent(): Promise<Agent> { return getPrimaryAgent() }
