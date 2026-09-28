
import { extractText, getDocumentProxy } from 'unpdf'
import {
  agruparLinhasPorY,
  montarMarkdownComHeadings,
  type ItemPdf,
} from '@/lib/imports/pdfHeadings'
import { textoSeguroParaBanco } from '@/lib/textoDoBanco'


function normalizar(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array
    ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    : new Uint8Array(input)
}


export async function extrairTextoPdf(input: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = normalizar(input)
  const pdf = await getDocumentProxy(bytes)
  const { text } = await extractText(pdf, { mergePages: true })
  return textoSeguroParaBanco(typeof text === 'string' ? text : String(text ?? '')).trim()
}


const Y_TOL = 2


export async function extrairTextoPdfComPaginas(
  input: ArrayBuffer | Uint8Array,
  deps?: {
    extrairItens?: (input: ArrayBuffer | Uint8Array) => Promise<ItemPdf[][]>
    extrairPaginas?: (input: ArrayBuffer | Uint8Array) => Promise<string[]>
  },
): Promise<string> {
  const extrairItens = deps?.extrairItens ?? defaultExtrairItens
  const extrairPaginas = deps?.extrairPaginas ?? defaultExtrairPaginas

  
  let itensPorPagina: ItemPdf[][] | null = null
  try {
    const resultado = await extrairItens(input)
    if (resultado.length > 0) {
      itensPorPagina = resultado
    }
  } catch {
    
  }

  
  if (itensPorPagina !== null) {
    return textoSeguroParaBanco(montarPaginasComHeadings(itensPorPagina))
  }

  
  const paginas = await extrairPaginas(input)
  return textoSeguroParaBanco(montarPaginasTexto(paginas))
}


function montarPaginasComHeadings(itensPorPagina: ItemPdf[][]): string {
  const parts: string[] = []
  for (let i = 0; i < itensPorPagina.length; i++) {
    const linhas = agruparLinhasPorY(itensPorPagina[i] ?? [], Y_TOL)
    const texto = montarMarkdownComHeadings(linhas).trim()
    if (!texto) continue
    
    parts.push(i === 0 ? texto : `## Página ${i + 1}\n\n${texto}`)
  }
  return parts.join('\n\n')
}


function montarPaginasTexto(paginas: string[]): string {
  const parts: string[] = []
  for (let i = 0; i < paginas.length; i++) {
    const texto = (paginas[i] ?? '').trim()
    if (!texto) continue
    parts.push(i === 0 ? texto : `## Página ${i + 1}\n\n${texto}`)
  }
  return parts.join('\n\n')
}


async function defaultExtrairItens(input: ArrayBuffer | Uint8Array): Promise<ItemPdf[][]> {
  const bytes = normalizar(input)
  const pdf = await getDocumentProxy(bytes)
  const resultado: ItemPdf[][] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const pagina = await pdf.getPage(p)
    const conteudo = await pagina.getTextContent()
    const itens: ItemPdf[] = conteudo.items
      .filter((item): item is typeof item & { str: string } => 'str' in item)
      .map(item => ({
        str: (item as { str: string }).str,
        y: (item as { transform: number[] }).transform[5] ?? 0,
        height:
          (item as { height?: number }).height ??
          (item as { transform: number[] }).transform[3] ??
          0,
      }))
    resultado.push(itens)
  }
  return resultado
}


async function defaultExtrairPaginas(input: ArrayBuffer | Uint8Array): Promise<string[]> {
  const bytes = normalizar(input)
  const pdf = await getDocumentProxy(bytes)
  const { text } = await extractText(pdf, { mergePages: false })
  return Array.isArray(text) ? text : [String(text ?? '')]
}
