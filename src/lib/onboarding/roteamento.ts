import type { Perfil } from './types'
import { normalizarTexto, palavrasDe } from './texto'

const CHIPS: Perfil[] = ['tem_empresa', 'sem_empresa', 'revendedor', 'curioso']


const REVENDEDOR =
  /\brevend|\bresell|white.?label|\b(pra|pro|pros|pras|para|p\/|aos?)\s+(os\s+|as\s+)?(meus|minhas)\s+clientes/


const SEM_EMPRESA =
  /\b(ainda\s+)?nao\s+(tenho|possuo|abri|montei|criei)\s+((uma|um|nenhuma|nenhum|minha|meu)\s+)?(empresa|negoci|cnpj|firma)|\bsem\s+empresa\b/


const QUER_ABRIR =
  /\b(quero|queria|vou|pretendo|planejo|penso em|pensando em|ideia e)\b.{0,20}\b(abrir|montar|criar|comecar|iniciar)\b/


const TEM_EMPRESA =
  /\b(tenho|minha|minhas|nossa|nossas|somos|abri|abriu|montei)\b.{0,30}(empresa|negoci|loja|startup|agencia)/


const CURIOSO =
  /\bcurios|\bexplor|\b(so|apenas)\s+(quero\s+|queria\s+|vou\s+|estou\s+|to\s+)?(olh|vendo\b|ver\b|test|conhec|dar\b|dando\b|espi)/


export function classificarPerfil(resposta: string): Perfil | null {
  const t = normalizarTexto(resposta)
  if (CHIPS.includes(t as Perfil)) return t as Perfil
  if (SEM_EMPRESA.test(t)) return 'sem_empresa'
  if (QUER_ABRIR.test(t)) return 'sem_empresa'
  if (TEM_EMPRESA.test(t)) return 'tem_empresa'
  if (REVENDEDOR.test(t)) return 'revendedor'
  if (CURIOSO.test(t)) return 'curioso'
  return null
}


const SAUDACOES = new Set([
  'oi', 'oie', 'oii', 'oiee', 'ola', 'opa', 'opaa', 'eae', 'eai', 'e', 'ai', 'hey', 'hi',
  'hello', 'alo', 'salve', 'fala', 'bom', 'boa', 'boas', 'dia', 'tarde', 'noite',
  'tudo', 'td', 'bem', 'beleza', 'blz', 'certo', 'ok', 'okay', 'tranquilo', 'tranquila',
  'como', 'vai', 'voce', 'vc', 'prazer', 'obrigado', 'obrigada', 'valeu', 'vlw',
])


export function ehSaudacao(texto: string): boolean {
  const palavras = palavrasDe(texto)
  if (palavras.length === 0) return false
  return palavras.every((p) => SAUDACOES.has(p))
}


export function textoSubstantivo(texto: string): boolean {
  const t = normalizarTexto(texto)
  if (!t || ehSaudacao(t)) return false
  return palavrasDe(t).length >= 2 || t.length >= 8
}
