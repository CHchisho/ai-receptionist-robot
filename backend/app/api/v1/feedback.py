from fastapi import APIRouter
from pydantic import BaseModel

from app.services.feedback import save_feedback

router = APIRouter(prefix="/feedback")


class FeedbackRequest(BaseModel):
    rating: int
    comment: str = ""


@router.post("")
def submit_feedback(feedback: FeedbackRequest):
    saved_feedback = save_feedback(feedback.rating, feedback.comment)

    return {
        "message": "Feedback received",
        **saved_feedback,
    }