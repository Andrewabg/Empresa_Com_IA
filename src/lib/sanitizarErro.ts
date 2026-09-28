

const TOKEN_SOLTO = /\b(ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|sk-)[A-Za-z0-9_-]{8,}/g

export function sanitizarCredenciaisDeErro(msg: string): string {
  return msg
    .replace(/(https?:\/\/)[^/\s@]+@/g, '$1***@')
    .replace(TOKEN_SOLTO, '***')
}


export function motivoSeguro(err: unknown): string {
  return sanitizarCredenciaisDeErro(err instanceof Error ? err.message : String(err))
}
