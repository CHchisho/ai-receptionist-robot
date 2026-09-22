import base64
from uuid import uuid4

from app.schemas.conversation import AskRequest, AskResponse, ContentCard, RelatedLink, SourceChunk
from app.services.knowledge import store
from app.services.llm.base import LlmProvider
from app.services.llm.prompt import SYSTEM_PROMPT, build_user_prompt
from app.services.rag.base import RagProvider, RetrievedChunk
from app.services.tts.base import TtsProvider


class ConversationService:
    """Orchestrates question → retrieval → LLM → TTS. Voice input is transcribed first."""

    def __init__(self, llm: LlmProvider, rag: RagProvider, tts: TtsProvider) -> None:
        self._llm = llm
        self._rag = rag
        self._tts = tts

    def ask(self, payload: AskRequest) -> AskResponse:
        session_id = payload.session_id or str(uuid4())
        chunks = self._rag.search(payload.text)

        question_lower = payload.text.lower()
        matched_card: ContentCard | None = None

        for demo in store.list_demos():
            if matched_card is None and demo["title"].lower() in question_lower:
                matched_card = ContentCard(
                    kind="demo",
                    title=demo["title"],
                    description=demo["description"],
                    location=demo["location"],
                    url=demo["url"],
                )

                chunks.append(
                    RetrievedChunk(
                        source_id=f"demo-{demo['id']}",
                        title=demo["title"],
                        snippet=(
                            f"Demo: {demo['description']} "
                            f"Location: {demo['location']}."
                        ),
                        url=demo["url"],
                        label=demo["title"],
                    )
                )

        for event in store.list_events():
            if matched_card is None and event["title"].lower() in question_lower:
                matched_card = ContentCard(
                    kind="event",
                    title=event["title"],
                    description=event["description"],
                    event_time=event["event_time"],
                    room=event["room"],
                )

                chunks.append(
                    RetrievedChunk(
                        source_id=f"event-{event['id']}",
                        title=event["title"],
                        snippet=(
                            f"Event: {event['description']} "
                            f"Time: {event['event_time']}. "
                            f"Room: {event['room']}."
                        ),
                    )
                )

        user_prompt = build_user_prompt(payload.text, chunks)
        answer = self._llm.generate(question=payload.text, context=chunks)
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
            card=matched_card,
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
