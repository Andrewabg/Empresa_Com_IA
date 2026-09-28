

import type { IgGatilho, IgRunStatus } from '@/data/igAutomacoes'


export const GATILHO_INDISPONIVEL_LABEL: Partial<Record<IgGatilho, string>> = {
  story: 'Resposta a um story',
  palavra_no_direct: 'Mensagem direta',
}

export const AVISO_GATILHO_INDISPONIVEL =
  'Esta automação foi criada com um gatilho que esta versão não executa mais, então ela fica parada mesmo aparecendo como ativa. Para voltar a responder, troque o disparo para comentário em uma publicação e escolha a publicação, ou arquive esta automação.'


export const ERRO_GATILHO_FORA_DE_USO =
  'Esta automação dispara por um tipo de evento que esta versão não executa, então ela ficaria no ar sem responder a ninguém. Troque o disparo para comentário em uma publicação, ou arquive a automação.'


export function gatilhoForaDeUso(gatilho: unknown): boolean {
  
  
  
  
  return typeof gatilho === 'string' && Object.hasOwn(GATILHO_INDISPONIVEL_LABEL, gatilho)
}


export const SUFIXO_GATILHO_FORA_DE_USO = ' · fora de uso'


export const ROTULO_PAUSADA_COM_DISPAROS = 'Pausada, não responde a comentários novos'

export const TEXTOS_GATILHO_IG = {
  semPassos: 'Esta automação não tem nenhuma mensagem configurada, então nada foi enviado.',
  foraDaJanela: 'Não deu para responder no direct: a janela de resposta a este comentário já fechou.',
  tokenMorto: 'A conexão com o Instagram caiu. Reconecte a conta na tela de configuração para as automações voltarem a rodar.',
  limiteMeta: 'A Meta limitou os envios agora. As mensagens que ficaram na fila saem sozinhas quando o limite liberar.',
  bloqueada: 'A Meta recusou o envio para esta pessoa. Insistir piora a reputação da conta, então este envio foi encerrado.',
  desistiu: 'O envio falhou nas tentativas e foi encerrado. Parte das mensagens pode já ter sido entregue.',
  
  imagemSemUrl: 'Não deu para preparar a imagem deste passo, então ele foi enviado apenas com o texto.',
  
  passoSoImagemSemUrl: 'Não deu para preparar a imagem deste passo, e ele não tinha texto, então nada foi enviado e a sequência parou aqui.',
  acessorioNaoEntregue: 'A mensagem principal deste passo chegou, mas uma parte extra dele não saiu. Pode ser a imagem ou a continuação de um texto longo. A sequência seguiu normalmente.',
  
  botaoSemTexto: 'Esta mensagem tem botões e ficou sem texto na hora do envio, e o Instagram só entrega botões junto de um texto. Nada foi enviado. Confira o texto dela na automação: se ele usa só o nome de quem comentou, fica vazio quando a pessoa não tem nome de usuário.',
  
  parteExtraIncerta: 'Uma mensagem deste disparo teve de ser retomada depois de uma falha nossa. O principal chegou, mas a parte extra dela (a imagem, ou a continuação de um texto longo) pode não ter chegado. A sequência seguiu daqui.',
  
  recusaDesconhecida: 'O Instagram recusou este envio e a resposta dele não diz o que consertar. A sequência parou aqui. Se voltar a acontecer, confira a conexão do Instagram na tela de configuração.',
  sumiuDoBanco: 'O registro desta automação não foi encontrado, então a sequência não teve como continuar.',
  
  pausadaNoMeio: 'Esta automação foi pausada enquanto este disparo estava no meio do caminho, então as mensagens que faltavam não foram enviadas.',
  
  sequenciaMudouNoMeio: 'A sequência de mensagens mudou enquanto este disparo estava no meio do caminho, então as mensagens que faltavam não foram enviadas.',
  
  naoRetomou: 'Este disparo parou por uma falha nossa e não deu para retomá-lo. Parte das mensagens pode já ter sido entregue.',
  
  origemForaDoFormato: 'O identificador do comentário veio fora do formato esperado, então este envio foi recusado por segurança e a sequência parou aqui.',
  
  eventoRunMorto: 'Instagram: uma automação parou antes de entregar tudo.',
  
  eventoNaoConsultou: 'Instagram: um comentário chegou e não deu para consultar as automações, então nada foi disparado.',
  
  eventoAutomacaoFalhou: 'Instagram: uma automação falhou ao receber um comentário e não respondeu a quem comentou. As outras automações seguiram funcionando.',
  
  eventoPalavraForaDoTeto: 'Instagram: uma automação tem uma palavra maior do que cabe num comentário, então ela nunca reconhece quem comenta e ninguém é atendido. Abra a automação, apague essa palavra e salve.',
} as const


