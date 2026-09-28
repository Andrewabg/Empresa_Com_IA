








import { semComentariosDeSql } from './sqlSemComentarios'

export type MotivoDeForma = 'vazio' | 'dolar' | 'segunda_instrucao' | 'nao_e_leitura' | 'escreve' | 'escape'


const RE_STRING_COM_ESCAPE = /\be'/i

const RE_ABRE_DOLLAR = /\$([A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*)?\$/

const RE_ESCAPE_UNICODE = /\bu&['"]/i
const RE_ESCREVE = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy)\b/i


export function formaDeLeitura(sql: string): { motivo: MotivoDeForma | null; limpo: string } {
  const bruto = sql.trim()
  if (!bruto) return { motivo: 'vazio', limpo: '' }
  if (RE_ABRE_DOLLAR.test(bruto)) return { motivo: 'dolar', limpo: '' }
  const semTerminadorFinal = bruto.replace(/;\s*$/, '')
  if (semTerminadorFinal.includes(';')) return { motivo: 'segunda_instrucao', limpo: '' }
  const limpo = semComentariosDeSql(semTerminadorFinal).trim()
  if (!limpo) return { motivo: 'vazio', limpo: '' }
  if (!/^(select|with)\b/i.test(limpo)) return { motivo: 'nao_e_leitura', limpo }
  if (RE_ESCREVE.test(limpo)) return { motivo: 'escreve', limpo }
  if (RE_ESCAPE_UNICODE.test(limpo)) return { motivo: 'escape', limpo }
  if (RE_STRING_COM_ESCAPE.test(limpo)) return { motivo: 'escape', limpo }
  return { motivo: null, limpo }
}
