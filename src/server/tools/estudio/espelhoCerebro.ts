




import { renderBrandVoiceMirror, type BrandVoice } from '@/lib/estudio/brandVoice'
import type { SwipeView } from '@/lib/estudio/types'
import { escreverNotaNoCerebro } from '../../brain/espelho'


export interface EscreverNotaArgs { caminho: string; conteudo: string; titulo: string; tags: string[]; commitMsg: string }
export interface EspelhoDeps {
  escrever?: (a: EscreverNotaArgs) => Promise<{ ok: boolean }>
}


async function defaultEscrever(a: EscreverNotaArgs): Promise<{ ok: boolean }> {
  return escreverNotaNoCerebro({ ...a, authorAgent: 'copywriter' })
}

export async function espelharVozNoCerebro(
  input: { slug: string; nomeMarca: string; voice: BrandVoice }, deps: EspelhoDeps = {},
): Promise<{ ok: boolean }> {
  const escrever = deps.escrever ?? defaultEscrever
  try {
    const conteudo = renderBrandVoiceMirror(input.nomeMarca, input.voice)
    return await escrever({
      caminho: `marca/${input.slug}/voz.md`,
      conteudo,
      titulo: 'Voz da marca',
      tags: ['marca', 'voz'],
      commitMsg: 'estúdio: voz da marca',
    })
  } catch {
    return { ok: false }
  }
}


function renderSwipeMirror(swipe: SwipeView): string {
  const d = swipe.desmontagem ?? {}
  const L: string[] = [`# Swipe — ${swipe.titulo}`, '']
  if (swipe.fonte) L.push(`Fonte: ${swipe.fonte}`)
  if (swipe.tags.length) L.push(`Tags: ${swipe.tags.join(', ')}`)
  if (d.angulo) L.push(`Ângulo: ${d.angulo}`)
  if (d.gancho) L.push(`Gancho: ${d.gancho}`)
  if (d.porqueFunciona) L.push(`Por que funciona: ${d.porqueFunciona}`)
  if (d.gatilhos?.length) L.push(`Gatilhos: ${d.gatilhos.join(', ')}`)
  if (d.estrutura?.length) { L.push('Estrutura:'); for (const e of d.estrutura) L.push(`- ${e}`) }
  L.push('', '## Copy de referência', swipe.conteudo)
  return L.join('\n').trim() + '\n'
}

export async function espelharSwipeNoCerebro(
  input: { slug: string; swipe: SwipeView }, deps: EspelhoDeps = {},
): Promise<{ ok: boolean }> {
  const escrever = deps.escrever ?? defaultEscrever
  try {
    const conteudo = renderSwipeMirror(input.swipe)
    const isConcorrente = input.swipe.tags.some((t) => t.trim().toLowerCase() === 'concorrente')
    return await escrever({
      caminho: `marca/${input.slug}/swipe/${input.swipe.id}.md`,
      conteudo,
      titulo: `Swipe: ${input.swipe.titulo}`,
      tags: ['marca', 'swipe', ...(isConcorrente ? ['concorrente'] : [])],
      commitMsg: `estúdio: swipe ${input.swipe.titulo}`,
    })
  } catch {
    return { ok: false }
  }
}
