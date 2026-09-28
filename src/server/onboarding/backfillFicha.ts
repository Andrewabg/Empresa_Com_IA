
import { serverDb } from '@/server/supabase'
import { getSettings as getSettingsImpl, setSetting as setSettingImpl } from '@/data/settings'
import { upsertFatoEmpresa, FICHA_SETTING_KEY } from '@/data/fichaEmpresa'
import { parseFatos, slugFato, type FatoEmpresa } from '@/lib/memory/fichaEmpresa'
import { fatoDoTopico } from '@/lib/onboarding/fatoDoTopico'
import { fatosDeIdentidade } from '@/lib/onboarding/fatosIdentidade'
import { primeiraFraseUtil } from '@/lib/onboarding/primeiraFrase'
import { TOPICS, topicTag } from '@/server/interview/topics'
import { motivoSeguro } from '@/lib/sanitizarErro'
import type { UpsertFato } from './gravarNaFicha'
import type { Slot, SlotStatus } from '@/lib/onboarding/types'


export const FICHA_BACKFILL_KEY = 'ficha_backfill_at'


const CHAVES_IDENTIDADE = ['company_name', 'operator_name', 'mission', 'voice_tone'] as const


const TAGS_TOPICOS = TOPICS.map((t) => topicTag(t.id))


const PREFIXO_TOPICO = topicTag('')


export interface NotaDeTopico {
  id: string
  tags: string[]
  
  updated: string
  
  corpo: string
}


export interface SessaoDeOnboarding {
  operatorId: string
  slots: Slot[]
  at: string
}


const STATUS_PROJETAVEIS: ReadonlySet<SlotStatus> = new Set<SlotStatus>(['coberto', 'pendente_commit'])

export type BackfillFichaResult =
  | { status: 'noop' }                                              
  | { status: 'ok'; inseridos: number; pulados: number; falhas: number }
  | { status: 'failed'; error: string }                             

export interface BackfillFichaDeps {
  getSettings?: (keys: string[]) => Promise<Map<string, string | null>>
  setSetting?: (key: string, value: string) => Promise<void>
  listarNotas?: (tags: string[]) => Promise<NotaDeTopico[]>
  listarSessoes?: () => Promise<SessaoDeOnboarding[]>
  upsert?: UpsertFato
  
  now?: () => string
}


async function listarNotasPadrao(tags: string[]): Promise<NotaDeTopico[]> {
  const { data, error } = await serverDb()
    .from('notes')
    .select('id, tags, updated, note_chunks(content, chunk_index)')
    .overlaps('tags', tags)
  if (error) throw new Error(`backfillFicha notas: ${error.message}`)
  type Row = { id: string; tags: string[] | null; updated: string | null; note_chunks?: { content: string; chunk_index: number }[] }
  return ((data as Row[]) ?? []).map((n) => ({
    id: n.id,
    tags: n.tags ?? [],
    updated: n.updated ?? '',
    
    
    corpo: [...(n.note_chunks ?? [])].sort((a, b) => a.chunk_index - b.chunk_index)[0]?.content ?? '',
  }))
}


async function listarSessoesPadrao(): Promise<SessaoDeOnboarding[]> {
  const { data, error } = await serverDb()
    .from('onboarding_session')
    .select('operator_id, slots, updated_at, created_at')
  if (error) throw new Error(`backfillFicha sessões: ${error.message}`)
  type Row = { operator_id: string; slots: Slot[] | null; updated_at: string | null; created_at: string | null }
  return ((data as Row[]) ?? []).map((s) => ({
    operatorId: s.operator_id,
    slots: s.slots ?? [],
    at: s.updated_at ?? s.created_at ?? '',
  }))
}


function fatoDaNota(tags: string[]) {
  const ids = tags
    .filter((t) => t.startsWith(PREFIXO_TOPICO))
    .map((t) => t.slice(PREFIXO_TOPICO.length))
    .sort()
  for (const id of ids) {
    const mapeado = fatoDoTopico(id)
    if (mapeado) return mapeado
  }
  return null
}


