




export function maskDeployWebhook(secret: string | null | undefined): string | null {
  if (!secret) return null
  const raw = secret.trim()
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const host = url.host 
  if (!host) return null
  
  const segments = url.pathname.split('/').filter((s) => s.length > 0)
  const token = segments[segments.length - 1] ?? ''
  if (!token) return host 
  return `${host} …••••${token.slice(-4)}`
}
