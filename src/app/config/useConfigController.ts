'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

import type {
  ConfigData,
  OpenAiResult,
  GithubResult,
  GithubTokenResult,
  ComposioResult,
  TestResponse,
  RepoEntry,
  ListReposResponse,
  CreateRepoResponse,
} from './ui'
import type { ConfigController, ConfigValidity } from './controller'
import { prefetchConfigCards } from './prefetch'
import { DEFAULT_BRANDING } from '@/lib/branding'
import { avisarConfigMudou } from '@/lib/configEvents'


export function useConfigController(): {
  ctrl: ConfigController
  loading: boolean
  fetchError: string | null
} {
  const router = useRouter()

  const [data, setData] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [openaiKey, setOpenaiKey] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [composioKey, setComposioKey] = useState('')

  
  const [testingOpenai, setTestingOpenai] = useState(false)
  const [openaiResult, setOpenaiResult] = useState<OpenAiResult | null>(null)
  
  const [testingGithubToken, setTestingGithubToken] = useState(false)
  const [githubTokenResult, setGithubTokenResult] = useState<GithubTokenResult | null>(null)
  
  const [testingGithub, setTestingGithub] = useState(false)
  const [githubResult, setGithubResult] = useState<GithubResult | null>(null)
  
  const [testingComposio, setTestingComposio] = useState(false)
  const [composioResult, setComposioResult] = useState<ComposioResult | null>(null)

  
  const [listingRepos, setListingRepos] = useState(false)
  const [repoList, setRepoList] = useState<RepoEntry[] | null>(null)
  const [reposError, setReposError] = useState<string | null>(null)
  const [newRepoName, setNewRepoName] = useState('awave-cerebro')
  const [creatingRepo, setCreatingRepo] = useState(false)
  const [createResult, setCreateResult] = useState<CreateRepoResponse | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setFetchError(null)
      const res = await fetch('/api/config')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ConfigData = await res.json()
      setData(json)
    } catch (err) {
      console.error('[config] fetch error:', err)
      setFetchError('Erro ao carregar a configuração — tente recarregar.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    
    
    
    prefetchConfigCards()
    fetchStatus()
  }, [fetchStatus])

  
  
  
  const save = async (): Promise<boolean> => {
    setSaving(true)
    setSaveMsg(null)

    const payload: Record<string, string> = {}
    if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim()
    if (githubToken.trim()) payload.github_token = githubToken.trim()
    if (githubRepo.trim()) payload.github_repo = githubRepo.trim()
    if (composioKey.trim()) payload.composio_api_key = composioKey.trim()

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      
      
      
      const json = (await res.json()) as { ok: boolean; status: ConfigData['status'] }
      setData((prev) => (prev ? { ...prev, status: json.status } : prev))
      
      
      avisarConfigMudou()
      setSaveMsg({ ok: true, text: 'Configuração salva com sucesso.' })
      setOpenaiKey('')
      setGithubToken('')
      setGithubRepo('')
      setComposioKey('')
      return true
    } catch (err) {
      setSaveMsg({ ok: false, text: `Erro ao salvar: ${err instanceof Error ? err.message : String(err)}` })
      return false
    } finally {
      setSaving(false)
    }
  }

  const activate = () => router.push('/onboarding')

  
  
  
  const runTest = useCallback(async (target: 'openai' | 'github' | 'github_token' | 'composio'): Promise<TestResponse | null> => {
    const payload: Record<string, string> = { target }
    if (target === 'openai') {
      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim()
    } else if (target === 'github_token') {
      if (githubToken.trim()) payload.github_token = githubToken.trim()
    } else if (target === 'composio') {
      if (composioKey.trim()) payload.composio_api_key = composioKey.trim()
    } else {
      if (githubToken.trim()) payload.github_token = githubToken.trim()
      if (githubRepo.trim()) payload.github_repo = githubRepo.trim()
    }

    const res = await fetch('/api/config/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as TestResponse
  }, [openaiKey, githubToken, githubRepo, composioKey])

  const handleTestOpenai = async () => {
    setTestingOpenai(true)
    setOpenaiResult(null)
    try {
      const json = await runTest('openai')
      setOpenaiResult(
        json?.openai ?? { ok: false, detail: 'nenhuma chave para testar — preencha ou salve primeiro' },
      )
    } catch (err) {
      setOpenaiResult({ ok: false, detail: `erro ao testar: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setTestingOpenai(false)
    }
  }

  const handleTestGithubToken = async () => {
    setTestingGithubToken(true)
    setGithubTokenResult(null)
    try {
      const json = await runTest('github_token')
      setGithubTokenResult(
        json?.githubToken ?? {
          ok: false,
          detail: 'nenhum token para testar — preencha ou salve primeiro',
        },
      )
    } catch (err) {
      setGithubTokenResult({
        ok: false,
        detail: `erro ao testar: ${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setTestingGithubToken(false)
    }
  }

  const handleTestGithub = async () => {
    setTestingGithub(true)
    setGithubResult(null)
    try {
      const json = await runTest('github')
      setGithubResult(
        json?.github ?? {
          ok: false,
          detail: 'preencha (ou salve) o token e o repo para testar',
        },
      )
    } catch (err) {
      setGithubResult({ ok: false, detail: `erro ao testar: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setTestingGithub(false)
    }
  }

  const handleTestComposio = async () => {
    setTestingComposio(true)
    setComposioResult(null)
    try {
      const json = await runTest('composio')
      setComposioResult(
        json?.composio ?? {
          ok: false,
          error: 'nenhuma chave para testar — preencha ou salve primeiro',
        },
      )
    } catch (err) {
      setComposioResult({ ok: false, error: `erro ao testar: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setTestingComposio(false)
    }
  }

  
  
  
  const handleListRepos = async () => {
    setListingRepos(true)
    setReposError(null)
    setRepoList(null)
    try {
      const tok = githubToken.trim()
      const res = await fetch('/api/config/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tok ? { github_token: tok } : {}),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ListReposResponse
      if (json.ok && json.repos) {
        setRepoList(json.repos)
        if (json.repos.length === 0) {
          setReposError('nenhum repositório com acesso de escrita encontrado')
        }
      } else {
        setReposError(json.detail ?? 'não foi possível listar os repositórios')
      }
    } catch (err) {
      setReposError(`erro ao listar: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setListingRepos(false)
    }
  }

  
  const handleCreateRepo = async () => {
    setCreatingRepo(true)
    setCreateResult(null)
    try {
      const tok = githubToken.trim()
      const res = await fetch('/api/config/repos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRepoName.trim(),
          ...(tok ? { github_token: tok } : {}),
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as CreateRepoResponse
      setCreateResult(json)
      if (json.ok && json.fullName) {
        setGithubRepo(json.fullName)
      }
    } catch (err) {
      setCreateResult({
        ok: false,
        detail: `erro ao criar: ${err instanceof Error ? err.message : String(err)}`,
      })
    } finally {
      setCreatingRepo(false)
    }
  }

  
  
  const tokenAvailable = githubToken.trim().length > 0 || (data?.status.github_token ?? false)

  const allConfigured = data
    ? data.status.openai_api_key && data.status.github_token && data.status.github_repo
    : false

  
  
  
  
  const autoListedRef = useRef(false)
  const tokenValid = (githubTokenResult?.ok ?? false) || (data?.status.github_token ?? false)
  useEffect(() => {
    if (!tokenValid || allConfigured) {
      autoListedRef.current = false
      return
    }
    if (autoListedRef.current || listingRepos || repoList) return
    autoListedRef.current = true
    void handleListRepos()
    
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenValid, allConfigured, listingRepos, repoList])

  
  const validity: ConfigValidity = {
    openai: (openaiResult?.ok ?? false) || (data?.status.openai_api_key ?? false),
    githubToken: (githubTokenResult?.ok ?? false) || (data?.status.github_token ?? false),
    repo: (githubResult?.ok ?? false) || (data?.status.github_repo ?? false),
  }

  
  
  
  
  const composioAutoTestedRef = useRef(false)
  const composioConfigured = data?.status.composio_api_key ?? false
  useEffect(() => {
    if (!composioConfigured || !allConfigured) {
      composioAutoTestedRef.current = false
      return
    }
    if (composioAutoTestedRef.current || testingComposio || composioResult) return
    composioAutoTestedRef.current = true
    void handleTestComposio()
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composioConfigured, allConfigured, testingComposio, composioResult])

  
  
  const tokenDescription = `Awave Agents${githubRepo.trim() ? ` — ${githubRepo.trim()}` : ''}`
  const githubTokenUrl = `https://github.com/settings/tokens/new?description=${encodeURIComponent(
    tokenDescription,
  )}&scopes=repo`

  const ctrl: ConfigController = {
    data,
    saving,
    saveMsg,
    openaiKey, setOpenaiKey,
    githubToken, setGithubToken,
    githubRepo, setGithubRepo,
    composioKey, setComposioKey,
    testingOpenai, openaiResult, testOpenai: handleTestOpenai,
    testingGithubToken, githubTokenResult, testGithubToken: handleTestGithubToken,
    testingGithub, githubResult, testGithub: handleTestGithub,
    testingComposio, composioResult, testComposio: handleTestComposio,
    listingRepos, repoList, reposError, listRepos: handleListRepos,
    newRepoName, setNewRepoName,
    creatingRepo, createResult, createRepo: handleCreateRepo,
    tokenAvailable,
    save,
    activate,
    allConfigured,
    validity,
    githubTokenUrl,
    
    isDono: data?.isDono ?? false,
    companyName: data?.companyName ?? '',
    
    assistantName: data?.assistantName?.trim() || DEFAULT_BRANDING.assistantName,
  }

  return { ctrl, loading, fetchError }
}
