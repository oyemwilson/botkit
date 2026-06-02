'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  getDocuments,
  deleteDocument,
  getChatHistory,
  getStats,
  uploadPDF,
  ingestURL,
  parseSources,
  resetVectorstore,
} from '@/lib/api'
import type { Document, ChatHistoryMessage, Stats } from '@/lib/types'

type Tab = 'documents' | 'history'

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon,
  bg,
}: {
  title: string
  value: number
  icon: string
  bg: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className={`inline-flex p-2.5 rounded-xl ${bg} mb-3`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-500 mt-1">{title}</div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const [activeTab, setActiveTab] = useState<Tab>('documents')
  const [stats, setStats] = useState<Stats | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [history, setHistory] = useState<ChatHistoryMessage[]>([])
  const [historyFilter, setHistoryFilter] = useState('')
  const [tabLoading, setTabLoading] = useState(false)
  const [error, setError] = useState('')

  const [uploadStatus, setUploadStatus] = useState('')
  const [urlInput, setUrlInput] = useState('')

  // Auto-restore session
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_key')
    if (!saved) return
    setAdminKey(saved)
    getStats(saved)
      .then((s) => { setStats(s); setAuthenticated(true) })
      .catch(() => sessionStorage.removeItem('admin_key'))
  }, [])

  const refreshStats = useCallback(async (key: string) => {
    const s = await getStats(key)
    setStats(s)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      const s = await getStats(adminKey)
      setStats(s)
      setAuthenticated(true)
      sessionStorage.setItem('admin_key', adminKey)
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  const loadDocuments = useCallback(async () => {
    setTabLoading(true)
    try {
      setDocuments(await getDocuments(adminKey))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setTabLoading(false)
    }
  }, [adminKey])

  const loadHistory = useCallback(async (filter?: string) => {
    setTabLoading(true)
    try {
      setHistory(await getChatHistory(adminKey, filter || undefined))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setTabLoading(false)
    }
  }, [adminKey])

  useEffect(() => {
    if (!authenticated) return
    if (activeTab === 'documents') loadDocuments()
    if (activeTab === 'history') loadHistory(historyFilter)
  }, [activeTab, authenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}" from the knowledge base?`)) return
    try {
      await deleteDocument(id, adminKey)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      refreshStats(adminKey)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleReset = async () => {
    if (!confirm('This will wipe ALL vectors from ChromaDB. The AI will forget everything. Continue?')) return
    try {
      const data = await resetVectorstore(adminKey)
      setUploadStatus(`✓ ${data.message}`)
      setDocuments([])
      refreshStats(adminKey)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    }
  }

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadStatus(`Uploading ${file.name}…`)
    try {
      const data = await uploadPDF(file)
      setUploadStatus(`✓ ${data.message}`)
      loadDocuments()
      refreshStats(adminKey)
    } catch (err: unknown) {
      setUploadStatus(`✗ ${err instanceof Error ? err.message : 'Upload failed'}`)
    }
    e.target.value = ''
  }

  const handleURLIngest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    setUploadStatus(`Scraping ${urlInput}…`)
    try {
      const data = await ingestURL(urlInput)
      setUploadStatus(`✓ ${data.message}`)
      setUrlInput('')
      loadDocuments()
      refreshStats(adminKey)
    } catch (err: unknown) {
      setUploadStatus(`✗ ${err instanceof Error ? err.message : 'Ingest failed'}`)
    }
  }

  // ── Login Screen ──────────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
              🔐
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500 text-sm mt-1">Enter your admin key to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin key"
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            {authError && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{authError}</p>
            )}
            <button
              type="submit"
              disabled={authLoading || !adminKey}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors"
            >
              {authLoading ? 'Verifying…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-blue-600 hover:underline">
              ← Back to Chat
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-lg">🤖</div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-400 text-xs">BotKit AI · Knowledge Base Manager</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              <span className="hidden sm:inline">← </span>Chat
            </Link>
            <button
              onClick={() => {
                setAuthenticated(false)
                sessionStorage.removeItem('admin_key')
              }}
              className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Documents Uploaded" value={stats.total_documents_uploaded} icon="📄" bg="bg-blue-50" />
            <StatCard title="Vector Chunks" value={stats.total_chunks_in_vector_db} icon="🧩" bg="bg-purple-50" />
            <StatCard title="Chat Messages" value={stats.total_chat_messages} icon="💬" bg="bg-emerald-50" />
            <StatCard title="Unique Sessions" value={stats.total_unique_sessions} icon="👥" bg="bg-orange-50" />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6 flex gap-6">
            {(['documents', 'history'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab === 'documents' ? '📄 Documents' : '💬 Chat History'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tabLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Loading…
              </div>
            ) : activeTab === 'documents' ? (
              <DocumentsTab
                documents={documents}
                onDelete={handleDelete}
                onReset={handleReset}
                uploadStatus={uploadStatus}
                urlInput={urlInput}
                setUrlInput={setUrlInput}
                onPDFUpload={handlePDFUpload}
                onURLIngest={handleURLIngest}
              />
            ) : (
              <HistoryTab
                history={history}
                filter={historyFilter}
                setFilter={setHistoryFilter}
                onFilter={() => loadHistory(historyFilter)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Documents Tab ─────────────────────────────────────────────────────────────
interface DocumentsTabProps {
  documents: Document[]
  onDelete: (id: number, name: string) => void
  onReset: () => void
  uploadStatus: string
  urlInput: string
  setUrlInput: (v: string) => void
  onPDFUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onURLIngest: (e: React.FormEvent) => void
}

function DocumentsTab({
  documents,
  onDelete,
  onReset,
  uploadStatus,
  urlInput,
  setUrlInput,
  onPDFUpload,
  onURLIngest,
}: DocumentsTabProps) {
  return (
    <div className="space-y-5">
      {/* Upload Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Upload PDF</p>
          <label className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6H16a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Choose PDF File
            <input type="file" accept=".pdf" className="hidden" onChange={onPDFUpload} />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Ingest URL</p>
          <form onSubmit={onURLIngest} className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/faq"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      {uploadStatus && (
        <div
          className={`text-sm px-4 py-3 rounded-xl ${
            uploadStatus.startsWith('✓')
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : uploadStatus.startsWith('✗')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {uploadStatus}
        </div>
      )}

      {/* Table */}
      {/* Danger zone */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800">Reset Knowledge Base</p>
          <p className="text-xs text-red-500 mt-0.5">Wipes all vectors from ChromaDB — use if AI references deleted documents</p>
        </div>
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium transition-colors"
        >
          Reset All Vectors
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">📂</div>
          <p className="font-medium">No documents yet</p>
          <p className="text-sm mt-1">Upload a PDF or add a URL above to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Name</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Chunks</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Added</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-800 max-w-xs truncate" title={doc.name}>
                    {doc.name}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        doc.doc_type === 'pdf'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {doc.doc_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{doc.chunk_count}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">
                    {new Date(doc.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onDelete(doc.id, doc.name)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Chat History Tab ──────────────────────────────────────────────────────────
interface HistoryTabProps {
  history: ChatHistoryMessage[]
  filter: string
  setFilter: (v: string) => void
  onFilter: () => void
}

function HistoryTab({ history, filter, setFilter, onFilter }: HistoryTabProps) {
  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onFilter()}
          placeholder="Filter by session ID…"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          onClick={onFilter}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl font-medium transition-colors"
        >
          Filter
        </button>
        {filter && (
          <button
            onClick={() => { setFilter(''); onFilter() }}
            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-5xl mb-3">💬</div>
          <p className="font-medium">No messages yet</p>
          <p className="text-sm mt-1">Conversations will appear here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {history.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${
                  msg.role === 'user' ? 'bg-blue-500' : 'bg-slate-500'
                }`}
              >
                {msg.role === 'user' ? 'U' : 'AI'}
              </div>
              <div className={`flex-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{msg.session_id.slice(0, 22)}…</span>
                  <span className="text-xs text-gray-300">
                    {new Date(msg.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div
                  className={`px-3 py-2 rounded-xl text-sm ${
                    msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.sources && parseSources(msg.sources).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {parseSources(msg.sources).map((src, i) => (
                      <span key={i} className="text-xs text-gray-400">📄 {src}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
