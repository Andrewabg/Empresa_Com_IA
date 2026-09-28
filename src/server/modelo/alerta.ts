







import { getSetting, setSetting } from '@/data/settings'
import {
  classificarFalhaDoModelo, lerAlertaDoModelo,
  type AlertaDoModelo, type MotivoFalhaModelo,
} from '@/lib/modelo/falhaDoModelo'

export const CHAVE_ALERTA_MODELO = 'modelo_alerta'


export async function registrarFalhaDoModelo(
  motivo: MotivoFalhaModelo,
  agoraIso: string = new Date().toISOString(),
): Promise<void> {
  try {
    const atual = lerAlertaDoModelo(await getSetting(CHAVE_ALERTA_MODELO), agoraIso)
    if (atual?.motivo === motivo && Date.parse(agoraIso) - Date.parse(atual.em) < 30 * 60 * 1000) return
    await setSetting(CHAVE_ALERTA_MODELO, JSON.stringify({ motivo, em: agoraIso }))
  } catch (e) {
    console.warn('[modelo/alerta] registrar fail-open:', e)
  }
}


export async function limparAlertaDoModelo(agoraIso: string = new Date().toISOString()): Promise<void> {
  try {
    if (!lerAlertaDoModelo(await getSetting(CHAVE_ALERTA_MODELO), agoraIso)) return
    await setSetting(CHAVE_ALERTA_MODELO, '')
  } catch (e) {
    console.warn('[modelo/alerta] limpar fail-open:', e)
  }
}


export async function alertaDoModelo(agoraIso: string = new Date().toISOString()): Promise<AlertaDoModelo | null> {
  try {
    return lerAlertaDoModelo(await getSetting(CHAVE_ALERTA_MODELO), agoraIso)
  } catch (e) {
    console.warn('[modelo/alerta] leitura fail-open:', e)
    return null
  }
}


export function registrarSeAcionavel(erro: unknown): void {
  const motivo = classificarFalhaDoModelo(erro)
  if (motivo) void registrarFalhaDoModelo(motivo)
}
