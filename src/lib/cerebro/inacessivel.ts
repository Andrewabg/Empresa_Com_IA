


export type MotivoDoCerebroInacessivel =
  | 'demora'
  | 'acesso'
  | 'repositorio'
  | 'rede'
  | 'clone'
  | 'desconhecido'


const ASSINATURAS: ReadonlyArray<readonly [MotivoDoCerebroInacessivel, RegExp]> = [
  ['acesso', /authentication failed|could not read username|bad credentials|invalid username or password|\b(401|403)\b|permission denied|access denied|terminal prompts disabled/i],
  ['clone', /unstaged changes|local changes|not currently on a branch|index\.lock|unrelated histories|rebase|cannot pull|working tree|detached head/i],
  ['rede', /enotfound|eai_again|econnrefused|econnreset|etimedout|getaddrinfo|could not resolve host|network is unreachable|socket hang up/i],
  ['demora', /timeout|timed out|não respondeu a tempo/i],
  ['repositorio', /repository not found|\bnot found\b|\b404\b|does not exist|no such remote/i],
] as const


export function motivoDoCerebroInacessivel(causa: unknown): MotivoDoCerebroInacessivel {
  const texto = textoDoErro(causa)
  if (!texto) return 'desconhecido'
  for (const [motivo, assinatura] of ASSINATURAS) {
    if (assinatura.test(texto)) return motivo
  }
  return 'desconhecido'
}


function textoDoErro(causa: unknown, profundidade = 0): string {
  if (causa == null || profundidade > 5) return ''
  if (typeof causa === 'string') return causa
  if (causa instanceof Error) {
    const proprio = `${causa.name} ${causa.message}`
    const dentro = textoDoErro((causa as { cause?: unknown }).cause, profundidade + 1)
    return dentro ? `${proprio} ${dentro}` : proprio
  }
  if (typeof causa === 'object') {
    const o = causa as { message?: unknown; cause?: unknown }
    const proprio = typeof o.message === 'string' ? o.message : ''
    const dentro = textoDoErro(o.cause, profundidade + 1)
    return [proprio, dentro].filter(Boolean).join(' ')
  }
  return ''
}


export const COPY_DO_CEREBRO_INACESSIVEL: Record<MotivoDoCerebroInacessivel, string> = {
  demora: 'Não consegui falar com o seu repositório agora porque ele demorou demais para responder. Eu tento sozinho mais tarde.',
  acesso: 'Não consegui entrar no seu repositório porque o GitHub não aceitou o acesso. Abra a Configuração e confira se a conexão com o GitHub continua valendo.',
  repositorio: 'Não encontrei o repositório do seu Cérebro. Abra a Configuração e confira se o endereço dele está certo e se a conexão com o GitHub enxerga ele.',
  rede: 'Não consegui falar com o GitHub agora, e parece falta de conexão. Eu tento sozinho mais tarde.',
  clone: 'A cópia do seu repositório que fica guardada aqui ficou num estado que trava a sincronização. Eu arrumo ela sozinho na próxima vez que precisar do Cérebro, e nada do que está publicado se perde.',
  desconhecido: 'Não consegui abrir o seu Cérebro agora. Eu tento sozinho mais tarde.',
}


export function mensagemDoCerebroInacessivel(causa?: unknown): string {
  return COPY_DO_CEREBRO_INACESSIVEL[motivoDoCerebroInacessivel(causa)]
}


export const TODAS_AS_MENSAGENS_DO_CEREBRO: readonly string[] = Object.values(COPY_DO_CEREBRO_INACESSIVEL)


export const ORACAO_DO_CEREBRO_INACESSIVEL: Record<MotivoDoCerebroInacessivel, string> = {
  demora: 'o GitHub demorou demais para responder',
  acesso: 'o GitHub não aceitou o acesso, então confira a chave do GitHub',
  repositorio: 'não encontrei o repositório do seu Cérebro',
  rede: 'parece falta de conexão com o GitHub',
  clone: 'a cópia guardada aqui travou, e eu arrumo ela sozinho',
  desconhecido: '',
}


export function chaveSuspeitaDoMotivo(
  motivo: string | null | undefined,
): 'github_token' | 'github_repo' | null {
  if (motivo === 'acesso') return 'github_token'
  if (motivo === 'repositorio') return 'github_repo'
  return null
}


export function oracaoDoMotivoSalvo(motivo: string | null | undefined): string {
  if (!motivo) return ''
  return ORACAO_DO_CEREBRO_INACESSIVEL[motivo as MotivoDoCerebroInacessivel] ?? ''
}
