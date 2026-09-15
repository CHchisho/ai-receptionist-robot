from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.feedback import list_feedback, save_feedback

router = APIRouter(prefix="/feedback")


class FeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""
    session_id: str | None = None


@router.post("")
def submit_feedback(feedback: FeedbackRequest):
    saved_feedback = save_feedback(
        feedback.rating,
        feedback.comment,
        feedback.session_id,
    )

    return {
        "message": "Feedback received",
        **saved_feedback,
    }

@router.get("")
def get_feedback():
    return list_feedback()