from pathlib import Path
import sys

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py → project root
_ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=None if "pytest" in sys.modules else _ROOT_ENV,
        extra="ignore",
    )

    app_name: str = "AI Receptionist"
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173"

    llm_provider: str = "mock"
    stt_provider: str = "mock"
    tts_provider: str = "mock"
    rag_provider: str = "mock"

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.2:1b"

    whisper_model_size: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    piper_model_path: str = "models/piper/en_US-lessac-medium.onnx"

    qdrant_url: str = "http://127.0.0.1:6333"
    qdrant_collection: str = "lena_knowledge"
    ollama_embed_model: str = "nomic-embed-text"
    knowledge_documents_dir: str = "knowledge/documents"
    knowledge_urls: str = ""
    knowledge_refresh: bool = False
    sqlite_path: str = "knowledge/app.sqlite"
    rag_top_k: int = 5
    rag_score_threshold: float = 0.25
    conversation_history_turns: int = 6

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def knowledge_url_list(self) -> list[str]:
        return [item.strip() for item in self.knowledge_urls.split(",") if item.strip()]

    @property
    def knowledge_documents_path(self) -> Path:
        path = Path(self.knowledge_documents_dir)
        if path.is_absolute():
            return path
        return _ROOT_ENV.parent / path

    @property
    def sqlite_file(self) -> Path:
        path = Path(self.sqlite_path)
        if path.is_absolute():
            return path
        return _ROOT_ENV.parent / path


settings = Settings()
