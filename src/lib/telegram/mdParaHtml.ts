














export interface OpcoesDoConversor {
  
  linksClicaveis?: boolean
}

const NUL = '\x00'

function escapeHtml(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}


function inline(l: string, linksClicaveis: boolean): string {
  const comLinks = linksClicaveis
    
    
    ? l.replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, txt: string, url: string) => `<a href="${url.replace(/"/g, '&quot;')}">${txt}</a>`)
    
    
    : l
  return comLinks
    .replace(/\*\*([^\n]+?)\*\*/g, '<b>$1</b>')
    .replace(/__([^\n]+?)__/g, '<b>$1</b>')
    .replace(/~~([^\n]+?)~~/g, '<s>$1</s>')
    
    .replace(/(^|[\s(])\*([^*\s][^*\n]*?)\*(?=$|[\s).,;:!?…])/g, '$1<i>$2</i>')
    .replace(/(^|[\s(])_([^_\s][^_\n]*?)_(?=$|[\s).,;:!?…])/g, '$1<i>$2</i>')
}


export function mdParaHtmlTelegram(md: string, opts?: OpcoesDoConversor): string {
  const linksClicaveis = opts?.linksClicaveis === true
  const guardados: string[] = []
  const guardar = (html: string): string => { guardados.push(html); return `${NUL}${guardados.length - 1}${NUL}` }
  
  let t = md.replace(/\x00/g, '')
  
  t = t.replace(/```[^\n`]*\n([\s\S]*?)```/g, (_m, code: string) => guardar(`<pre>${escapeHtml(code.replace(/\n$/, ''))}</pre>`))
  t = t.replace(/```([^`\n]+)```/g, (_m, code: string) => guardar(`<pre>${escapeHtml(code)}</pre>`))
  
  t = escapeHtml(t)
  
  t = t.replace(/`([^`\n]+)`/g, (_m, code: string) => guardar(`<code>${code}</code>`))
  
  const saida: string[] = []
  let citacao: string[] = []
  const fecharCitacao = () => {
    if (citacao.length > 0) { saida.push(`<blockquote>${citacao.join('\n')}</blockquote>`); citacao = [] }
  }
  for (const linha of t.split('\n')) {
    const mCitacao = linha.match(/^&gt;\s?(.*)$/) 
    if (mCitacao) { citacao.push(inline(mCitacao[1], linksClicaveis)); continue }
    fecharCitacao()
    let l = linha
    
    if (/^\s*\|.*\|\s*$/.test(l)) {
      if (/^\s*\|[\s\-:|]+\|\s*$/.test(l)) continue
      l = l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()).join(' — ')
    }
    
    const mTitulo = l.match(/^#{1,6}\s+(.*)$/)
    if (mTitulo) { saida.push(`<b>${inline(mTitulo[1], linksClicaveis)}</b>`); continue }
    
    l = l.replace(/^(\s*)[-*]\s+/, '$1• ')
    saida.push(inline(l, linksClicaveis))
  }
  fecharCitacao()
  
  return saida.join('\n').replace(/\x00(\d+)\x00/g, (_m, i: string) => guardados[Number(i)])
}


export function htmlParaPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/<[^>]*$/, '') 
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&') 
}


export function mdParaTextoPuro(md: string): string {
  return htmlParaPlain(mdParaHtmlTelegram(md, { linksClicaveis: true }))
}
