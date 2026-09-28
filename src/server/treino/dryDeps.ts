



import type { CanalToolsDeps } from '@/server/canais/loadout'
import { searchBase as searchBaseReal } from '@/data/baseConhecimento'
import { embedTexto } from '@/server/canais/embed'
import { getContato as getContatoReal } from '@/data/contatos'
import { resolverSlug } from '@/lib/canais/midiaPublica'


export interface ArquivoPublico { slug: string; rotulo: string; descricao: string }

export function dryToolDeps(
  over: Partial<Pick<CanalToolsDeps, 'searchBase' | 'embed' | 'getContato'>> = {},
  
  arquivos: { catalogo?: ArquivoPublico[]; coletor?: string[] } = {},
  
  escalacoes?: Array<{ motivo: string }>,
): CanalToolsDeps {
  const catalogo = arquivos.catalogo ?? []
  return {
    embed: over.embed ?? ((t) => embedTexto(t)),
    searchBase: over.searchBase ?? searchBaseReal,
    getContato: over.getContato ?? getContatoReal,
    updateFichaContato: async () => {},
    setConversaStatus: async () => {},
    onEscalar: async (_ctx, motivo: string) => { escalacoes?.push({ motivo }) },
    
    
    ...(catalogo.length
      ? {
          listarMidiaPublica: async () => catalogo,
          enviarArquivo: async (_ctx, slug: string) => {
            const canonico = resolverSlug(catalogo.map((a) => a.slug), slug)
            if (!canonico) return { ok: false as const, motivo: 'slug_desconhecido' as const }
            if (arquivos.coletor?.length) return { ok: false as const, motivo: 'ja_anexado' as const }
            arquivos.coletor?.push(canonico)
            return { ok: true as const }
          },
        }
      : {}),
    now: () => new Date().toISOString(),
  }
}
