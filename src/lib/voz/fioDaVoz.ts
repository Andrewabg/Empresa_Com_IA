

export type LadoDaFala = 'usuario' | 'assistente'


export interface FalaDoFio {
  lado: LadoDaFala
  texto: string
  
  ordem: number
}


interface VagaAberta {
  lado: LadoDaFala
  
  id: string
  ordem: number
}

export interface FioDaVoz {
  abertas: VagaAberta[]
}

export const FIO_VAZIO: FioDaVoz = { abertas: [] }

export type EventoDoFio =
  
  | { tipo: 'abriu'; lado: LadoDaFala; id: string; ordem: number }
  
  | { tipo: 'transcreveu'; lado: LadoDaFala; id: string; texto: string; ordemReserva: number }
  
  | { tipo: 'abandonou'; lado: LadoDaFala; id: string }

export interface PassoDoFio {
  estado: FioDaVoz
  emitir: FalaDoFio[]
}

const mesmaVaga = (v: VagaAberta, lado: LadoDaFala, id: string) => v.lado === lado && v.id === id

export function avancarFio(estado: FioDaVoz, ev: EventoDoFio): PassoDoFio {
  switch (ev.tipo) {
    case 'abriu': {
      
      
      if (estado.abertas.some((v) => mesmaVaga(v, ev.lado, ev.id))) {
        return { estado, emitir: [] }
      }
      return {
        estado: { abertas: [...estado.abertas, { lado: ev.lado, id: ev.id, ordem: ev.ordem }] },
        emitir: [],
      }
    }

    case 'transcreveu': {
      const i = estado.abertas.findIndex((v) => mesmaVaga(v, ev.lado, ev.id))
      
      
      const ordem = i === -1 ? ev.ordemReserva : estado.abertas[i].ordem
      const abertas = i === -1 ? estado.abertas : estado.abertas.filter((_, k) => k !== i)
      const texto = ev.texto.trim()
      return { estado: { abertas }, emitir: texto ? [{ lado: ev.lado, texto, ordem }] : [] }
    }

    case 'abandonou': {
      const i = estado.abertas.findIndex((v) => mesmaVaga(v, ev.lado, ev.id))
      if (i === -1) return { estado, emitir: [] }
      return { estado: { abertas: estado.abertas.filter((_, k) => k !== i) }, emitir: [] }
    }

    default:
      return { estado, emitir: [] }
  }
}
