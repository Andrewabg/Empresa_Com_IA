










import { ehRoteiro, getFormato } from '@/lib/estudio/formatos'
import type { ItemDaEntrega } from './types'


export const TETO_DE_ITENS_NO_PACOTE = 40

export interface EntradaDoPacote {
  
  caminho: string
  
  fonte: { tipo: 'artefato'; artifactId: string } | { tipo: 'texto'; conteudo: string }
}

const SEM_ACENTO: Record<string, string> = {
  á: 'a', à: 'a', â: 'a', ã: 'a', é: 'e', ê: 'e', í: 'i', ó: 'o', ô: 'o', õ: 'o', ú: 'u', ü: 'u', ç: 'c',
}


export function slugDoNome(texto: string): string {
  const base = (texto ?? '').toLowerCase().replace(/[áàâãéêíóôõúüç]/g, (c) => SEM_ACENTO[c] ?? c)
  const limpo = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return limpo.slice(0, 40) || 'item'
}


export function numeroDaPasta(indice: number): string {
  return String(indice + 1).padStart(2, '0')
}

export interface CopyDoItem {
  
  campos: { rotulo: string; texto: string }[]
}


export function copyEmMarkdown(item: ItemDaEntrega, copy: CopyDoItem | null): string {
  const L = [`# ${item.formatoNome}`, '', `Ângulo: ${item.angulo || 'não definido'}`, '']
  if (!copy?.campos.length) {
    L.push('Esta peça ainda não tem copy escrita.')
  } else {
    for (const c of copy.campos) L.push(`## ${c.rotulo}`, '', c.texto.trim(), '')
  }
  return `${L.join('\n').trimEnd()}\n`
}

export interface PlanoDePacote {
  entradas: EntradaDoPacote[]
  
  cortados: number
}


export function planoDePacote(
  itens: ItemDaEntrega[],
  copyPorItem: Record<number, CopyDoItem | null>,
  teto = TETO_DE_ITENS_NO_PACOTE,
): PlanoDePacote {
  const lista = itens ?? []
  const dentro = lista.slice(0, Math.max(0, teto))
  const entradas: EntradaDoPacote[] = []

  for (const item of dentro) {
    const roteiro = ehRoteiro(getFormato(item.formato))
    const nome = `${numeroDaPasta(item.indice)}-${slugDoNome(item.formatoNome)}`
    
    const base = roteiro ? `roteiros/${nome}` : `${nome}/copy`
    entradas.push({
      caminho: `${base}.md`,
      fonte: { tipo: 'texto', conteudo: copyEmMarkdown(item, copyPorItem[item.indice] ?? null) },
    })
    if (!roteiro && item.artifactId) {
      entradas.push({ caminho: `${nome}/arte.png`, fonte: { tipo: 'artefato', artifactId: item.artifactId } })
    }
  }

  return { entradas, cortados: Math.max(0, lista.length - dentro.length) }
}


export function leiaMe(nomeDaEntrega: string, plano: PlanoDePacote, itens: ItemDaEntrega[]): string {
  const comArte = plano.entradas.filter((e) => e.fonte.tipo === 'artefato').length
  const L = [
    `# ${nomeDaEntrega}`,
    '',
    `${itens.length} ${itens.length === 1 ? 'peça' : 'peças'} nesta entrega, ${comArte} com arte pronta.`,
    '',
    'Cada pasta numerada é uma peça: dentro dela ficam a arte e o texto, juntos. Os roteiros ficam na pasta `roteiros`, porque não têm arte.',
    '',
    'O texto está em markdown, que abre em qualquer editor. A arte está em PNG, no tamanho exato que a plataforma pede.',
  ]
  if (plano.cortados > 0) {
    L.push('', `Esta entrega é maior que o pacote: ${plano.cortados} ${plano.cortados === 1 ? 'peça ficou' : 'peças ficaram'} de fora. Baixe de novo depois de postar as primeiras.`)
  }
  const semArte = itens.filter((i) => i.estado !== 'pronto').length
  if (semArte > 0) {
    L.push('', `${semArte} ${semArte === 1 ? 'peça ainda não terminou' : 'peças ainda não terminaram'}. O que já está pronto veio no pacote; baixe de novo quando o resto fechar.`)
  }
  return `${L.join('\n')}\n`
}
