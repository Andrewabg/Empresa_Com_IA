


export interface AgenteDesligavel {
  id: string
  name: string
  is_primary: boolean
  dismissed_at: string | null
}

export interface Veredito {
  ok: boolean
  
  motivo?: string
}


export function podeDesligar(a: AgenteDesligavel): Veredito {
  if (a.is_primary) {
    return { ok: false, motivo: 'O assistente principal não pode ser desligado — é ele que atende você. Para mudar quem ele é, edite o nome e a persona na ficha dele.' }
  }
  if (a.dismissed_at !== null) {
    return { ok: false, motivo: `${a.name} já está desligado.` }
  }
  return { ok: true }
}


export function podeReadmitir(a: AgenteDesligavel): Veredito {
  if (a.dismissed_at === null) {
    return { ok: false, motivo: `${a.name} já faz parte do time.` }
  }
  return { ok: true }
}


export function novoGerenteDosSubordinados(
  desligado: { manager_id: string | null },
  primarioId: string | null,
): string | null {
  return desligado.manager_id ?? primarioId
}
