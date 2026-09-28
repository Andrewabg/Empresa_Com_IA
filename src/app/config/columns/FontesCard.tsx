'use client'



import { useState, useEffect, useCallback } from 'react'
import { descreverAgenda, type AgendaSpec, type Frequencia } from '@/lib/rotinas/agenda'
import { AVISO_NENHUMA_PROPOSTA } from '@/lib/fontes/mensagens'
import { TEXTOS_FONTES, OPCOES_DE_FREQUENCIA, DIAS_DA_SEMANA, URL_GUIA_INSTALACAO } from '@/lib/fontes/copyDaTela'



interface ConsultaNaTela {
  id: string
  fonte_id: string
  rotulo: string
  corpo: string
  nota_path: string | null
  agenda: AgendaSpec
  proxima_execucao: string
  ultima_execucao: string | null
  aprovada_em: string | null
  aprovada_por: string | null
  ativa: boolean
  
  ultimo_erro: string | null
}

interface FonteNaTela {
  id: string
  nome: string
  tipo: 'banco'
  secret_ref: string
  ativa: boolean
  
  ultimo_erro: string | null
  
  aviso: string | null
  created_at: string
  updated_at: string
  consultas: ConsultaNaTela[]
}

interface Proposta {
  rotulo: string
  corpo: string
  notaPath: string
  motivo: string
}

interface Recusada {
  rotulo: string
  motivo: string
}

interface Agregado {
  colunas: string[]
  linhas: Record<string, string | number | null>[]
}


interface EscolhaDaProposta {
  marcada: boolean
  frequencia: Frequencia
  hora: string
  diaSemana: number
  diaMes: number
}

const ESCOLHA_PADRAO: EscolhaDaProposta = {
  marcada: true,
  frequencia: 'diaria',
  hora: '08:00',
  diaSemana: 1,
  diaMes: 1,
}


function agendaDaEscolha(e: EscolhaDaProposta): AgendaSpec {
  if (e.frequencia === 'semanal') return { frequencia: 'semanal', hora: e.hora, diaSemana: e.diaSemana }
  if (e.frequencia === 'mensal') return { frequencia: 'mensal', hora: e.hora, diaMes: e.diaMes }
  return { frequencia: 'diaria', hora: e.hora }
}


function dataPorExtenso(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}



const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 'var(--radius-md)',
  padding: '11px 14px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-ui)',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const SELECT_STYLE: React.CSSProperties = { ...INPUT_STYLE, padding: '8px 10px', fontSize: 13 }

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
}

const AJUDA_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--text-tertiary)',
}

const BOTAO_PRIMARIO: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 'var(--radius-md)',
  border: 'none',
  background: 'linear-gradient(120deg, var(--wave-from), var(--wave-to))',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
}

const BOTAO_SECUNDARIO: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-hairline)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-secondary)',
  fontSize: 12.5,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
}


function ConsultaCrua({ corpo }: { corpo: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={LABEL_STYLE}>{TEXTOS_FONTES.rotuloConsultaCrua}</label>
      <pre
        style={{
          margin: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          fontFamily: 'monospace',
          fontSize: 12.5,
          lineHeight: 1.55,
          color: 'var(--text-secondary)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 220,
          overflowY: 'auto',
        }}
      >
        {corpo}
      </pre>
    </div>
  )
}


