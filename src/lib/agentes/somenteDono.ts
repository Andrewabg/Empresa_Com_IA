

export const AVISO_SO_O_DONO_DESLIGA = 'Só o dono da empresa desliga ou traz de volta alguém do time.'
export const AVISO_SO_O_DONO_MUDA_A_DIRECAO = 'Só o dono da empresa muda a Direção de arte.'
export const AVISO_QUEM_CONECTA_E_O_DONO = 'Quem conecta as ferramentas é o dono da empresa.'

export const ROTULO_O_DONO_CONECTA = 'o dono conecta'
export const ERRO_CONFERIR_ACESSO =
  'Não foi possível confirmar o seu acesso agora. Nada foi alterado: tente de novo em instantes.'

export const FALHA_NO_DESLIGAMENTO =
  'Não foi possível concluir agora. Pode já ter sido feito: confira a lista do time antes de tentar de novo.'


export function mensagemDeAcaoDoDono(
  status: number,
  erroDoServidor: string | null | undefined,
  aviso: string,
  fallback: string,
): string {
  if (status === 403) return aviso
  if (status === 401) return ERRO_CONFERIR_ACESSO
  if (status >= 500) return fallback
  return erroDoServidor || fallback
}


export function mensagemDoDesligamento(status: number, erroDoServidor: string | null): string {
  return mensagemDeAcaoDoDono(status, erroDoServidor, AVISO_SO_O_DONO_DESLIGA, FALHA_NO_DESLIGAMENTO)
}
