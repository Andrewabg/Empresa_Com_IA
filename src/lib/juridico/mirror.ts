
import type { ContratoView } from '@/lib/juridico/types'


export function slugContrato(titulo: string, id: string): string {
  
  
  const s = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
  return s ? `${s}-${id.slice(0, 8)}` : id
}

export function renderContratoMirror(c: ContratoView): string {
  const L: string[] = [`# ${c.titulo}`, '', `Tipo: ${c.tipo} · Status: ${c.status} · Versão: ${c.versaoAtual}`]
  if (c.partes.length) L.push(`Partes: ${c.partes.map((p) => `${p.papel} ${p.nome}`).join(' × ')}`)
  L.push('', c.texto)
  return L.join('\n').trim() + '\n'
}

export function renderModeloMirror(c: ContratoView): string {
  const L: string[] = [`# Modelo da casa — ${c.titulo}`, '', `Tipo: ${c.tipo}`, '', c.texto]
  return L.join('\n').trim() + '\n'
}
