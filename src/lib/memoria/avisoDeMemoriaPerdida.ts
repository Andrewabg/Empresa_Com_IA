











export const CHAVE_MORTAS_AVISADAS = 'memoria_mortas_avisadas'


export function deveAvisarMemoriaPerdida(mortas: number, jaAvisadas: number | null): boolean {
  if (!Number.isFinite(mortas) || mortas <= 0) return false
  const base = Number.isFinite(jaAvisadas as number) && (jaAvisadas as number) > 0 ? (jaAvisadas as number) : 0
  return mortas > base
}


export function avisoDeMemoriaPerdida(novas: number): string {
  const quantas = novas === 1
    ? 'Uma coisa que eu deveria ter guardado no seu Cérebro'
    : `${novas} coisas que eu deveria ter guardado no seu Cérebro`
  const verbo = novas === 1 ? 'não entrou' : 'não entraram'
  return `${quantas} ${verbo}, e eu parei de tentar. Se em alguma conversa eu disse que tinha guardado, aquilo não chegou lá. Abra o Cérebro para conferir o que está faltando e me peça o que ainda fizer falta.`
}
