


export function podeDerrubarSessao(s: { fase: string; haFalaDevida: boolean }): boolean {
  return s.fase === 'idle' && !s.haFalaDevida
}
