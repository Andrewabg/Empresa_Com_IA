// src/server/custom/enviarMensagem.ts — a operação pública de envio transacional.
// Toda decisão fica aqui e é testável por DI; o transporte continua sendo o dispatch.
import { cabeNoTeto, podarCarimbos, TETO_ENVIOS_HORA } from '@/lib/custom/tetoDeEnvio'
import { classificarReserva, type LinhaDeReserva } from '@/lib/custom/estadoDaReserva'
import { temConteudoVisivel } from '@/lib/conteudoVisivel'
import { normalizarTelefone, formaComDdiConhecida } from '@/lib/canais/telefone'
import { KIND_AUTOMACAO } from '@/lib/canais/autoriaDaBolha'
import { mdParaWhatsapp } from '@/lib/whatsapp/mdParaWhatsapp'
import { WHATSAPP_CLOUD_MAX_CHARS } from '@/server/canais/providers/whatsappCloud'
import { UAZAPI_MAX_CHARS } from '@/server/canais/providers/uazapi'
import { INSTAGRAM_MAX_CHARS } from '@/lib/instagram/limitesDaMeta'
import type { EnviarMensagemInput, EnviarMensagemResultado } from './contrato'
import type { CanalRow, CanalTipo } from '@/data/canais'

/**
 * O estado da janela de 24h, em três valores e não em um booleano: "nunca houve conversa" e
 * "a conversa esfriou" mandam o comprador procurar coisas DIFERENTES, e um `false` só faria
 * a mensagem falar da última mensagem de um contato que talvez nunca tenha escrito.
 */
export type EstadoDaJanela = 'aberta' | 'sem_conversa' | 'expirada'

/**
 * A resposta da janela: o estado E a linha de contato que o produziu.
 *
 * O `contatoId` viaja junto porque descobrir a janela É descobrir o par. A janela é do
 * NÚMERO e o mesmo assinante pode ter duas linhas gravadas (o WhatsApp entrega o número
 * brasileiro ora com o nono dígito, ora sem); quem responde "aberta" já sabe em qual delas o
 * cliente está falando. Enquanto essa resposta era jogada fora, o histórico resolvia o
 * contato por outro caminho e podia gravar a mensagem na thread parada: o cliente escrevia
 * de um lado e o operador via a resposta subir do outro.
 *
 * `null` = a pergunta não foi feita a nenhum contato (provider sem janela de 24h) ou não
 * havia contato nenhum. Aí quem resolve o par é o `getOrCreateContato`.
 */
export interface JanelaDoPar {
  estado: EstadoDaJanela
  contatoId: string | null
  /**
   * A forma REAL do destino, tal como está gravada no contato que respondeu por esta janela
   * (o `external_id` dele). `undefined`/`null` quando `contatoId` também é — nenhum contato
   * resolveu o par.
   *
   * Existe porque a busca da janela é TOLERANTE a variante (nono dígito, DDI — é isso que
   * fecha a bifurcação de thread), então o `destino` que chegou em `enviarMensagemCustom` pode
   * não ser a forma que o contato tem gravada. Mandar essa forma "quase certa" pro provedor é
   * o jeito de queimar a `dedupKey` à toa: a reserva já aconteceu quando o envio é tentado, o
   * `to` não-E.164 é rejeitado pela Meta, e a chave fica ocupada para sempre (achado 4 da
   * revisão do branch inteiro, 2026-09-08 — regressão da tolerância de variante do achado 3/A6:
   * antes dela, um `destino` sem DDI era recusado como `fora_da_janela` ANTES da reserva).
   *
   * ESTE CAMPO SOZINHO NÃO É SUFICIENTE: a mesma busca por variante que o preenche pode ter
   * casado contra uma linha de CONTATO gravada numa forma incompleta (sem DDI) — o caso real é
   * `acharOuCriarContato` criando o contato atrás de um envio UAZAPI a um número sem DDI vindo
   * de fora. Preferir cegamente este valor herdaria o MESMO defeito do achado 4, só que por
   * outro caminho. Quem consome este campo NÃO deriva um DDI a partir de dígitos crus (isso
   * reescreveria um número estrangeiro em formato nacional para um número BR de OUTRO
   * assinante — achado crítico da revisão do branch inteiro, 2026-09-08, round 2): escolhe,
   * entre `destino` e este campo, o que já tiver DDI observado (`formaComDdiConhecida`,
   * `src/lib/canais/telefone.ts`). Sem evidência de completude em nenhum dos dois, o `destino`
   * segue como está — falha alta e recuperável, nunca entrega silenciosa a um estranho.
   */
  contatoExternalId?: string | null
}

