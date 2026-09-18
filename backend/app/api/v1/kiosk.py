from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.knowledge import store


router = APIRouter(prefix="/kiosk")


class KioskModeRequest(BaseModel):
    mode: Literal["chat", "survey"]


@router.get("/mode")
def get_kiosk_mode():
    return {"mode": store.get_kiosk_mode()}


@router.put("/mode")
def update_kiosk_mode(request: KioskModeRequest):
    mode = store.set_kiosk_mode(request.mode)
    return {"mode": mode}