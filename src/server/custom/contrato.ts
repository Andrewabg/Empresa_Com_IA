// src/server/custom/contrato.ts — O CONTRATO ESTÁVEL entre o core e a pasta custom/
// do comprador. ⚠️ API PÚBLICA do produto: mudança breaking aqui exige release notes
// explícitas (o código do cliente importa estes types). Manter mínimo e estável.
import type React from 'react'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Contexto injetado pelo core em toda execução de tool custom (v1 mínimo — spec §4.1). */
export interface CustomToolCtx {
  /** Id do agente que está executando (ex.: 'jarvis'). */
  agentId: string | null
  /** Id do operador dono da instância (quando disponível no turno). */
  operatorId: string | null
  /**
   * Id da conversa corrente (quando disponível).
   *
   * Qual TABELA ele endereça depende de onde o turno acontece: no chat do painel é
   * `conversations`; no atendimento por WhatsApp é `conversas_externas` (a linha que carrega
   * o contato, e por ele o telefone do cliente). É a mesma pergunta — "com quem estou
   * falando agora" — e por isso um campo só.
   */
  conversationId: string | null
  /** Client Supabase com service role — acesso total às tabelas da instância. */
  db: () => SupabaseClient
  /** Lê um setting da tabela `settings` (null se ausente). */
  getSetting: (key: string) => Promise<string | null>
}

/** Nome neutro — o mesmo contexto serve tools e handlers de API. */
export type CustomCtx = CustomToolCtx

/** Uma tool custom registrada em custom/tools/index.ts. */
export interface ToolCustom {
  /** Identificador único (snake_case, 3-40 chars, começa com letra). Vira o nome da tool no modelo. */
  id: string
  titulo: string
  /** Descrição PRO MODELO — diga quando usar, como uma instrução. */
  descricao: string
  /** Schema zod do input (objeto). */
  inputSchema: z.ZodTypeAny
  /** true ⇒ a execução vira uma APROVAÇÃO em /aprovacoes (HITL) em vez de rodar na hora. */
  requerAprovacao?: boolean
  /**
   * O ctx é o V2 (com `getSecret`/`setSecret`/`acoes`) nos DOIS caminhos: execução direta e
   * execução aprovada. Foi declarado `CustomToolCtx` por muito tempo, e a tipagem estreita
   * escondeu o defeito em vez de denunciá-lo — quem precisava do Vault numa tool com
   * `requerAprovacao` era obrigado a um cast, e o cast passou a mentir num dos dois caminhos.
   * Alargar não quebra ninguém: um `execute` já escrito com `CustomToolCtx` continua válido.
   */
  execute: (ctx: CustomCtxV2, input: unknown) => Promise<unknown>
}

/** Uma tela custom registrada em custom/pages/index.tsx — renderiza em /c/<slug>. */
export interface PaginaCustom {
  /** Slug da URL (kebab-case, 3-40 chars). */
  slug: string
  /** Título — aparece no rail e no topo da tela. */
  titulo: string
  Componente: React.ComponentType
}

/** Um endpoint custom registrado em custom/api/index.ts — atende /api/c/<slug>. */
export interface ApiCustom {
  slug: string
  /** Handlers por método. O core aplica auth de OPERADOR antes de chamar. */
  GET?: (req: Request, ctx: CustomCtx) => Promise<Response>
  POST?: (req: Request, ctx: CustomCtx) => Promise<Response>
}

/**
 * Helper de identidade que INFERE o tipo do `input` do `execute` a partir do seu
 * `inputSchema` zod — o cliente NÃO precisa mais fazer cast (`input as {...}`). A
 * interface interna `ToolCustom` fica byte-idêntica (execute continua `input: unknown`
 * lá dentro) — só a ASSINATURA deste helper é genérica, então `registryTools`/
 * `mastraCustomTools`, que iteram `ToolCustom[]`, seguem intactos. Se o cliente
 * editar o `inputSchema`, o `execute` recompila com o novo tipo (pega o erro cedo).
 */