export interface EnviarMensagemDeps {
  listCanais: () => Promise<CanalRow[]>
  reservarEnvio: (i: { dedupKey: string; destino: string; canalId: string | null }) => Promise<{ reservado: boolean; id?: string }>
  /** A linha que já ocupa a chave, lida só quando a reserva PERDE. É ela que transforma
   *  `duplicado` (uma palavra para três destinos diferentes) num motivo acionável. */
  lerEnvio: (dedupKey: string) => Promise<LinhaDeReserva | null>
  concluirEnvio: (id: string, externalId: string) => Promise<void>
  falharEnvio: (id: string, erro: string) => Promise<void>
  /** Estreitado de propósito: o dispatch devolve `acao`/`retryAfterMs`, que esta operação
   *  não usa. O adaptador mora no wiring, e é o que mantém o teste sem rede. */
  enviarTexto: (canal: CanalRow, para: string, texto: string) => Promise<{ ok: true; externalId: string } | { ok: false; erro: string }>
  getOrCreateContato: (i: { tipo: CanalTipo; external_id: string; nome: string }) => Promise<{ id: string; external_id: string }>
  getOrCreateConversaAberta: (canalId: string, contatoId: string) => Promise<{ id: string }>
  insertMensagemExterna: (linha: {
    conversa_id: string; direcao: 'out'; autor: 'operador'
    texto: string; status: 'enviada'; external_id: string
    midia: { kind: string }
  }) => Promise<unknown>
  /** Carimba a atividade da conversa. TODO caminho de saída da casa faz isto depois de
   *  inserir a linha `out`; sem ele a conversa não sobe no /inbox (a lista ordena por
   *  `ultima_msg_at`) e o follow-up segue lendo o par como se nós devêssemos resposta. */
  touchConversaOut: (conversaId: string, atIso: string) => Promise<void>
  /** `id` é obrigatório no RecordEventInput real; a convenção é id determinístico com escopo. */
  recordEvent: (i: { id: string; type: 'action'; label: string; agent?: string }) => Promise<void>
  notificar: (i: { titulo: string; corpo: string; urgencia?: 'imediata' | 'briefing'; dedupKey?: string }) => Promise<{ created: boolean }>
  /** A conversa aceita texto livre agora? Assíncrona porque a resposta mora no banco, e uma
   *  dep injetada é tão pura para o teste sendo `async` quanto sendo síncrona. Ela recebe o
   *  canal JÁ resolvido e o destino JÁ normalizado: é o que garante que a janela seja
   *  consultada para o mesmo par que vai receber a mensagem. E o par que ela resolveu volta
   *  no `contatoId`, para o histórico usar ESSE, em vez de resolver o par uma segunda vez
   *  por outro critério. */
  podeEnviarLivre: (canal: CanalRow, destino: string) => Promise<JanelaDoPar>
  /** Carimbos dos envios recentes — o estado do teto, injetado para o teste ser puro. */
  carimbos: number[]
  now: () => string
}

/** Copy do aviso ao dono quando o teto morde. */
export const AVISO_TETO_TITULO = 'Envios automáticos pausados'
export const AVISO_TETO_CORPO =
  `Uma automação sua pediu mais de ${TETO_ENVIOS_HORA} envios em uma hora e o sistema segurou os seguintes. ` +
  'Isso costuma ser sinal de repetição indevida. Confira a automação antes de liberar mais.'

/** Copy do aviso ao dono quando a mensagem SAIU e o registro dela falhou. O identificador do
 *  provedor entra no corpo porque é por ele que dá para conciliar depois o que saiu. */
