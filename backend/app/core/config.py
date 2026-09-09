from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AI Receptionist"
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173"

    llm_provider: str = "mock"
    stt_provider: str = "mock"
    tts_provider: str = "mock"
    rag_provider: str = "mock"

    whisper_model_size: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
