


import { linkValido } from '@/lib/trafego/lancamentoCriativo'
import { gerarCopyLancamento as gerarCopyLancamentoDefault } from '@/server/tools/trafego/gerarCopyLancamento'

export interface GerarCopyBody { artifactId?: string; link?: string }
export interface GerarCopyDeps { gerarCopyLancamento?: typeof gerarCopyLancamentoDefault }
export interface GerarCopyResult { status: number; body: Record<string, unknown> }

export async function gerarCopyLancamentoHandler(
  body: GerarCopyBody,
  operatorId: string,
  deps: GerarCopyDeps = {},
): Promise<GerarCopyResult> {
  const artifactId = (body.artifactId ?? '').trim()
  const link = (body.link ?? '').trim()
  if (!artifactId) return { status: 400, body: { error: 'Falta a arte (artifactId).' } }
  if (!linkValido(link)) return { status: 400, body: { error: 'Link de destino inválido (use http/https).' } }
  const gerar = deps.gerarCopyLancamento ?? gerarCopyLancamentoDefault
  try {
    const copy = await gerar({ artifactId, link }, { operatorId, actingAgentId: 'gestor-trafego' })
    return { status: 200, body: { message: copy.message, headline: copy.headline, cta: copy.ctaMeta, porque: copy.porque } }
  } catch (e) {
    console.error('[gerarCopyLancamentoHandler]', e)
    return { status: 500, body: { error: 'Não consegui gerar a copy agora. Tente de novo.' } }
  }
}
