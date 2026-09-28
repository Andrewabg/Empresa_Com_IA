
import { buildComposioMastraTools } from '@/server/actions/mastraTools'
import { composioUserId, type ComposioClient } from '@/server/actions/composio'
import { listTodosOsToolkitSlugs } from '@/server/config/noAuthToolkits'
import { CATALOG_LIMIT, expandirListaLegada } from '@/lib/toolkit-gating'

export async function catalogoComposioDoAgente(
  ferramentas: { composio?: boolean; composio_toolkits?: string[] } | null | undefined,
  composio?: ComposioClient | null,
): Promise<Record<string, unknown>> {
  if (ferramentas?.composio === false) return {}
  const lista = ferramentas?.composio_toolkits
  const catalogo = lista && lista.length > 0
    ? await listTodosOsToolkitSlugs(composio === undefined ? {} : { getClient: async () => composio })
    : []
  return buildComposioMastraTools(
    { userId: composioUserId(), limit: CATALOG_LIMIT, toolkits: lista && lista.length > 0 ? expandirListaLegada(lista, catalogo) : undefined },
    composio,
  )
}
