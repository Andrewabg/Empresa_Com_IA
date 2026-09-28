











export const TETO_DO_TITULO = 110


const FRASE_DE_MAQUINA = /(\buse\s+(a|as)\s+tools?\b|não\s+responda\s+em\s+texto|responda\s+chamando\s+a\s+tool)/i


function frases(texto: string): string[] {
  return texto
    .replace(/\s+/g, ' ')
    .split(/(?<=\.)\s+/)
    .map((f) => f.trim())
    .filter(Boolean)
}


export function tituloDoObjetivo(objective: string | null | undefined): string {
  const cru = (objective ?? '').replace(/\s+/g, ' ').trim()
  if (!cru) return ''
  const primeira = frases(cru).find((f) => !FRASE_DE_MAQUINA.test(f))
  return aparar(primeira ?? cru)
}

function aparar(texto: string): string {
  const t = texto.trim()
  if (t.length <= TETO_DO_TITULO) return t
  
  const fatia = t.slice(0, TETO_DO_TITULO)
  const espaco = fatia.lastIndexOf(' ')
  return `${(espaco > TETO_DO_TITULO * 0.6 ? fatia.slice(0, espaco) : fatia).replace(/[\s,;.:-]+$/, '')}…`
}
