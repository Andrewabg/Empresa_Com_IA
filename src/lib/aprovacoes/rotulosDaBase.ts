













export const ROTULO_PORQUE = 'Por quê:'
export const ROTULO_BASE = 'Base:'
export const ROTULO_AVISO = 'Aviso:'
export const ROTULO_EVIDENCIA = 'Evidência:'

const ROTULOS = [ROTULO_PORQUE, ROTULO_BASE, ROTULO_AVISO, ROTULO_EVIDENCIA] as const


export function ehReasonDaBase(texto: string | null | undefined): boolean {
  const t = (texto ?? '').trimStart()
  return ROTULOS.some((r) => t.startsWith(r))
}
