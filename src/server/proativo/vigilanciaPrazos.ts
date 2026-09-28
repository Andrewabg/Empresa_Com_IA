
import { notificar as notificarDefault, type NotificarInput } from './notificar'
import { classificarPrazo, alertavel, ordenarRadar } from '@/lib/juridico/prazosRadar'
import {
  avisoDePrazo, avisoDeVariosPrazos, chaveDedupPrazo, chaveDedupPrazoAgregado, TIPO_PRAZO,
} from '@/lib/proativo/prazoAviso'
import { temDestino } from '@/lib/proativo/destinoDoAviso'
import { getSetting } from '@/data/settings'
import { listPrazosAtivosParaVigilancia } from '@/data/prazos'
import { toPrazoView, type PrazoView } from '@/lib/juridico/prazosTipos'
import { validarTz, FUSO_SETTING_KEY, TZ_DEFAULT } from '@/lib/tempo/fusoDoDono'


export const LIMITE_AVISOS_INDIVIDUAIS = 3

export interface VigilanciaPrazosDeps {
  listarPrazos?: () => Promise<PrazoView[]>
  hojeISO?: () => string
  notificarFn?: (i: NotificarInput) => Promise<{ created: boolean }>
  temCanal?: () => Promise<boolean>
  
  now?: () => Date
  getFuso?: () => Promise<string>
}

export async function runVigilanciaPrazos(
  deps: VigilanciaPrazosDeps = {},
): Promise<{ alertados: number }> {
  const notificarFn = deps.notificarFn ?? notificarDefault
  const temCanal = deps.temCanal ?? (async () => temDestino(await getSetting('telegram_owner_chat')))
  const now = deps.now ?? (() => new Date())
  const getFuso = deps.getFuso ?? (async () => (await getSetting(FUSO_SETTING_KEY)) ?? TZ_DEFAULT)

  try {
    
    
    
    if (!(await temCanal())) return { alertados: 0 }

    
    
    
    const hoje = deps.hojeISO
      ? deps.hojeISO()
      : new Intl.DateTimeFormat('en-CA', { timeZone: validarTz(await getFuso()) }).format(now())

    
    
    const listar = deps.listarPrazos ?? (async () => (await listPrazosAtivosParaVigilancia()).map(toPrazoView))

    const prazos = await listar()
    const alertaveis = ordenarRadar(prazos.filter((p) => alertavel(p, hoje)), hoje)
    if (alertaveis.length === 0) return { alertados: 0 }

    if (alertaveis.length > LIMITE_AVISOS_INDIVIDUAIS) {
      try {
        const { titulo, corpo } = avisoDeVariosPrazos(alertaveis, hoje)
        
        
        const maiorDias = classificarPrazo(alertaveis[alertaveis.length - 1], hoje).diasRestantes
        const r = await notificarFn({
          tipo: TIPO_PRAZO, urgencia: 'imediata',
          titulo, corpo,
          payload: { prazo_ids: alertaveis.map((p) => p.id) },
          dedupKey: chaveDedupPrazoAgregado(hoje, maiorDias < 0),
        })
        return { alertados: r.created ? alertaveis.length : 0 }
      } catch (e) {
        console.warn('[vigilanciaPrazos] agregado fail-open:', e)
        return { alertados: 0 }
      }
    }

    let alertados = 0
    for (const p of alertaveis) {
      try {
        const { diasRestantes } = classificarPrazo(p, hoje)
        const { titulo, corpo } = avisoDePrazo(p, diasRestantes)
        const r = await notificarFn({
          tipo: TIPO_PRAZO, urgencia: 'imediata',
          titulo, corpo,
          payload: { prazo_id: p.id },
          dedupKey: chaveDedupPrazo(p.id, hoje, diasRestantes < 0),
        })
        if (r.created) alertados++
      } catch (e) { console.warn('[vigilanciaPrazos] prazo fail-open:', p.id, e) }
    }
    return { alertados }
  } catch (e) {
    console.warn('[vigilanciaPrazos] fail-open:', e)
    return { alertados: 0 }
  }
}
