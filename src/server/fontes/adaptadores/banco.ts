








import { Client, type ClientConfig } from 'pg'
import type { Adaptador, Agregado, Registro } from '@/lib/fontes/tipos'
import { formaDeLeitura } from '@/lib/fontes/formaDeLeitura'
import {
  AVISO_CONSULTA_CORTADA, RECUSA_FUNCAO_NAO_PERMITIDA, RECUSA_LE_O_PROPRIO_BANCO,
  RECUSA_NAO_E_LEITURA, RECUSA_RESULTADO_GRANDE_DEMAIS, RECUSA_SQL_COM_DOLAR,
} from '@/lib/fontes/mensagens'
import { campoSeguro, semLiteraisDeTexto } from '@/lib/fontes/sanitizar'
import { RecusaDoNucleo } from '../recusaDoNucleo'


export interface ClienteBanco {
  connect(): Promise<void>
  end(): Promise<void>
  query(sql: string): Promise<{ fields: { name: string }[]; rows: Record<string, unknown>[] }>
}

export interface OpcoesConsulta {
  maxLinhas: number
  timeoutMs: number
  
  leSchemaDoBanco?: boolean
}

export const MAX_LINHAS_DEFAULT = 500
export const TIMEOUT_MS_DEFAULT = 15_000


export const CONEXAO_TIMEOUT_MS = 10_000


export const QUERY_TIMEOUT_MS = TIMEOUT_MS_DEFAULT + 5_000


const RE_SSLMODE_NA_CONEXAO = /\bsslmode\s*=/i


export function opcoesDoCliente(credencial: string): ClientConfig {
  return {
    connectionString: credencial,
    connectionTimeoutMillis: CONEXAO_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
    keepAlive: true,
    ...(RE_SSLMODE_NA_CONEXAO.test(credencial) ? {} : { ssl: { rejectUnauthorized: true } }),
  }
}


export function criarCliente(credencial: string): ClienteBanco {
  return new Client(opcoesDoCliente(credencial)) as unknown as ClienteBanco
}


export type PoderDaConexao = 'so_leitura' | 'poder_demais' | 'nao_deu_para_conferir'


export const SQL_DO_PODER_DA_CONEXAO = `select
    coalesce((select u.usesuper from pg_user u where u.usename = current_user), false) as manda_em_tudo,
    coalesce((select bool_or(pg_has_role(current_user, r.oid, 'member'))
              from pg_roles r
              where r.rolname in ('pg_read_server_files', 'pg_write_server_files',
                                  'pg_execute_server_program', 'pg_signal_backend')), false) as papel_de_administrador`


export async function poderDaConexao(
  credencial: string,
  criar: (c: string) => ClienteBanco = criarCliente,
): Promise<PoderDaConexao> {
  let cliente: ClienteBanco
  try {
    cliente = criar(credencial)
  } catch {
    return 'nao_deu_para_conferir'
  }
  try {
    await cliente.connect()
  } catch {
    return 'nao_deu_para_conferir'
  }
  try {
    await cliente.query('begin transaction read only')
    const res = await cliente.query(SQL_DO_PODER_DA_CONEXAO)
    await cliente.query('commit')
    const linha = res.rows[0]
    if (!linha) return 'nao_deu_para_conferir'
    const mandaEmTudo = linha['manda_em_tudo']
    const papel = linha['papel_de_administrador']
    
    
    
    
    if (typeof mandaEmTudo !== 'boolean' || typeof papel !== 'boolean') return 'nao_deu_para_conferir'
    return mandaEmTudo || papel ? 'poder_demais' : 'so_leitura'
  } catch {
    return 'nao_deu_para_conferir'
  } finally {
    await cliente.end().catch(() => {})
  }
}


export const FUNCOES_PERMITIDAS: readonly string[] = [
  'count', 'sum', 'avg', 'min', 'max',
  'stddev', 'stddev_pop', 'stddev_samp', 'variance', 'var_pop', 'var_samp',
  'round', 'floor', 'ceil', 'ceiling', 'abs', 'greatest', 'least', 'coalesce', 'nullif',
  'date_trunc', 'date_part', 'extract', 'to_char', 'age', 'now', 'current_date', 'current_timestamp',
  'lower', 'upper', 'trim', 'btrim', 'ltrim', 'rtrim', 'length', 'char_length',
  'substr', 'substring', 'left', 'right',
  'cast', 'percentile_cont', 'percentile_disc', 'mode',
]


const NAO_SAO_FUNCAO: readonly string[] = [
  'select', 'from', 'where', 'and', 'or', 'not', 'in', 'exists', 'all', 'any', 'some',
  'as', 'on', 'using', 'join', 'inner', 'outer', 'cross', 'lateral', 'natural', 'full',
  'union', 'intersect', 'except', 'values', 'group', 'by', 'order', 'having',
  'limit', 'offset', 'with', 'recursive', 'case', 'when', 'then', 'else', 'end',
  'over', 'filter', 'partition', 'within', 'distinct', 'is', 'between', 'like', 'ilike',
  'similar', 'asc', 'desc', 'nulls', 'first', 'last', 'fetch', 'only', 'rows', 'row',
  'at', 'time', 'zone', 'interval', 'array', 'for', 'null', 'true', 'false', 'collate',
  'numeric', 'decimal', 'varchar', 'character', 'char', 'bit', 'float', 'real', 'double',
  'int', 'integer', 'bigint', 'smallint', 'timestamp', 'timestamptz', 'timetz', 'text',
  'money', 'bool', 'boolean',
]


