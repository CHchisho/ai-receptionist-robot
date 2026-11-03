import base64

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from app.core.dependencies import get_tts_provider
from app.services.knowledge import store
from app.services.tts.base import TtsProvider
from app.services.tts.welcome import replace_welcome_audio, welcome_clip


router = APIRouter(prefix="/kiosk")


class KioskModeRequest(BaseModel):
    mode: Literal["chat", "survey"]


class WelcomeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


@router.get("/mode")
def get_kiosk_mode():
    return {"mode": store.get_kiosk_mode()}


@router.put("/mode")
def update_kiosk_mode(request: KioskModeRequest):
    mode = store.set_kiosk_mode(request.mode)
    return {"mode": mode}


@router.get("/settings")
def get_kiosk_settings():
    return {
        "mode": store.get_kiosk_mode(),
        "welcome_text": store.get_welcome_text(),
    }


@router.get("/welcome")
def get_welcome_message():
    text, audio = welcome_clip()
    return {
        "text": text,
        "audio_base64": base64.b64encode(audio).decode("ascii") if audio else None,
    }


@router.put("/welcome")
def update_welcome_message(
    request: WelcomeRequest,
    tts: TtsProvider = Depends(get_tts_provider),
):
    cleaned = request.text.strip()
    if not cleaned:
        raise HTTPException(status_code=422, detail="Welcome message is empty.")
    text = replace_welcome_audio(tts, cleaned)
    return {"text": text}
