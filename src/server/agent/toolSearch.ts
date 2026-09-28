
import { ToolSearchProcessor } from '@mastra/core/processors'
import { allowlistFilter, TOOL_SEARCH_TOP_K } from '@/lib/toolkit-gating'
import { expandirConsultaFerramenta } from '@/lib/tool-query-ptbr'

type BuscaCrua = (consulta: string, ctx: unknown) => Promise<unknown>


function ligarPonteConsultaPtBr(proc: ToolSearchProcessor): ToolSearchProcessor {
  const alvo = proc as unknown as { searchTools?: BuscaCrua }
  const original = alvo.searchTools
  if (typeof original !== 'function') {
    console.error('[toolSearch] costura `searchTools` sumiu do ToolSearchProcessor — ponte PT-BR OFF (revise ao subir o @mastra/core)')
    return proc
  }
  alvo.searchTools = (consulta: string, ctx: unknown) =>
    original.call(proc, expandirConsultaFerramenta(consulta), ctx)
  return proc
}


export function makeComposioToolSearch(
  catalog: Record<string, unknown>,
  allowlist?: string[] | null,
): ToolSearchProcessor {
  return ligarPonteConsultaPtBr(new ToolSearchProcessor({
    
    
    tools: catalog as ConstructorParameters<typeof ToolSearchProcessor>[0]['tools'],
    search: { topK: TOOL_SEARCH_TOP_K, autoLoad: true },
    storage: 'context',
    filter: allowlistFilter(allowlist),
  }))
}