export const AVISO_HISTORICO_TITULO = 'Uma mensagem saiu e o registro dela falhou'
export function avisoHistoricoCorpo(destino: string, externalId: string): string {
  return (
    `O cliente ${destino} recebeu a mensagem que uma automação sua disparou, mas parte do registro dela ` +
    'não foi gravada, então ela pode não aparecer na conversa dele. Não reenvie: o texto já chegou. ' +
    `O identificador dela no provedor é ${externalId}. ` +
    'Vale conferir se o banco de dados da instalação está respondendo.'
  )
}

/** Os dois motivos possíveis de `fora_da_janela`. Separados porque mandam procurar coisas
 *  diferentes: um contato que nunca falou, ou uma conversa que esfriou. */
export const DETALHE_SEM_CONVERSA =
  'este contato nunca escreveu neste canal, e sem uma mensagem dele a Meta não aceita texto livre'
export const DETALHE_JANELA_EXPIRADA =
  'a última mensagem deste contato tem mais de 24h, e a Meta não aceita texto livre depois disso'

/**
 * Os motivos de `duplicado`, um por desfecho. Eles existem porque a palavra sozinha juntava
 * "já chegou ao cliente" com "travou e nunca vai chegar", e as duas pedem coisas opostas de
 * quem escreveu a automação.
 *
 * NENHUM deles afirma que a mensagem não saiu quando não dá para saber. A reserva presa é o
 * caso exato disso: ela também é o que sobra quando o provedor ACEITOU e o registro do
 * `concluirEnvio` é que falhou, e nesse caminho o cliente já está com a mensagem na mão.
 */
export function detalheJaEntregue(externalId: string | null): string {
  const id = externalId ? ` O identificador dela no provedor é ${externalId}.` : ''
  return `esta chave já foi usada e a mensagem chegou ao destino.${id} Não precisa fazer nada`
}
export function detalheJaFalhou(erro: string | null): string {
  const motivo = erro && erro.trim() ? `: ${erro.trim()}` : ''
  return (
    `esta chave já foi usada e aquele envio falhou${motivo}. ` +
    'A chave segue ocupada de propósito, então reenviar é decisão sua, com uma chave nova'
  )
}
export const DETALHE_ENVIO_EM_ANDAMENTO =
  'um envio com esta chave começou há pouco e ainda não terminou. Espere ele concluir antes de decidir qualquer coisa'
export const DETALHE_RESERVA_PRESA =
  'esta chave foi reservada e o envio nunca chegou a ser confirmado, então não dá para afirmar se a mensagem chegou. ' +
  'O caso mais comum é a instalação ter sido reiniciada no meio do disparo. ' +
  'Confira com o cliente antes de mandar com uma chave nova, porque parte do trabalho pode já ter acontecido'
/** Cobre os DOIS jeitos de não saber: o registro não pôde ser lido, ou ele foi lido e não
 *  permite concluir nada (a data dele está no futuro, sinal de que os relógios do banco e da
 *  aplicação discordam). Afirmar qualquer desfecho nos dois casos seria afirmar sobre uma
 *  mensagem que talvez tenha chegado ao cliente. */
export const DETALHE_DUPLICADO_SEM_LEITURA =
  'esta chave já foi usada, e o registro dela não permite dizer agora o que aconteceu com aquela mensagem'

/** Teto de caracteres por tipo de canal, tirado da fonte única de cada provedor. Acima dele
 *  o adapter CHUNKA: o cliente receberia N mensagens, o histórico guardaria uma, e uma série
 *  que quebra no meio deixa o começo entregue com o resultado dizendo que nada saiu. */
const MAX_CHARS_POR_TIPO: Record<CanalTipo, number> = {
  // Os dois provedores de WhatsApp têm tetos próprios; vale o menor, senão o texto passa
  // aqui e é fatiado lá dentro justamente no canal mais apertado.
  whatsapp: Math.min(WHATSAPP_CLOUD_MAX_CHARS, UAZAPI_MAX_CHARS),
  instagram: INSTAGRAM_MAX_CHARS,
}

