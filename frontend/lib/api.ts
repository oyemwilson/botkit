const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function handleResponse(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export async function sendMessage(
  message: string,
  sessionId: string,
  history: Array<{ role: string; content: string }> = []
) {
  return handleResponse(
    await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId, history }),
    })
  )
}

export async function uploadPDF(file: File) {
  const form = new FormData()
  form.append('file', file)
  return handleResponse(
    await fetch(`${API_URL}/documents/upload-pdf`, { method: 'POST', body: form })
  )
}

export async function ingestURL(url: string, name?: string) {
  return handleResponse(
    await fetch(`${API_URL}/documents/ingest-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, ...(name && { name }) }),
    })
  )
}

export async function getDocuments(adminKey: string) {
  const res = await fetch(`${API_URL}/admin/documents`, {
    headers: { 'X-Admin-Key': adminKey },
  })
  if (res.status === 401) throw new Error('Invalid admin key')
  return handleResponse(res)
}

export async function deleteDocument(id: number, adminKey: string) {
  const res = await fetch(`${API_URL}/admin/documents/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (res.status === 401) throw new Error('Invalid admin key')
  return handleResponse(res)
}

export async function getChatHistory(
  adminKey: string,
  sessionId?: string,
  limit = 200
) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (sessionId) params.set('session_id', sessionId)
  const res = await fetch(`${API_URL}/admin/chat-history?${params}`, {
    headers: { 'X-Admin-Key': adminKey },
  })
  if (res.status === 401) throw new Error('Invalid admin key')
  return handleResponse(res)
}

export async function resetVectorstore(adminKey: string) {
  const res = await fetch(`${API_URL}/admin/reset-vectorstore`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminKey },
  })
  if (res.status === 401) throw new Error('Invalid admin key')
  return handleResponse(res)
}

export async function getStats(adminKey: string) {
  const res = await fetch(`${API_URL}/admin/stats`, {
    headers: { 'X-Admin-Key': adminKey },
  })
  if (res.status === 401) throw new Error('Invalid admin key')
  return handleResponse(res)
}

export function parseSources(raw: string | null): string[] {
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}