export function definirToolCustom<S extends z.ZodObject<z.ZodRawShape>>(
  t: Omit<ToolCustom, 'inputSchema' | 'execute'> & {
    inputSchema: S
    execute: (ctx: CustomCtxV2, input: z.infer<S>) => Promise<unknown>
  },
): ToolCustom {
  return t as ToolCustom
}
export function definirPaginaCustom(p: PaginaCustom): PaginaCustom { return p }
export function definirApiCustom(a: ApiCustom): ApiCustom { return a }

// ─────────────────────────────────────────────────────────────────────────────
// v2 — webhooks de entrada, rotinas periódicas e config declarativa (Movimento 4).
// ADITIVO: só ADICIONE ao fim. A única mudança que os types v1 já sofreram é o `execute` do
// ToolCustom passar a anunciar o `CustomCtxV2` que o core sempre entregou na execução direta
// (e que agora entrega também na aprovada) — alargamento, não quebra.
// ─────────────────────────────────────────────────────────────────────────────

/** Versão do contrato da zona custom/. Bumpar SÓ em mudança aditiva consciente. */
export const CONTRACT_VERSION = 5 as const

/** Evento externo já recebido e verificado, entregue a `processar`. */
export interface WebhookEvent {
  /** Slug do webhook que recebeu o evento (o `<slug>` de /api/hooks/<slug>). */
  slug: string
  /** Corpo parseado como JSON quando possível; `null` se o corpo não era JSON. */
  body: unknown
  /** Headers relevantes (safelist: assinatura, content-type, id de entrega). */
  headers: Record<string, string>
  /**
   * No ingress (verificação de assinatura) é o corpo cru exato, byte a byte.
   * DENTRO de `processar` (pós-fila) é uma reconstrução best-effort do body via
   * JSON.stringify (a fila não guarda os bytes originais), e um corpo não-JSON
   * chega vazio. Use `body` para os dados; a assinatura já foi verificada no ingress.
   */
  raw: string
}

/**
 * Descriptor de verificação de assinatura (conjunto FECHADO — a segurança mora no
 * core, não no código do cliente). O core lê o `segredo` do Vault pelo nome dado e
 * valida a assinatura ANTES de chamar `processar`. `segredo` = nome da chave (não o
 * valor). Variantes: HMAC no header (hex/base64), token no header, token na query.
 */
export type AuthDescriptor =
  | { tipo: 'hmac'; em: 'header'; header: string; encoding: 'hex' | 'base64'; segredo: string; prefixo?: string }
  | { tipo: 'token'; em: 'header'; header: string; segredo: string }
  | { tipo: 'token'; em: 'query'; param: string; segredo: string }

