


function tabelaEmProsa(linha: string): string | null {
  const t = linha.trim()
  if (!t.startsWith('|') || !t.endsWith('|') || t.length < 3) return null
  const celulas = t.slice(1, -1).split('|').map((c) => c.trim())
  
  if (celulas.every((c) => /^:?-{1,}:?$/.test(c))) return ''
  return celulas.filter(Boolean).join(' — ')
}


export function semMarcacao(texto: string): string {
  const linhas = texto.split(/\r?\n/)
  const saida: string[] = []
  for (const bruta of linhas) {
    const daTabela = tabelaEmProsa(bruta)
    if (daTabela !== null) {
      if (daTabela) saida.push(daTabela)
      continue
    }
    let l = bruta
    if (/^\s*```/.test(l)) continue          
    l = l.replace(/^\s{0,3}#{1,6}\s+/, '')   
    l = l.replace(/^\s*>\s?/, '')            
    l = l.replace(/^\s*[-*+]\s+/, '')        
    l = l.replace(/^\s*\d+[.)]\s+/, '')      
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(l)) continue 
    saida.push(l)
  }
  return saida
    .join('\n')
    .replace(/\*\*(.+?)\*\*/g, '$1')         
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*/g, '$1$2') 
    .replace(/`([^`]+)`/g, '$1')             
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') 
}
