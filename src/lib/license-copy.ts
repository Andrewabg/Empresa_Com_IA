








import { lojaLiberada, type LicenseState, type EngineBlockReason } from '@/lib/license-state'

export type LicenseTone = 'ok' | 'warn' | 'bad' | 'muted'


export const LICENSE_TONE: Record<LicenseState, LicenseTone> = {
  active: 'ok',
  expired: 'warn',
  revoked: 'bad',
  unverified: 'warn',
  in_use_elsewhere: 'warn',
  never_verified: 'muted',
}


export interface BannerAcao {
  rotulo: string
  href: string
}


export interface LojaBanner {
  text: string
  tone: LicenseTone
  acao?: BannerAcao
}


const ACAO_CONECTAR: BannerAcao = { rotulo: 'Conectar licença', href: '/config#licenca' }
const ACAO_LICENCA: BannerAcao = { rotulo: 'Abrir Configurações', href: '/config#licenca' }


export const TONE_COLOR: Record<LicenseTone, string> = {
  ok: 'var(--approve)',
  warn: 'rgb(214 158 46)',
  bad: 'var(--reject)',
  muted: 'var(--text-tertiary)',
}


export interface DescribeConfigOpts {
  buyerName?: string
  
  formattedDate?: string
  
  firehoseReason?: string | null
}


function configForFirehoseReason(reason: string | null | undefined): { text: string; tone: LicenseTone } | null {
  switch (reason) {
    case 'replica_detected':
      return {
        text: 'Esta licença consta ativa em mais de uma instalação ao mesmo tempo — novidades e Loja ficam pausadas. Se você fez um deploy agora há pouco, aguarde; se continuar, fale com o suporte.',
        tone: 'warn',
      }
    case 'integrity_violation':
      return {
        text: 'Não foi possível confirmar a integridade desta instalação — novidades e Loja ficam pausadas. Fale com o suporte para regularizar.',
        tone: 'bad',
      }
    case 'reseller_subscription_expired':
      return {
        text: 'A assinatura de quem te forneceu o acesso expirou — fale com seu fornecedor pra renovar.',
        tone: 'warn',
      }
    default:
      return null
  }
}


export function describeConfig(
  state: LicenseState | null,
  opts: DescribeConfigOpts,
): { text: string; tone: LicenseTone } {
  switch (state) {
    case 'active':
      return {
        text: `Licenciado para ${opts.buyerName ?? 'você'} · acesso até ${opts.formattedDate || '—'}`,
        tone: 'ok',
      }
    case 'expired':
      
      
      return (
        configForFirehoseReason(opts.firehoseReason) ?? {
          text: 'Acesso expirado — renove para voltar a receber novidades',
          tone: 'warn',
        }
      )
    case 'revoked':
      return { text: 'Licença revogada', tone: 'bad' }
    case 'unverified':
      return { text: 'Não foi possível verificar agora (usando último estado válido)', tone: 'warn' }
    case 'in_use_elsewhere':
      return {
        text: 'Esta chave já está ativa em outra instância. Desligue a outra (libera em até 24h) ou regere a chave no painel.',
        tone: 'warn',
      }
    case 'never_verified':
      return { text: 'Cole sua chave de licença para ativar', tone: 'muted' }
    default:
      return { text: '', tone: 'muted' }
  }
}


const BANNER_IN_USE: LojaBanner = { text: 'Esta chave já está ativa em outra instância.', tone: 'warn', acao: ACAO_LICENCA }
const BANNER_REVOKED: LojaBanner = { text: 'Sua licença foi revogada — a Loja fica indisponível.', tone: 'bad' }
const BANNER_EXPIRED: LojaBanner = { text: 'Seu acesso ao clube expirou — renove pra voltar a receber cargos.', tone: 'warn' }


const BANNER_CONNECT: LojaBanner = { text: 'A Loja abre assim que a licença for conectada nas Configurações.', tone: 'muted', acao: ACAO_CONECTAR }
const BANNER_UNAVAILABLE: LojaBanner = { text: 'Catálogo indisponível — tente em instantes.', tone: 'muted' }
const BANNER_UNVERIFIED: LojaBanner = { text: 'Não deu pra verificar a licença agora.', tone: 'warn' }



const BANNER_RESELLER_EXPIRED: LojaBanner = { text: 'A assinatura de quem te forneceu o acesso expirou — fale com seu fornecedor pra renovar.', tone: 'warn' }



const BANNER_REPLICA: LojaBanner = { text: 'Esta licença consta ativa em mais de uma instalação ao mesmo tempo. Se você fez um deploy agora há pouco, aguarde alguns minutos; se continuar, fale com o suporte.', tone: 'warn' }
const BANNER_INTEGRITY: LojaBanner = { text: 'Não foi possível confirmar a integridade desta instalação. Fale com o suporte para regularizar.', tone: 'bad' }


function bannerForFirehoseReason(reason: string | null | undefined): LojaBanner | null {
  switch (reason) {
    case 'in_use_elsewhere': return BANNER_IN_USE
    case 'revoked': return BANNER_REVOKED
    case 'expired': return BANNER_EXPIRED
    case 'no_license': return BANNER_CONNECT
    case 'reseller_subscription_expired': return BANNER_RESELLER_EXPIRED
    case 'replica_detected': return BANNER_REPLICA
    case 'integrity_violation': return BANNER_INTEGRITY
    default: return null 
  }
}


export function selectLojaBanner(
  state: LicenseState,
  hasCatalog: boolean,
  firehoseReason?: string | null,
): LojaBanner | null {
  const storeAllowed = lojaLiberada(state)
  if (hasCatalog && storeAllowed) return null

  if (storeAllowed) {
    
    const byReason = bannerForFirehoseReason(firehoseReason)
    if (byReason) return byReason
    return state === 'unverified' ? BANNER_UNVERIFIED : BANNER_UNAVAILABLE
  }

  switch (state) {
    case 'revoked': return BANNER_REVOKED
    case 'expired': return BANNER_EXPIRED
    case 'never_verified': return BANNER_CONNECT
    case 'in_use_elsewhere': return BANNER_IN_USE
    default: {
      
      
      
      const _exhaustivo: never = state
      return _exhaustivo
    }
  }
}






export interface EngineBlockCopy {
  title: string
  body: string
  
  canRevalidate: boolean
  
  showSupport: boolean
}


export function describeEngineBlock(reason: EngineBlockReason): EngineBlockCopy {
  switch (reason) {
    case 'hard':
      return {
        title: 'Acesso encerrado',
        body: 'Sua licença foi revogada após um reembolso e o acesso ao software foi encerrado. Se você acredita que isto é um engano, fale com o suporte de onde adquiriu o acesso.',
        canRevalidate: false,
        showSupport: true,
      }
    case 'stale':
      return {
        title: 'Não foi possível validar sua licença',
        body: 'Conecte-se à internet para continuar. Assim que a validação for concluída, o acesso volta automaticamente — nenhum dado é perdido.',
        canRevalidate: true,
        showSupport: false,
      }
    default: {
      const _exhaustivo: never = reason
      return _exhaustivo
    }
  }
}
