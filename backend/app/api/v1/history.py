from fastapi import APIRouter

from app.schemas.conversation import HistorySessionDetail, HistorySessionSummary, HistoryTurn
from app.services.knowledge import store

router = APIRouter()


@router.get("/history/sessions", response_model=list[HistorySessionSummary])
def list_sessions() -> list[HistorySessionSummary]:
    return [HistorySessionSummary(**row) for row in store.list_sessions()]


@router.get("/history/sessions/{session_id}", response_model=HistorySessionDetail)
def session_detail(session_id: str) -> HistorySessionDetail:
    turns = [HistoryTurn(**row) for row in store.list_turns(session_id)]
    return HistorySessionDetail(session_id=session_id, turns=turns)
