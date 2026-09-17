from typing import Any

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    session_id: str | None = None


class SourceChunk(BaseModel):
    source_id: str
    title: str
    snippet: str


class RelatedLink(BaseModel):
    url: str
    label: str


class AskResponse(BaseModel):
    session_id: str
    answer: str
    audio_base64: str | None = None
    links: list[RelatedLink] = []
    sources: list[SourceChunk] = []


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class SpeakResponse(BaseModel):
    audio_base64: str | None = None


class TranscribeResponse(BaseModel):
    text: str


class HistorySessionSummary(BaseModel):
    session_id: str
    started_at: str
    updated_at: str
    turn_count: int
    last_question: str | None = None


class HistoryTurn(BaseModel):
    id: int
    session_id: str
    question: str
    answer: str
    retrieved: list[dict[str, Any]]
    system_prompt: str
    user_prompt: str
    created_at: str


class HistorySessionDetail(BaseModel):
    session_id: str
    turns: list[HistoryTurn]
