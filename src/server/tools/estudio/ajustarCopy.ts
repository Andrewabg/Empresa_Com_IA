










import { appendVersao as appendVersaoImpl, getPecaComVersoes as getPecaImpl, toPecaView } from '@/data/pecas'
import { aplicarPatchDeBloco } from '@/lib/estudio/aplicarPatchDeBloco'
import type { Critica, EstudioPatch, PecaView, Variacao, Veredito } from '@/lib/estudio/types'

export const COPY_AJUSTAR_COPY = {
  inexistente: 'Não achei essa peça.',
  semTexto: 'Essa peça ainda não tem texto para editar.',
  semMudanca: 'Nada mudou nesse campo, então não criei versão nova.',
  pedidoIncompleto: 'Diga qual campo editar e o texto novo.',
  feito: 'Texto atualizado, sem gerar nada novo.',
} as const

export interface AjustarCopyInput {
  pecaId: string
  
  variacao: number
  
  blocoId: string
  texto: string
}
export interface AjustarCopyCtx { operatorId?: string }
export interface AjustarCopyDeps {
  getPecaComVersoes?: typeof getPecaImpl
  appendVersao?: typeof appendVersaoImpl
}
export interface AjustarCopyResult {
  output: string
  patch: EstudioPatch | null
  
  peca?: PecaView
  versao?: number
}

export async function ajustarCopy(
  input: AjustarCopyInput, ctx: AjustarCopyCtx, deps: AjustarCopyDeps = {},
): Promise<AjustarCopyResult> {
  if (!ctx.operatorId) return { output: 'Sem operador no contexto.', patch: null }
  const getPeca = deps.getPecaComVersoes ?? getPecaImpl
  const appendVersao = deps.appendVersao ?? appendVersaoImpl

  const peca = await getPeca(input.pecaId)
  
  if (!peca || peca.operator_id !== ctx.operatorId) return { output: COPY_AJUSTAR_COPY.inexistente, patch: null }

  const ultima = peca.versoes[peca.versoes.length - 1]
  if (!ultima) return { output: COPY_AJUSTAR_COPY.semTexto, patch: null }

  const atuais = (Array.isArray(ultima.variacoes) ? ultima.variacoes : []) as Variacao[]
  const r = aplicarPatchDeBloco(atuais, { variacao: input.variacao, blocoId: input.blocoId, texto: input.texto })
  if (!r.mudou) {
    return { output: r.recusas[0] ?? COPY_AJUSTAR_COPY.semMudanca, patch: null }
  }

  const versao = await appendVersao(peca.id, {
    variacoes: r.variacoes as never,
    veredito: (ultima.veredito ?? {}) as Veredito as never,
    critica: (ultima.critica ?? {}) as Critica as never,
    origemRevisao: 'edicao',
  })
  const full = await getPeca(input.pecaId)
  if (!full) return { output: COPY_AJUSTAR_COPY.inexistente, patch: null }
  const view = toPecaView(full)
  return {
    output: [COPY_AJUSTAR_COPY.feito, ...r.recusas].join(' '),
    patch: { op: 'upsert', entidade: 'peca', peca: view },
    peca: view,
    versao: versao.n,
  }
}
