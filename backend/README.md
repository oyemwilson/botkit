# 🤖 AI Business Chatbot — Backend

> FastAPI + LangChain + ChromaDB + OpenAI  
> RAG-powered chatbot backend you can plug any frontend into.

---

## 🗂 Project Structure

```
backend/
├── main.py                   ← Entry point. Start the server here.
├── config.py                 ← All environment variable settings
├── database.py               ← SQLite tables (chat history + document records)
├── models.py                 ← Request/response data shapes
├── requirements.txt          ← Python dependencies
├── .env.example              ← Copy this to .env and fill in your keys
│
├── routers/
│   ├── chat.py               ← POST /chat
│   ├── documents.py          ← POST /documents/upload-pdf, /documents/ingest-url
│   └── admin.py              ← GET  /admin/documents, /admin/chat-history, /admin/stats
│
└── services/
    ├── document_service.py   ← PDF & URL loading + text chunking
    └── rag_service.py        ← Embeddings, ChromaDB, LLM chain
```

---

## ⚡ Quick Start

### 1. Install Python (if you don't have it)
Download Python 3.11+ from https://python.org

### 2. Set up a virtual environment
```bash
# Create
python -m venv venv

# Activate (Mac/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Add your API key
```bash
cp .env.example .env
```
Open `.env` and set your `OPENAI_API_KEY`.  
Get one at https://platform.openai.com/api-keys

### 5. Start the server
```bash
uvicorn main:app --reload
```

### 6. Explore the API
Open http://localhost:8000/docs in your browser.  
FastAPI generates an interactive UI where you can test every endpoint.

---

## 📡 API Endpoints

### Chat
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/chat` | Send a message, get an AI answer |

**Request body:**
```json
{
  "message": "What is your return policy?",
  "session_id": "user-abc123"
}
```

**Response:**
```json
{
  "answer": "Our return policy allows returns within 30 days...",
  "sources": ["returns-policy.pdf"],
  "session_id": "user-abc123"
}
```

---

### Documents
| Method | URL | Description |
|--------|-----|-------------|
| POST | `/documents/upload-pdf` | Upload a PDF file |
| POST | `/documents/ingest-url` | Scrape a URL |

---

### Admin (requires `X-Admin-Key` header)
| Method | URL | Description |
|--------|-----|-------------|
| GET | `/admin/documents` | List all uploaded docs |
| DELETE | `/admin/documents/{id}` | Remove a document record |
| GET | `/admin/chat-history` | View all chat messages |
| GET | `/admin/stats` | Dashboard stats |

To call admin endpoints, add this header to your requests:
```
X-Admin-Key: <your ADMIN_SECRET_KEY from .env>
```

---

## 🏗 How RAG Works (Plain English)

```
Upload phase:
  PDF/URL → extract text → split into chunks → embed (convert to numbers) → store in ChromaDB

Chat phase:
  User question → embed question → find similar chunks in ChromaDB
               → send chunks + question to GPT → GPT answers using YOUR docs only
```

This is why it doesn't hallucinate: GPT can only use information from the documents you upload.

---

## 💰 Cost Estimate

| Component | Model | Approx Cost |
|-----------|-------|-------------|
| Embeddings | text-embedding-3-small | $0.02 / million tokens |
| Chat | gpt-4o-mini | $0.15 / million input tokens |
| Vector DB | ChromaDB (local) | **Free** |
| Database | SQLite (local) | **Free** |

A typical small business chatbot (100 docs, 1000 chats/month) costs **< $5/month**.

---

## 🔧 Customisation

**Change the AI model:** Edit `CHAT_MODEL` in `.env`  
**Change chunk size:** Edit `chunk_size` in `services/document_service.py`  
**Change how many results to retrieve:** Edit `RETRIEVER_K` in `.env`  
**Change the system prompt:** Edit `SYSTEM_PROMPT` in `services/rag_service.py`

---

## 🚀 Deploying to Production

1. **Railway.app** or **Render.com** — connect your GitHub repo, set env vars, done.
2. Set `CORS allow_origins` in `main.py` to your actual frontend URL.
3. Replace `ADMIN_SECRET_KEY` with a strong random key.

---

## 🧩 Embeddable Widget

Your frontend will expose a `<script>` tag that businesses paste into their site:

```html
<script src="https://your-domain.com/widget.js" data-chatbot-id="YOUR_ID"></script>
```

This is handled in the Next.js frontend (coming next).
