# models.py — Defines the shape of data going IN and OUT of the API.
# Pydantic automatically validates types and gives clear error messages.

from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime


# ── Chat ─────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str                         # the user's question
    session_id: str = "default"          # groups messages per conversation
    # optional: send previous messages for multi-turn memory
    history: list[dict] = []             # e.g. [{"role":"user","content":"hi"}]


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]                   # doc names that backed this answer
    session_id: str


# ── Documents ────────────────────────────────────────────────────────────────

class URLIngestRequest(BaseModel):
    url: HttpUrl                         # Pydantic validates this is a real URL
    name: Optional[str] = None           # friendly name (defaults to URL)


class IngestResponse(BaseModel):
    success: bool
    message: str
    chunk_count: int


# ── Admin ────────────────────────────────────────────────────────────────────

class DocumentInfo(BaseModel):
    id: int
    name: str
    doc_type: str
    chunk_count: int
    created_at: datetime

    class Config:
        from_attributes = True           # allows building from SQLAlchemy rows


class ChatMessageInfo(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    sources: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
