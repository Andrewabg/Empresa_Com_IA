











const ABRE_DOLLAR = /^\$([A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*)?\$/


export function semComentariosDeSql(sql: string): string {
  let saida = ''
  let i = 0
  const n = sql.length
  while (i < n) {
    const c = sql[i]

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    if (c === "'") {
      saida += c
      i++
      while (i < n) {
        const d = sql[i]
        saida += d
        i++
        if (d === '\\' && i < n) { saida += sql[i]; i++; continue }
        if (d === "'") {
          if (sql[i] === "'") { saida += "'"; i++; continue }
          break
        }
      }
      continue
    }

    
    
    if (c === '"') {
      saida += c
      i++
      while (i < n) {
        const d = sql[i]
        saida += d
        i++
        if (d === '"') {
          if (sql[i] === '"') { saida += '"'; i++; continue }
          break
        }
      }
      continue
    }

    
    if (c === '$') {
      const m = ABRE_DOLLAR.exec(sql.slice(i))
      if (m) {
        const tag = m[0]
        saida += tag
        i += tag.length
        const fim = sql.indexOf(tag, i)
        if (fim === -1) { saida += sql.slice(i); i = n } else { saida += sql.slice(i, fim) + tag; i = fim + tag.length }
        continue
      }
    }

    
    if (c === '-' && sql[i + 1] === '-') {
      let j = i + 2
      while (j < n && sql[j] !== '\n') j++
      saida += ' '
      i = j
      continue
    }

    
    
    
    
    
    if (c === '/' && sql[i + 1] === '*') {
      const fim = sql.indexOf('*/', i + 2)
      saida += ' '
      i = fim === -1 ? n : fim + 2
      continue
    }

    saida += c
    i++
  }
  return saida
}
