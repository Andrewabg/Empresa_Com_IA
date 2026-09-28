





export interface LinhaMidia {
  midia: {
    kind: string; media_id?: string; storage_path?: string
    transcricao?: string; descricao?: string
    ingestao?: 'pendente' | 'ok' | 'falhou'
  } | null
  created_at: string
}


export const ESPERA_MIDIA_MS = 12_000

export const TETO_ESPERA_MIDIA_MS = 60_000

export const PASSO_ESPERA_MIDIA_MS = 3_000


function resolvida(m: NonNullable<LinhaMidia['midia']>): boolean {
  if (!m.media_id) return true                       
  if (m.transcricao || m.descricao) return true      
  return m.ingestao === 'ok' || m.ingestao === 'falhou'
}


export function adiarPorMidia(
  msgs: LinhaMidia[],
  agoraIso: string,
  cfg: { esperaMs?: number; tetoMs?: number; passoMs?: number } = {},
): number {
  const espera = cfg.esperaMs ?? ESPERA_MIDIA_MS
  const teto = cfg.tetoMs ?? TETO_ESPERA_MIDIA_MS
  const passo = cfg.passoMs ?? PASSO_ESPERA_MIDIA_MS
  const agora = Date.parse(agoraIso)
  if (!Number.isFinite(agora)) return 0

  let maior = 0
  for (const m of msgs) {
    if (!m.midia || resolvida(m.midia)) continue
    const nascida = Date.parse(m.created_at)
    if (!Number.isFinite(nascida)) continue          
    
    const idade = Math.max(0, agora - nascida)
    if (idade >= teto) continue                       
    const restante = Math.min(Math.max(espera - idade, passo), teto - idade)
    if (restante > maior) maior = restante
  }
  return maior > 0 ? maior : 0
}
