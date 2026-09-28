
export function textoDaDelegacao(nomeDoAgente: string, comConversa: boolean): string {
  const onde = comConversa ? 'na conversa do painel e em Tarefas' : 'em Tarefas, no painel'
  return `Deleguei pro ${nomeDoAgente}. Quando ficar pronto, o resultado fica registrado ${onde}.`
}