const EMPACOTADORES_DE_LINHA: readonly string[] = [
  'json_agg', 'jsonb_agg', 'array_agg', 'string_agg', 'xmlagg',
  'to_json', 'to_jsonb', 'row_to_json', 'array_to_string', 'hstore',
  'json_build_object', 'json_build_array', 'jsonb_build_object', 'jsonb_build_array',
]

const NOMES_ACEITOS = new Set<string>([
  ...FUNCOES_PERMITIDAS, ...NAO_SAO_FUNCAO, ...EMPACOTADORES_DE_LINHA,
])


const RE_CHAMADA = /(?:\b(as)\s+)?([A-Za-z_\u0080-\uffff][A-Za-z0-9_$\u0080-\uffff]*)\s*\(/gi


const RE_LE_O_PROPRIO_BANCO = /\b(pg_catalog\s*\.|pg_stat|pg_settings\b|current_setting\s*\()/i


const RE_ESTRUTURA_DO_BANCO = /\binformation_schema\s*\./i


function primeiroNomeNaoAceito(texto: string): string | null {
  RE_CHAMADA.lastIndex = 0
  for (let m = RE_CHAMADA.exec(texto); m; m = RE_CHAMADA.exec(texto)) {
    if (m[1]) continue                                   
    const nome = m[2].toLowerCase()
    if (!NOMES_ACEITOS.has(nome)) return nome
  }
  return null
}


export function motivoDoSqlInseguro(sql: string, opts?: { leSchemaDoBanco?: boolean }): string | null {
  const forma = formaDeLeitura(sql)
  if (forma.motivo === 'dolar') return RECUSA_SQL_COM_DOLAR
  if (forma.motivo !== null) return RECUSA_NAO_E_LEITURA
  const limpo = forma.limpo
  
  
  
  
  
  
  
  
  
  
  
  const semNadaDeTexto = semLiteraisDeTexto(limpo).replace(/"([^"]*)"/g, '$1')
  if (RE_LE_O_PROPRIO_BANCO.test(semNadaDeTexto)) return RECUSA_LE_O_PROPRIO_BANCO
  if (!opts?.leSchemaDoBanco && RE_ESTRUTURA_DO_BANCO.test(semNadaDeTexto)) return RECUSA_LE_O_PROPRIO_BANCO
  if (primeiroNomeNaoAceito(semNadaDeTexto)) return RECUSA_FUNCAO_NAO_PERMITIDA
  return null
}


export function ehSelectSeguro(sql: string): boolean {
  return motivoDoSqlInseguro(sql) === null
}


export const MAX_BYTES_DO_RESULTADO = 4_000_000


function envelopeDoLimite(corpo: string, maxLinhas: number): string {
  
  
  
  
  const semTerminadorFinal = corpo.trim().replace(/;\s*$/, '')
  return `select * from (${semTerminadorFinal}) as _lim limit ${Math.trunc(maxLinhas) + 1}`
}

export async function executarConsulta(
  cliente: ClienteBanco,
  sql: string,
  opts: OpcoesConsulta,
): Promise<Agregado> {
  const motivo = motivoDoSqlInseguro(sql, { leSchemaDoBanco: opts.leSchemaDoBanco })
  if (motivo) {
    throw new Error(`Consulta recusada: a fonte é somente-leitura e aceita apenas uma leitura por vez. ${motivo}`)
  }
  await cliente.connect()
  try {
    await cliente.query('begin transaction read only')
    await cliente.query(`set local statement_timeout = ${Math.trunc(opts.timeoutMs)}`)
    const res = await cliente.query(envelopeDoLimite(sql, opts.maxLinhas))
    await cliente.query('commit')
    const colunas = res.fields.map((f) => f.name)
    
    
    
    
    
    let bytes = 0
    const todasAsLinhas: Registro[] = []
    for (const r of res.rows) {
      const out: Registro = {}
      for (const c of colunas) {
        const v = r[c]
        const valor = v === null || v === undefined ? null : typeof v === 'number' ? v : String(v)
        
        bytes += typeof valor === 'string' ? Buffer.byteLength(valor) : 8
        out[c] = valor
      }
      todasAsLinhas.push(out)
      
      
      
      
      if (bytes > MAX_BYTES_DO_RESULTADO) throw new RecusaDoNucleo(RECUSA_RESULTADO_GRANDE_DEMAIS)
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    const cortado = todasAsLinhas.length > opts.maxLinhas
    if (cortado) console.warn('[fontes]', AVISO_CONSULTA_CORTADA)
    const linhas = todasAsLinhas.slice(0, opts.maxLinhas)
    return cortado ? { colunas, linhas, cortado: true } : { colunas, linhas }
  } finally {
    await cliente.end()
  }
}


export function linhaDeSchema(l: Registro): string {
  return `${campoSeguro(l['table_name'])}.${campoSeguro(l['column_name'])} ${campoSeguro(l['data_type'])}`
}


async function descrever(credencial: string): Promise<string> {
  const sql = `select table_name, column_name, data_type
               from information_schema.columns
               where table_schema = 'public'
               order by table_name, ordinal_position`
  const a = await executarConsulta(criarCliente(credencial), sql, {
    maxLinhas: 2000, timeoutMs: TIMEOUT_MS_DEFAULT, leSchemaDoBanco: true,
  })
  return a.linhas.map(linhaDeSchema).join('\n')
}

async function obter(credencial: string, corpoDaConsulta: string): Promise<Agregado> {
  return executarConsulta(criarCliente(credencial), corpoDaConsulta, {
    maxLinhas: MAX_LINHAS_DEFAULT, timeoutMs: TIMEOUT_MS_DEFAULT,
  })
}

export const adaptadorBanco: Adaptador = {
  tipo: 'banco',
  suportaAgregacao: true,
  descrever,
  obter,
}
