


const EXT = '.md'


export function normalizeNotePath(path: string): string {
  return path.endsWith(EXT) ? path : `${path}${EXT}`
}


export function pareceNota(conteudo: string): boolean {
  const linhas = conteudo.split('\n')
  if (linhas[0]?.trim() !== '---') return false
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i]
    if (linha.trim() === '---') return false 
    if (/^id:\s*\S/.test(linha)) return true
  }
  return false
}

export interface ArquivoDoRepo {
  path: string
  
  conteudo: string
}

export interface Renomeacao {
  de: string
  para: string
}


export function planejarResgateMd(arquivos: ArquivoDoRepo[]): Renomeacao[] {
  const existentes = new Set(arquivos.map((a) => a.path))
  const destinos = new Set<string>()
  const plano: Renomeacao[] = []
  for (const a of arquivos) {
    if (a.path.endsWith(EXT)) continue
    if (!pareceNota(a.conteudo)) continue
    const para = normalizeNotePath(a.path)
    if (existentes.has(para) || destinos.has(para)) continue
    destinos.add(para)
    plano.push({ de: a.path, para })
  }
  return plano
}
