# services/rag_service.py
from functools import lru_cache
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain.schema import Document
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from config import get_settings

settings = get_settings()

SYSTEM_PROMPT = """You are a helpful customer support assistant.
Answer the user's question using ONLY the information provided in the context below.
If the answer is not in the context, say "I don't have information about that — 
please contact our support team."

Be concise, friendly, and professional.

Context:
{context}
"""

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{question}"),
])


@lru_cache()
def get_embeddings():
    return OpenAIEmbeddings(
        model=settings.embedding_model,
        openai_api_key=settings.openrouter_api_key,
        openai_api_base=settings.openrouter_base_url,
    )


@lru_cache()
def get_vectorstore():
    return Chroma(
        persist_directory=settings.chroma_persist_dir,
        embedding_function=get_embeddings(),
        collection_name="business_docs",
    )


@lru_cache()
def get_llm():
    return ChatOpenAI(
        model=settings.chat_model,
        temperature=0.2,
        openai_api_key=settings.openrouter_api_key,
        openai_api_base=settings.openrouter_base_url,
    )


def add_documents(chunks: list[Document]) -> int:
    get_vectorstore().add_documents(chunks)
    return len(chunks)


def ask(question: str, history: list[dict] = []) -> dict:
    retriever = get_vectorstore().as_retriever(
        search_type="similarity",
        search_kwargs={"k": settings.retriever_k},
    )
    relevant_docs = retriever.invoke(question)

    # DEBUG BLOCK
    # print(f"🔍 Retrieved {len(relevant_docs)} chunks")
    # for i, doc in enumerate(relevant_docs):
    #     print(f"  Chunk {i}: {doc.page_content[:200]}")

    context_text = "\n\n---\n\n".join(doc.page_content for doc in relevant_docs)
    sources = list({doc.metadata.get("source", "Unknown") for doc in relevant_docs})

    chain = prompt | get_llm() | StrOutputParser()
    answer = chain.invoke({"context": context_text, "question": question})

    return {"answer": answer, "sources": sources}


def delete_by_source(source_name: str) -> int:
    vs = get_vectorstore()
    results = vs._collection.get(where={"source": source_name})
    ids = results["ids"]
    if ids:
        vs._collection.delete(ids=ids)
    return len(ids)


def reset_vectorstore() -> int:
    vs = get_vectorstore()
    count = vs._collection.count()
    vs._client.delete_collection("business_docs")
    get_vectorstore.cache_clear()
    return count


def get_document_count() -> int:
    return get_vectorstore()._collection.count()