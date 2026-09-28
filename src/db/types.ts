export interface Note {
  id: string
  path: string
  title: string | null
  type: string | null
  tags: string[]
  confidence: number
  created: string
  updated: string
  last_accessed: string | null
  access_count: number
}

export interface NoteChunk {
  id: number
  note_id: string
  chunk_index: number
  content: string
  fts?: unknown
  embedding: number[] | null
}

export interface Edge {
  id: number
  from_id: string
  to_id: string
  relation: string
  created_at: string
}

export interface MemoryCandidate {
  id: number
  source_type: string
  source_ref: string | null
  raw_content: string
  suggested_type: string | null
  suggested_tags: string[]
  author_agent: string | null
  status: string
  created_at: string
  processed_at: string | null
  result: unknown | null
  
  origin_class?: string | null
}

export interface SyncState {
  id: number
  last_synced_sha: string | null
  embedding_version: string | null
  updated_at: string
}

export interface HybridHit {
  note_id: string
  chunk_index: number
  content: string
  score: number
}
