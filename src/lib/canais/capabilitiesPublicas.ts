





export function janela24hDoProvider(provider: string): boolean {
  return JANELA_24H_POR_PROVIDER[provider] ?? true
}

export const JANELA_24H_POR_PROVIDER: Record<string, boolean> = {
  whatsapp_cloud: true,
  uazapi: false,
}