export async function backfillFicha(deps: BackfillFichaDeps = {}): Promise<BackfillFichaResult> {
  const getSettings = deps.getSettings ?? getSettingsImpl
  const setSetting = deps.setSetting ?? setSettingImpl
  const listarNotas = deps.listarNotas ?? listarNotasPadrao
  const listarSessoes = deps.listarSessoes ?? listarSessoesPadrao
  const upsert = deps.upsert ?? upsertFatoEmpresa
  const now = deps.now ?? (() => new Date().toISOString())

  
  
  let settings: Map<string, string | null>
  try {
    settings = await getSettings([FICHA_BACKFILL_KEY, FICHA_SETTING_KEY, ...CHAVES_IDENTIDADE])
  } catch (err) {
    return { status: 'failed', error: motivoSeguro(err) }
  }
  if (settings.get(FICHA_BACKFILL_KEY)) return { status: 'noop' }

  
  
  
  const jaExiste = new Set(parseFatos(settings.get(FICHA_SETTING_KEY)).map((f) => f.id))

  let inseridos = 0
  let pulados = 0
  let falhas = 0

  
  
  let notas: NotaDeTopico[] = []
  try {
    notas = await listarNotas(TAGS_TOPICOS)
  } catch (err) {
    falhas++
    console.warn('[backfillFicha] não deu pra listar as notas:', motivoSeguro(err))
  }

  const gravar = async (fato: FatoEmpresa): Promise<void> => {
    if (!fato.id || jaExiste.has(fato.id)) {
      pulados++
      return
    }
    try {
      await upsert(fato)
      jaExiste.add(fato.id)
      inseridos++
    } catch (err) {
      falhas++
      console.warn(`[backfillFicha] fato '${fato.id}' não entrou na Ficha:`, motivoSeguro(err))
    }
  }

  for (const nota of notas) {
    try {
      const mapeado = fatoDaNota(nota.tags ?? [])
      
      
      if (!mapeado) {
        pulados++
        continue
      }
      const valor = primeiraFraseUtil(nota.corpo)
      if (!valor) {
        pulados++
        continue
      }
      await gravar({
        id: slugFato(mapeado.rotulo),
        rotulo: mapeado.rotulo,
        valor,
        categoria: mapeado.categoria,
        fonte: 'operador',
        
        
        
        at: nota.updated || now(),
      })
    } catch (err) {
      falhas++
      console.warn(`[backfillFicha] nota '${nota.id}' não pôde ser projetada:`, motivoSeguro(err))
    }
  }

  
  
  
  
  
  
  const identidade = {
    companyName: settings.get('company_name') ?? undefined,
    operatorName: settings.get('operator_name') ?? undefined,
    mission: settings.get('mission') ?? undefined,
    voiceTone: settings.get('voice_tone') ?? undefined,
  }
  for (const fato of fatosDeIdentidade(identidade, now())) await gravar(fato)

  
  
  
  
  
  
  
  
  
  
  let sessoes: SessaoDeOnboarding[] = []
  try {
    sessoes = await listarSessoes()
  } catch (err) {
    falhas++
    console.warn('[backfillFicha] não deu pra listar as sessões de onboarding:', motivoSeguro(err))
  }

  
  
  
  const sessoesOrdenadas = [...sessoes].sort(
    (a, b) => (a.at === b.at ? a.operatorId.localeCompare(b.operatorId) : a.at > b.at ? -1 : 1),
  )

  for (const sessao of sessoesOrdenadas) {
    for (const slot of sessao.slots ?? []) {
      try {
        if (!STATUS_PROJETAVEIS.has(slot.status)) {
          pulados++
          continue
        }
        const mapeado = fatoDoTopico(slot.id)
        const valor = (slot.valor ?? '').trim()
        if (!mapeado || !valor) {
          pulados++
          continue
        }
        await gravar({
          id: slugFato(mapeado.rotulo),
          rotulo: mapeado.rotulo,
          valor,
          categoria: mapeado.categoria,
          fonte: 'operador',
          at: sessao.at || now(),
        })
      } catch (err) {
        falhas++
        console.warn(`[backfillFicha] slot '${slot?.id}' da sessão '${sessao.operatorId}' não pôde ser projetado:`, motivoSeguro(err))
      }
    }
  }

  if (falhas === 0) {
    try {
      await setSetting(FICHA_BACKFILL_KEY, now())
    } catch (err) {
      
      console.warn('[backfillFicha] marcador não gravou (a passada seguinte é no-op):', motivoSeguro(err))
    }
  }

  return { status: 'ok', inseridos, pulados, falhas }
}
