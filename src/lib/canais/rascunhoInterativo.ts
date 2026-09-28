















export function textoPadraoDoArquivo(rotulo: string): string {
  const nome = (rotulo ?? '').trim()
  return nome ? `Segue o arquivo: ${nome}` : 'Segue o arquivo.'
}


export function textoDoRascunho(
  texto: string,
  corpoDasOpcoes: string | null,
  arquivo?: { legenda: string; rotulo: string } | null,
): string {
  const dele = texto.trim()
  if (dele) return dele
  
  
  
  
  
  
  if (!arquivo) return (corpoDasOpcoes ?? '').trim()
  return arquivo.legenda.trim() || textoPadraoDoArquivo(arquivo.rotulo)
}


export interface PlanoDeEnvioDoRascunho {
  
  enviarTexto: boolean
  
  corpoFinal: string | null
}


export function planoDeEnvioDoRascunho(args: {
  textoAprovado: string
  textoOriginal: string
  corpoDasOpcoes: string | null
}): PlanoDeEnvioDoRascunho {
  const corpo = (args.corpoDasOpcoes ?? '').trim()
  if (!corpo) return { enviarTexto: true, corpoFinal: null }
  const veioDasOpcoes = args.textoOriginal.trim() === corpo
  if (veioDasOpcoes) return { enviarTexto: false, corpoFinal: args.textoAprovado.trim() }
  return { enviarTexto: true, corpoFinal: corpo }
}