/** Fachada de ação injetada no ctx — o caminho recomendado pra tocar o sistema. */
export interface CustomAcoes {
  /** Empurra uma notificação ao dono (imediata pelo canal, ou juntada no briefing). */
  notificar: (input: { titulo: string; corpo: string; urgencia?: 'imediata' | 'briefing'; dedupKey?: string }) => Promise<{ created: boolean }>
  /** Cria uma tarefa para um agente do roster. `operadorId` é OPT-IN e explícito: quando
   *  presente, a tarefa nasce com aquele `operator_id` e herda o PAPEL dele (dono/membro) nas
   *  tools de ato de dono (gerenciarRotinas/gerenciarLembretes/ajustarNotificacoes). Ausente
   *  (o default) = tarefa SEM operador, igual ao comportamento de sempre — não vira dono por
   *  omissão. Só passe `ctx.operatorId` aqui quando o disparo for de fato uma ação do dono; um
   *  webhook de ENTRADA (terceiro externo) nunca deve preencher isto sozinho. */
  criarTarefa: (input: { agente: string; descricao: string; operadorId?: string }) => Promise<{ id: string }>
  /** Cria uma aprovação HITL em /aprovacoes (ato cru + args). */
  criarAprovacao: (input: { tool: string; titulo: string; args?: unknown }) => Promise<{ id: string }>
  /** Envia uma mensagem transacional por um canal, sem passar pelo LLM. O core resolve o
   *  canal, reduz o telefone a dígitos, garante idempotência pela `dedupKey`, grava no
   *  histórico e devolve resultado estruturado.
   *
   *  ATENÇÃO — nem todo canal CONTÉM o destino. No WhatsApp Cloud (oficial) e no Instagram só
   *  dá para escrever a quem falou com você nas últimas 24h (fora disso o retorno é
   *  `{enviado:false, motivo:'fora_da_janela'}`, e a Meta recusaria de qualquer forma). No
   *  UAZAPI (não oficial) não existe essa janela: o disparo alcança QUALQUER número. Isto
   *  importa quando o gatilho do envio vem de um webhook — todo webhook da sua pasta custom/
   *  já exige autenticação, mas num canal UAZAPI o SEU código é quem decide para quem a
   *  mensagem vai; valide o `destino` contra a sua base antes de chamar, em vez de confiar no
   *  que chegou no evento. Este aviso também mora em `custom/CLAUDE.md` — se um dia os dois
   *  divergirem, este arquivo é o que chega a toda instalação já publicada (o CLAUDE.md da
   *  pasta custom/ só é escrito uma vez, na instalação nova).
   *
   *  A `dedupKey` fica guardada PARA SEMPRE — a faxina de 90 dias que tira o telefone do
   *  envio (`anonimizarCustomEnviosVelhos`, `src/data/customEnvios.ts`) apaga `destino`,
   *  `erro` e `external_id`, nunca a `dedup_key`; é o que sustenta a garantia "mesma chave, no
   *  máximo um envio, para sempre". Por isso a `dedupKey` NÃO PODE carregar dado pessoal:
   *  monte-a com identificadores estáveis do seu sistema (id do evento + id do
   *  contato/cliente), nunca o telefone. Ver `EnviarMensagemInput.dedupKey` abaixo. Este
   *  aviso também mora em `custom/CLAUDE.md`, mesma regra do parágrafo acima.
   *
   *  DOIS casos LANÇAM em vez de devolver `{enviado:false}`, e os dois são erro de quem
   *  chama, não recusa do canal:
   *  1. campo obrigatório em branco (reservar a chave vazia faria o disparo seguinte virar
   *     `duplicado` em silêncio, para sempre);
   *  2. texto acima do limite do canal (o provedor o partiria em várias mensagens e só a
   *     última entraria no histórico). O limite é medido no texto já convertido para o
   *     formato do canal, que pode ser MAIOR que o que você escreveu. */
  enviarMensagem: (input: EnviarMensagemInput) => Promise<EnviarMensagemResultado>
}

/** Contexto expandido (v2) — compatível com CustomToolCtx (aditivo). */
export interface CustomCtxV2 extends CustomToolCtx {
  /** Lê um segredo do Vault pelo nome (null se ausente). */
  getSecret: (nome: string) => Promise<string | null>
  /** Grava/atualiza um segredo no Vault. */
  setSecret: (nome: string, valor: string) => Promise<void>
  /** Fachada de ações do core (notificar / criar tarefa / criar aprovação / enviar mensagem). */
  acoes: CustomAcoes
}

/** Webhook declarado em custom/webhooks/index.ts — atende /api/hooks/<slug>. */
export interface WebhookCustom {
  /** Slug da URL (kebab-case). Compõe /api/hooks/<slug>. */
  slug: string
  /** Como o core verifica a autenticidade do evento (conjunto fechado). */
  auth: AuthDescriptor
  /** Caminho de dot-notation no evento pra extrair a chave de dedup (ex.: 'body.id'). */
  dedupDe?: string
  /** Alternativa a `dedupDe`: função que extrai a chave de dedup (null ⇒ sem dedup). */
  extrairDedup?: (evento: WebhookEvent) => string | null
  /** Métodos aceitos (default: só POST). */
  metodo?: 'POST' | 'GET_POST'
  /** Processa o evento já verificado. Erros viram retry/log no core. */
  processar: (evento: WebhookEvent, ctx: CustomCtxV2) => Promise<void>
}

/** Rotina periódica declarada em custom/rotinas/index.ts — roda no heartbeat. */
export interface RotinaCustom {
  /** Identificador único (snake_case) — chave de agendamento/idempotência. */
  id: string
  /** Intervalo mínimo entre execuções, em minutos. */
  cadaMinutos: number
  /** O trabalho da rotina. */
  executar: (ctx: CustomCtxV2) => Promise<void>
}

