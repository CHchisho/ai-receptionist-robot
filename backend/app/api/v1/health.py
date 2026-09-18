from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "llm": settings.llm_provider,
        "stt": settings.stt_provider,
        "tts": settings.tts_provider,
        "rag": settings.rag_provider,
    }
