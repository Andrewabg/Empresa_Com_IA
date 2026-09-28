

export const LARGURA_MIN_PX = 360

export const LARGURA_MAX_FRACAO = 0.7

export const LARGURA_PADRAO_PX = 440
export const LARGURA_PADRAO_FRACAO = 0.4
export const CHAVE_STORAGE = 'conversa.larguraDoChat'

export function larguraPadrao(viewportPx: number): number {
  return Math.min(LARGURA_PADRAO_PX, Math.round(viewportPx * LARGURA_PADRAO_FRACAO))
}


export function prenderLargura(pedidaPx: number, viewportPx: number): number {
  const teto = Math.floor(viewportPx * LARGURA_MAX_FRACAO)
  const piso = Math.min(LARGURA_MIN_PX, teto)
  if (!Number.isFinite(pedidaPx)) return piso
  return Math.max(piso, Math.min(teto, Math.round(pedidaPx)))
}


export function larguraInicial(salva: string | null, viewportPx: number): number {
  const n = salva == null ? NaN : Number(salva)
  if (!Number.isFinite(n) || n <= 0) return larguraPadrao(viewportPx)
  return prenderLargura(n, viewportPx)
}


export function larguraAoArrastar(larguraNoInicioPx: number, dxPx: number, viewportPx: number): number {
  return prenderLargura(larguraNoInicioPx - dxPx, viewportPx)
}
