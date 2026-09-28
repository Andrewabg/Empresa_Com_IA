




















import {
  ARQUETIPOS_DE_CENA,
  clausulaDeTextoDiegetico,
  temTextoDiegetico,
  type ArquetipoDeCena,
} from './arquetipos'


export const CAUDA_MUDA = 'no text, no letters, no words, no logos, no watermark, no signage'


export const CAUDA_ESTREITA =
  'No advertising headline, no marketing copy, no caption or subtitle overlaid on the photo, ' +
  'no logos, no brand names, no watermark, no invented signage, no interface chrome beyond what ' +
  'is described above'


export const INSTRUCAO_CRU =
  'This must NOT look produced: no art direction, no styling, no colour grading, nothing arranged ' +
  'for the camera. It should read like a photo someone took quickly to send to a colleague'


const CLAUSULA_SEM_TEXTO =
  /^no\s+(text|letters?|lettering|words?|writing|type|typography|logos?|watermarks?|signage|signs?|captions?|labels?|numbers?)\b/i


const FRASES_NOSSAS: RegExp[] = [
  /^no advertising headline\b/i,
  /^the only text visible anywhere in the frame is\b/i,
  /^that text is part of the photographed object\b/i,
  /^it does not need to be perfectly formed\b/i,
  /^this must not look produced\b/i,
  /^it should read like a photo someone took quickly\b/i,
]


const CAMERAS_CONHECIDAS: ReadonlySet<string> = new Set(
  ARQUETIPOS_DE_CENA.map((a) => a.camera.trim().replace(/[\s,.;]+$/, '').toLowerCase()),
)

interface Pedaco { inicio: number; conteudo: string }


function fatiar(texto: string, separadores: string): Pedaco[] {
  const out: Pedaco[] = []
  let inicio = 0
  for (let i = 0; i <= texto.length; i++) {
    if (i === texto.length || separadores.includes(texto[i]!)) {
      out.push({ inicio, conteudo: texto.slice(inicio, i) })
      inicio = i + 1
    }
  }
  return out
}

function semPontuacaoFinal(s: string): string {
  return s.trim().replace(/[\s,.;]+$/, '')
}


export function removerProibicaoDeTexto(prompt: string): string {
  const texto = (prompt ?? '').trimEnd()
  const pedacos = fatiar(texto, ',.')
  let corte = texto.length
  for (let i = pedacos.length - 1; i >= 0; i--) {
    const limpo = pedacos[i]!.conteudo.trim()
    if (!limpo) continue
    if (!CLAUSULA_SEM_TEXTO.test(limpo)) break
    corte = pedacos[i]!.inicio
  }
  return semPontuacaoFinal(texto.slice(0, corte))
}


export function removerCaudaAnterior(prompt: string): string {
  let texto = removerProibicaoDeTexto(prompt ?? '')
  
  
  for (let volta = 0; volta < 16; volta++) {
    const frases = fatiar(texto, '.').filter((f) => f.conteudo.trim())
    const ultima = frases[frases.length - 1]
    if (!ultima) break
    const f = ultima.conteudo.trim()
    const nossa = FRASES_NOSSAS.some((r) => r.test(f)) || CAMERAS_CONHECIDAS.has(f.toLowerCase())
    if (!nossa) break
    texto = removerProibicaoDeTexto(texto.slice(0, ultima.inicio))
  }
  return semPontuacaoFinal(texto)
}


export function fecharPromptFundo(promptFundo: string, arquetipo: ArquetipoDeCena | null): string {
  const base = removerCaudaAnterior(promptFundo)
  if (!base) return ''

  const frases: string[] = [encerrar(base)]
  if (arquetipo) frases.push(encerrar(arquetipo.camera))
  if (arquetipo?.polimento === 'cru') frases.push(encerrar(INSTRUCAO_CRU))

  if (!arquetipo || !temTextoDiegetico(arquetipo)) {
    frases.push(encerrar(CAUDA_MUDA))
  } else {
    frases.push(clausulaDeTextoDiegetico(arquetipo).trim())
    frases.push(encerrar(CAUDA_ESTREITA))
  }
  return frases.join(' ')
}


function encerrar(s: string): string {
  const t = s.trim()
  return /[.!?]$/.test(t) ? t : `${t}.`
}
