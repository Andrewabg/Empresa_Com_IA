














export function chaveDaConsulta(args: {
  paginas: number
  filtroCanal: string
  filtroStatus: string
  busca: string
}): string {
  return JSON.stringify([args.paginas, args.filtroCanal, args.filtroStatus, args.busca])
}
