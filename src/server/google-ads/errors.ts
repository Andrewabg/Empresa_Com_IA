



export type EstadoConexao =
  | 'conectado'
  | 'nao_conectado'
  | 'aguardando_aprovacao'
  | 'nao_autorizado'
  | 'erro_desconhecido'

export interface ResultadoErro {
  estado: EstadoConexao
  
  detalhe?: string
}


function extrairAuthorizationError(corpo: unknown): string | undefined {
  try {
    
    const raiz = Array.isArray(corpo) ? corpo[0] : corpo
    if (!raiz || typeof raiz !== 'object') return undefined

    const obj = raiz as Record<string, unknown>
    const error = obj['error'] as Record<string, unknown> | undefined
    if (!error) return undefined

    const details = error['details']
    if (!Array.isArray(details)) return undefined

    for (const detalhe of details) {
      if (!detalhe || typeof detalhe !== 'object') continue
      const d = detalhe as Record<string, unknown>
      const errors = d['errors']
      if (!Array.isArray(errors)) continue
      for (const e of errors) {
        if (!e || typeof e !== 'object') continue
        const err = e as Record<string, unknown>
        const errorCode = err['errorCode'] as Record<string, unknown> | undefined
        if (!errorCode) continue
        const authErr = errorCode['authorizationError']
        if (typeof authErr === 'string') return authErr
      }
    }
    return undefined
  } catch {
    return undefined
  }
}


function extrairMensagem(corpo: unknown): string | undefined {
  try {
    const raiz = Array.isArray(corpo) ? corpo[0] : corpo
    if (!raiz || typeof raiz !== 'object') return undefined
    const obj = raiz as Record<string, unknown>
    const error = obj['error'] as Record<string, unknown> | undefined
    if (!error) return undefined
    const details = error['details']
    if (!Array.isArray(details)) return undefined
    for (const detalhe of details) {
      if (!detalhe || typeof detalhe !== 'object') continue
      const d = detalhe as Record<string, unknown>
      const errors = d['errors']
      if (!Array.isArray(errors)) continue
      for (const e of errors) {
        if (!e || typeof e !== 'object') continue
        const err = e as Record<string, unknown>
        if (typeof err['message'] === 'string') return err['message']
      }
    }
    
    if (typeof error['message'] === 'string') return error['message']
    return undefined
  } catch {
    return undefined
  }
}


export function mapearErroGoogleAds(status: number, corpoJson: unknown): ResultadoErro {
  try {
    const authErr = extrairAuthorizationError(corpoJson)
    const detalhe = extrairMensagem(corpoJson)

    if (authErr === 'DEVELOPER_TOKEN_NOT_APPROVED') {
      return {
        estado: 'aguardando_aprovacao',
        detalhe: detalhe ?? 'Developer token aguardando aprovação do Google.',
      }
    }

    
    if (status === 401 || status === 403) {
      return { estado: 'nao_autorizado', detalhe }
    }

    return { estado: 'erro_desconhecido', detalhe }
  } catch {
    return { estado: 'erro_desconhecido' }
  }
}
