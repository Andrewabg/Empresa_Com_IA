

import { getFormato } from '@/lib/estudio/formatos'
import type { CausaCriativo } from '@/lib/trafego/criativo'

export interface ObjetivoRuiInput {
  diagnostico: string
  nomeAnuncio?: string
  copyAtual?: string
  
  criativo?: { tipo: 'imagem' | 'video'; descricao: string }
  
  causa?: CausaCriativo
}


export function formatoDaRenovacao(criativo?: { tipo: 'imagem' | 'video' }): string {
  return criativo?.tipo === 'video' ? 'anuncio-30s' : 'meta-ad'
}



const DIRECAO_POR_CAUSA: Partial<Record<CausaCriativo, string>> = {
  hook: 'O problema é o HOOK: a primeira linha não para o scroll. Ataque a abertura — é ela que decide o resto.',
  hold: 'O problema é o HOLD: a abertura prende e o meio perde. Reescreva o corpo, com ritmo e uma virada no meio.',
  ctr_cta: 'O problema é o clique: interessa e não converte. Reforce a oferta e deixe o CTA inequívoco.',
}

export function objetivoRuiParaLia({ diagnostico, nomeAnuncio, copyAtual, criativo, causa }: ObjetivoRuiInput): string {
  const alvo = nomeAnuncio ? `O anúncio "${nomeAnuncio}"` : 'Um anúncio de tráfego'
  const linhas = [`${alvo} está fadigado. Diagnóstico do Rui: ${diagnostico}.`]
  const direcao = causa ? DIRECAO_POR_CAUSA[causa] : undefined
  if (direcao) linhas.push(direcao)
  if (copyAtual && copyAtual.trim()) {
    linhas.push(`Copy atual do anúncio: ${copyAtual.trim()}. NÃO repita essa copy — escreva um ÂNGULO NOVO.`)
  }
  if (criativo && criativo.descricao.trim()) {
    const d = criativo.descricao.trim()
    if (criativo.tipo === 'imagem') {
      linhas.push(`O criativo atual é uma IMAGEM que mostra: ${d}. Leve o visual em conta — a nova copy deve renovar/conversar com essa imagem.`)
    } else {
      linhas.push(`O criativo atual é um VÍDEO. Transcrição da fala: "${d}". Escreva um roteiro NOVO que renove essa mensagem — NÃO repita o mesmo roteiro.`)
    }
  }
  const slug = formatoDaRenovacao(criativo)
  const nome = getFormato(slug)?.nome ?? slug
  linhas.push(`Produza uma peça nova de copy (formato ${slug} — ${nome}) que renove o criativo. Use a tool gerarPeca; não responda em texto.`)
  return linhas.join(' ')
}
