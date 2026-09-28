


export interface ContaConectada { slug: string; status: string }


export const CONTAS_POR_PAGINA = 100


export const MAX_PAGINAS_CONTAS = 20


export interface ClientDeContas {
  connectedAccounts: {
    list(
      query: { userIds: string[]; limit?: number; cursor?: string },
      requestOptions?: { signal?: AbortSignal },
    ): Promise<{ items?: unknown[]; nextCursor?: string | null }>
  }
}


export async function listarContasConectadas(
  c: ClientDeContas,
  userId: string,
  requestOptions?: { signal?: AbortSignal },
): Promise<ContaConectada[]> {
  const out: ContaConectada[] = []
  let cursor: string | undefined
  const vistos = new Set<string>()
  for (let pagina = 0; pagina < MAX_PAGINAS_CONTAS; pagina++) {
    const res = await c.connectedAccounts.list(
      { userIds: [userId], limit: CONTAS_POR_PAGINA, ...(cursor ? { cursor } : {}) },
      requestOptions,
    )
    for (const a of res.items ?? []) {
      const item = a as { toolkit?: { slug?: string }; status?: unknown }
      const slug = item.toolkit?.slug
      if (slug) out.push({ slug, status: String(item.status ?? '') })
    }
    const proximo = res.nextCursor
    if (!proximo) return out
    
    
    if (vistos.has(proximo)) {
      console.warn('[listarContasConectadas] cursor repetido — paro com o que já veio')
      return out
    }
    vistos.add(proximo)
    cursor = proximo
  }
  console.warn(`[listarContasConectadas] teto de ${MAX_PAGINAS_CONTAS} páginas atingido — a lista pode estar incompleta`)
  return out
}
