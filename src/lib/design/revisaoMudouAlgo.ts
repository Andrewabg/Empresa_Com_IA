












export function conceitosQueMudam<T extends { promptImagem: string }>(
  conceitos: readonly T[],
  promptBase: string,
): T[] {
  const base = promptBase.trim()
  if (!base) return [...conceitos]
  return conceitos.filter((c) => c.promptImagem.trim() !== base)
}

export const AVISO_REVISAO_SEM_MUDANCA =
  'Esse pedido não mudou a direção da arte, então não gerei uma versão nova. Me diz em termos visuais o que trocar (a cor do fundo, a foto, o enquadramento, a tipografia) e eu refaço.'
