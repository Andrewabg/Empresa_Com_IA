

import { normalizarTexto } from '@/lib/google-ads/text'

export const GLOSSARIO: Record<string, string> = {
  cpc: 'quanto você paga cada vez que clicam no seu anúncio',
  cpa: 'quanto custou para conseguir cada cliente',
  cpl: 'quanto custou cada contato interessado (lead)',
  roas: 'para cada R$ 1 investido, quanto o anúncio trouxe de venda',
  conversao: 'uma ação que vale dinheiro: uma venda, um orçamento ou uma mensagem no WhatsApp',
  ctr: 'de cada 100 pessoas que veem o anúncio, quantas clicam nele',
  quality_score: 'a nota do Google pro seu anúncio — quanto maior, mais barato você aparece',
  impression_share: 'de todas as vezes que seu anúncio podia aparecer, em quantas ele apareceu',
}


export function traduzir(sigla: string): string | null {
  const chave = normalizarTexto(sigla).trim().replace(/[\s-]+/g, '_')
  return GLOSSARIO[chave] ?? null
}