/** Campo de config declarado em custom/config/index.ts — vira input no /config. */
export interface ConfigCustom {
  /** Nome da chave no Vault/settings (prefixo `custom_` por convenção). */
  chave: string
  /** Rótulo exibido no /config. */
  rotulo: string
  /** Tipo do input — `segredo` mascara e grava no Vault; `texto`/`url` são settings. */
  tipo: 'segredo' | 'texto' | 'url'
  /** true ⇒ o setup cobra o preenchimento. */
  obrigatorio?: boolean
  /** Texto de ajuda abaixo do input. */
  ajuda?: string
}

/** Helper de identidade — registra um webhook custom preservando o tipo. */
export function definirWebhookCustom(w: WebhookCustom): WebhookCustom { return w }
/** Helper de identidade — registra uma rotina periódica custom. */
export function definirRotinaCustom(r: RotinaCustom): RotinaCustom { return r }
/** Helper de identidade — registra um campo de config custom. */
export function definirConfigCustom(c: ConfigCustom): ConfigCustom { return c }

// ─────────────────────────────────────────────────────────────────────────────
// O gancho de saída e o envio transacional. Terceiro BLOCO deste arquivo, e é só isso que o
// "v3" de alguns nomes quer dizer: a versão do contrato é o `CONTRACT_VERSION` acima, hoje 5.
// ADITIVO: quem não tem `custom/saida` continua idêntico ao que era.

/** Prazo do revisor de saída. Curto de propósito: ele é para comparar e decidir,
 *  não para chamar API externa. Encaixa ABAIXO do prazo do motor. */
export const PRAZO_SAIDA_MS = 3_000

/** O turno, do ponto de vista do revisor de saída. */
export interface SaidaCtx {
  conversaId: string
  agenteSlug: string
  agenteNome: string
  canalId: string
  /** União escrita à mão de propósito: o contrato público não importa de `@/data`. */
  provedor: 'whatsapp_cloud' | 'uazapi' | 'instagram'
  /** external_id do contato (o telefone, no WhatsApp). */
  destino: string
  /** O texto do cliente que disparou este turno. */
  mensagemDoCliente: string
}

/** O que o revisor decide sobre o texto que ia sair.
 *  `null` = não mexer. `{texto}` = manda este no lugar. `{segurar}` = não manda;
 *  vira rascunho no inbox para uma pessoa decidir. */
export type SaidaCustom =
  | { texto: string }
  | { segurar: true; motivo: string }
  | null

/** Revisor declarado em `custom/saida/index.ts`. */
export interface RevisorDeSaida {
  revisar: (texto: string, ctx: SaidaCtx) => Promise<SaidaCustom>
}

/** Ajuda o TypeScript do comprador a inferir os tipos do revisor. */
export function definirRevisorDeSaida(r: RevisorDeSaida): RevisorDeSaida {
  return r
}

/** O que o comprador pede para sair. */
export interface EnviarMensagemInput {
  destino: string
  texto: string
  /** Ausente + 1 canal habilitado = usa ele. Ausente + vários = erro, nunca "o primeiro". */
  canalId?: string
  /** OBRIGATÓRIO. Mesma chave = no máximo um envio, para sempre — literalmente: a linha nunca
   *  é apagada e a `dedup_key` nunca é tocada pela anonimização de 90 dias. NÃO carregue dado
   *  pessoal aqui; monte a partir de identificadores estáveis (id do evento + id do
   *  contato/cliente), nunca o telefone. Exemplo:
   *  `confirmacao-agendamento:<id do agendamento>:<id do contato>`. */
  dedupKey: string
}

/** O resultado é ESTRUTURADO de propósito: quem chama precisa distinguir "a Meta recusou"
 *  de "eu já tinha mandado" sem ler texto de erro. */
export type EnviarMensagemResultado =
  | { enviado: true; mensagemId: string }
  | {
      enviado: false
      motivo:
        | 'duplicado'
        | 'fora_da_janela'
        | 'canal_ambiguo'
        | 'canal_ausente'
        | 'teto_atingido'
        | 'recusado_pelo_provedor'
      detalhe?: string
    }
