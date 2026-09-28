

import { escreverNotaNoCerebro, type EscreverNotaArgs } from '../../brain/espelho'
import { renderContratoMirror, renderModeloMirror, slugContrato } from '@/lib/juridico/mirror'
import type { ContratoView } from '@/lib/juridico/types'

export interface EspelhoJuridicoDeps { escrever?: (a: EscreverNotaArgs) => Promise<{ ok: boolean }> }

export async function espelharContratoNoCerebro(c: ContratoView, deps: EspelhoJuridicoDeps = {}): Promise<{ ok: boolean }> {
  const escrever = deps.escrever ?? escreverNotaNoCerebro
  try {
    return await escrever({
      caminho: `juridico/contratos/${slugContrato(c.titulo, c.id)}.md`,
      conteudo: renderContratoMirror(c), titulo: c.titulo,
      tags: ['juridico', 'contrato', c.tipo], commitMsg: `escritório: contrato ${c.titulo}`,
      authorAgent: 'juridico',
    })
  } catch { return { ok: false } }
}

export async function espelharModeloNoCerebro(c: ContratoView, deps: EspelhoJuridicoDeps = {}): Promise<{ ok: boolean }> {
  const escrever = deps.escrever ?? escreverNotaNoCerebro
  try {
    return await escrever({
      caminho: `juridico/modelos/${slugContrato(c.titulo, c.id)}.md`,
      conteudo: renderModeloMirror(c), titulo: `Modelo: ${c.titulo}`,
      tags: ['juridico', 'modelo', c.tipo], commitMsg: `escritório: modelo ${c.titulo}`,
      authorAgent: 'juridico',
    })
  } catch { return { ok: false } }
}
