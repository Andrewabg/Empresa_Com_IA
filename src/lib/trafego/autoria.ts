










export const JANELA_AUTORIA_MIN = 90

export interface EscritaRecente {
  id: string
  tipo: string
  entityId: string
  
  minutosAtras: number
}

export interface AutoriaInput {
  quebrou: boolean
  escritas: EscritaRecente[]
}


export function atribuirQueda(input: AutoriaInput): EscritaRecente | null {
  if (!input.quebrou) return null
  const naJanela = input.escritas.filter((e) => e.minutosAtras <= JANELA_AUTORIA_MIN)
  if (naJanela.length === 0) return null
  return naJanela.reduce((maisNova, e) => (e.minutosAtras < maisNova.minutosAtras ? e : maisNova))
}


export function textoAutoria(e: EscritaRecente): string {
  const oQue = e.tipo === 'targeting' ? 'a segmentacao'
    : e.tipo === 'orcamento' ? 'o orcamento'
    : `o campo ${e.tipo}`
  return `Ha ${e.minutosAtras} minutos eu mudei ${oQue} de ${e.entityId}. `
    + `Pode ter sido isso: edicao significativa reseta a fase de aprendizado e o Meta freia a entrega de proposito. `
    + `Se quiser, da pra desfazer.`
}
