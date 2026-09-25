import base64
import re
from uuid import uuid4

from app.core.config import settings
from app.schemas.conversation import (
    AskRequest,
    AskResponse,
    ContentCard,
    NavigationRoute,
    RelatedLink,
    SourceChunk,
)
from app.services.catalog import CatalogHit, CatalogProvider, NoOpCatalogProvider
from app.services.knowledge import store
from app.services.llm.base import LlmProvider
from app.services.llm.prompt import SYSTEM_PROMPT, UNKNOWN_ANSWER, build_user_prompt
from app.services.navigation.base import Location, NavigationProvider
from app.services.rag.base import RagProvider, RetrievedChunk
from app.services.tts.base import TtsProvider

_REFERENTIAL = re.compile(
    r"\b(there|that|it|here|them)\b|"
    r"^(and\b|what about\b|how about\b|how do i get\b)",
    re.IGNORECASE,
)


class ConversationService:
    """Question → route (nav / catalog / RAG) → LLM only if facts exist → TTS."""

    def __init__(
        self,
        llm: LlmProvider,
        rag: RagProvider,
        tts: TtsProvider,
        navigation: NavigationProvider,
        catalog: CatalogProvider | None = None,
    ) -> None:
        self._llm = llm
        self._rag = rag
        self._tts = tts
        self._navigation = navigation
        self._catalog = catalog or NoOpCatalogProvider()

    def ask(self, payload: AskRequest) -> AskResponse:
        session_id = payload.session_id or str(uuid4())
        history = store.list_turns(session_id)[-settings.conversation_history_turns :]

        location, catalog_hit, chunks = self._route(payload.text, history)

        if not chunks:
            answer = UNKNOWN_ANSWER
            user_prompt = build_user_prompt(payload.text, [], history)
        else:
            user_prompt = build_user_prompt(payload.text, chunks, history)
            answer = self._llm.generate(
                question=payload.text,
                context=chunks,
                history=history,
            )

        audio = self._tts.synthesize(answer)
        store.save_turn(
            session_id=session_id,
            question=payload.text,
            answer=answer,
            retrieved=[
                {
                    "source_id": chunk.source_id,
                    "title": chunk.title,
                    "snippet": chunk.snippet,
                    "url": chunk.url,
                }
                for chunk in chunks
            ],
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
        )
        return AskResponse(
            session_id=session_id,
            answer=answer,
            audio_base64=base64.b64encode(audio).decode("ascii") if audio else None,
            links=_unique_links(chunks),
            sources=[
                SourceChunk(source_id=c.source_id, title=c.title, snippet=c.snippet)
                for c in chunks
            ],
            route=_route_from_location(location) if location else None,
            card=_card_from_hit(catalog_hit) if catalog_hit else None,
        )

    def _route(
        self,
        question: str,
        history: list[dict],
    ) -> tuple[Location | None, CatalogHit | None, list[RetrievedChunk]]:
        location = self._find_location(question, history)
        if location:
            return location, None, [_location_chunk(location)]

        catalog_hit = self._find_catalog(question, history)
        if catalog_hit:
            return None, catalog_hit, [_catalog_chunk(catalog_hit)]

        chunks = _usable_chunks(self._rag.search(question))
        if not chunks and history:
            combined = f"{history[-1]['question']} {question}"
            chunks = _usable_chunks(self._rag.search(combined))
        return None, None, chunks

    def _find_location(self, question: str, history: list[dict]) -> Location | None:
        location = self._navigation.find(question)
        if location:
            return location
        if not history or not _is_referential(question):
            return None
        last_name = _last_navigation_name(history[-1].get("retrieved") or [])
        if last_name:
            return self._navigation.find(last_name)
        return None

    def _find_catalog(self, question: str, history: list[dict]) -> CatalogHit | None:
        hit = self._catalog.find(question)
        if hit:
            return hit
        if history:
            return self._catalog.find(f"{history[-1]['question']} {question}")
        return None


def _usable_chunks(chunks: list[RetrievedChunk]) -> list[RetrievedChunk]:
    return [chunk for chunk in chunks if (chunk.snippet or "").strip()]


def _is_referential(question: str) -> bool:
    return bool(_REFERENTIAL.search(question.strip()))


def _last_navigation_name(retrieved: list) -> str | None:
    for item in reversed(retrieved):
        source_id = str(item.get("source_id") or "")
        if source_id.startswith("navigation:"):
            title = str(item.get("title") or "")
            prefix = "Indoor navigation: "
            if title.startswith(prefix):
                return title[len(prefix) :]
            return source_id.split(":", 1)[1].replace("-", " ")
    return None


def _location_chunk(location: Location) -> RetrievedChunk:
    return RetrievedChunk(
        source_id=f"navigation:{location.name.lower().replace(' ', '-')}",
        title=f"Indoor navigation: {location.name}",
        snippet=(
            f"{location.name} is on the {location.floor}. "
            f"Landmark: {location.landmark}. Directions: {location.directions}"
        ),
    )


def _catalog_chunk(hit: CatalogHit) -> RetrievedChunk:
    if hit.kind == "event":
        snippet = (
            f"Event: {hit.description} Time: {hit.event_time or 'unspecified'}. "
            f"Room: {hit.room or 'unspecified'}."
        )
    else:
        snippet = f"Demo: {hit.description} Location: {hit.location or 'unspecified'}."
    return RetrievedChunk(
        source_id=hit.source_id,
        title=hit.title,
        snippet=snippet,
        url=hit.url,
        label=hit.title,
    )


def _route_from_location(location: Location) -> NavigationRoute:
    return NavigationRoute(
        name=location.name,
        floor=location.floor,
        landmark=location.landmark,
        directions=location.directions,
    )


def _card_from_hit(hit: CatalogHit) -> ContentCard:
    return ContentCard(
        kind=hit.kind,
        title=hit.title,
        description=hit.description,
        location=hit.location,
        event_time=hit.event_time,
        room=hit.room,
        url=hit.url,
    )


def _unique_links(chunks) -> list[RelatedLink]:
    links: list[RelatedLink] = []
    seen: set[str] = set()
    for chunk in chunks:
        url = getattr(chunk, "url", None)
        if not url or url in seen:
            continue
        seen.add(url)
        links.append(RelatedLink(url=url, label=getattr(chunk, "label", None) or chunk.title))
    return links
