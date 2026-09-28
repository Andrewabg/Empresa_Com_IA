

import { encurtarTitulo } from '@/lib/encurtarTitulo'
import { semMarcacao } from '@/lib/semMarcacao'


export const ULTIMO_DA_SERIE = 'Esse foi o último desta série, como você combinou.'


export const TETO_POR_MENSAGEM = 220

export const TETO_TOTAL = 700

export interface MensagemDoContexto { papel: string; texto: string }

function nome(papel: string): string {
  return papel === 'user' ? 'Você' : 'Eu'
}


export function recortarContexto(
  mensagens: MensagemDoContexto[],
  opts?: { porMensagem?: number; total?: number },
): string {
  const porMensagem = opts?.porMensagem ?? TETO_POR_MENSAGEM
  const total = opts?.total ?? TETO_TOTAL
  const linhas: string[] = []
  let acumulado = 0
  for (let i = mensagens.length - 1; i >= 0; i--) {
    const m = mensagens[i]
    
    
    const texto = semMarcacao(m.texto ?? '').replace(/\s+/g, ' ').trim()
    if (!texto) continue
    
    const linha = `${nome(m.papel)}: ${encurtarTitulo(texto, porMensagem)}`
    const custo = linha.length + 1
    if (acumulado + custo > total) break
    linhas.unshift(linha)
    acumulado += custo
  }
  return linhas.join('\n')
}


export function corpoDoLembrete(i: {
  texto: string
  dueAtIso: string
  tz: string
  contexto?: string | null
  
  ultimoDaSerie?: boolean
}): { titulo: string; corpo: string } {
  const quando = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: i.tz, hour12: false,
  }).format(new Date(i.dueAtIso))
  const contexto = (i.contexto ?? '').trim()
  const base = contexto ? `${i.texto}\n\nNa conversa em que você pediu:\n${contexto}` : i.texto
  return {
    titulo: `Lembrete de ${quando}`,
    corpo: i.ultimoDaSerie ? `${base}\n\n${ULTIMO_DA_SERIE}` : base,
  }
}
