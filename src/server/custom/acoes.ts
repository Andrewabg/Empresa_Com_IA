// src/server/custom/acoes.ts — monta a fachada CustomAcoes: thin-wraps fail-safe sobre serviços
// do core. É o caminho recomendado pra a zona custom tocar o sistema (em vez de SQL cru service-role).
import { notificar } from '@/server/proativo/notificar'
import { createTask } from '@/data/tasks'
import { getAgentBySlugOuRole } from '@/data/agents'
import { createCustomToolApproval } from '@/server/approvals/customTool'
import { listCanais, type CanalRow, type CanalTipo } from '@/data/canais'
import { getContatoPorExternalId, getOrCreateContato, listContatosPorExternalId } from '@/data/contatos'
import { getConversaAbertaDoPar, getOrCreateConversaAberta, touchConversaOut } from '@/data/conversasExternas'
import { insertMensagemExterna } from '@/data/mensagensExternas'
import { reservarEnvio, concluirEnvio, falharEnvio, getEnvioPorDedup } from '@/data/customEnvios'
import { recordEvent } from '@/data/events'
import { enviarTexto } from '@/server/canais/dispatch'
import { getProvider } from '@/server/canais/registry'
import { maisRecenteEntre, precisaJanela } from '@/lib/canais/janela'
import { enviarMensagemCustom, type JanelaDoPar } from './enviarMensagem'
import type { CustomAcoes } from './contrato'

// Estado do teto: array de módulo (o laço acidental acontece dentro do processo, e é lá
// que o freio precisa morder). Reinício do container zera, e isso é aceitável por desenho.
const carimbosDeEnvio: number[] = []

/**
 * A janela de 24h da Meta, consultada pela operação DEPOIS de ela resolver o canal e
 * normalizar o destino. Ela é injetada em vez de embutida porque é a única parte da decisão
 * que precisa do banco; o resto continua puro e testável sem rede.
 *
 * Sem conversa anterior = fora da janela: nunca abrimos conversa nova com texto livre, e a
 * Meta recusaria de qualquer forma. O par capability + `precisaJanela` é o mesmo que o
 * `inboxActions` usa; duplicar a regra aqui daria duas regras diferentes.
 *
 * A janela é do NÚMERO, não da linha de contato. No Brasil o mesmo assinante aparece com e
 * sem o nono dígito, e uma instalação pode ter as DUAS formas gravadas (a antiga morta e a
 * nova viva). Lendo só o contato escolhido pelo casamento exato, um cliente que acabou de
 * escrever pela outra forma era recusado como `fora_da_janela` com a janela aberta. Aqui
 * vale a última entrada entre TODAS as variantes.
 *
 * E a linha que deu essa resposta VOLTA junto, porque descobrir a janela é descobrir o par:
 * é essa mesma linha que recebe a mensagem no histórico. Devolver só o estado deixava o
 * envio resolver o contato de novo, pelo casamento exato, e a resposta aparecia para o
 * operador numa thread parada enquanto o cliente falava pela outra forma do número.
 */
async function estadoDaJanela(canal: CanalRow, destino: string): Promise<JanelaDoPar> {
  const janela24h = getProvider(canal.provider)?.adapter.capabilities.janela24h ?? true
  if (!janela24h) return { estado: 'aberta', contatoId: null, contatoExternalId: null }
  const contatos = await listContatosPorExternalId(canal.tipo, destino)
  if (contatos.length === 0) return { estado: 'sem_conversa', contatoId: null, contatoExternalId: null }
  // O casamento exato na frente, e só como DESEMPATE: quem decide é a conversa viva. Com as
  // duas formas gravadas e a mesma marca de tempo nas duas, o assinante é representado pela
  // linha que o `getContatoPorExternalId` escolheria, e as duas decisões não se contradizem.
  const preferidos = [...contatos].sort(
    (a, b) => Number(b.external_id === destino) - Number(a.external_id === destino),
  )
  const conversas = await Promise.all(preferidos.map((c) => getConversaAbertaDoPar(canal.id, c.id)))
  // Conversa que existe mas nunca recebeu mensagem DO CLIENTE é o mesmo estado, do ponto de
  // vista de quem lê o motivo: ninguém escreveu para nós ali.
  // `item` carrega o CONTATO inteiro, não só o id: quem chama precisa também do
  // `external_id` — a forma que o provedor de fato reconhece — para canonicalizar o envio
  // (achado 4 da revisão do branch inteiro, 2026-09-08).
  const vivo = maisRecenteEntre(preferidos.map((c, i) => ({ item: c, em: conversas[i]?.ultima_msg_in_at })))
  if (!vivo) return { estado: 'sem_conversa', contatoId: null, contatoExternalId: null }
  const expirada = precisaJanela(janela24h, vivo.em, new Date().toISOString())
  return { estado: expirada ? 'expirada' : 'aberta', contatoId: vivo.item.id, contatoExternalId: vivo.item.external_id }
}

