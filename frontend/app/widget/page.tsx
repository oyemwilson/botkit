'use client'

import { useState, useEffect, useRef } from 'react'
import { sendMessage } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export default function WidgetPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: 'Hi! How can I help you today?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState('widget_default')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let sid = sessionStorage.getItem('widget_session_id')
    if (!sid) {
      sid = `widget_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      sessionStorage.setItem('widget_session_id', sid)
    }
    setSessionId(sid)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() }
    const history = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-8)
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
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-base flex-shrink-0">
          🤖
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">AI Assistant</div>
          <div className="text-xs text-blue-200">Powered by BotKit AI</div>
        </div>
        <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0" title="Online" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="flex flex-col gap-1 max-w-[87%]">
              <div
                className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-0.5">
                  {msg.sources.map((src, i) => (
                    <span key={i} className="text-xs text-gray-400">
                      📄 {src}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3 py-2.5">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message…"
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="w-9 h-9 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
