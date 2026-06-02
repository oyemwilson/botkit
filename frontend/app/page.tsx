'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { sendMessage, uploadPDF, ingestURL } from '@/lib/api'
import type { Message } from '@/lib/types'

type UploadStatus = { text: string; type: 'success' | 'error' | 'loading' | null }

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your AI assistant. Upload PDFs or add URLs to train me, then ask anything about those documents.",
  sources: [],
  timestamp: new Date(),
}

function newSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [status, setStatus] = useState<UploadStatus>({ text: '', type: null })
  const [embedOpen, setEmbedOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true)
  }, [])

  useEffect(() => {
    let sid = localStorage.getItem('chatbot_session_id')
    if (!sid) {
      sid = newSessionId()
      localStorage.setItem('chatbot_session_id', sid)
    }
    setSessionId(sid)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    const history = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }))

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const data = await sendMessage(userMsg.content, sessionId, history)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
          timestamp: new Date(),
        },
      ])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, something went wrong: ${msg}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages, sessionId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus({ text: `Uploading ${file.name}…`, type: 'loading' })
    try {
      const data = await uploadPDF(file)
      setUploadedDocs((prev) => [...prev, file.name])
      setStatus({ text: data.message, type: 'success' })
      if (window.innerWidth < 768) setSidebarOpen(false)
    } catch (err: unknown) {
      setStatus({ text: err instanceof Error ? err.message : 'Upload failed', type: 'error' })
    }
    e.target.value = ''
  }

  const handleURLIngest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    setStatus({ text: `Scraping ${urlInput}…`, type: 'loading' })
    try {
      const data = await ingestURL(urlInput)
      setUploadedDocs((prev) => [...prev, urlInput])
      setStatus({ text: data.message, type: 'success' })
      setUrlInput('')
      if (window.innerWidth < 768) setSidebarOpen(false)
    } catch (err: unknown) {
      setStatus({ text: err instanceof Error ? err.message : 'Ingest failed', type: 'error' })
    }
  }

  const startNewChat = () => {
    const sid = newSessionId()
    localStorage.setItem('chatbot_session_id', sid)
    setSessionId(sid)
    setMessages([WELCOME])
  }

  const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/widget.js" data-url="${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/widget"></script>`

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          md:relative md:inset-auto md:z-auto
          ${sidebarOpen ? 'translate-x-0 md:w-72' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden'}
          w-72 transition-all duration-300 bg-slate-900 text-white flex flex-col flex-shrink-0
        `}
      >
        <div className="p-5 border-b border-slate-700/60 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
            🤖
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">BotKit AI</h1>
            <p className="text-slate-400 text-xs">GPT-4o mini · RAG</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* PDF Upload */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Upload PDF
            </p>
            <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl cursor-pointer transition-colors text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6H16a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Choose PDF
              <input type="file" accept=".pdf" className="hidden" onChange={handlePDFUpload} />
            </label>
          </div>

          {/* URL Ingest */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Add URL
            </p>
            <form onSubmit={handleURLIngest} className="space-y-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/faq"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
              />
              <button
                type="submit"
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm transition-colors"
              >
                Scrape &amp; Add
              </button>
            </form>
          </div>

          {/* Status badge */}
          {status.text && (
            <div
              className={`text-xs px-3 py-2 rounded-xl flex items-start gap-2 ${
                status.type === 'success'
                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40'
                  : status.type === 'error'
                  ? 'bg-red-900/40 text-red-400 border border-red-800/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700/40'
              }`}
            >
              <span className="flex-shrink-0">
                {status.type === 'success' ? '✓' : status.type === 'error' ? '✗' : '⟳'}
              </span>
              {status.text}
            </div>
          )}

          {/* Docs added this session */}
          {uploadedDocs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                This Session
              </p>
              <ul className="space-y-1.5">
                {uploadedDocs.map((doc, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400 flex-shrink-0">✓</span>
                    <span className="truncate" title={doc}>
                      {doc.length > 32 ? doc.slice(0, 32) + '…' : doc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer links */}
        <div className="p-4 border-t border-slate-700/60 space-y-2">
          <button
            onClick={() => setEmbedOpen(true)}
            className="flex items-center gap-2 w-full text-sm text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Get Embed Code
          </button>
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin Panel
          </Link>
          <button
            onClick={startNewChat}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            New Conversation
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h2 className="font-semibold text-gray-800 text-sm">Customer Support Chat</h2>
            <p className="text-gray-400 text-xs">Answers grounded in your uploaded documents</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span className="text-xs text-gray-400">Online</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex flex-col gap-1 max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'assistant' && (
                  <span className="text-xs text-gray-400 ml-1">AI Assistant</span>
                )}
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm shadow-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-1">
                    {msg.sources.map((src, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100"
                      >
                        📄 {src}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '160ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '320ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-3 max-w-3xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents…"
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-400 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white rounded-xl font-medium transition-colors text-sm flex items-center gap-2"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Embed code modal */}
      {embedOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Embed on Any Website</h3>
              <button onClick={() => setEmbedOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Paste this script tag before <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> on any page:
            </p>
            <div className="bg-gray-900 rounded-xl p-4 relative">
              <code className="text-xs text-green-400 break-all font-mono">{embedCode}</code>
              <button
                onClick={() => navigator.clipboard.writeText(embedCode)}
                className="absolute top-3 right-3 text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              A floating chat button will appear on your website. The widget connects to this chatbot.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
