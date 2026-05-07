from langchain_core.language_models import BaseChatModel
from ..config.settings import settings

_llm_instance: BaseChatModel = None


def get_llm() -> BaseChatModel:
    """Return a cached LLM instance based on LLM_PROVIDER setting."""
    global _llm_instance
    if _llm_instance is not None:
        return _llm_instance

    if settings.LLM_PROVIDER == "ollama":
        from langchain_ollama import ChatOllama
        _llm_instance = ChatOllama(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=settings.OLLAMA_TEMPERATURE,
        )
        print(f"🦙 LLM: Ollama ({settings.OLLAMA_MODEL}) @ {settings.OLLAMA_BASE_URL}")
    else:
        from langchain_openai import ChatOpenAI
        _llm_instance = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            temperature=0,
            api_key=settings.OPENAI_API_KEY,
        )
        print(f"🤖 LLM: OpenAI ({settings.OPENAI_MODEL})")

    return _llm_instance


def reset_llm() -> None:
    """Reset the cached LLM instance (useful for testing or config changes)."""
    global _llm_instance
    _llm_instance = None
