from fastapi import APIRouter

from app.api.v1 import conversation, feedback, health, history, knowledge, kiosk

router = APIRouter()
router.include_router(health.router, tags=["health"])
router.include_router(conversation.router, tags=["conversation"])
router.include_router(knowledge.router, tags=["knowledge"])
router.include_router(history.router, tags=["history"])
router.include_router(feedback.router, tags=["feedback"])
router.include_router(kiosk.router, tags=["kiosk"])
