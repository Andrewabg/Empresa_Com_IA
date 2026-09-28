









import { motivoDoSqlInseguro } from './adaptadores/banco'
import { selecionaColunaDeIdentidade, motivoDaProjecao } from '@/lib/fontes/sanitizar'
import { isSafeNotePath } from '@/lib/brain/safePath'
import { normalizarCaminhoDaNota } from '@/lib/fontes/caminhoDaNota'
import {
  RECUSA_DADO_PESSOAL, RECUSA_CAMINHO_DA_NOTA, RECUSA_DESTINO_FORA_DO_CONHECIMENTO,
} from '@/lib/fontes/mensagens'


const PASTAS_RESERVADAS = new Set([
  'skills', '.github', 'custom',
  'identidade', 'empresa', 'evals',
])


export function motivoDaRecusa(corpo: string, notaPath: string): string | null {
  
  
  
  
  const motivoDeTransporte = motivoDoSqlInseguro(corpo)
  if (motivoDeTransporte) return motivoDeTransporte
  if (selecionaColunaDeIdentidade(corpo)) return RECUSA_DADO_PESSOAL
  
  
  
  
  
  const motivoProjecao = motivoDaProjecao(corpo)
  if (motivoProjecao) return motivoProjecao
  
  
  
  const alvo = normalizarCaminhoDaNota(notaPath)
  if (!alvo.endsWith('.md') || !isSafeNotePath(alvo)) return RECUSA_CAMINHO_DA_NOTA
  
  
  
  
  
  
  
  
  
  const primeiroSegmento = alvo.split('/')[0].toLowerCase()
  if (!alvo.includes('/') || PASTAS_RESERVADAS.has(primeiroSegmento)) {
    return RECUSA_DESTINO_FORA_DO_CONHECIMENTO
  }
  return null
}
