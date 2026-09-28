


import { rotuloRecorrencia, type Recorrencia } from '@/lib/proativo/recorrencia'


export const COMANDOS_BOT = [
  { command: 'briefing', description: 'Resumo do dia agora' },
  { command: 'lembretes', description: 'Meus lembretes ativos' },
  { command: 'status', description: 'Saúde da empresa e pendências' },
  { command: 'ajuda', description: 'O que posso fazer' },
] as const

export interface LembreteAtivoLike {
  texto: string; due_at: string; recorrencia: string | null
  
  termina_em?: string | null
}


export function formatarLembretesLista(ativos: LembreteAtivoLike[], agoraIso: string, tz: string): string {
  if (ativos.length === 0) {
    return 'Nenhum lembrete ativo. É só me pedir em linguagem natural: me lembra amanhã às 9h de pagar o contador.'
  }
  const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: tz }) 
  const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: tz })
  const hoje = fmtDia.format(new Date(agoraIso))
  const amanha = fmtDia.format(new Date(Date.parse(agoraIso) + 86_400_000))
  const linhas = ativos.map((l, i) => {
    const d = new Date(l.due_at)
    const dia = fmtDia.format(d)
    const quando = dia === hoje ? `hoje ${fmtHora.format(d)}`
      : dia === amanha ? `amanhã ${fmtHora.format(d)}`
      : `${fmtData.format(d)} ${fmtHora.format(d)}`
    const rec = l.recorrencia as Recorrencia | null
    
    
    const [anoFim, mesFim, diaFim] = (l.termina_em ?? '').split('-')
    const ate = l.termina_em ? `, até ${diaFim}/${mesFim}/${anoFim}` : ''
    return `${i + 1}. ${quando}, ${l.texto}${rec ? ` (${rotuloRecorrencia(rec)}${ate})` : ''}`
  })
  return `⏰ Seus lembretes:\n${linhas.join('\n')}`
}

export interface StatusInput {
  pollLastSeen: string | null
  aprovacoesPendentes: number
  tarefasAndamento: number
  
  ultimoBriefing: string | null
  agoraIso: string
  tz: string
}


export function montarStatus(i: StatusInput): string {
  const visto = i.pollLastSeen
    ? ` (último ciclo ${new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: i.tz }).format(new Date(i.pollLastSeen))})`
    : ''
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: i.tz }).format(new Date(i.agoraIso))
  const briefing = !i.ultimoBriefing ? 'ainda não saiu'
    : i.ultimoBriefing === hoje ? 'hoje'
    : i.ultimoBriefing.split('-').slice(1).reverse().join('/') 
  return [
    '📟 **Status da empresa**',
    `• Canal: ativo${visto}`,
    `• Aprovações esperando você: ${i.aprovacoesPendentes}`,
    `• Tarefas em andamento: ${i.tarefasAndamento}`,
    `• Último briefing: ${briefing}`,
  ].join('\n')
}


export const MSG_AJUDA = [
  'Eu sou seu assistente no bolso. Fala comigo como você fala com gente.',
  '',
  '**O que entra:** texto, áudio (eu transcrevo) e foto (eu enxergo).',
  '**O que sai:** respostas em texto e imagens geradas. Quer ouvir a resposta em voz? É só me pedir que eu ligo.',
  '**Aprovações** chegam com botões de Aprovar/Rejeitar direto aqui.',
  '**Lembretes** em linguagem natural: me lembra amanhã às 9h de pagar o contador.',
  '',
  'Atalhos: /briefing (resumo do dia agora), /lembretes (ativos), /status (saúde da empresa).',
].join('\n')
