


const CONTROLES = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g


const TEM_SURROGATE = /[\ud800-\udfff]/


export function textoSeguroParaBanco(texto: string): string {
  const semControles = texto.replace(CONTROLES, '')
  if (!TEM_SURROGATE.test(semControles)) return semControles
  return descartarSurrogatesSoltos(semControles)
}


function descartarSurrogatesSoltos(texto: string): string {
  let out = ''
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdbff) {
      const proximo = i + 1 < texto.length ? texto.charCodeAt(i + 1) : 0
      if (proximo >= 0xdc00 && proximo <= 0xdfff) {
        out += texto[i] + texto[i + 1]
        i++
      }
      continue 
    }
    if (c >= 0xdc00 && c <= 0xdfff) continue 
    out += texto[i]
  }
  return out
}


export function cortarTextoSeguro(texto: string, max: number): string {
  return textoSeguroParaBanco(texto.length > max ? texto.slice(0, max) : texto)
}
