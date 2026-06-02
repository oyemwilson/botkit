# config.py — All configuration lives here.
# Every other file imports from here, so you only change values in ONE place.

from pydantic_settings import BaseSettings   # pip install pydantic-settings
from functools import lru_cache


class Settings(BaseSettings):
    openrouter_api_key: str          # ← rename from openai_api_key
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    embedding_model: str = "openai/text-embedding-3-small"
    chat_model: str = "openai/gpt-4o-mini"
    retriever_k: int = 5
    chroma_persist_dir: str = "./chroma_db"
    database_url: str = "sqlite:///./chatbot.db"
    admin_secret_key: str = "change-me-in-production"

    class Config:
        env_file = ".env"          # reads your .env file automatically
        env_file_encoding = "utf-8"


# @lru_cache means this function only runs ONCE — efficient singleton pattern
@lru_cache()
def get_settings() -> Settings:
    return Settings()
