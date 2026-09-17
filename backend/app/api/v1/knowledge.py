from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.dependencies import get_rag_provider
from app.schemas.knowledge import (
    KnowledgeChunkListResponse,
    KnowledgeChunkResponse,
    KnowledgeSourceListResponse,
    KnowledgeSourceResponse,
    KnowledgeStatusResponse,
    SourceLabelRequest,
    UrlIngestRequest,
)
from app.services.knowledge import indexer, store
from app.services.rag.base import RagProvider
from app.services.rag.qdrant import QdrantRagProvider

router = APIRouter()


def _as_qdrant(rag: RagProvider) -> QdrantRagProvider:
    if not isinstance(rag, QdrantRagProvider):
        raise HTTPException(status_code=501, detail="Knowledge ingest requires RAG_PROVIDER=qdrant")
    return rag


@router.get("/knowledge/status", response_model=KnowledgeStatusResponse)
def knowledge_status() -> KnowledgeStatusResponse:
    payload = indexer.status()
    return KnowledgeStatusResponse(indexing=payload["indexing"], error=payload["error"])


@router.get("/knowledge/sources", response_model=KnowledgeSourceListResponse)
def list_sources(rag: RagProvider = Depends(get_rag_provider)) -> KnowledgeSourceListResponse:
    if not isinstance(rag, QdrantRagProvider):
        return KnowledgeSourceListResponse(items=[], indexing=False)
    items = [KnowledgeSourceResponse(**item) for item in indexer.catalog(rag)]
    return KnowledgeSourceListResponse(items=items, indexing=indexer.status()["indexing"])


@router.post("/knowledge/sources/url", response_model=KnowledgeSourceResponse)
def ingest_url(
    payload: UrlIngestRequest,
    rag: RagProvider = Depends(get_rag_provider),
) -> KnowledgeSourceResponse:
    item = indexer.add_url(_as_qdrant(rag), str(payload.url), payload.label)
    return KnowledgeSourceResponse(**item)


@router.post("/knowledge/sources/file", response_model=KnowledgeSourceResponse)
async def ingest_file(
    file: UploadFile = File(...),
    label: str | None = Form(default=None),
    rag: RagProvider = Depends(get_rag_provider),
) -> KnowledgeSourceResponse:
    data = await file.read()
    item = indexer.add_file(_as_qdrant(rag), file.filename or "upload.txt", data, label=label)
    return KnowledgeSourceResponse(**item)


@router.patch("/knowledge/sources", response_model=KnowledgeSourceResponse)
def rename_source(
    payload: SourceLabelRequest,
    rag: RagProvider = Depends(get_rag_provider),
) -> KnowledgeSourceResponse:
    try:
        item = indexer.rename_source(_as_qdrant(rag), payload.source_id, payload.title.strip())
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Source not found") from exc
    return KnowledgeSourceResponse(**item)


@router.delete("/knowledge/sources")
def delete_source(
    source_id: str = Query(...),
    rag: RagProvider = Depends(get_rag_provider),
) -> dict:
    indexer.remove_source(_as_qdrant(rag), source_id)
    return {"ok": True}


@router.get("/knowledge/file")
def download_file(source_id: str = Query(...)) -> FileResponse:
    record = store.get_source(source_id)
    if record is None or not record.filename:
        raise HTTPException(status_code=404, detail="File not found")
    path = settings.knowledge_documents_path / record.filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=record.filename)


@router.get("/knowledge/chunks", response_model=KnowledgeChunkListResponse)
def list_chunks(
    source_id: str = Query(...),
    rag: RagProvider = Depends(get_rag_provider),
) -> KnowledgeChunkListResponse:
    chunks = _as_qdrant(rag).list_chunks(source_id)
    return KnowledgeChunkListResponse(
        items=[
            KnowledgeChunkResponse(
                source_id=chunk.source_id,
                chunk_index=chunk.chunk_index,
                text=chunk.text,
            )
            for chunk in chunks
        ]
    )


@router.post("/knowledge/reindex", response_model=KnowledgeStatusResponse)
def reindex(rag: RagProvider = Depends(get_rag_provider)) -> KnowledgeStatusResponse:
    started = indexer.start_reindex(_as_qdrant(rag))
    payload = indexer.status()
    if not started and payload["indexing"]:
        return KnowledgeStatusResponse(indexing=True, error=None)
    return KnowledgeStatusResponse(indexing=payload["indexing"], error=payload["error"])
