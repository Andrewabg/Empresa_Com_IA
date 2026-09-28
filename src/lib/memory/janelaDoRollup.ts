


export const CHAVE_ULTIMO_ROLLUP_OK = 'rollup_ultimo_ok_at'


const TETO_DIAS_PADRAO = 7
const DIA_MS = 86_400_000


export function chaveDeClaimDoDia(dia: string): string {
  return `rollup_claim:${dia}`
}


export function janelaDoCore(
  ultimoOkIso: string | null,
  agoraIso: string,
  tetoDias: number = TETO_DIAS_PADRAO,
): string {
  const agora = Date.parse(agoraIso)
  const teto = new Date(agora - tetoDias * DIA_MS).toISOString()
  if (!ultimoOkIso) return teto
  const ultimo = Date.parse(ultimoOkIso)
  if (!Number.isFinite(ultimo) || ultimo > agora) return teto
  return ultimo < agora - tetoDias * DIA_MS ? teto : ultimoOkIso
}