const ROTULO_DO_DISPARO: Record<IgRunStatus, string> = {
  pendente: 'na fila',
  enviando: 'enviando',
  concluido: 'concluído',
  falhou: 'falhou',
  interrompido: 'parou no meio',
}

const COR_DO_DISPARO: Record<IgRunStatus, string> = {
  pendente: 'var(--text-tertiary)',
  enviando: 'var(--wave-from)',
  concluido: 'var(--approve)',
  falhou: 'var(--reject)',
  interrompido: 'var(--text-secondary)',
}


export function rotuloDoDisparo(status: string): string {
  return ROTULO_DO_DISPARO[status as IgRunStatus] ?? DESFECHO_DESCONHECIDO
}

export function corDoDisparo(status: string): string {
  return COR_DO_DISPARO[status as IgRunStatus] ?? 'var(--text-tertiary)'
}


export const DESFECHO_DESCONHECIDO = 'desfecho que não reconhecemos'



const ASPAS = /[\u0022\u0027\u2018\u2019\u201a\u201b\u201c\u201d\u201e\u201f\u2032\u2033\u2035\u2036\u275b\u275c\u275d\u275e\u301d\u301e\u301f\uff02\uff07\u00ab\u00bb\u2039\u203a]/g


const SEM_LUGAR_NUM_ROTULO = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g


function nomeaAutomacao(frase: string, nome: string): string {
  const limpo = (nome ?? '')
    .replace(SEM_LUGAR_NUM_ROTULO, ' ')
    .replace(/\s+/g, ' ')
    .replace(ASPAS, "'")
    .trim()
    .slice(0, 60)
  
  
  if (!limpo) return frase
  return frase.replace('uma automação', () => `a automação "${limpo}"`)
}


export function legendaAutomacaoFalhou(nome: string): string {
  return nomeaAutomacao(TEXTOS_GATILHO_IG.eventoAutomacaoFalhou, nome)
}


export function legendaPalavraForaDoTeto(nome: string): string {
  return nomeaAutomacao(TEXTOS_GATILHO_IG.eventoPalavraForaDoTeto, nome)
}


export function legendaDeRepeticoes(quantas: number): string {
  if (!Number.isFinite(quantas) || quantas < 1) return ''
  if (quantas === 1) return 'O mesmo comentário chegou mais uma vez e a gente não repetiu o envio.'
  return `O mesmo comentário chegou mais ${quantas} vezes e a gente não repetiu o envio.`
}


export function legendaRecusaDesconhecida(codigo: number | null): string {
  if (codigo == null) return TEXTOS_GATILHO_IG.recusaDesconhecida
  return `${TEXTOS_GATILHO_IG.recusaDesconhecida} O Instagram devolveu o código ${codigo}.`
}


export function avisoDeAtraso(atrasoS: number, intervaloHeartbeatS: number): string {
  if (atrasoS <= 0) return ''
  return `A espera é um horário mínimo, não um cronômetro exato. Na prática esta mensagem pode sair na hora que você pediu ou até ${duracaoAmigavel(intervaloHeartbeatS)} depois, e mais do que isso quando muita gente comenta ao mesmo tempo.`
}


export function duracaoAmigavel(segundos: number): string {
  const s = Number.isFinite(segundos) ? Math.max(0, segundos) : 0
  if (s < 3600) {
    const minutos = Math.max(1, Math.round(s / 60))
    return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`
  }
  if (s < 86_400) {
    const horas = Math.max(1, Math.round(s / 3600))
    return `${horas} ${horas === 1 ? 'hora' : 'horas'}`
  }
  const dias = Math.max(1, Math.round(s / 86_400))
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`
}
