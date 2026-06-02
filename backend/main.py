# main.py — The entry point. Run this file to start the server.
#
# HOW TO RUN:
#   1. pip install -r requirements.txt
#   2. cp .env.example .env  →  fill in your OPENAI_API_KEY
#   3. uvicorn main:app --reload
#   4. Open http://localhost:8000/docs  ← interactive API explorer (auto-generated!)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from routers import chat, documents, admin

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Business Chatbot API",
    description="RAG-powered chatbot backend. Upload docs, ask questions.",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# CORS allows your Next.js frontend (on a different port/domain) to call this API.
# In production, replace "*" with your actual frontend URL.
import os
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──────────────────────────────────────────────────────────
# Each router handles a group of related endpoints.
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(admin.router)


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Runs once when the server starts — creates DB tables if they don't exist."""
    create_tables()
    print("✅  Database tables ready.")
    print("✅  ChromaDB vector store loaded.")
    print("🚀  Server is running at http://localhost:8000")
    print("📖  API docs at       http://localhost:8000/docs")


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    """Simple ping — confirms the server is alive."""
    return {"status": "ok", "message": "AI Chatbot API is running."}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
