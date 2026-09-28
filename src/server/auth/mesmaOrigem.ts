
export function mesmaOrigem(request: Request): boolean {
  const origin = request.headers.get('origin')

  
  if (origin === null) return true

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    
    return true
  }

  const hostsConhecidos = [
    request.headers.get('host'),
    request.headers.get('x-forwarded-host'),
  ].filter((h): h is string => !!h)

  
  
  if (hostsConhecidos.length === 0) return true

  
  return hostsConhecidos.includes(originHost)
}
