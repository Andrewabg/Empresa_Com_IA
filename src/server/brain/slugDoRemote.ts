


export function slugDoRemote(url: string): string | null {
  const cru = url.trim()
  if (!cru) return null

  
  const ssh = cru.match(/^[^@]+@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/i)
  if (ssh) return ssh[1]!.toLowerCase()

  
  const https = cru.match(/^https?:\/\/(?:[^@/]*@)?github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/i)
  if (https) return https[1]!.toLowerCase()

  return null
}


export function mesmoRepositorio(urlDoOrigin: string, slugConfigurado: string): boolean {
  const doClone = slugDoRemote(urlDoOrigin)
  if (doClone === null) return true
  return doClone === slugConfigurado.trim().toLowerCase()
}
