










import type { EstadoConexao } from './errors'
import type { CredsGoogleAds } from './client'




export interface DepsEstado {
  creds: CredsGoogleAds | null
  client: {
    verificarAcesso(): Promise<EstadoConexao>
  }
}




export async function estadoDaConexao(deps: DepsEstado): Promise<EstadoConexao> {
  
  if (deps.creds === null) {
    return 'nao_conectado'
  }

  
  return deps.client.verificarAcesso()
}
