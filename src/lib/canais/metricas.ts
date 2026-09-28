





export interface AmostraConversa {
  criadaEm: string
  
  primeiraRespostaEm: string | null
  escalou: boolean
  fechouEm: string | null
  
  recontatoEm: string | null
  bolhas: number
  turnos: number
}

export interface MetricasAtendimento {
  conversas: number
  medianaPrimeiraRespostaMs: number | null
  p90PrimeiraRespostaMs: number | null
  
  taxaEscalacao: number
  
  taxaRecontato48h: number
  bolhasPorTurno: number
}

export const JANELA_RECONTATO_MS = 48 * 60 * 60 * 1000

const ms = (iso: string | null): number | null => {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}


export function percentil(ordenados: number[], p: number): number | null {
  if (ordenados.length === 0) return null
  const rank = Math.ceil((p / 100) * ordenados.length)
  return ordenados[Math.min(ordenados.length - 1, Math.max(0, rank - 1))]
}


const r2 = (n: number): number => (Number.isFinite(n) ? Math.round(n * 100) / 100 + 0 : 0)

export function apurarMetricas(amostras: AmostraConversa[]): MetricasAtendimento {
  const vazio: MetricasAtendimento = {
    conversas: 0, medianaPrimeiraRespostaMs: null, p90PrimeiraRespostaMs: null,
    taxaEscalacao: 0, taxaRecontato48h: 0, bolhasPorTurno: 0,
  }
  if (amostras.length === 0) return vazio

  
  
  const esperas: number[] = []
  let escalaram = 0
  let fechadas = 0
  let recontatos = 0
  let bolhas = 0
  let turnos = 0

  for (const a of amostras) {
    const criada = ms(a.criadaEm)
    const resposta = ms(a.primeiraRespostaEm)
    if (criada !== null && resposta !== null && resposta >= criada) esperas.push(resposta - criada)
    if (a.escalou) escalaram++
    const fechou = ms(a.fechouEm)
    if (fechou !== null) {
      fechadas++
      const voltou = ms(a.recontatoEm)
      if (voltou !== null && voltou >= fechou && voltou - fechou <= JANELA_RECONTATO_MS) recontatos++
    }
    bolhas += Number.isFinite(a.bolhas) ? Math.max(0, a.bolhas) : 0
    turnos += Number.isFinite(a.turnos) ? Math.max(0, a.turnos) : 0
  }

  esperas.sort((x, y) => x - y)
  return {
    conversas: amostras.length,
    medianaPrimeiraRespostaMs: percentil(esperas, 50),
    p90PrimeiraRespostaMs: percentil(esperas, 90),
    taxaEscalacao: r2(escalaram / amostras.length),
    
    
    taxaRecontato48h: fechadas > 0 ? r2(recontatos / fechadas) : 0,
    bolhasPorTurno: turnos > 0 ? r2(bolhas / turnos) : 0,
  }
}


export function duracaoLegivel(msTotal: number | null): string {
  if (msTotal === null || !Number.isFinite(msTotal) || msTotal < 0) return '—'
  const seg = Math.round(msTotal / 1000)
  if (seg < 60) return `${seg}s`
  const min = Math.floor(seg / 60)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const resto = min % 60
  return resto === 0 ? `${h}h` : `${h}h${String(resto).padStart(2, '0')}`
}


export function percentualLegivel(fracao: number): string {
  const n = Number.isFinite(fracao) ? Math.max(0, Math.min(1, fracao)) : 0
  return `${Math.round(n * 100)}%`
}
