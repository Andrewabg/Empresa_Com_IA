import type {
  ConfigData,
  OpenAiResult,
  GithubResult,
  GithubTokenResult,
  ComposioResult,
  RepoEntry,
  CreateRepoResponse,
} from './ui'


export interface ConfigValidity {
  openai: boolean
  githubToken: boolean
  repo: boolean
}


export interface ConfigController {
  data: ConfigData | null
  saving: boolean
  saveMsg: { ok: boolean; text: string } | null
  openaiKey: string; setOpenaiKey: (v: string) => void
  githubToken: string; setGithubToken: (v: string) => void
  githubRepo: string; setGithubRepo: (v: string) => void
  composioKey: string; setComposioKey: (v: string) => void
  testingOpenai: boolean; openaiResult: OpenAiResult | null; testOpenai: () => void
  testingGithubToken: boolean; githubTokenResult: GithubTokenResult | null; testGithubToken: () => void
  testingGithub: boolean; githubResult: GithubResult | null; testGithub: () => void
  testingComposio: boolean; composioResult: ComposioResult | null; testComposio: () => void
  listingRepos: boolean; repoList: RepoEntry[] | null; reposError: string | null; listRepos: () => void
  newRepoName: string; setNewRepoName: (v: string) => void
  creatingRepo: boolean; createResult: CreateRepoResponse | null; createRepo: () => void
  tokenAvailable: boolean
  save: () => Promise<boolean>   
  activate: () => void           
  allConfigured: boolean
  validity: ConfigValidity
  githubTokenUrl: string
  
  isDono: boolean
  
  companyName: string
  
  assistantName: string
}
