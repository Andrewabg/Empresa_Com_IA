










import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { raioXDemo } from '@/lib/google-ads/demo'
import { montarRaioX, renderRaioX } from '@/lib/google-ads/raio-x'
import type { LerContaRealResult } from '@/server/google-ads/ler-conta'
import { getTurnContext } from '@/server/agent/turnContext'


export interface RaioXResult {
  output: string
  demo: boolean
}


export interface ObterRaioXDeps {
  lerReal?: (operatorId: string) => Promise<LerContaRealResult | null>
}


async function lerRealDefault(operatorId: string): Promise<LerContaRealResult | null> {
  const { resolverClienteGoogleAds } = await import('@/server/google-ads/resolver')
  const resolved = await resolverClienteGoogleAds()
  if (!resolved) return null
  const { getFichaGoogle } = await import('@/server/google-ads/ficha-store')
  const ficha = await getFichaGoogle(operatorId, resolved.customerId).catch(() => null)
  const { lerContaReal } = await import('@/server/google-ads/ler-conta')
  return lerContaReal({ cliente: resolved.cliente, ficha })
}


export async function obterRaioX(ctx: { operatorId?: string }, deps: ObterRaioXDeps = {}): Promise<RaioXResult> {
  try {
    if (ctx.operatorId) {
      const lerReal = deps.lerReal ?? lerRealDefault
      const real = await lerReal(ctx.operatorId)
      if (real) {
        const output = renderRaioX(montarRaioX(real.input), {
          demo: false,
          negocio: real.negocio,
          contaAtiva: real.contaAtiva,
        })
        return { output, demo: false }
      }
    }
  } catch {
    
  }
  return { output: raioXDemo(), demo: true }
}


export const analisarContaTool = createTool({
  id: 'analisarConta',
  description:
    'Faz o RAIO-X da conta de Google Ads: nota de saúde 0-100, dinheiro queimado em palavras sem retorno, palavras acima do custo-por-cliente máximo e projeção de gasto do mês. Use quando o dono pedir análise/diagnóstico da conta. Lê a conta REAL quando há acesso de leitura; sem acesso, roda sobre uma conta de EXEMPLO. O resultado diz qual é a fonte (real vs demonstração) — apresente o diagnóstico ao dono como ele veio.',
  inputSchema: z.object({}),
  execute: async () => {
    const ctx = getTurnContext()
    const r = await obterRaioX({ operatorId: ctx.operatorId })
    return { output: r.output, demo: r.demo }
  },
})
