










export type PapelCargo = 'suporte' | 'vendas' | 'geral'

export interface CargoNoCanal {
  agentId: string
  nome: string
  papel: PapelCargo
  
  palavras: string[]
}

export interface Roteador {
  cargos: CargoNoCanal[]
  
  padrao: string
}


export const PALAVRAS_PADRAO: Record<PapelCargo, string[]> = {
  suporte: [
    'pedido', 'atrasou', 'nao chegou', 'defeito', 'quebrado', 'troca', 'devolucao',
    'reembolso', 'estorno', 'nota fiscal', 'garantia', 'reclamacao', 'cancelar',
    'rastreio', 'codigo de rastreio', 'problema', 'nao funciona', 'suporte',
  ],
  vendas: [
    'quanto custa', 'preco', 'valor', 'orcamento', 'plano', 'planos', 'contratar',
    'assinar', 'comprar', 'desconto', 'promocao', 'parcelar', 'parcelamento',
    
    
    
    'parcelam', 'parcela', 'aceita cartao', 'tem desconto',
    'formas de pagamento', 'proposta', 'catalogo', 'tabela de precos', 'quero contratar',
  ],
  geral: [],
}


export const MIN_TURNOS_TRANSFERENCIA = 3


export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}


function pontuar(textoNorm: string, palavras: string[]): number {
  let pontos = 0
  for (const bruta of palavras) {
    const alvo = normalizar(bruta)
    if (!alvo) continue
    
    const re = new RegExp(`(?:^|\\s)${alvo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`)
    if (re.test(textoNorm)) pontos++
  }
  return pontos
}


export function rotearPorSinal(texto: string, r: Roteador): string | null {
  if (!texto || r.cargos.length < 2) return null
  const t = normalizar(texto)
  if (!t) return null

  let melhor: { agentId: string; pontos: number } | null = null
  let empatado = false
  for (const cargo of r.cargos) {
    const pontos = pontuar(t, cargo.palavras)
    if (pontos === 0) continue
    if (!melhor || pontos > melhor.pontos) {
      melhor = { agentId: cargo.agentId, pontos }
      empatado = false
    } else if (pontos === melhor.pontos) {
      empatado = true
    }
  }
  if (!melhor || empatado) return null
  return melhor.agentId
}


export function deveTransferir(input: {
  atual: string
  sugerido: string | null
  turnosDesdeTransferencia: number
  minTurnos?: number
}): boolean {
  const { atual, sugerido } = input
  if (!sugerido || sugerido === atual) return false
  const min = input.minTurnos ?? MIN_TURNOS_TRANSFERENCIA
  return input.turnosDesdeTransferencia >= min
}


export function turnosDesdeTransferencia(
  historico: Array<{ direcao: 'in' | 'out'; texto: string }>,
): number {
  let ultimaMarca = -1
  for (let i = historico.length - 1; i >= 0; i--) {
    if (ehMarcaTransferencia(historico[i].texto)) { ultimaMarca = i; break }
  }
  if (ultimaMarca === -1) return Number.POSITIVE_INFINITY
  let turnos = 0
  for (let i = ultimaMarca + 1; i < historico.length; i++) {
    if (historico[i].direcao === 'in') turnos++
  }
  return turnos
}


export const KIND_TRANSFERENCIA = 'transferencia'

const PREFIXO_MARCA = '[o cliente foi transferido de '


export function ehMarcaTransferencia(texto: string): boolean {
  return typeof texto === 'string' && texto.trimStart().startsWith(PREFIXO_MARCA)
}


export function marcaTransferencia(de: string, para: string): string {
  return `[o cliente foi transferido de ${de} para ${para}]`
}


export function lerRoteador(config: unknown, padrao: string): Roteador | null {
  const raw = (config as { roteamento?: unknown } | null)?.roteamento
  if (!raw || typeof raw !== 'object') return null
  const lista = (raw as { cargos?: unknown }).cargos
  if (!Array.isArray(lista)) return null
  const cargos: CargoNoCanal[] = []
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue
    const c = item as { agentId?: unknown; nome?: unknown; papel?: unknown; palavras?: unknown }
    if (typeof c.agentId !== 'string' || !c.agentId.trim()) continue
    const palavras = Array.isArray(c.palavras) ? c.palavras.filter((p): p is string => typeof p === 'string') : []
    cargos.push({
      agentId: c.agentId,
      nome: typeof c.nome === 'string' && c.nome.trim() ? c.nome : c.agentId,
      papel: c.papel === 'suporte' || c.papel === 'vendas' ? c.papel : 'geral',
      palavras,
    })
  }
  
  return cargos.length >= 2 ? { cargos, padrao } : null
}
