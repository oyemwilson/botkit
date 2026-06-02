# routers/documents.py
# Handles uploading PDFs and ingesting URLs into the vector store.

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from models import URLIngestRequest, IngestResponse
from database import get_db, UploadedDocument
from services import document_service, rag_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload-pdf", response_model=IngestResponse)
async def upload_pdf(
    file: UploadFile = File(...),          # FastAPI handles multipart form automatically
    db: Session = Depends(get_db),
):
    """
    Upload a PDF file.
    - Reads the PDF bytes
    - Splits into chunks
    - Embeds and stores in ChromaDB
    - Records the upload in SQLite
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Read the file bytes
    file_bytes = await file.read()

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Load + chunk
    chunks = document_service.load_pdf(file_bytes, filename=file.filename)

    if not chunks:
        raise HTTPException(status_code=400, detail="Could not extract text from PDF.")

    # Store in vector DB
    chunk_count = rag_service.add_documents(chunks)

    # Record in SQLite
    db.add(UploadedDocument(
        name=file.filename,
        doc_type="pdf",
        chunk_count=chunk_count,
    ))
    db.commit()

    return IngestResponse(
        success=True,
        message=f"Successfully processed '{file.filename}'",
        chunk_count=chunk_count,
    )


@router.post("/ingest-url", response_model=IngestResponse)
async def ingest_url(
    request: URLIngestRequest,
    db: Session = Depends(get_db),
):
    """
    Provide a URL → scrapes the page → chunks → embeds → stores.
    Great for FAQ pages, product pages, knowledge base articles, etc.
    """
    url_str = str(request.url)
    name = request.name or url_str

    # Load + chunk
    chunks = document_service.load_url(url=url_str, name=name)

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail=f"Could not extract content from '{url_str}'. "
                   "Make sure the page is publicly accessible.",
        )

    total_chars = sum(len(c.page_content.strip()) for c in chunks)
    if total_chars < 300:
        raise HTTPException(
            status_code=422,
            detail=f"Only {total_chars} characters were scraped from that URL — the page likely requires "
                   "JavaScript or a login to load. For Google Docs, use the export URL "
                   "(...export?format=txt) or upload a PDF instead.",
        )

    # Store in vector DB
    chunk_count = rag_service.add_documents(chunks)

    # Record in SQLite
    db.add(UploadedDocument(
        name=name,
        doc_type="url",
        chunk_count=chunk_count,
    ))
    db.commit()

    return IngestResponse(
        success=True,
        message=f"Successfully scraped and processed '{url_str}'",
        chunk_count=chunk_count,
    )
