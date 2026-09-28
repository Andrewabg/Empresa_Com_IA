'use client'


import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  TEXTOS_REVISAO_IG, TEXTO_DO_ALERTA, contagemDeMensagens,
  type RevisaoCompleta, type MensagemRevisada, type BotaoRevisado,
} from '@/lib/instagram/revisaoAntesDeAtivar'


export interface RevisaoNaTela {
  id: string
  nome: string
  carregando: boolean
  erro: string | null
  conteudo: RevisaoCompleta | null
  baseadoEm: string | null
}

const AMBER_RGB = '214 158 46'

export function RevisaoAntesDeAtivar({
  revisao, ocupada, onConfirmar, onCancelar,
}: {
  revisao: RevisaoNaTela | null
  ocupada: boolean
  onConfirmar: () => void
  onCancelar: () => void
}) {
  const conteudo = revisao?.conteudo ?? null
  const vazia = conteudo !== null && conteudo.mensagens.length === 0 && conteudo.respostaPublica === null

  return (
    <Modal
      open={revisao !== null}
      onOpenChange={(o) => { if (!o) onCancelar() }}
      title={TEXTOS_REVISAO_IG.titulo}
      hint={revisao?.nome}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {TEXTOS_REVISAO_IG.explicacao}
        </p>

        {revisao?.carregando && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)' }}>{TEXTOS_REVISAO_IG.abrindo}</p>
        )}

        {revisao?.erro && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--reject)' }}>{revisao.erro}</p>
        )}

        {vazia && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--reject)' }}>{TEXTOS_REVISAO_IG.semConteudo}</p>
        )}

        {conteudo && conteudo.alertas.length > 0 && (
          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px',
              borderRadius: 'var(--radius-sm)', border: `1px solid rgb(${AMBER_RGB} / 0.3)`,
              background: `rgb(${AMBER_RGB} / 0.07)`,
            }}
          >
            {conteudo.alertas.map((a) => (
              <p key={a} style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                {TEXTO_DO_ALERTA[a]}
              </p>
            ))}
          </div>
        )}

        {conteudo && (
          <Bloco titulo={TEXTOS_REVISAO_IG.rotuloRespostaPublica}>
            <Texto valor={conteudo.respostaPublica} vazio={TEXTOS_REVISAO_IG.semRespostaPublica} />
          </Bloco>
        )}

        {conteudo && conteudo.mensagens.length > 0 && (
          <Bloco titulo={`${TEXTOS_REVISAO_IG.rotuloMensagens} ${contagemDeMensagens(conteudo.mensagens.length)}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {conteudo.mensagens.map((m) => <Mensagem key={m.posicao} mensagem={m} />)}
            </div>
          </Bloco>
        )}

        {conteudo && (
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
            {TEXTOS_REVISAO_IG.nomeDeExemplo}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            variant="primary" onClick={onConfirmar}
            disabled={ocupada || revisao?.carregando === true || conteudo === null || vazia}
          >
            {TEXTOS_REVISAO_IG.confirmar}
          </Button>
          <Button variant="ghost" onClick={onCancelar} disabled={ocupada}>
            {TEXTOS_REVISAO_IG.cancelar}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 560, color: 'var(--text-primary)' }}>{titulo}</p>
      {children}
    </div>
  )
}


function Texto({ valor, vazio }: { valor: string | null; vazio: string }) {
  if (valor === null) {
    return <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)' }}>{vazio}</p>
  }
  return (
    <p
      style={{
        margin: 0, fontSize: 13, color: 'var(--text-secondary)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        padding: '10px 12px', borderRadius: 'var(--radius-sm)',
        background: 'var(--surface)', border: '1px solid var(--border-hairline)',
      }}
    >
      {valor}
    </p>
  )
}

function Mensagem({ mensagem }: { mensagem: MensagemRevisada }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{mensagem.posicao}</span>
      <Texto valor={mensagem.texto} vazio={TEXTOS_REVISAO_IG.semTexto} />
      {mensagem.imagem && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>
          {TEXTOS_REVISAO_IG.rotuloImagem} {mensagem.imagem}. {TEXTOS_REVISAO_IG.avisoImagemSemPreVisualizacao}
        </p>
      )}
      {mensagem.botoes.map((b, i) => <BotaoDaRevisao key={`${b.endereco}-${i}`} botao={b} />)}
    </div>
  )
}


function BotaoDaRevisao({ botao }: { botao: BotaoRevisado }) {
  const suspeito = botao.alertas.length > 0
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 10px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${suspeito ? `rgb(${AMBER_RGB} / 0.4)` : 'var(--border-hairline)'}`,
      }}
    >
      <span style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>
        {TEXTOS_REVISAO_IG.rotuloBotao}: {botao.rotulo}
      </span>
      <code style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
        {botao.endereco}
      </code>
      <span
        style={{
          fontSize: 12, wordBreak: 'break-all',
          color: suspeito ? `rgb(${AMBER_RGB})` : 'var(--text-tertiary)',
        }}
      >
        {TEXTOS_REVISAO_IG.rotuloSite} {botao.site ?? '?'}
      </span>
    </div>
  )
}
