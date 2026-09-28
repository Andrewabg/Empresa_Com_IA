












import { contemDadoPessoal } from './sanitizar'
import { RECUSA_DADO_PESSOAL, RECUSA_AGREGADO_TEXTO_LIVRE, RECUSA_AGREGADO_SERIALIZADO } from './mensagens'
import type { Agregado } from './tipos'


const LIMITE_DE_DIMENSAO = 40


function comecaSerializado(texto: string): boolean {
  return texto.startsWith('{') || texto.startsWith('[')
    || texto.startsWith('<') || texto.startsWith('(')
}


function celulaSuspeita(valor: string | number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null
  const texto = String(valor)
  if (texto.length > LIMITE_DE_DIMENSAO) return RECUSA_AGREGADO_TEXTO_LIVRE
  if (contemDadoPessoal(texto)) return RECUSA_DADO_PESSOAL
  if (comecaSerializado(texto)) return RECUSA_AGREGADO_SERIALIZADO
  return null
}


export function agregadoSuspeito(a: Agregado): string | null {
  for (const coluna of a.colunas) {
    const motivo = celulaSuspeita(coluna)
    if (motivo) return motivo
  }
  for (const linha of a.linhas) {
    
    
    
    
    for (const chave of new Set([...a.colunas, ...Object.keys(linha)])) {
      const motivo = celulaSuspeita(chave) ?? celulaSuspeita(linha[chave])
      if (motivo) return motivo
    }
  }
  return null
}
