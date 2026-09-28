




import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { searchBase as searchBaseDefault } from '@/data/baseConhecimento'
import { getContato as getContatoDefault, updateFichaContato as updFichaDefault } from '@/data/contatos'
import { setConversaStatus as setStatusDefault } from '@/data/conversasExternas'
import { mergeFicha } from '@/lib/canais/ficha'
import { PULL_K, SIM_CUTOFF_FATO } from '@/lib/canais/recuperacaoBudget'
import { filtrarPorRelevancia } from '@/lib/canais/relevancia'
import { redigirPII } from '@/lib/canais/pii'
import { expandirBase } from './expansaoBase'
import { LIM } from '@/lib/canais/interativo'


const LIM_BOTOES = LIM.BOTOES_MAX

export interface CanalToolsCtx { agentId: string; conversaId: string; contatoId: string; canalId: string }


export interface CasoEscalado {
  resumo?: string
  sabemos?: string[]
  falta?: string[]
  sentimento?: 'neutro' | 'insatisfeito' | 'irritado'
}
export interface CanalToolsDeps {
  embed: (texto: string) => Promise<number[]>
  searchBase: typeof searchBaseDefault
  expandir?: typeof expandirBase
  getContato: typeof getContatoDefault
  updateFichaContato: typeof updFichaDefault
  setConversaStatus: typeof setStatusDefault
  
  onEscalar: (ctx: CanalToolsCtx, motivo: string, caso?: CasoEscalado) => Promise<void>
  
  escalacaoBloqueada?: string
  
  listarMidiaPublica?: (canalId: string) => Promise<Array<{ slug: string; rotulo: string; descricao: string }>>
  
  enviarArquivo?: (
    ctx: CanalToolsCtx,
    slug: string,
    legenda?: string,
  ) => Promise<{ ok: true } | { ok: false; motivo: MotivoArquivo }>
  
  oferecerOpcoes?: (
    ctx: CanalToolsCtx,
    bruto: unknown,
  ) => Promise<{ ok: true; comoTexto: boolean } | { ok: false; erros: string[] }>
  now: () => string
}


export type MotivoArquivo = 'slug_desconhecido' | 'nao_suportado' | 'envio_falhou' | 'ja_anexado'


const AVISO_ARQUIVO: Record<MotivoArquivo, string> = {
  slug_desconhecido:
    'Esse arquivo não está no catálogo da empresa. Chame `listarArquivos` e use um slug EXATO da lista — você não pode enviar nada fora dela. Se o que o cliente pediu não existe na lista, diga isso e escale.',
  nao_suportado: 'Não consigo mandar arquivo por este canal. Explique ao cliente e escale se precisar.',
  envio_falhou: 'O arquivo não saiu. NÃO diga que enviou; avise que vai verificar e escale.',
  ja_anexado: 'Você já anexou um arquivo nesta resposta — mande só um por vez.',
}

