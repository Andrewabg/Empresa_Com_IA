


import { vereditoDe, type Veredito } from '@/lib/trafego/veredito'
import { campoSeguro } from '@/lib/fontes/sanitizar'
import type { AccountBaseline } from '@/lib/trafego/baseline'
import type { FrameConta } from '@/lib/trafego/perfilConta'
import type { MetricShape } from '@/lib/trafego/types'

const ROTULO: Record<Veredito, string> = { escalar: 'escalar', cortar: 'cortar', observar: 'observar', aprendendo: 'ainda aprendendo' }
const TETO = 20

export function segundaOpiniao(
  entidades: Array<{ id: string; nome: string | null }>,
  ultimoPorId: Map<string, MetricShape>,
  opts: { baseline: AccountBaseline | null; frame: FrameConta },
): string {
  const linhas: string[] = []
  const vistos = new Set<string>()
  for (const e of entidades) {
    if (linhas.length >= TETO) break
    if (vistos.has(e.id)) continue
    vistos.add(e.id)
    const m = ultimoPorId.get(e.id)
    if (!m) continue
    linhas.push(`${campoSeguro(e.nome ?? e.id)} [${campoSeguro(e.id)}]: ${ROTULO[vereditoDe(m, opts.baseline, { frame: opts.frame })]}`)
  }
  if (!linhas.length) return ''
  return `Segunda opinião, o painel diz (regras fixas sobre a última leitura do painel, cite como tal):\n${linhas.join('\n')}`
}
