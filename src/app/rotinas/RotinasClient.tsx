'use client'


import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { RotinaCard } from './RotinaCard'
import { RotinaForm } from './RotinaForm'
import { rascunhoDaRotina, type AgenteOpcao, type RascunhoRotina, type Rotina } from './types'

const SUGESTOES: { titulo: string; pedido: string; frequencia: RascunhoRotina['frequencia']; hora: string; diaSemana?: number; diasSemana?: number[]; diaMes?: number }[] = [
  {
    titulo: 'Resumo da manhã',
    pedido: 'Me faça um resumo do que aconteceu ontem na empresa e do que precisa da minha atenção hoje.',
    frequencia: 'diaria', hora: '08:00',
  },
  {
    titulo: 'Relatório da semana',
    pedido: 'Gere o relatório da semana com os números, o que melhorou, o que piorou e o que você recomenda mudar.',
    frequencia: 'semanal', hora: '08:00', diaSemana: 1, diasSemana: [1],
  },
  {
    titulo: 'Fechamento do mês',
    pedido: 'Feche o mês: consolide os resultados, compare com o mês anterior e liste as decisões que eu preciso tomar.',
    frequencia: 'mensal', hora: '09:00', diaMes: 1,
  },
]

function rascunhoVazio(agentes: AgenteOpcao[]): RascunhoRotina {
  return {
    agentId: agentes[0]?.id ?? '',
    titulo: '', pedido: '', frequencia: 'diaria', hora: '08:00', diaSemana: 1, diasSemana: [1], diaMes: 1,
    terminaEm: '', 
  }
}

interface Props {
  initialRotinas: Rotina[]
  agentes: AgenteOpcao[]
  tz: string
  agora: string
}

type Editor = { modo: 'fechado' } | { modo: 'nova'; valor: RascunhoRotina } | { modo: 'editando'; id: string; valor: RascunhoRotina }

export function RotinasClient({ initialRotinas, agentes, tz, agora }: Props) {
  const [rotinas, setRotinas] = useState<Rotina[]>(initialRotinas)
  const [editor, setEditor] = useState<Editor>({ modo: 'fechado' })
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [avisos, setAvisos] = useState<Record<string, string>>({})

  const avisar = (id: string, msg: string | null) =>
    setAvisos((a) => {
      const proximo = { ...a }
      if (msg) proximo[id] = msg
      else delete proximo[id]
      return proximo
    })

  
  const aplicar = (r: Rotina) =>
    setRotinas((lista) => (lista.some((x) => x.id === r.id) ? lista.map((x) => (x.id === r.id ? r : x)) : [r, ...lista]))

  async function salvar(v: RascunhoRotina) {
    setSalvando(true)
    setErroForm(null)
    const editando = editor.modo === 'editando' ? editor.id : null
    try {
      const res = await fetch(editando ? `/api/rotinas/${editando}` : '/api/rotinas', {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
      })
      const json = (await res.json()) as { rotina?: Rotina; error?: string }
      if (!res.ok || !json.rotina) {
        setErroForm(json.error ?? 'Não consegui salvar a rotina agora.')
        return
      }
      aplicar(json.rotina)
      setEditor({ modo: 'fechado' })
    } catch {
      setErroForm('Sem conexão com o servidor. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function alternar(r: Rotina) {
    setOcupada(r.id)
    avisar(r.id, null)
    try {
      const res = await fetch(`/api/rotinas/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativa: !r.ativa }),
      })
      const json = (await res.json()) as { rotina?: Rotina; error?: string }
      if (res.ok && json.rotina) aplicar(json.rotina)
      else avisar(r.id, json.error ?? 'Não consegui mudar o estado desta rotina.')
    } catch {
      avisar(r.id, 'Sem conexão com o servidor.')
    } finally {
      setOcupada(null)
    }
  }

  async function rodar(r: Rotina) {
    setOcupada(r.id)
    avisar(r.id, null)
    try {
      const res = await fetch(`/api/rotinas/${r.id}/rodar`, { method: 'POST' })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        avisar(r.id, json.error ?? 'Não consegui iniciar a rotina agora.')
        return
      }
      avisar(r.id, null)
      
      setRotinas((lista) => lista.map((x) => (x.id === r.id ? { ...x, ultima_execucao: new Date().toISOString() } : x)))
    } catch {
      avisar(r.id, 'Sem conexão com o servidor.')
    } finally {
      setOcupada(null)
    }
  }

  async function apagar(r: Rotina) {
    setOcupada(r.id)
    const antes = rotinas
    setRotinas((lista) => lista.filter((x) => x.id !== r.id)) 
    try {
      const res = await fetch(`/api/rotinas/${r.id}`, { method: 'DELETE' })
      if (!res.ok) {
        setRotinas(antes)
        avisar(r.id, 'Não consegui apagar esta rotina.')
      }
    } catch {
      setRotinas(antes)
      avisar(r.id, 'Sem conexão com o servidor.')
    } finally {
      setOcupada(null)
    }
  }

  const abrirNova = (base?: Partial<RascunhoRotina>) => {
    setErroForm(null)
    setEditor({ modo: 'nova', valor: { ...rascunhoVazio(agentes), ...base } })
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 28px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 25, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Rotinas
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
            O trabalho que a sua empresa faz sozinha, na hora certa, sem você pedir.
          </p>
        </div>
        {editor.modo === 'fechado' && rotinas.length > 0 && (
          <Button variant="primary" onClick={() => abrirNova()}>Nova rotina</Button>
        )}
      </header>

      {editor.modo !== 'fechado' && (
        <RotinaForm
          key={editor.modo === 'editando' ? editor.id : 'nova'}
          agentes={agentes}
          tz={tz}
          agora={agora}
          valor={editor.valor}
          editando={editor.modo === 'editando'}
          salvando={salvando}
          erro={erroForm}
          onCancelar={() => { setEditor({ modo: 'fechado' }); setErroForm(null) }}
          onSalvar={salvar}
        />
      )}

      {rotinas.length === 0 && editor.modo === 'fechado' ? (
        <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
          <EmptyState
            headline="Nenhuma rotina ainda"
            sub="Uma rotina é um pedido que se repete sozinho: você escreve uma vez, e o agente faz na hora marcada, para sempre."
            action={<Button variant="primary" onClick={() => abrirNova()}>Criar a primeira</Button>}
          />
          <div style={{ padding: '0 24px 26px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              ou comece por uma destas
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {SUGESTOES.map((s) => (
                <Button key={s.titulo} size="sm" onClick={() => abrirNova(s)}>{s.titulo}</Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rotinas.map((r) => (
            <RotinaCard
              key={r.id}
              rotina={r}
              agentes={agentes}
              tz={tz}
              agora={agora}
              ocupada={ocupada === r.id}
              aviso={avisos[r.id] ?? null}
              onAlternar={() => void alternar(r)}
              onRodar={() => void rodar(r)}
              onEditar={() => { setErroForm(null); setEditor({ modo: 'editando', id: r.id, valor: rascunhoDaRotina(r) }) }}
              onApagar={() => void apagar(r)}
            />
          ))}
        </div>
      )}

      {rotinas.length > 0 && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          Cada rotina vira uma tarefa do agente na hora marcada. Se ela precisar de uma ação que sai
          para o mundo (publicar, enviar, gastar), você continua decidindo em Aprovações.
        </p>
      )}
    </div>
  )
}