/**
 * O telefone como o comprador digita ("+55 (11) 99999-9999") reduzido ao que o produto
 * grava e o provedor aceita (só dígitos). Vale para o WhatsApp; o Instagram endereça por
 * IGSID, que não é telefone e passa intacto. Identificador que não vira telefone (LID,
 * lixo curto) também passa intacto: quem recusa é o provedor, com motivo próprio, em vez
 * de esta função inventar um destino.
 */
export function normalizarDestino(tipo: CanalTipo, destino: string): string {
  if (tipo !== 'whatsapp') return destino
  return normalizarTelefone(destino) ?? destino
}

const nao = (
  motivo: Extract<EnviarMensagemResultado, { enviado: false }>['motivo'],
  detalhe?: string,
): EnviarMensagemResultado => ({ enviado: false, motivo, ...(detalhe ? { detalhe } : {}) })

/**
 * As mensagens das exceções, em constantes nomeadas. Elas SÃO copy do comprador: quem as lê
 * é a pessoa que escreveu o código da zona custom, no console da instalação dela. Enquanto
 * eram literais soltas no meio do fluxo, escapavam da régua de copy da casa.
 */
export function erroCampoObrigatorio(campo: string): string {
  return `enviarMensagem: o campo "${campo}" é obrigatório e veio em branco`
}
export function erroTextoAcimaDoLimite(tamanho: number, limite: number): string {
  return (
    `enviarMensagem: o texto ocupa ${tamanho} caracteres no formato do canal e o limite é ${limite}. ` +
    'Acima disso a mensagem sairia partida em várias e só a última entraria no histórico.'
  )
}
export const ERRO_RESERVA_SEM_ID =
  'enviarMensagem: a reserva foi aceita sem identificador. Enviar assim deixaria a mensagem sem rastro nenhum.'
/** Separado do campo em branco DE PROPÓSITO: quem escreveu o código está olhando uma string
 *  preenchida, e dizer a ele que o campo "veio em branco" o faria procurar a coisa errada. */
export const ERRO_TEXTO_SEM_CONTEUDO =
  'enviarMensagem: o texto tem caracteres, mas nenhum deles aparece na tela depois da conversão ' +
  'para o formato do canal. A linha separadora de tabela e os caracteres invisíveis são os casos comuns.'

/** Campo a campo, nunca em bloco: o que entra aqui é código do comprador. Em branco LANÇA,
 *  porque `dedupKey` vazia seria RESERVADA e transformaria todo disparo seguinte sem chave
 *  em `duplicado` calado — silêncio é o pior desfecho possível para um envio transacional. */
function exigir(campo: 'destino' | 'texto' | 'dedupKey', valor: unknown): string {
  const limpo = typeof valor === 'string' ? valor.trim() : ''
  // `trim` não alcança caractere de FORMATAÇÃO: um espaço de largura zero sozinho passava
  // por aqui e virava uma `dedupKey` invisível reservada para sempre, ou um texto que sai
  // vazio na tela do cliente. O valor DEVOLVIDO segue sendo o original aparado.
  if (!temConteudoVisivel(limpo)) throw new Error(erroCampoObrigatorio(campo))
  return limpo
}

