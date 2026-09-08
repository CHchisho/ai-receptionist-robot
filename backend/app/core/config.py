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

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
