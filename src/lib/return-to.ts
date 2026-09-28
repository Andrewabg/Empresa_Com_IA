


export const RETURN_TO_FALLBACK = '/config'


const ROTAS_PERMITIDAS = new Set(['/config', '/integracoes', '/loja/contratar'])


export function safeReturnTo(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return RETURN_TO_FALLBACK
  const bruto = raw.trim()
  if (!bruto) return RETURN_TO_FALLBACK
  
  if (!bruto.startsWith('/') || bruto.startsWith('//') || bruto.startsWith('/\\')) return RETURN_TO_FALLBACK
  
  const semQuery = bruto.split(/[?#]/)[0]
  
  if (!/^\/[a-z0-9/-]*$/.test(semQuery)) return RETURN_TO_FALLBACK
  const semBarraFinal = semQuery.length > 1 ? semQuery.replace(/\/+$/, '') : semQuery
  return ROTAS_PERMITIDAS.has(semBarraFinal) ? semBarraFinal : RETURN_TO_FALLBACK
}
