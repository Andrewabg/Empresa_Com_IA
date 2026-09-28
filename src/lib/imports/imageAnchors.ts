


export function headingDaImagem(
  chunks: { text: string; heading_path: string }[],
  n: number,
): string | null {
  const ancora = `[imagem ${n}]`
  const encontrado = chunks.find(c => c.text.includes(ancora))
  if (!encontrado) return null
  return encontrado.heading_path === '' ? null : encontrado.heading_path
}
