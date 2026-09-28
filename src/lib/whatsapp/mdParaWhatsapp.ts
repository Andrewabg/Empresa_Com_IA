













const NUL = '\x00'


function inline(l: string, guardar: (s: string) => string): string {
  return l
    
    .replace(/\*\*([^\n]+?)\*\*/g, (_m, t: string) => guardar(`*${t}*`))
    .replace(/__([^\n]+?)__/g, (_m, t: string) => guardar(`*${t}*`))
    
    .replace(/~~([^\n]+?)~~/g, (_m, t: string) => guardar(`~${t}~`))
    
    
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, txt: string, url: string) => guardar(`${txt} (${url})`))
    
    .replace(/(^|[\s(])\*([^*\s][^*\n]*?)\*(?=$|[\s).,;:!?…])/g, (_m, pre: string, t: string) => `${pre}${guardar(`_${t}_`)}`)
    .replace(/(^|[\s(])_([^_\s][^_\n]*?)_(?=$|[\s).,;:!?…])/g, (_m, pre: string, t: string) => `${pre}${guardar(`_${t}_`)}`)
}


export function mdParaWhatsapp(md: string): string {
  const guardados: string[] = []
  const guardar = (s: string): string => { guardados.push(s); return `${NUL}${guardados.length - 1}${NUL}` }
  
  let t = md.replace(/\x00/g, '')
  
  t = t.replace(/```[^\n`]*\n([\s\S]*?)```/g, (_m, code: string) => guardar('```' + code.replace(/\n$/, '') + '```'))
  t = t.replace(/```([^`\n]+)```/g, (_m, code: string) => guardar('```' + code + '```'))
  
  t = t.replace(/`([^`\n]+)`/g, (_m, code: string) => guardar('```' + code + '```'))
  
  const saida: string[] = []
  for (const linha of t.split('\n')) {
    let l = linha
    
    if (/^\s*\|.*\|\s*$/.test(l)) {
      if (/^\s*\|[\s\-:|]+\|\s*$/.test(l)) continue
      l = l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()).join(' — ')
    }
    
    const mTitulo = l.match(/^#{1,6}\s+(.*)$/)
    if (mTitulo) { saida.push(`*${inline(mTitulo[1], guardar)}*`); continue }
    
    l = l.replace(/^(\s*)>\s?/, '$1')
    
    l = l.replace(/^(\s*)[-*]\s+/, '$1• ')
    saida.push(inline(l, guardar))
  }
  
  return saida.join('\n').replace(/\x00(\d+)\x00/g, (_m, i: string) => guardados[Number(i)])
}