export function buildCanalTools(
  ctx: CanalToolsCtx,
  deps: CanalToolsDeps,
  composioTools?: Record<string, unknown>,
  customTools?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    buscarBase: createTool({
      id: 'buscarBase',
      description: 'Busca na base de conhecimento da empresa (FAQ, preços, políticas, playbook). Use SEMPRE antes de afirmar qualquer fato ao cliente.',
      inputSchema: z.object({ pergunta: z.string().describe('A dúvida do cliente, em texto.') }),
      execute: async ({ pergunta }) => {
        try {
          const embedding = await deps.embed(pergunta)
          const res = await deps.searchBase({ pergunta, embedding, agentId: ctx.agentId, k: PULL_K })
          
          
          const filtrados = filtrarPorRelevancia(res, SIM_CUTOFF_FATO)
          
          
          const viz = filtrados.length
            ? await (deps.expandir ?? expandirBase)(
                filtrados.map((r) => ({ id: r.id, titulo: r.titulo, conteudo: r.conteudo })),
                ctx.agentId,
              )
            : []
          const combinado = [...filtrados, ...viz]
          
          
          
          
          if (!combinado.length) return { vazio: true, aviso: 'Nada na base sobre isso. NÃO invente. Se a pergunta do cliente estiver vaga, faça UMA pergunta de esclarecimento e tente de novo; se já perguntou e continua sem base, admita e use `escalarHumano`.' }
          return combinado.map((r) => ({ titulo: r.titulo, conteudo: r.conteudo }))
        } catch {
          
          
          return { vazio: true, aviso: 'Base indisponível agora — não invente; admita e escale se necessário.' }
        }
      },
    }),
    anotarFicha: createTool({
      id: 'anotarFicha',
      description: 'Anota um fato durável sobre ESTE cliente na ficha dele (preferência, contexto). Use com moderação.',
      
      
      
      inputSchema: z.object({ texto: z.string().max(300).describe('O fato, curto e objetivo (até 300 caracteres).') }),
      execute: async ({ texto }) => {
        const contato = await deps.getContato(ctx.contatoId)
        if (!contato) return { ok: false }
        
        const limpo = redigirPII(texto)
        const next = mergeFicha(contato.ficha, { aprendizados: [limpo] }, { origem: 'agente', at: deps.now() })
        await deps.updateFichaContato(ctx.contatoId, next)
        return { ok: true }
      },
    }),
    escalarHumano: createTool({
      id: 'escalarHumano',
      description: 'Passa a conversa para um humano do time. Use quando o cliente pedir, estiver insatisfeito, ou o caso fugir do seu playbook. Encerre sua resposta após chamar.',
      
      
      inputSchema: z.object({
        motivo: z.string().describe('Por que está escalando.'),
        resumo: z.string().optional().describe('UMA frase: o que o cliente quer.'),
        sabemos: z.array(z.string()).max(6).optional().describe('O que já foi apurado nesta conversa.'),
        falta: z.array(z.string()).max(6).optional().describe('O que ainda falta descobrir.'),
        sentimento: z.enum(['neutro', 'insatisfeito', 'irritado']).optional(),
      }),
      execute: async ({ motivo, resumo, sabemos, falta, sentimento }) => {
        
        
        
        
        
        
        if (deps.escalacaoBloqueada) {
          return { escalado: false, aviso: deps.escalacaoBloqueada }
        }
        await deps.setConversaStatus(ctx.conversaId, 'aguardando_humano')
        await deps.onEscalar(ctx, motivo, { resumo, sabemos, falta, sentimento })
        return { escalado: true, aviso: 'Conversa passada ao time humano. Não responda mais nada.' }
      },
    }),
    
    
    
    ...(deps.listarMidiaPublica && deps.enviarArquivo
      ? {
          listarArquivos: createTool({
            id: 'listarArquivos',
            description: 'Lista os arquivos que a empresa autorizou você a enviar (tabela de preços, catálogo, foto de produto). Chame antes de `enviarArquivo`.',
            inputSchema: z.object({}),
            execute: async () => {
              try {
                const arquivos = await deps.listarMidiaPublica!(ctx.canalId)
                if (!arquivos.length) {
                  return { vazio: true, aviso: 'A empresa não liberou nenhum arquivo para envio. Explique ao cliente com suas palavras.' }
                }
                return { arquivos }
              } catch {
                return { vazio: true, aviso: 'Não consegui abrir o catálogo de arquivos agora. Não prometa envio.' }
              }
            },
          }),
          enviarArquivo: createTool({
            id: 'enviarArquivo',
            description: 'Envia ao cliente UM arquivo do catálogo da empresa. Use `listarArquivos` antes para saber o que existe. Você NÃO pode enviar nada fora dessa lista.',
            inputSchema: z.object({
              slug: z.string().describe('O identificador EXATO vindo de listarArquivos.'),
              legenda: z.string().max(900).optional().describe('Uma frase curta que acompanha o arquivo.'),
            }),
            execute: async ({ slug, legenda }) => {
              try {
                const res = await deps.enviarArquivo!(ctx, slug, legenda)
                if (res.ok) return { ok: true, aviso: 'Arquivo anexado à sua resposta deste turno.' }
                return { ok: false, motivo: res.motivo, aviso: AVISO_ARQUIVO[res.motivo] }
              } catch {
                
                return { ok: false, motivo: 'envio_falhou' as const, aviso: AVISO_ARQUIVO.envio_falhou }
              }
            },
          }),
        }
      : {}),
    
    
    
    ...(deps.oferecerOpcoes
      ? {
          oferecerOpcoes: createTool({
            id: 'oferecerOpcoes',
            description:
              'Manda a mensagem com opções CLICÁVEIS em vez de pedir para o cliente digitar. Use só quando a resposta é uma escolha fechada e curta (triagem, confirmação, escolher um serviço). Para pergunta aberta, responda em texto normal.',
            inputSchema: z.object({
              corpo: z.string().describe('A pergunta ou frase que aparece acima das opções.'),
              rodape: z.string().optional().describe('Linha pequena embaixo (opcional).'),
              opcoes: z
                .array(z.object({
                  titulo: z.string().describe('O texto do botão/linha, curto.'),
                  descricao: z.string().optional().describe('Detalhe de uma linha (só em lista).'),
                }))
                .describe('Até 3 viram botões; de 4 a 10 viram lista.'),
            }),
            execute: async ({ corpo, rodape, opcoes }) => {
              
              
              const lista = (opcoes ?? []).length > LIM_BOTOES
              const bruto = lista
                ? { tipo: 'lista', corpo, rodape, botao: 'Ver opções', secoes: [{ titulo: '', linhas: opcoes }] }
                : { tipo: 'botoes', corpo, rodape, botoes: opcoes }
              try {
                const res = await deps.oferecerOpcoes!(ctx, bruto)
                if (res.ok) {
                  return {
                    ok: true,
                    aviso: res.comoTexto
                      ? 'Este canal não tem botão: as opções vão numeradas, em texto. NÃO repita as opções na sua resposta.'
                      : 'Opções enviadas com a sua resposta. NÃO repita as opções em texto.',
                  }
                }
                return { ok: false, erros: res.erros, aviso: `Não deu para montar as opções: ${res.erros.join(' ')} Responda em texto normal.` }
              } catch {
                return { ok: false, aviso: 'Não consegui montar as opções agora. Responda em texto normal.' }
              }
            },
          }),
        }
      : {}),
    
    
    
    ...(composioTools ?? {}),
    
    
    
    
    
    ...semColisao(customTools, ['buscarBase', 'anotarFicha', 'escalarHumano', 'listarArquivos', 'enviarArquivo', 'oferecerOpcoes']),
  }
}


function semColisao(
  tools: Record<string, unknown> | undefined,
  reservados: readonly string[],
): Record<string, unknown> {
  if (!tools) return {}
  const out: Record<string, unknown> = {}
  for (const [id, tool] of Object.entries(tools)) {
    if (reservados.includes(id)) {
      console.warn(`[buildCanalTools] tool custom "${id}" colide com tool de canal, ignorada`)
      continue
    }
    out[id] = tool
  }
  return out
}
