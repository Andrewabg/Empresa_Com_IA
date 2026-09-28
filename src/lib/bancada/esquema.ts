

import { neutralizarCerca } from '@/lib/cercaDoPrompt'
import { campoSeguro } from '@/lib/fontes/sanitizar'
import type { Bancada } from './tipos'

export interface TabelaNoEsquema { nome: string; colunas: string[]; linhas: number; porque?: string }

export function esquemaDaBancada(b: Bancada): TabelaNoEsquema[] {
  return [...b.tabelas.values()].map((t) => ({
    nome: t.nome,
    colunas: t.colunas.map((c) => c.nome),
    linhas: t.linhas.length,
    ...(t.porque ? { porque: t.porque } : {}),
  }))
}

export function mensagemDeErroSql(erro: string, esquema: TabelaNoEsquema[]): string {
  const lista = esquema.length
    ? esquema
        .map((t) => {
          const nome = campoSeguro(t.nome)
          const colunas = t.colunas.map((c) => campoSeguro(c)).join(', ')
          const porque = t.porque ? `, lida para: ${campoSeguro(t.porque)}` : ''
          return `${nome} (${colunas})${porque}`
        })
        .join('; ')
    : 'nenhuma tabela carregada ainda'
  return `A consulta falhou: ${neutralizarCerca(erro).replace(/\s+/g, ' ').trim()}. Tabelas disponíveis: ${lista}.`
}
