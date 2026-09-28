'use client'


import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ROTULO_PAUSADA_COM_DISPAROS } from '@/lib/instagram/copyGatilho'
import { TEXTOS_COCKPIT_IG, ROTULO_GATILHO_IG, ROTULO_ESTADO_IG } from '@/lib/instagram/copyCockpit'
import { podeAlternarPelaLista } from '@/lib/instagram/estadoDaAutomacao'
import { AMBAR } from '@/lib/instagram/tons'
import { TEXTOS_REVISAO_IG } from '@/lib/instagram/revisaoAntesDeAtivar'
import type { IgAutomacaoRow } from '@/data/igAutomacoes'


function estadoLabel(a: IgAutomacaoRow): string {
  if (a.status === 'rascunho' && a.disparos > 0) return ROTULO_PAUSADA_COM_DISPAROS
  return ROTULO_ESTADO_IG[a.status]
}


export interface AvisoAutomacao {
  texto: string
  tipo: 'erro' | 'info'
}

interface Props {
  automacoes: IgAutomacaoRow[]
  ehDono: boolean
  canalHabilitado: boolean
  ocupada: string | null
  avisos: Record<string, AvisoAutomacao>
  onAlternar: (a: IgAutomacaoRow) => void
  onRevisar: (a: IgAutomacaoRow) => void
  onEditar: (a: IgAutomacaoRow) => void
  onArquivar: (a: IgAutomacaoRow) => void
  onVerHistorico: (a: IgAutomacaoRow) => void
}

export function ListaDeAutomacoes({
  automacoes, ehDono, canalHabilitado, ocupada, avisos,
  onAlternar, onRevisar, onEditar, onArquivar, onVerHistorico,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {automacoes.map((a) => (
        <Linha
          key={a.id}
          automacao={a}
          ehDono={ehDono}
          canalHabilitado={canalHabilitado}
          ocupada={ocupada === a.id}
          aviso={avisos[a.id] ?? null}
          onAlternar={() => onAlternar(a)}
          onRevisar={() => onRevisar(a)}
          onEditar={() => onEditar(a)}
          onArquivar={() => onArquivar(a)}
          onVerHistorico={() => onVerHistorico(a)}
        />
      ))}
    </div>
  )
}

function Linha({
  automacao: a, ehDono, canalHabilitado, ocupada, aviso,
  onAlternar, onRevisar, onEditar, onArquivar, onVerHistorico,
}: {
  automacao: IgAutomacaoRow
  ehDono: boolean
  canalHabilitado: boolean
  ocupada: boolean
  aviso: AvisoAutomacao | null
  onAlternar: () => void
  onRevisar: () => void
  onEditar: () => void
  onArquivar: () => void
  onVerHistorico: () => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const ativa = a.status === 'ativa'
  const podeAlternar = podeAlternarPelaLista(a.status)
  
  
  const alternarBloqueado = !ativa && !ehDono
  
  
  const arquivarBloqueado = !ehDono

  return (
    <div
      style={{
        background: 'var(--surface)', border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-md)', padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 10,
        opacity: ativa ? 1 : 0.72,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 7, height: 7, borderRadius: 999, flexShrink: 0, transform: 'translateY(-1px)',
            background: ativa ? 'var(--wave-from)' : a.status === 'expirada' ? 'var(--reject)' : 'var(--text-tertiary)',
            ...(ativa ? { animation: 'awave-live-dot 2.4s ease-in-out infinite' } : null),
          }}
        />
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 560, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {a.nome}
        </h3>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>{estadoLabel(a)}</span>
      </div>

      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
        {ROTULO_GATILHO_IG[a.gatilho]}
        {a.palavras.length > 0 && ` · palavras: ${a.palavras.slice(0, 4).join(', ')}${a.palavras.length > 4 ? ` e mais ${a.palavras.length - 4}` : ''}`}
      </p>

      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
        {a.disparos} {a.disparos === 1 ? 'disparo' : 'disparos'} · {a.dms_enviadas} {a.dms_enviadas === 1 ? 'direto enviado' : 'diretos enviados'} · {a.respostas_publicas} {a.respostas_publicas === 1 ? 'resposta pública' : 'respostas públicas'}
      </p>

      {}
      {a.status === 'expirada' && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
          {TEXTOS_COCKPIT_IG.expiradaTemSaida}
        </p>
      )}

      {}
      {ativa && !canalHabilitado && (
        <p style={{ margin: 0, fontSize: 12, color: AMBAR }}>
          {TEXTOS_COCKPIT_IG.automacaoParadaPeloCanal}
        </p>
      )}

      {aviso && (
        <p style={{ margin: 0, fontSize: 12.5, color: aviso.tipo === 'erro' ? 'var(--reject)' : 'var(--text-secondary)' }}>
          {aviso.texto}
        </p>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {podeAlternar && (
          <Button
            size="sm" variant="ghost"
            onClick={ativa ? onAlternar : onRevisar}
            disabled={ocupada || alternarBloqueado}
            title={alternarBloqueado ? TEXTOS_REVISAO_IG.soDonoAtiva : undefined}
          >
            {ativa ? TEXTOS_COCKPIT_IG.pausar : TEXTOS_COCKPIT_IG.ativar}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onEditar} disabled={ocupada}>{TEXTOS_COCKPIT_IG.editar}</Button>
        <Button size="sm" variant="ghost" onClick={onVerHistorico} disabled={ocupada}>{TEXTOS_COCKPIT_IG.historico}</Button>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {confirmando ? (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {TEXTOS_COCKPIT_IG.arquivarPergunta} {TEXTOS_COCKPIT_IG.arquivarEDefinitivo}
              </span>
              <Button size="sm" variant="danger" onClick={onArquivar} disabled={ocupada}>{TEXTOS_COCKPIT_IG.arquivar}</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>{TEXTOS_COCKPIT_IG.arquivarCancelar}</Button>
            </>
          ) : (
            <Button
              size="sm" variant="ghost" onClick={() => setConfirmando(true)}
              disabled={ocupada || arquivarBloqueado}
              title={arquivarBloqueado ? TEXTOS_REVISAO_IG.soDonoArquiva : undefined}
            >
              {TEXTOS_COCKPIT_IG.arquivar}
            </Button>
          )}
        </span>
      </div>
    </div>
  )
}