/**
 * Contato existente primeiro, criação só depois. O `getOrCreateContato` casa por igualdade
 * exata, e no Brasil o mesmo assinante aparece com e sem o nono dígito: passar direto criaria
 * um SEGUNDO contato na outra forma do número e bifurcaria a thread do cliente no inbox.
 *
 * Este é o caminho de quem NÃO teve a janela consultada (provider sem janela de 24h): lá não
 * há conversa viva para apontar o par, e o representante do assinante é o casamento exato.
 * Onde a janela foi consultada, o par já veio dela e este caminho não é usado.
 */
async function acharOuCriarContato(i: { tipo: CanalTipo; external_id: string; nome: string }) {
  const existente = await getContatoPorExternalId(i.tipo, i.external_id)
  return existente ?? getOrCreateContato(i)
}

export function construirAcoes(): CustomAcoes {
  const notificarDono: CustomAcoes['notificar'] = async ({ titulo, corpo, urgencia, dedupKey }) =>
    notificar({ tipo: 'custom', titulo, corpo, urgencia: urgencia ?? 'imediata', dedupKey })

  return {
    notificar: notificarDono,
    async criarTarefa({ agente, descricao, operadorId }) {
      const row = await getAgentBySlugOuRole(agente)
      if (!row) throw new Error(`criarTarefa: agente "${agente}" não existe no roster`)
      // operadorId é OPT-IN do CHAMADOR (custom/) — nunca inferido daqui. Ver o comentário
      // no contrato: um webhook de entrada não pode virar concessão de ato de dono sozinho.
      const task = await createTask({ agent_id: row.id, objective: descricao, operator_id: operadorId })
      return { id: task.id }
    },
    async criarAprovacao({ tool, titulo, args }) {
      const apr = await createCustomToolApproval({ toolId: tool, titulo, args, agentId: null })
      return { id: apr.id }
    },
    async enviarMensagem(input) {
      // O canal é resolvido UMA vez, dentro da operação. A versão anterior o resolvia aqui
      // também, para decidir a janela antes de entrar: além da regra duplicada, eram duas
      // leituras de `listCanais` com uma janela de corrida entre elas — desligar um canal no
      // /config entre as duas fazia o wiring ver 2 e a operação ver 1, e o disparo morria
      // como "fora_da_janela" sem nada de errado com o contato.
      return enviarMensagemCustom(input, {
        listCanais, reservarEnvio, concluirEnvio, falharEnvio,
        lerEnvio: getEnvioPorDedup,
        // O dispatch devolve `acao`/`retryAfterMs` além do que a operação precisa; estreitar
        // aqui é o que mantém o `EnviarMensagemDeps` pequeno.
        enviarTexto: async (canal, para, texto) => {
          const r = await enviarTexto(canal, para, texto)
          return r.ok ? { ok: true, externalId: r.externalId } : { ok: false, erro: r.erro }
        },
        getOrCreateContato: acharOuCriarContato,
        getOrCreateConversaAberta,
        insertMensagemExterna, touchConversaOut, recordEvent,
        notificar: notificarDono,
        podeEnviarLivre: estadoDaJanela,
        carimbos: carimbosDeEnvio,
        now: () => new Date().toISOString(),
      })
    },
  }
}
