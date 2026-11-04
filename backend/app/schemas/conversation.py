from typing import Any

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    session_id: str | None = None
    language: str = "en"
    # Whisper duration from the preceding transcribe call. Empty for typed questions.
    stt_ms: int | None = Field(default=None, ge=0)


class SourceChunk(BaseModel):
    source_id: str
    title: str
    snippet: str


class RelatedLink(BaseModel):
    url: str
    label: str


class NavigationRoute(BaseModel):
    name: str
    floor: str
    landmark: str
    directions: str
    image_url: str | None = None


class ContentCard(BaseModel):
    kind: str
    title: str
    description: str
    location: str | None = None
    event_time: str | None = None
    room: str | None = None
    url: str | None = None
    image_url: str | None = None


class AskResponse(BaseModel):
    session_id: str
    answer: str
    audio_base64: str | None = None
    links: list[RelatedLink] = []
    sources: list[SourceChunk] = []
    route: NavigationRoute | None = None
    card: ContentCard | None = None
    turn_id: int | None = None


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    language: str = "en"
    # When set, the synthesis duration is stored on that chat turn.
    turn_id: int | None = Field(default=None, ge=1)


class SpeakResponse(BaseModel):
    audio_base64: str | None = None


class TranscribeResponse(BaseModel):
    text: str
    language: str
    stt_ms: int


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
    stt_ms: int | None = None
    llm_ms: int | None = None
    tts_ms: int | None = None


class HistorySessionDetail(BaseModel):
    session_id: str
    turns: list[HistoryTurn]