function TabelaDoAgregado({ agregado }: { agregado: Agregado }) {
  if (agregado.linhas.length === 0) {
    return <p style={AJUDA_STYLE}>{TEXTOS_FONTES.resultadoVazio}</p>
  }
  const celula: React.CSSProperties = {
    padding: '6px 10px',
    borderBottom: '1px solid var(--border-hairline)',
    fontSize: 12.5,
    color: 'var(--text-secondary)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={LABEL_STYLE}>{TEXTOS_FONTES.tituloResultadoDoTeste}</label>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {agregado.colunas.map((c) => (
                <th key={c} style={{ ...celula, color: 'var(--text-tertiary)', fontWeight: 600 }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agregado.linhas.map((linha, i) => (
              <tr key={i}>
                {agregado.colunas.map((c) => (
                  <td key={c} style={celula}>{linha[c] === null || linha[c] === undefined ? '' : String(linha[c])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



export function FontesCard() {
  const [fontes, setFontes] = useState<FonteNaTela[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [nomeInput, setNomeInput] = useState('')
  const [credencialInput, setCredencialInput] = useState('')
  const [conectando, setConectando] = useState(false)

  const [propostasPorFonte, setPropostasPorFonte] = useState<Record<string, Proposta[]>>({})
  const [recusadasPorFonte, setRecusadasPorFonte] = useState<Record<string, Recusada[]>>({})
  
  const [reconhecidas, setReconhecidas] = useState<Record<string, boolean>>({})
  const [escolhas, setEscolhas] = useState<Record<string, EscolhaDaProposta>>({})
  const [agregadoPorConsulta, setAgregadoPorConsulta] = useState<Record<string, Agregado>>({})
  
  const [ocupado, setOcupado] = useState<Record<string, boolean>>({})

  const marcarOcupado = (chave: string, valor: boolean) =>
    setOcupado((o) => ({ ...o, [chave]: valor }))

  const carregar = useCallback(async () => {
    try {
      const res = await fetch('/api/fontes')
      if (res.ok) {
        const json = (await res.json()) as { fontes: FonteNaTela[] }
        setFontes(json.fontes ?? [])
        setErro(null)
        return
      }
      
      
      
      setErro(res.status === 403 ? TEXTOS_FONTES.somenteDono : TEXTOS_FONTES.falhaLeitura)
    } catch {
      setErro(TEXTOS_FONTES.falhaLeitura)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  
  const erroDaResposta = async (res: Response): Promise<string> => {
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (res.status === 403) return TEXTOS_FONTES.somenteDono
    return json.error ?? TEXTOS_FONTES.falhaLeitura
  }

  
  const conectar = async () => {
    setErro(null)
    if (!nomeInput.trim() || !credencialInput.trim()) {
      setErro(TEXTOS_FONTES.faltaPreencherConexao)
      return
    }
    setConectando(true)
    try {
      const res = await fetch('/api/fontes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeInput.trim(), tipo: 'banco', credencial: credencialInput.trim() }),
      })
      if (res.ok) {
        setNomeInput('')
        setCredencialInput('')
        
        
        
        
        const json = (await res.json().catch(() => ({}))) as { aviso?: string }
        if (json.aviso) setErro(json.aviso)
        await carregar()
      } else {
        setErro(await erroDaResposta(res))
      }
    } catch {
      setErro(TEXTOS_FONTES.falhaAoSalvar)
    } finally {
      setConectando(false)
    }
  }

  
  const reconhecer = async (fonteId: string) => {
    setErro(null)
    marcarOcupado(`rec:${fonteId}`, true)
    try {
      const res = await fetch(`/api/fontes/${fonteId}/reconhecer`, { method: 'POST' })
      if (!res.ok) {
        setErro(await erroDaResposta(res))
        return
      }
      const json = (await res.json()) as { propostas?: Proposta[]; recusadas?: Recusada[] }
      const propostas = json.propostas ?? []
      const recusadas = json.recusadas ?? []
      setPropostasPorFonte((p) => ({ ...p, [fonteId]: propostas }))
      setRecusadasPorFonte((r) => ({ ...r, [fonteId]: recusadas }))
      setReconhecidas((r) => ({ ...r, [fonteId]: true }))
      setEscolhas((e) => {
        const novo = { ...e }
        propostas.forEach((_p, i) => { novo[`${fonteId}:${i}`] = { ...ESCOLHA_PADRAO } })
        return novo
      })
    } catch {
      setErro(TEXTOS_FONTES.falhaLeitura)
    } finally {
      marcarOcupado(`rec:${fonteId}`, false)
    }
  }

  
  const adicionarMarcadas = async (fonteId: string) => {
    setErro(null)
    const propostas = propostasPorFonte[fonteId] ?? []
    const selecionadas = propostas
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => (escolhas[`${fonteId}:${i}`] ?? ESCOLHA_PADRAO).marcada)
    if (selecionadas.length === 0) {
      setErro(TEXTOS_FONTES.nenhumaMarcada)
      return
    }
    marcarOcupado(`add:${fonteId}`, true)
    
    
    const falhou: number[] = []
    let primeiroErro: string | null = null
    try {
      for (const { p, i } of selecionadas) {
        const escolha = escolhas[`${fonteId}:${i}`] ?? ESCOLHA_PADRAO
        try {
          const res = await fetch('/api/fontes/consultas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fonteId,
              rotulo: p.rotulo,
              corpo: p.corpo,
              notaPath: p.notaPath,
              agenda: agendaDaEscolha(escolha),
            }),
          })
          if (!res.ok) {
            falhou.push(i)
            primeiroErro = primeiroErro ?? (await erroDaResposta(res))
          }
        } catch {
          falhou.push(i)
          primeiroErro = primeiroErro ?? TEXTOS_FONTES.falhaAoSalvar
        }
      }
      
      
      setPropostasPorFonte((atual) => ({
        ...atual,
        [fonteId]: (atual[fonteId] ?? []).filter((_p, i) => falhou.includes(i)),
      }))
      
      
      
      setEscolhas((atual) => {
        const novo = { ...atual }
        propostas.forEach((_p, i) => { delete novo[`${fonteId}:${i}`] })
        falhou.forEach((antigo, novoIndice) => {
          novo[`${fonteId}:${novoIndice}`] = atual[`${fonteId}:${antigo}`] ?? { ...ESCOLHA_PADRAO }
        })
        return novo
      })
      if (primeiroErro) setErro(primeiroErro)
      await carregar()
    } finally {
      marcarOcupado(`add:${fonteId}`, false)
    }
  }

  
  const testar = async (consultaId: string) => {
    setErro(null)
    marcarOcupado(`test:${consultaId}`, true)
    try {
      const res = await fetch(`/api/fontes/consultas/${consultaId}/testar`, { method: 'POST' })
      if (!res.ok) {
        setErro(await erroDaResposta(res))
        return
      }
      const json = (await res.json()) as { agregado: Agregado; aviso?: string }
      setAgregadoPorConsulta((a) => ({ ...a, [consultaId]: json.agregado }))
      
      
      if (json.aviso) setErro(json.aviso)
    } catch {
      setErro(TEXTOS_FONTES.falhaLeitura)
    } finally {
      marcarOcupado(`test:${consultaId}`, false)
    }
  }

  const aprovar = async (consultaId: string) => {
    setErro(null)
    marcarOcupado(`apr:${consultaId}`, true)
    try {
      const res = await fetch(`/api/fontes/consultas/${consultaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprovar: true }),
      })
      if (!res.ok) setErro(await erroDaResposta(res))
      await carregar()
    } catch {
      setErro(TEXTOS_FONTES.falhaAoSalvar)
    } finally {
      marcarOcupado(`apr:${consultaId}`, false)
    }
  }

  const alternarConsulta = async (consultaId: string, ativa: boolean) => {
    setErro(null)
    marcarOcupado(`alt:${consultaId}`, true)
    try {
      const res = await fetch(`/api/fontes/consultas/${consultaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativa }),
      })
      if (!res.ok) setErro(await erroDaResposta(res))
      await carregar()
    } catch {
      setErro(TEXTOS_FONTES.falhaAoSalvar)
    } finally {
      marcarOcupado(`alt:${consultaId}`, false)
    }
  }

  const removerConsulta = async (consultaId: string) => {
    if (!window.confirm(TEXTOS_FONTES.confirmarRemoverConsulta)) return
    setErro(null)
    marcarOcupado(`del:${consultaId}`, true)
    try {
      const res = await fetch(`/api/fontes/consultas/${consultaId}`, { method: 'DELETE' })
      if (!res.ok) setErro(await erroDaResposta(res))
      await carregar()
    } catch {
      setErro(TEXTOS_FONTES.falhaAoSalvar)
    } finally {
      marcarOcupado(`del:${consultaId}`, false)
    }
  }

  const alternarFonte = async (fonteId: string, ativa: boolean) => {
    setErro(null)
    marcarOcupado(`altf:${fonteId}`, true)
    try {
      const res = await fetch(`/api/fontes/${fonteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativa }),
      })
      if (!res.ok) setErro(await erroDaResposta(res))
      await carregar()
    } catch {
      setErro(TEXTOS_FONTES.falhaAoSalvar)
    } finally {
      marcarOcupado(`altf:${fonteId}`, false)
    }
  }

  const removerFonte = async (fonteId: string) => {
    if (!window.confirm(TEXTOS_FONTES.confirmarRemoverFonte)) return
    setErro(null)
    marcarOcupado(`delf:${fonteId}`, true)
    try {
      const res = await fetch(`/api/fontes/${fonteId}`, { method: 'DELETE' })
      if (!res.ok) setErro(await erroDaResposta(res))
      await carregar()
    } catch {
      setErro(TEXTOS_FONTES.falhaAoSalvar)
    } finally {
      marcarOcupado(`delf:${fonteId}`, false)
    }
  }

  const mudarEscolha = (chave: string, patch: Partial<EscolhaDaProposta>) =>
    setEscolhas((e) => ({ ...e, [chave]: { ...(e[chave] ?? ESCOLHA_PADRAO), ...patch } }))

  
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: '20px',
        background: 'var(--surface)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        {TEXTOS_FONTES.tituloCard}
      </h2>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
        {TEXTOS_FONTES.introCard}
      </p>

      {}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={LABEL_STYLE}>{TEXTOS_FONTES.rotuloNome}</label>
          <input
            type="text"
            value={nomeInput}
            onChange={(e) => setNomeInput(e.target.value)}
            placeholder={TEXTOS_FONTES.placeholderNome}
            autoComplete="off"
            style={INPUT_STYLE}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={LABEL_STYLE}>{TEXTOS_FONTES.rotuloConexao}</label>
          <input
            type="password"
            value={credencialInput}
            onChange={(e) => setCredencialInput(e.target.value)}
            placeholder={TEXTOS_FONTES.placeholderConexao}
            autoComplete="off"
            style={INPUT_STYLE}
          />
          {}
          <p style={AJUDA_STYLE}>{TEXTOS_FONTES.ajudaSomenteLeitura}</p>
          {}
          <p style={AJUDA_STYLE}>{TEXTOS_FONTES.ajudaConexaoCriptografada}</p>
          {}
          <a
            href={URL_GUIA_INSTALACAO}
            target="_blank"
            rel="noreferrer"
            style={{ ...AJUDA_STYLE, color: 'var(--wave-from)', textDecoration: 'underline', width: 'fit-content' }}
          >
            {TEXTOS_FONTES.abrirGuia}
          </a>
        </div>

        <div>
          <button
            type="button"
            onClick={() => void conectar()}
            disabled={conectando}
            style={{ ...BOTAO_PRIMARIO, cursor: conectando ? 'not-allowed' : 'pointer', opacity: conectando ? 0.6 : 1 }}
          >
            {conectando ? TEXTOS_FONTES.conectando : TEXTOS_FONTES.botaoConectar}
          </button>
        </div>
      </div>

      {erro && (
        <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--reject)' }}>
          {erro}
        </p>
      )}

      {carregando && <p style={AJUDA_STYLE}>{TEXTOS_FONTES.carregando}</p>}
      {!carregando && fontes.length === 0 && <p style={AJUDA_STYLE}>{TEXTOS_FONTES.nenhumaFonte}</p>}

      {}
      {fontes.map((fonte) => {
        const propostas = propostasPorFonte[fonte.id] ?? []
        const recusadas = recusadasPorFonte[fonte.id] ?? []
        const jaReconheceu = reconhecidas[fonte.id] === true
        return (
          <div
            key={fonte.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              padding: 16,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span
                aria-hidden
                style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: fonte.ultimo_erro ? 'var(--reject)' : fonte.ativa ? 'var(--approve)' : 'var(--text-tertiary)',
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{fonte.nome}</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {fonte.ativa ? TEXTOS_FONTES.fonteLigada : TEXTOS_FONTES.fonteDesligada}
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void alternarFonte(fonte.id, !fonte.ativa)}
                  disabled={ocupado[`altf:${fonte.id}`]}
                  style={BOTAO_SECUNDARIO}
                >
                  {ocupado[`altf:${fonte.id}`]
                    ? (fonte.ativa ? TEXTOS_FONTES.desligando : TEXTOS_FONTES.ligando)
                    : (fonte.ativa ? TEXTOS_FONTES.botaoDesligar : TEXTOS_FONTES.botaoLigar)}
                </button>
                <button
                  type="button"
                  onClick={() => void removerFonte(fonte.id)}
                  disabled={ocupado[`delf:${fonte.id}`]}
                  style={{ ...BOTAO_SECUNDARIO, color: 'var(--reject)' }}
                >
                  {ocupado[`delf:${fonte.id}`] ? TEXTOS_FONTES.removendo : TEXTOS_FONTES.botaoRemover}
                </button>
              </span>
            </div>

            {}
            {fonte.ultimo_erro && (
              <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--reject)' }}>
                {TEXTOS_FONTES.rotuloUltimoErro} {fonte.ultimo_erro}
              </p>
            )}

            {}
            {fonte.aviso && (
              <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                {TEXTOS_FONTES.rotuloAvisoDaFonte} {fonte.aviso}
              </p>
            )}

            {}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <button
                  type="button"
                  onClick={() => void reconhecer(fonte.id)}
                  disabled={ocupado[`rec:${fonte.id}`]}
                  style={{
                    ...BOTAO_PRIMARIO,
                    cursor: ocupado[`rec:${fonte.id}`] ? 'not-allowed' : 'pointer',
                    opacity: ocupado[`rec:${fonte.id}`] ? 0.6 : 1,
                  }}
                >
                  {ocupado[`rec:${fonte.id}`] ? TEXTOS_FONTES.reconhecendo : TEXTOS_FONTES.botaoReconhecer}
                </button>
              </div>
              <p style={AJUDA_STYLE}>{TEXTOS_FONTES.ajudaReconhecer}</p>
            </div>

            {}
            {jaReconheceu && propostas.length === 0 && (
              <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                {recusadas.length > 0 ? AVISO_NENHUMA_PROPOSTA : TEXTOS_FONTES.nadaAPropor}
              </p>
            )}

            {}
            {propostas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={LABEL_STYLE}>{TEXTOS_FONTES.tituloPropostas}</span>
                {propostas.map((p, i) => {
                  const chave = `${fonte.id}:${i}`
                  const escolha = escolhas[chave] ?? ESCOLHA_PADRAO
                  return (
                    <div
                      key={chave}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 10,
                        padding: 14,
                        background: 'var(--surface)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={escolha.marcada}
                          onChange={(e) => mudarEscolha(chave, { marcada: e.target.checked })}
                          style={{ marginTop: 3, accentColor: 'var(--wave-from)' }}
                        />
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{p.rotulo}</span>
                      </label>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={LABEL_STYLE}>{TEXTOS_FONTES.rotuloMotivo}</span>
                        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{p.motivo}</p>
                      </div>

                      {}
                      <ConsultaCrua corpo={p.corpo} />

                      {p.notaPath && (
                        <p style={AJUDA_STYLE}>
                          {TEXTOS_FONTES.rotuloDestino}: <code style={{ fontFamily: 'monospace' }}>{p.notaPath}</code>
                        </p>
                      )}

                      {}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 150 }}>
                          <label style={LABEL_STYLE}>{TEXTOS_FONTES.rotuloQuando}</label>
                          <select
                            value={escolha.frequencia}
                            onChange={(e) => mudarEscolha(chave, { frequencia: e.target.value as Frequencia })}
                            style={SELECT_STYLE}
                          >
                            {OPCOES_DE_FREQUENCIA.map((o) => (
                              <option key={o.valor} value={o.valor}>{o.rotulo}</option>
                            ))}
                          </select>
                        </div>

                        {escolha.frequencia === 'semanal' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 130 }}>
                            <label style={LABEL_STYLE}>{TEXTOS_FONTES.rotuloDiaDaSemana}</label>
                            <select
                              value={escolha.diaSemana}
                              onChange={(e) => mudarEscolha(chave, { diaSemana: Number(e.target.value) })}
                              style={SELECT_STYLE}
                            >
                              {DIAS_DA_SEMANA.map((d, idx) => (
                                <option key={d} value={idx}>{d}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {escolha.frequencia === 'mensal' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 110 }}>
                            <label style={LABEL_STYLE}>{TEXTOS_FONTES.rotuloDiaDoMes}</label>
                            <select
                              value={escolha.diaMes}
                              onChange={(e) => mudarEscolha(chave, { diaMes: Number(e.target.value) })}
                              style={SELECT_STYLE}
                            >
                              {Array.from({ length: 28 }, (_v, k) => k + 1).map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 110 }}>
                          <label style={LABEL_STYLE}>{TEXTOS_FONTES.rotuloHorario}</label>
                          <input
                            type="time"
                            value={escolha.hora}
                            onChange={(e) => mudarEscolha(chave, { hora: e.target.value })}
                            style={SELECT_STYLE}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div>
                  <button
                    type="button"
                    onClick={() => void adicionarMarcadas(fonte.id)}
                    disabled={ocupado[`add:${fonte.id}`]}
                    style={{
                      ...BOTAO_PRIMARIO,
                      cursor: ocupado[`add:${fonte.id}`] ? 'not-allowed' : 'pointer',
                      opacity: ocupado[`add:${fonte.id}`] ? 0.6 : 1,
                    }}
                  >
                    {ocupado[`add:${fonte.id}`] ? TEXTOS_FONTES.adicionando : TEXTOS_FONTES.botaoAdicionar}
                  </button>
                </div>
              </div>
            )}

            {}
            {recusadas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={LABEL_STYLE}>{TEXTOS_FONTES.tituloRecusadas}</span>
                {recusadas.map((r, i) => (
                  <div
                    key={`${r.rotulo}:${i}`}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 3,
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{r.rotulo}</span>
                    <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>{r.motivo}</span>
                  </div>
                ))}
              </div>
            )}

            {}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={LABEL_STYLE}>{TEXTOS_FONTES.tituloConsultas}</span>
              {fonte.consultas.length === 0 && <p style={AJUDA_STYLE}>{TEXTOS_FONTES.nenhumaConsulta}</p>}
              {fonte.consultas.map((c) => {
                const aprovada = c.aprovada_em !== null
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 10,
                      padding: 14,
                      background: 'var(--surface)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{c.rotulo}</span>
                      <span
                        style={{
                          fontSize: 11.5, padding: '2px 8px', borderRadius: 999,
                          border: '1px solid var(--border-hairline)',
                          color: aprovada ? 'var(--approve)' : 'var(--text-tertiary)',
                        }}
                      >
                        {aprovada ? TEXTOS_FONTES.aprovada : TEXTOS_FONTES.esperandoAprovacao}
                      </span>
                    </div>

                    {}
                    {c.ultimo_erro && (
                      <p role="status" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--reject)' }}>
                        {TEXTOS_FONTES.rotuloUltimoErroDaConsulta} {c.ultimo_erro}
                      </p>
                    )}

                    {}
                    <ConsultaCrua corpo={c.corpo} />

                    {c.nota_path && (
                      <p style={AJUDA_STYLE}>
                        {TEXTOS_FONTES.rotuloDestino}: <code style={{ fontFamily: 'monospace' }}>{c.nota_path}</code>
                      </p>
                    )}

                    {}
                    {aprovada && (
                      <p style={AJUDA_STYLE}>
                        {descreverAgenda(c.agenda)}.{' '}
                        {c.ultima_execucao
                          ? `${TEXTOS_FONTES.rotuloUltimaExecucao} ${dataPorExtenso(c.ultima_execucao)}.`
                          : TEXTOS_FONTES.aindaNaoRodou}
                      </p>
                    )}

                    {!aprovada && <p style={AJUDA_STYLE}>{TEXTOS_FONTES.ajudaAprovar}</p>}

                    {agregadoPorConsulta[c.id] && <TabelaDoAgregado agregado={agregadoPorConsulta[c.id]} />}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => void testar(c.id)}
                        disabled={ocupado[`test:${c.id}`]}
                        style={BOTAO_SECUNDARIO}
                      >
                        {ocupado[`test:${c.id}`] ? TEXTOS_FONTES.testando : TEXTOS_FONTES.botaoTestar}
                      </button>

                      {!aprovada && (
                        <button
                          type="button"
                          onClick={() => void aprovar(c.id)}
                          disabled={ocupado[`apr:${c.id}`]}
                          style={{
                            ...BOTAO_PRIMARIO,
                            padding: '8px 16px',
                            cursor: ocupado[`apr:${c.id}`] ? 'not-allowed' : 'pointer',
                            opacity: ocupado[`apr:${c.id}`] ? 0.6 : 1,
                          }}
                        >
                          {ocupado[`apr:${c.id}`] ? TEXTOS_FONTES.aprovando : TEXTOS_FONTES.botaoAprovar}
                        </button>
                      )}

                      {aprovada && (
                        <button
                          type="button"
                          onClick={() => void alternarConsulta(c.id, !c.ativa)}
                          disabled={ocupado[`alt:${c.id}`]}
                          style={BOTAO_SECUNDARIO}
                        >
                          {ocupado[`alt:${c.id}`]
                            ? (c.ativa ? TEXTOS_FONTES.desligando : TEXTOS_FONTES.ligando)
                            : (c.ativa ? TEXTOS_FONTES.botaoDesligar : TEXTOS_FONTES.botaoLigar)}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void removerConsulta(c.id)}
                        disabled={ocupado[`del:${c.id}`]}
                        style={{ ...BOTAO_SECUNDARIO, color: 'var(--reject)' }}
                      >
                        {ocupado[`del:${c.id}`] ? TEXTOS_FONTES.removendo : TEXTOS_FONTES.botaoRemover}
                      </button>
                    </div>

                    <p style={AJUDA_STYLE}>{TEXTOS_FONTES.ajudaTestar}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}
