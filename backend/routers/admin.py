# routers/admin.py
# Admin-only endpoints — protected by a secret key in the request header.
# These power the admin panel in your frontend.

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
from models import DocumentInfo, ChatMessageInfo
from database import get_db, UploadedDocument, ChatMessage
from services import rag_service
from config import get_settings

settings = get_settings()

router = APIRouter(prefix="/admin", tags=["Admin"])


def verify_admin(x_admin_key: Optional[str] = Header(None)):
    """
    Simple API-key auth. The frontend must send this header:
      X-Admin-Key: <your ADMIN_SECRET_KEY from .env>
    """
    if x_admin_key != settings.admin_secret_key:
        raise HTTPException(status_code=401, detail="Invalid or missing admin key.")


# ── Documents ────────────────────────────────────────────────────────────────

@router.get("/documents", response_model=list[DocumentInfo])
def list_documents(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),        # _ means "run the check, ignore the return value"
):
    """Returns all documents that have been uploaded."""
    return db.query(UploadedDocument).order_by(UploadedDocument.created_at.desc()).all()


@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    doc = db.query(UploadedDocument).filter(UploadedDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    chunks_deleted = rag_service.delete_by_source(doc.name)
    db.delete(doc)
    db.commit()
    return {"message": f"Document '{doc.name}' removed ({chunks_deleted} chunks deleted from vector store)."}


@router.post("/reset-vectorstore")
def reset_vectorstore(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Wipes the entire ChromaDB vector store. Use when documents were deleted without cleaning vectors."""
    count = rag_service.reset_vectorstore()
    return {"message": f"Vector store cleared. Removed {count} chunks.", "chunks_removed": count}


# ── Chat History ─────────────────────────────────────────────────────────────

@router.get("/chat-history", response_model=list[ChatMessageInfo])
def get_chat_history(
    session_id: Optional[str] = None,       # filter by session if provided
    limit: int = 100,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Returns recent chat messages. Optionally filter by session_id."""
    query = db.query(ChatMessage).order_by(ChatMessage.created_at.desc())
    if session_id:
        query = query.filter(ChatMessage.session_id == session_id)
    return query.limit(limit).all()


# ── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Quick dashboard stats."""
    total_docs = db.query(UploadedDocument).count()
    total_messages = db.query(ChatMessage).count()
    total_sessions = db.query(ChatMessage.session_id).distinct().count()
    vector_chunks = rag_service.get_document_count()

    return {
        "total_documents_uploaded": total_docs,
        "total_chunks_in_vector_db": vector_chunks,
        "total_chat_messages": total_messages,
        "total_unique_sessions": total_sessions,
    }
