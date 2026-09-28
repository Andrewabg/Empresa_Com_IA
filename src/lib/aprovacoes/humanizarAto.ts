


import { formatarDataPtBr } from './dataPtBr'
import { rotuloCta } from '@/lib/trafego/lancamentoCriativo'

export interface CampoHumano {
  label: string
  valor: string
}
export interface AtoHumanizado {
  principais: CampoHumano[]
  detalhes: CampoHumano[]
}


const LABELS: Record<string, string> = {
  summary: 'Título', title: 'Título', name: 'Título',
  subject: 'Assunto',
  start_datetime: 'Início', start: 'Início', start_time: 'Início',
  end_datetime: 'Fim', end: 'Fim', end_time: 'Fim',
  due_date: 'Prazo', due: 'Prazo',
  attendees: 'Convidados', guests: 'Convidados',
  to: 'Para', recipient: 'Para', recipients: 'Para',
  cc: 'Cc',
  body: 'Mensagem', message: 'Mensagem', text: 'Mensagem', content: 'Mensagem',
  description: 'Descrição',
  location: 'Local',
  calendar_id: 'Agenda',
  timezone: 'Fuso',
  create_meeting_room: 'Sala do Meet',
  event_duration_hour: 'Duração (h)', event_duration_minutes: 'Duração (min)',
  url: 'Link', link: 'Link',
  phone: 'Telefone', phone_number: 'Telefone',
}



const DENYLIST = new Set([
  'eventtype', 'visibility', 'transparency', 'send_updates', 'exclude_organizer', 'timezone',
  'guests_can_modify', 'guests_can_invite_others', 'guests_can_see_other_guests',
])


const DEFAULTISH = new Set(['default', 'primary', 'none', 'opaque', 'all'])


const PRIORIDADE = [
  'title', 'summary', 'name', 'subject',
  'start', 'start_datetime', 'start_time', 'end', 'end_datetime', 'end_time', 'due', 'due_date',
  'to', 'recipient', 'recipients', 'attendees', 'guests', 'cc',
  'location',
  'body', 'message', 'text', 'content', 'description',
]

function rotulo(key: string): string {
  const l = LABELS[key.toLowerCase()]
  if (l) return l
  const s = key.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'sim' : 'não'
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return v.map(formatarValor).filter(Boolean).join(', ')
  if (typeof v === 'string') return formatarDataPtBr(v) ?? v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function ehRuido(key: string, v: unknown): boolean {
  if (DENYLIST.has(key.toLowerCase())) return true
  if (v === '' || v === null || v === undefined || v === false || v === 0) return true
  if (typeof v === 'string' && DEFAULTISH.has(v.toLowerCase())) return true
  return false
}

function rank(key: string): number {
  const i = PRIORIDADE.indexOf(key.toLowerCase())
  return i === -1 ? PRIORIDADE.length : i
}

function humanizarLancamentoCriativo(args: Record<string, unknown>): AtoHumanizado {
  const s = (key: string) => {
    const v = args[key]
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }
  const name = s('name')
  const message = s('message')
  const cta = s('cta')
  const link = s('link')
  const conjuntoNome = s('conjuntoNome')
  const adsetId = s('adsetId')
  const paginaNome = s('paginaNome')
  const pageId = s('pageId')
  const arteNome = s('arteNome')
  const artifactId = s('artifactId')
  const headline = s('headline')
  const accountId = s('accountId')

  const principais: CampoHumano[] = []
  const push = (label: string, valor: string | undefined) => {
    if (valor) principais.push({ label, valor })
  }
  push('Título', name)
  push('Mensagem', message)
  if (cta) principais.push({ label: 'Botão', valor: rotuloCta(cta) })
  push('Link', link)
  push('Conjunto', conjuntoNome ?? adsetId)
  push('Página', paginaNome ?? pageId)
  push('Arte', arteNome ?? artifactId)
  push('Headline', headline)

  const ctx = (args.contexto && typeof args.contexto === 'object' && !Array.isArray(args.contexto))
    ? (args.contexto as Record<string, unknown>)
    : null
  const cs = (key: string) => {
    const v = ctx?.[key]
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }

  push('Objetivo', cs('objetivo'))
  push('Posicionamento', cs('posicionamento'))
  push('Orçamento', cs('orcamento'))
  push('Público', cs('publico'))
  push('Advantage+', cs('advantage'))
  push('Otimização', cs('otimizacao'))

  const detalhes: CampoHumano[] = []
  const pushDet = (label: string, valor: string | undefined) => {
    if (valor) detalhes.push({ label, valor })
  }
  pushDet('Conta', accountId)
  pushDet('ID do conjunto', adsetId)
  pushDet('ID da Página', pageId)
  pushDet('ID da arte', artifactId)

  const detalhados = Array.isArray(ctx?.publicoDetalhado)
    ? (ctx!.publicoDetalhado as unknown[]).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : []
  for (const d of detalhados) detalhes.push({ label: 'Público', valor: d })

  return { principais, detalhes }
}


function humanizarDuplicarConjunto(args: Record<string, unknown>): AtoHumanizado {
  const s = (key: string) => {
    const v = args[key]
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }
  const conjuntoNome = s('conjuntoNome')
  const adsetId = s('adsetId')
  const antesPt = s('antesPt')
  const depoisPt = s('depoisPt')

  const principais: CampoHumano[] = []
  const push = (label: string, valor: string | undefined) => {
    if (valor) principais.push({ label, valor })
  }
  principais.push({ label: 'Ação', valor: 'Duplicar conjunto corrigido' })
  push('Conjunto', conjuntoNome ?? adsetId)
  if (antesPt && depoisPt) principais.push({ label: 'Correção', valor: `${antesPt} → ${depoisPt}` })
  principais.push({ label: 'Original', valor: 'fica intacto' })
  principais.push({ label: 'Cópia', valor: 'sobe pausada' })

  const detalhes: CampoHumano[] = []
  const pushDet = (label: string, valor: string | undefined) => {
    if (valor) detalhes.push({ label, valor })
  }
  pushDet('ID do conjunto', adsetId)

  const c = (args.correcao && typeof args.correcao === 'object' && !Array.isArray(args.correcao))
    ? (args.correcao as Record<string, unknown>)
    : null
  const po = (c?.promoted_object && typeof c.promoted_object === 'object' && !Array.isArray(c.promoted_object))
    ? (c.promoted_object as Record<string, unknown>)
    : null
  const cs = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
  pushDet('Otimização nova', cs(c?.optimization_goal))
  pushDet('Evento', cs(po?.custom_event_type))
  pushDet('Pixel', cs(po?.pixel_id))

  return { principais, detalhes }
}

export function humanizarAto(slug: string | null, args: Record<string, unknown> | null): AtoHumanizado {
  const detalhes: CampoHumano[] = []
  if (!args || typeof args !== 'object') return { principais: [], detalhes }

  if (slug === 'AWAVE_META_LAUNCH_CREATIVE') {
    return humanizarLancamentoCriativo(args)
  }

  if (slug === 'AWAVE_META_DUPLICATE_ADSET') {
    return humanizarDuplicarConjunto(args)
  }

  
  
  const brutos: { key: string; campo: CampoHumano; i: number }[] = []
  Object.entries(args).forEach(([key, v], i) => {
    const campo: CampoHumano = { label: rotulo(key), valor: formatarValor(v) }
    if (ehRuido(key, v)) detalhes.push(campo)
    else brutos.push({ key, campo, i })
  })

  const principais = brutos
    .sort((a, b) => rank(a.key) - rank(b.key) || a.i - b.i)
    .map((x) => x.campo)

  return { principais, detalhes }
}
