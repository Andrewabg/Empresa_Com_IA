









import { pecaDoArtifact as pecaDoArtifactImpl, setPecaNoAr as setPecaNoArImpl } from '@/data/pecas'

export interface VincularLancamentoDeps {
  pecaDoArtifact?: (artifactId: string) => Promise<{ id: string; operator_id: string } | null>
  setPecaNoAr?: typeof setPecaNoArImpl
}

export interface VincularLancamentoResult {
  
  vinculou: boolean
  pecaId?: string
}


export async function vincularLancamentoAPeca(
  input: { artifactId?: string | null; adId?: string | null },
  deps: VincularLancamentoDeps = {},
): Promise<VincularLancamentoResult> {
  const artifactId = (input.artifactId ?? '').trim()
  const adId = (input.adId ?? '').trim()
  if (!artifactId || !adId) return { vinculou: false }

  const achar = deps.pecaDoArtifact ?? pecaDoArtifactImpl
  const setNoAr = deps.setPecaNoAr ?? setPecaNoArImpl
  try {
    const peca = await achar(artifactId)
    if (!peca) return { vinculou: false }
    
    
    await setNoAr(peca.id, peca.operator_id, adId, null)
    return { vinculou: true, pecaId: peca.id }
  } catch (e) {
    console.warn('[vincularLancamentoAPeca] fail-open (o anúncio JÁ subiu):', e)
    return { vinculou: false }
  }
}
