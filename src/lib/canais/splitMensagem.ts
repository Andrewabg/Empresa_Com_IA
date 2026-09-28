









export function splitMensagem(texto: string, limite: number): string[] {
  const t = texto.trimEnd()
  if (t.length === 0) return []
  
  if (limite <= 0 || t.length <= limite) return [t]

  const pedacos: string[] = []
  let resto = t
  while (resto.length > limite) {
    const janela = resto.slice(0, limite)
    
    const corteQuebra = janela.lastIndexOf('\n')
    const corteEspaco = corteQuebra > 0 ? -1 : janela.lastIndexOf(' ')
    const corte = corteQuebra > 0 ? corteQuebra : corteEspaco
    const fim = corte > 0 ? corte : limite
    const bloco = resto.slice(0, fim).trimEnd()
    if (bloco.length > 0) pedacos.push(bloco)
    
    resto = resto.slice(corte > 0 ? fim + 1 : fim)
  }
  const cauda = resto.trimEnd()
  if (cauda.length > 0) pedacos.push(cauda)
  return pedacos
}
