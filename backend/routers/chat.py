# routers/chat.py
# Handles the /chat endpoint — what the customer-facing widget calls.

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import ChatRequest, ChatResponse
from database import get_db, ChatMessage
from services import rag_service

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Main chat endpoint.
    - Receives user message + optional session_id
    - Runs RAG to find relevant docs + get an answer
    - Saves both question and answer to the database
    - Returns the answer and source document names
    """
    # Guard: make sure there are documents loaded before chatting
    if rag_service.get_document_count() == 0:
        raise HTTPException(
            status_code=400,
            detail="No documents have been uploaded yet. Please add documents first.",
        )

    # Run RAG
    result = rag_service.ask(
        question=request.message,
        history=request.history,
    )

    sources_json = json.dumps(result["sources"])

    # Save user message to DB
    db.add(ChatMessage(
        session_id=request.session_id,
        role="user",
        content=request.message,
    ))

    # Save assistant reply to DB
    db.add(ChatMessage(
        session_id=request.session_id,
        role="assistant",
        content=result["answer"],
        sources=sources_json,
    ))
    db.commit()

    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        session_id=request.session_id,
    )
