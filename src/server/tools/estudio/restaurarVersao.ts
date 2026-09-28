
import {
  getPecaComVersoes as getPecaImpl,
  appendVersao as appendVersaoImpl,
  type PecaVersaoRow,
} from '@/data/pecas'

const CALMA_INEXISTENTE = 'Não achei essa peça.'

export const COPY_RESTAURAR = {
  inexistente: CALMA_INEXISTENTE,
  semVersao: (n: number) => `Não existe versão ${n} nessa peça.`,
  jaEhAAtual: (n: number) => `A versão ${n} já é a que está valendo.`,
} as const

export interface RestaurarVersaoResult {
  ok: boolean
  output: string
  versao?: PecaVersaoRow
}

export interface RestaurarVersaoDeps {
  getPecaComVersoes?: typeof getPecaImpl
  appendVersao?: typeof appendVersaoImpl
}

export async function restaurarVersao(
  input: { pecaId: string; n: number },
  ctx: { operatorId?: string },
  deps: RestaurarVersaoDeps = {},
): Promise<RestaurarVersaoResult> {
  if (!ctx.operatorId) return { ok: false, output: 'Sem operador no contexto.' }
  const getPeca = deps.getPecaComVersoes ?? getPecaImpl
  const appendVersao = deps.appendVersao ?? appendVersaoImpl

  const peca = await getPeca(input.pecaId)
  if (!peca) return { ok: false, output: CALMA_INEXISTENTE }
  
  if (peca.operator_id !== ctx.operatorId) return { ok: false, output: CALMA_INEXISTENTE }

  const alvo = peca.versoes.find((v) => v.n === input.n)
  if (!alvo) return { ok: false, output: COPY_RESTAURAR.semVersao(input.n) }

  const atual = peca.versoes[peca.versoes.length - 1]
  if (atual && atual.n === alvo.n) return { ok: false, output: COPY_RESTAURAR.jaEhAAtual(input.n) }

  const versao = await appendVersao(peca.id, {
    variacoes: alvo.variacoes as never,
    veredito: alvo.veredito as never,
    critica: (alvo.critica ?? {}) as never,
    origemRevisao: `restaurada da v${alvo.n}`,
  })
  return { ok: true, output: `Voltei para a versão ${alvo.n}. As versões seguintes continuam guardadas.`, versao }
}
