
const EVENTO = 'awave:config-mudou'


export function avisarConfigMudou(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENTO))
}


export function escutarConfigMudou(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENTO, callback)
  return () => window.removeEventListener(EVENTO, callback)
}