/** A mensagem de uma exceção, sem o ruído do `String(err)` em cima de um Error. */
function mensagemDoErro(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Qual dos desfechos de chave tomada é este. NUNCA lança: a recusa classificada é o que o
 * contrato promete, e um soluço do banco na leitura do motivo não pode virar exceção crua
 * dentro do código do comprador.
 *
 * NÃO existe retomada automática aqui, e a ausência é decidida. Uma reserva presa em
 * `reservado` com `external_id` vazio é o que sobra em três caminhos, e em DOIS deles o
 * cliente já recebeu a mensagem: a instalação parada depois do aceite do provedor, e o
 * `concluirEnvio` que falhou (caminho tratado logo abaixo, que avisa o dono e deixa a linha
 * exatamente nesse estado). Retomar por idade duplicaria a mensagem justamente nos dois.
 * Quem decide é o comprador, agora informado pelo motivo.
 */
async function detalheDoDuplicado(d: EnviarMensagemDeps, dedupKey: string, agoraMs: number): Promise<string> {
  let linha: LinhaDeReserva | null
  try {
    linha = await d.lerEnvio(dedupKey)
  } catch (err) {
    console.warn('[custom/enviarMensagem] a reserva existente não pôde ser lida:', mensagemDoErro(err))
    return DETALHE_DUPLICADO_SEM_LEITURA
  }
  switch (classificarReserva(linha, agoraMs)) {
    case 'entregue': return detalheJaEntregue(linha?.external_id ?? null)
    case 'falhou': return detalheJaFalhou(linha?.erro ?? null)
    case 'em_andamento': return DETALHE_ENVIO_EM_ANDAMENTO
    case 'presa': return DETALHE_RESERVA_PRESA
    default: return DETALHE_DUPLICADO_SEM_LEITURA
  }
}

/** Último recurso quando a mensagem já saiu e o registro dela falhou. NUNCA lança: ela é
 *  chamada de dentro de um catch, e estourar aqui apagaria o `enviado: true` que é verdade. */
async function avisarHistoricoPerdido(
  d: EnviarMensagemDeps,
  info: { destino: string; dedupKey: string; externalId: string; erro: string },
): Promise<void> {
  // O log do container é o piso: se o aviso e o rastro caírem juntos (o banco fora explica
  // os três), esta linha é a única prova de que uma mensagem entregue não foi registrada.
  console.warn(
    `[custom/enviarMensagem] mensagem entregue sem registro completo (dedupKey=${info.dedupKey}, ` +
    `externalId=${info.externalId}): ${info.erro}`,
  )
  try {
    await d.notificar({
      titulo: AVISO_HISTORICO_TITULO,
      corpo: avisoHistoricoCorpo(info.destino, info.externalId),
      urgencia: 'imediata',
      dedupKey: `custom_envio_historico:${info.dedupKey}`,
    })
  } catch {
    // O aviso é o canal preferido, não o único: o rastro abaixo ainda registra o ocorrido.
  }
  try {
    await d.recordEvent({
      id: `custom-envio-sem-historico:${info.dedupKey}`,
      type: 'action',
      label: `Envio transacional ${info.externalId} saiu sem registro completo (${info.dedupKey}): ${info.erro}`,
    })
  } catch {
    // Se nem o rastro entra, o banco está fora e o console.warn acima é o que resta.
  }
}

export async function enviarMensagemCustom(
  input: EnviarMensagemInput,
  d: EnviarMensagemDeps,
): Promise<EnviarMensagemResultado> {
  const dedupKey = exigir('dedupKey', input.dedupKey)
  const texto = exigir('texto', input.texto)
  const destinoCru = exigir('destino', input.destino)

  // 1) Canal. Ambiguidade é ERRO: "o primeiro habilitado" é exatamente a heurística que
  //    este contrato existe para aposentar.
  const habilitados = (await d.listCanais()).filter((c) => c.enabled)
  let canal: CanalRow | undefined
  if (input.canalId) {
    canal = habilitados.find((c) => c.id === input.canalId)
    if (!canal) return nao('canal_ausente', `o canal ${input.canalId} não existe ou está desligado`)
  } else {
    if (habilitados.length === 0) return nao('canal_ausente', 'nenhum canal habilitado')
    if (habilitados.length > 1) {
      return nao('canal_ambiguo', `há ${habilitados.length} canais habilitados; informe o canalId`)
    }
    canal = habilitados[0]
  }
  // `let`: a canonicalização (abaixo, passo 2) pode reescrever para a forma do CONTATO que a
  // janela resolveu — todo uso de `destino` daqui pra baixo (reserva, envio, aviso) precisa
  // enxergar essa forma final, e reatribuir é o que evita ter que trocar cada site um por um.
  let destino = normalizarDestino(canal.tipo, destinoCru)

  // O tamanho só dá para julgar com o canal na mão. LANÇA (como todo campo mal preenchido) e
  // lança ANTES da reserva: recusa de entrada não pode queimar a dedupKey.
  //
  // Mede o texto CONVERTIDO, não o cru: os três adapters fatiam
  // `splitMensagem(mdParaWhatsapp(texto), MAX)`, e a conversão CRESCE o texto (uma crase
  // simples vira três, uma tabela vira linha com separador). Medir o cru deixaria passar
  // 3.999 caracteres com markdown que viram 7.000 e saem partidos lá dentro.
  const limite = MAX_CHARS_POR_TIPO[canal.tipo]
  // O MESMO texto que o adapter vai mandar: mede o limite aqui em cima e, lá embaixo, é ele
  // que entra no histórico — o /inbox precisa mostrar o que o cliente leu, não o markdown cru.
  const textoDoCanal = mdParaWhatsapp(texto)
  // A conversão pode ESVAZIAR um texto que entrou preenchido (ela remove o caractere nulo,
  // que é o placeholder interno dela). Sair assim seria uma bolha em branco no WhatsApp do
  // cliente, e uma linha sem texto no histórico.
  if (!temConteudoVisivel(textoDoCanal)) throw new Error(ERRO_TEXTO_SEM_CONTEUDO)
  if (textoDoCanal.length > limite) throw new Error(erroTextoAcimaDoLimite(textoDoCanal.length, limite))

  // 2) Janela de 24h, ANTES de reservar: recusa previsível não deve queimar a dedupKey.
  const janela = await d.podeEnviarLivre(canal, destino)
  if (janela.estado !== 'aberta') {
    return nao('fora_da_janela', janela.estado === 'sem_conversa' ? DETALHE_SEM_CONVERSA : DETALHE_JANELA_EXPIRADA)
  }
  // A janela pode ter resolvido o par por uma VARIANTE do número (nono dígito, DDI) — ela é
  // tolerante de propósito, e é isso que fecha a bifurcação de thread (achado 3/A6). Mas nem
  // `destino` (o que o comprador mandou) nem `janela.contatoExternalId` (o que está gravado no
  // contato que a janela achou) têm garantia individual de já carregar o DDI: mandar a forma
  // "quase certa" pro provedor é o jeito de queimar a `dedupKey` à toa (achado 4, 2026-09-08) —
  // e ESCOLHER cegamente um dos dois lados sem checar (a versão anterior deste conserto,
  // `formaSeguraDeEnvio`, DERIVAVA o DDI a partir de dígitos crus quando nenhum dos dois já o
  // carregava) é pior: a régua de "número BR completo" que ela reaproveitava (`variantesBr`)
  // não distingue um nacional americano/argentino/russo em formato nacional de um número BR de
  // OUTRO assinante, e a mensagem saía, silenciosa e irreversível, para um estranho (achado
  // crítico da revisão do branch inteiro, 2026-09-08, round 2).
  //
  // `formaComDdiConhecida` só ESCOLHE, nunca deriva: entre `destino` (a evidência do que o
  // comprador mandou) e `janela.contatoExternalId` (a evidência do que a janela achou gravado,
  // quando achou), usa o que JÁ tiver DDI observado (12/13 dígitos). Sem evidência de nenhum
  // dos dois lados, `destino` segue como está — e um `to` sem DDI que a Meta rejeitar volta a
  // falhar ALTO (recuperável: o comprador vê o erro e decide), nunca entrega a outra pessoa.
  // CANONICALIZA depois da recusa previsível (ela tem que continuar olhando o número que o
  // comprador de fato mandou) e antes de qualquer coisa que grave ou dispare.
  destino = formaComDdiConhecida(canal.tipo, destino, janela.contatoExternalId)

  // 3) Teto. Avisa o dono: teto que corta em silêncio é pior que teto nenhum.
  //    FREIO GROSSO, e de propósito: a leitura acontece aqui e o carimbo só depois do
  //    `await` da reserva, então N disparos simultâneos podem passar juntos pela borda. Ele
  //    existe para frear um LAÇO acidental, que é sequencial; não é cota, não conte com ele
  //    para número exato.
  const agoraMs = Date.parse(d.now())
  if (!cabeNoTeto(d.carimbos, agoraMs)) {
    // A chave é BALDEADA POR DIA, como as quatro vigilâncias da casa fazem. Constante, ela
    // avisaria UMA vez a cada 90 dias: o índice único de `notificacoes` não tem componente de
    // tempo e a poda só roda depois desse prazo. O teto voltaria a cortar em silêncio no dia
    // seguinte, que é exatamente o que ele existe para não fazer.
    const dia = d.now().slice(0, 10)
    try {
      await d.notificar({
        titulo: AVISO_TETO_TITULO, corpo: AVISO_TETO_CORPO,
        urgencia: 'imediata', dedupKey: `custom_envio_teto:${dia}`,
      })
    } catch (err) {
      // O aviso é o desejável; a RECUSA CLASSIFICADA é o essencial. Um soluço do banco aqui
      // derrubaria como exceção crua, no código do comprador, um caso que o contrato promete
      // devolver no resultado.
      console.warn('[custom/enviarMensagem] aviso do teto não saiu (fail-open):', mensagemDoErro(err))
    }
    return nao('teto_atingido')
  }

  // 4) Reserva. É ESTE passo que deduplica, e ele vem antes de qualquer byte sair.
  const reserva = await d.reservarEnvio({ dedupKey, destino, canalId: canal.id })
  if (!reserva.reservado) return nao('duplicado', await detalheDoDuplicado(d, dedupKey, agoraMs))
  // Reserva ganha sem id não existe no DAO; se existisse, seguir adiante enviaria sem
  // rastro. Estourar aqui é preferível a mandar às cegas.
  const reservaId = reserva.id
  if (!reservaId) throw new Error(ERRO_RESERVA_SEM_ID)

  // O carimbo entra no PEDIDO, não no sucesso: um laço que falha no provedor também queima
  // o número do comprador na Meta, e contar só o que deu certo deixaria justamente o laço
  // quebrado atravessar o freio para sempre. É o que o aviso ao dono diz ("pediu mais de N").
  d.carimbos.push(agoraMs)
  const podados = podarCarimbos(d.carimbos, agoraMs)
  d.carimbos.length = 0
  d.carimbos.push(...podados)

  // 5) Envio. O `try` não é decoração: o dispatch resolve credenciais no Vault, e `getSecret`
  //    LANÇA em qualquer erro de banco. Sem ele, a exceção subiria com a reserva presa em
  //    `reservado` e a mesma chave passaria a devolver `duplicado` PARA SEMPRE — a
  //    confirmação daquela venda ficaria impossível de enviar, e quem tentasse com chave
  //    nova mandaria a mesma mensagem duas vezes.
  let res: { ok: true; externalId: string } | { ok: false; erro: string }
  try {
    res = await d.enviarTexto(canal, destino, texto)
  } catch (err) {
    res = { ok: false, erro: mensagemDoErro(err) }
  }
  if (!res.ok) {
    try {
      await d.falharEnvio(reservaId, res.erro)
    } catch {
      // Marcar a reserva é o desejável, não o essencial. O essencial é o comprador receber
      // a recusa CLASSIFICADA em vez de uma exceção que ele leria como bug do código dele.
    }
    return nao('recusado_pelo_provedor', res.erro)
  }

  // 6) O envio precisa existir no inbox: mensagem que o cliente recebeu e o operador não vê
  //    faz a próxima conversa começar torta. Daqui para baixo os BYTES JÁ SAÍRAM, então
  //    nenhuma falha pode virar exceção: devolver erro faria o comprador reenviar e o
  //    cliente receber duas vezes, que é pior do que um histórico incompleto.
  //    Cada escrita tem o SEU try: num try único, o primeiro tropeço engolia todas as
  //    seguintes, e a mais cara delas é a `concluirEnvio` — a reserva ficava dizendo
  //    "reservado" para uma mensagem que o cliente já tinha em mãos.
  const externalId = res.externalId
  const falhas: string[] = []
  const tentar = async (oQue: string, fn: () => Promise<unknown>): Promise<void> => {
    try {
      await fn()
    } catch (err) {
      falhas.push(`${oQue}: ${mensagemDoErro(err)}`)
    }
  }

  // A reserva primeiro: ela é o registro auditável de que estes bytes saíram, e não depende
  // de nada do histórico.
  await tentar('concluir a reserva', () => d.concluirEnvio(reservaId, externalId))

  // Contato → conversa → linha do histórico é uma cadeia: cada passo precisa do anterior,
  // então ela é UMA tentativa. O carimbo só sai se a linha entrou, senão a conversa subiria
  // no /inbox anunciando uma mensagem que não está lá.
  // `null` e não `''`: o vazio confundia "não gravou" com "gravou e o banco devolveu um id
  // vazio". No segundo caso o carimbo era pulado em silêncio; agora ele é tentado, falha
  // dentro do `tentar` e o dono fica sabendo.
  let conversaGravada: string | null = null
  await tentar('gravar a mensagem no histórico', async () => {
    // UMA resolução, UM par. Quando a janela já disse de qual linha de contato veio a última
    // fala do cliente, é ela que recebe a linha do histórico e o carimbo de atividade —
    // resolver o contato de novo aqui, por outro critério, é o que fazia a resposta subir na
    // thread parada enquanto o cliente falava pela outra forma do número. O
    // `getOrCreateContato` continua sendo o caminho de quem não teve a janela consultada
    // (provider sem janela de 24h), e ali ele também cria o contato que ainda não existe.
    //
    // A conversa segue vindo do `getOrCreateConversaAberta`, e não da leitura da janela: só
    // ele REABRE uma conversa fechada. A janela lê a fechada de propósito (ela ainda carrega
    // a última fala do cliente), e gravar direto nela deixaria a mensagem fora do /inbox.
    const contatoId = janela.contatoId
      ?? (await d.getOrCreateContato({ tipo: canal.tipo, external_id: destino, nome: destino })).id
    const conversa = await d.getOrCreateConversaAberta(canal.id, contatoId)
    await d.insertMensagemExterna({
      // `operador`, NUNCA `agente`. Esta linha não é fala do agente: é uma automação do
      // comprador falando pela empresa. Marcá-la como do agente desligava o aviso de IA da
      // conversa inteira — `contarSaidasEntregues` conta `autor='agente'` para decidir o
      // disclosure, então cada envio transacional fazia a PRÓXIMA resposta de IA sair sem a
      // identificação obrigatória, e o carimbo de "última saída" empurrava o ciclo de 30 dias
      // para sempre à frente. De quebra, o detector de loop lia este texto como fala do
      // agente, o dossiê inflava as tentativas e o `rotularAutor` não rotulava, deixando o
      // modelo imitar a voz transacional do comprador como se fosse a dele.
      conversa_id: conversa.id, direcao: 'out', autor: 'operador',
      texto: textoDoCanal, status: 'enviada', external_id: externalId,
      // O carimbo que o /inbox lê para assinar a bolha. Sem ele o fio dizia "Você", e o
      // operador atribuía a si mesmo uma frase que uma automação escreveu.
      midia: { kind: KIND_AUTOMACAO },
    })
    conversaGravada = conversa.id
  })
  // Cópia local: o `let` é escrito dentro de uma closure, e sem ela o `!== null` não estreita.
  const conversaId = conversaGravada
  if (conversaId !== null) {
    await tentar('carimbar a atividade da conversa', () => d.touchConversaOut(conversaId, d.now()))
  }

  // id determinístico pela dedupKey: o upsert do recordEvent então não duplica o rastro
  // nem quando a mesma chave é reprocessada.
  await tentar('registrar o rastro', () => d.recordEvent({
    id: `custom-envio:${dedupKey}`,
    type: 'action',
    label: `Envio transacional da zona custom (${dedupKey})`,
  }))

  if (falhas.length > 0) {
    await avisarHistoricoPerdido(d, {
      destino, dedupKey, externalId, erro: falhas.join('; '),
    })
  }
  return { enviado: true, mensagemId: externalId }
}
