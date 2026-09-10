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


class TranscribeResponse(BaseModel):
    text: str
