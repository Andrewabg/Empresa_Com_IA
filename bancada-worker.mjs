















import { parentPort, workerData } from 'node:worker_threads'
import initSqlJs from 'sql.js'

const TIPO_SQL = { inteiro: 'INTEGER', real: 'REAL', texto: 'TEXT' }
const IDENT = /^[a-z_][a-z0-9_]{0,63}$/
const TETO_CHARS_DA_CELULA = 2_000
const TETO_CHARS_DA_RESPOSTA = 64_000


function celulaSegura(v) {
  if (v instanceof Uint8Array) return `<blob ${v.length} bytes>`
  if (v instanceof ArrayBuffer) return `<blob ${v.byteLength} bytes>`
  if (typeof v === 'string' && v.length > TETO_CHARS_DA_CELULA) return `${v.slice(0, TETO_CHARS_DA_CELULA)}…`
  return v
}

function ident(nome) {
  if (typeof nome !== 'string' || !IDENT.test(nome)) throw new Error(`identificador invalido: ${String(nome).slice(0, 40)}`)
  return `"${nome}"`
}



const t0 = performance.now()
const SQL = await initSqlJs()
const db = new SQL.Database()
try {
  const heapPedido = Math.trunc(Number(workerData.heapBytes))
  const heap = heapPedido > 0 ? heapPedido : 128_000_000
  const tetoPedido = Math.trunc(Number(workerData.tetoLinhas))
  const teto = tetoPedido > 0 ? tetoPedido : 200
  db.run(`PRAGMA hard_heap_limit = ${heap}`)
  
  
  db.run('PRAGMA temp_store = 2')

  for (const t of workerData.tabelas ?? []) {
    const cols = t.colunas
      .map((c) => `${ident(c.nome)} ${Object.hasOwn(TIPO_SQL, c.tipo) ? TIPO_SQL[c.tipo] : 'TEXT'}`)
      .join(', ')
    db.run(`CREATE TABLE ${ident(t.nome)} (${cols})`)
    const ins = db.prepare(`INSERT INTO ${ident(t.nome)} VALUES (${t.colunas.map(() => '?').join(', ')})`)
    try { for (const linha of t.linhas) ins.run(linha) } finally { ins.free() }
  }

  db.run('PRAGMA query_only = 1')

  const st = db.prepare(String(workerData.sql))
  const linhas = []
  let cortou = false
  let charsUsados = 0
  try {
    while (st.step()) {
      if (linhas.length >= teto) { cortou = true; break }
      const linha = st.get().map(celulaSegura)
      const tamanho = JSON.stringify(linha).length
      if (charsUsados + tamanho > TETO_CHARS_DA_RESPOSTA) { cortou = true; break }
      linhas.push(linha)
      charsUsados += tamanho
    }
    const colunas = st.getColumnNames()
    parentPort.postMessage({ ok: true, colunas, linhas, cortou, ms: Math.round(performance.now() - t0) })
  } finally {
    st.free()
  }
} catch (e) {
  parentPort.postMessage({ ok: false, erro: e instanceof Error ? e.message : String(e) })
} finally {
  db.close()
}
