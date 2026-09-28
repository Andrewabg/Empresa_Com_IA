








export type MotivoDaRecusaDoNucleo = 'dado_pessoal' | 'configuracao'


export class RecusaDoNucleo extends Error {
  readonly motivo: MotivoDaRecusaDoNucleo

  constructor(message: string, motivo: MotivoDaRecusaDoNucleo = 'configuracao') {
    super(message)
    this.name = 'RecusaDoNucleo'
    this.motivo = motivo
  }
}
