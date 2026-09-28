


import { getTurnContext } from '@/server/agent/turnContext'
import { nomeDaTabela } from '@/lib/bancada/nomeDaTabela'
import { TETO_LINHAS_DA_BANCADA, type Bancada, type TabelaDaBancada } from '@/lib/bancada/tipos'

function nova(): Bancada {
  return { tabelas: new Map(), totalLinhas: 0, contador: 0, historicoCarregado: false }
}


export function obterBancada(): Bancada {
  const ctx = getTurnContext()
  if (!ctx.bancada) ctx.bancada = nova()
  return ctx.bancada
}


export function registrarTabela(
  b: Bancada,
  t: Omit<TabelaDaBancada, 'nome'>,
  base: string,
): { ok: true; nome: string } | { ok: false; motivo: 'cheia' } {
  if (b.totalLinhas + (b.reservado ?? 0) + t.linhas.length > TETO_LINHAS_DA_BANCADA) return { ok: false, motivo: 'cheia' }
  b.contador += 1
  const nome = nomeDaTabela(b.contador, base)
  b.tabelas.set(nome, { ...t, nome })
  b.totalLinhas += t.linhas.length
  return { ok: true, nome }
}


export function fixarTabela(b: Bancada, t: TabelaDaBancada): { ok: true } | { ok: false; motivo: 'cheia' } {
  const anterior = b.tabelas.get(t.nome)?.linhas.length ?? 0
  if (b.totalLinhas - anterior + (b.reservado ?? 0) + t.linhas.length > TETO_LINHAS_DA_BANCADA) return { ok: false, motivo: 'cheia' }
  b.tabelas.set(t.nome, t)
  b.totalLinhas += t.linhas.length - anterior
  return { ok: true }
}


export function reservarLinhas(b: Bancada, n: number): boolean {
  if (!Number.isInteger(n) || n <= 0) return false
  if (b.totalLinhas + (b.reservado ?? 0) + n > TETO_LINHAS_DA_BANCADA) return false
  b.reservado = (b.reservado ?? 0) + n
  return true
}


export function liberarReserva(b: Bancada, n: number): void {
  if (!Number.isFinite(n) || n <= 0) return
  b.reservado = Math.max(0, (b.reservado ?? 0) - n)
}
