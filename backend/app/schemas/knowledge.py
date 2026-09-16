from pydantic import BaseModel, Field, HttpUrl


class UrlIngestRequest(BaseModel):
    url: HttpUrl
    label: str | None = Field(default=None, max_length=200)


class SourceLabelRequest(BaseModel):
    source_id: str
    title: str = Field(min_length=1, max_length=200)


class KnowledgeSourceResponse(BaseModel):
    source_id: str
    title: str
    kind: str
    url: str | None = None
    filename: str | None = None
    chunk_count: int = 0
    stale: bool = False
    stale_reason: str | None = None


class KnowledgeSourceListResponse(BaseModel):
    items: list[KnowledgeSourceResponse]
    indexing: bool = False


class KnowledgeStatusResponse(BaseModel):
    indexing: bool
    error: str | None = None


class KnowledgeChunkResponse(BaseModel):
    source_id: str
    chunk_index: int
    text: str


class KnowledgeChunkListResponse(BaseModel):
    items: list[KnowledgeChunkResponse]
