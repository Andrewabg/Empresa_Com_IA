


export const MAX_CHAVE = 80


const FALLBACK = 'arquivo'


export function chaveDeArquivoSegura(nome: string, maxLen: number = MAX_CHAVE): string {
  
  const base = nome.replace(/\\/g, '/').split('/').filter((p) => p && p !== '..').pop() ?? ''
  
  const semAcento = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const achatado = semAcento
    .replace(/[^A-Za-z0-9_.\-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._]+/, '')      
    .replace(/[._]+$/, '')
  if (!achatado) return FALLBACK
  if (achatado.length <= maxLen) return achatado

  
  const ponto = achatado.lastIndexOf('.')
  const temExt = ponto > 0 && ponto > achatado.length - 12
  const ext = temExt ? achatado.slice(ponto) : ''
  const corpo = temExt ? achatado.slice(0, ponto) : achatado
  const cortado = corpo.slice(0, Math.max(1, maxLen - ext.length)).replace(/[._]+$/, '')
  return (cortado || FALLBACK) + ext
}
