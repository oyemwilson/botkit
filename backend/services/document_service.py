# services/document_service.py
# Responsible for loading documents (PDF or URL) and splitting them into chunks.
# "Chunks" are small pieces of text (~500 words each) that can be searched efficiently.

import io
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, WebBaseLoader
from langchain.schema import Document
import tempfile
import os


# ── Text Splitter ─────────────────────────────────────────────────────────────
# chunk_size=800 chars ≈ ~150 words — small enough to be precise, big enough for context
# chunk_overlap=100 means adjacent chunks share 100 chars so answers don't get cut off

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100,
    separators=["\n\n", "\n", ".", " "],  # tries to split on paragraphs first
)


def load_pdf(file_bytes: bytes, filename: str) -> list[Document]:
    """
    Takes raw PDF bytes (from an uploaded file), saves to a temp file,
    extracts text with PyPDF, then splits into chunks.
    Returns a list of LangChain Document objects.
    """
    # Write to a temp file because PyPDFLoader needs a file path
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        loader = PyPDFLoader(tmp_path)
        pages = loader.load()                   # each page becomes a Document

        # Tag every chunk with the source filename so we can show it in the UI
        for page in pages:
            page.metadata["source"] = filename

        chunks = text_splitter.split_documents(pages)
        return chunks
    finally:
        os.unlink(tmp_path)                     # always delete the temp file


def load_url(url: str, name: str) -> list[Document]:
    """
    Fetches a web page, strips HTML tags, then splits into chunks.
    Returns a list of LangChain Document objects.
    """
    loader = WebBaseLoader(web_paths=[url])
    docs = loader.load()

    print(f"\n{'='*60}")
    print(f"[URL INGEST] URL    : {url}")
    print(f"[URL INGEST] Name   : {name}")
    print(f"[URL INGEST] Pages  : {len(docs)}")
    for i, doc in enumerate(docs):
        content_preview = doc.page_content.strip()[:500] or "(empty)"
        print(f"[URL INGEST] Page {i} ({len(doc.page_content)} chars):\n{content_preview}")
    print(f"{'='*60}\n")

    for doc in docs:
        doc.metadata["source"] = name or url    # label the source

    chunks = text_splitter.split_documents(docs)
    print(f"[URL INGEST] Split into {len(chunks)} chunks")
    return chunks
