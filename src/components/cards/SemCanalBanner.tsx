import Link from 'next/link'
import {
  CONVITE_A_CONECTAR_TELEGRAM,
  tituloDaFilaPresa,
} from '@/lib/proativo/destinoDoAviso'
import {
  agruparAvisos,
  gruposParaOPainel,
  restantesNoPainel,
} from '@/lib/proativo/grupoDeAvisos'


export function SemCanalBanner({
  desdeIso,
  agoraIso,
  tipos = [],
  total,
}: {
  desdeIso: string
  agoraIso: string
  
  tipos?: readonly string[]
  
  total?: number
}) {
  const real = total ?? tipos.length
  const { mostrados, restantes } = gruposParaOPainel(agruparAvisos(tipos))
  const sobra = restantesNoPainel(restantes)
  return (
    <section role="alert" className="cc-avisos">
      <div className="cc-avisos__topo">
        <div className="cc-avisos__texto">
          <p className="cc-avisos__titulo">{tituloDaFilaPresa(real, desdeIso, agoraIso)}</p>
          <p className="cc-avisos__sub">{CONVITE_A_CONECTAR_TELEGRAM}</p>
        </div>
        <Link href="/config#canais" className="cc-avisos__cta">
          Conectar Telegram
        </Link>
      </div>

      {mostrados.length > 0 && (
        <ul className="cc-avisos__grupos">
          {mostrados.map((g) => (
            <li key={g.chave}>
              {}
              {g.href ? (
                <Link href={g.href} className="cc-avisos__grupo cc-avisos__grupo--link">
                  <span>{g.rotulo}</span>
                  <span className="cc-avisos__ir" aria-hidden="true">→</span>
                </Link>
              ) : (
                <span className="cc-avisos__grupo">{g.rotulo}</span>
              )}
            </li>
          ))}
          {sobra ? (
            <li>
              <span className="cc-avisos__grupo cc-avisos__grupo--sobra">{sobra}</span>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  )
}
