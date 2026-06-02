# database.py — Sets up SQLite to store chat history & document metadata.
# SQLite is a file-based database that needs ZERO setup or server — perfect for portfolios.

from datetime import datetime
from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from config import get_settings

settings = get_settings()

# Create the database engine (the "connection" to the file)
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # required for SQLite + FastAPI
)

# SessionLocal is a factory — call it to get a fresh DB session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


# ── Table 1: Every message ever sent/received ───────────────────────────────
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)          # groups messages per conversation
    role = Column(String)                             # "user" or "assistant"
    content = Column(Text)
    sources = Column(Text, nullable=True)             # JSON list of source doc names
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Table 2: Every document that has been uploaded ──────────────────────────
class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)                             # filename or URL
    doc_type = Column(String)                         # "pdf" or "url"
    chunk_count = Column(Integer)                     # how many chunks were stored
    created_at = Column(DateTime, default=datetime.utcnow)


def create_tables():
    """Creates all tables in the database if they don't already exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """
    FastAPI dependency — gives each request its own DB session,
    then closes it automatically when the request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
