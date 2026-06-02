export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  timestamp: Date
}

export interface Document {
  id: number
  name: string
  doc_type: 'pdf' | 'url'
  chunk_count: number
  created_at: string
}

export interface ChatHistoryMessage {
  id: number
  session_id: string
  role: 'user' | 'assistant'
  content: string
  sources: string | null
  created_at: string
}

export interface Stats {
  total_documents_uploaded: number
  total_chunks_in_vector_db: number
  total_chat_messages: number
  total_unique_sessions: number
}

export interface IngestResponse {
  success: boolean
  message: string
  chunk_count: number
}
