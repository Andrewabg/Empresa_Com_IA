

export type ConnectFailReason =
  | 'nao_configurado'   
  | 'token_recusado'    
  | 'oauth_nao_iniciou' 
  | 'sem_permissao'     
  | 'limite_atingido'   
  | 'sem_rede'          
  | 'generico'          

export interface ConnectFailCta {
  label: string
  href: string
}
export interface ConnectFailCopy {
  message: string
  cta?: ConnectFailCta
}

const KNOWN: readonly ConnectFailReason[] = [
  'nao_configurado',
  'token_recusado',
  'oauth_nao_iniciou',
  'sem_permissao',
  'limite_atingido',
  'sem_rede',
  'generico',
]


export function normalizeReason(raw: unknown): ConnectFailReason {
  return typeof raw === 'string' && (KNOWN as readonly string[]).includes(raw)
    ? (raw as ConnectFailReason)
    : 'generico'
}


export function reasonForActivateThrow(mode: string | undefined): ConnectFailReason {
  return mode === 'apikey' ? 'token_recusado' : 'oauth_nao_iniciou'
}


export function connectFailCopy(
  reason: ConnectFailReason | string | undefined,
  appName?: string,
): ConnectFailCopy {
  const app = (appName ?? '').trim()
  switch (normalizeReason(reason)) {
    case 'oauth_nao_iniciou':
      return {
        message: app
          ? `O Composio não conseguiu iniciar a autorização com o ${app} agora. Teste sua conexão do Composio e tente de novo.`
          : 'O Composio não conseguiu iniciar a autorização agora. Teste sua conexão do Composio e tente de novo.',
        cta: { label: 'Testar conexão do Composio', href: '/config' },
      }
    case 'token_recusado':
      return {
        message: 'Não consegui validar esse token no Composio. Confira se ele está correto e ainda válido e cole novamente.',
      }
    
    
    case 'sem_permissao':
      return {
        message: app
          ? `O Composio recusou criar a conexão com o ${app}: sua chave não tem permissão para isso. Uma chave só de leitura passa no "Testar" e falha aqui — gere uma chave nova com permissão total (escrita) no painel do Composio e cole em Configuração.`
          : 'O Composio recusou criar a conexão: sua chave não tem permissão para isso. Uma chave só de leitura passa no "Testar" e falha aqui — gere uma chave nova com permissão total (escrita) no painel do Composio e cole em Configuração.',
        cta: { label: 'Trocar a chave do Composio', href: '/config' },
      }
    case 'limite_atingido':
      return {
        message: 'Sua conta do Composio chegou ao limite de conexões do plano. Desconecte uma ferramenta que você não usa, ou aumente o plano no painel do Composio, e tente de novo.',
        cta: { label: 'Ver minhas conexões', href: '/integracoes' },
      }
    case 'sem_rede':
      return {
        message: 'Não consegui falar com o servidor agora. Confira sua conexão e tente de novo em instantes.',
      }
    case 'nao_configurado':
      return {
        message: 'Sua chave do Composio ainda não está configurada. Configure em Configuração para conectar.',
        cta: { label: 'Ir para Configuração', href: '/config' },
      }
    case 'generico':
    default:
      return { message: 'Não consegui iniciar a conexão. Tente de novo.' }
  }
}
