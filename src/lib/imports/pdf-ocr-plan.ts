






export const MAX_OCR_PAGES = 40

export function ocrPagePlan(
  numPages: number,
  cap: number = MAX_OCR_PAGES,
): { pages: number[]; truncated: boolean } {
  const n = Math.max(0, Math.floor(numPages))
  const take = Math.min(n, Math.max(0, cap))
  return { pages: Array.from({ length: take }, (_, i) => i + 1), truncated: n > take }
}
