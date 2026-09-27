from fastapi.testclient import TestClient

from app.core.dependencies import get_tts_provider
from app.main import create_app
from app.schemas.conversation import AskRequest
from app.services.catalog import CatalogHit, NoOpCatalogProvider
from app.services.conversation import ConversationService
from app.services.llm.mock import MockLlmProvider
from app.services.llm.prompt import UNKNOWN_ANSWER
from app.services.navigation.base import Location
from app.services.navigation.mock import MockNavigationProvider
from app.services.rag.base import RetrievedChunk
from app.services.rag.mock import MockRagProvider
from app.services.tts.mock import MockTtsProvider


class RecordingLlm:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def generate(self, question: str, context: list, history: list | None = None) -> str:
        self.calls.append({"question": question, "context": context, "history": history or []})
        return "AI answer"


class FakeRag:
    def __init__(self, chunks: list[RetrievedChunk] | None = None) -> None:
        self.chunks = chunks or []
        self.queries: list[str] = []

    def search(self, question: str) -> list[RetrievedChunk]:
        self.queries.append(question)
        return list(self.chunks)

    def list_sources(self):
        return []


class FakeCatalog:
    def __init__(self, hit: CatalogHit | None = None) -> None:
        self.hit = hit
        self.queries: list[str] = []

    def find(self, query: str) -> CatalogHit | None:
        self.queries.append(query)
        if self.hit and self.hit.title.lower() in query.lower():
            return self.hit
        return None


def _service(
    llm=None,
    rag=None,
    tts=None,
    navigation=None,
    catalog=None,
) -> ConversationService:
    return ConversationService(
        llm=llm or RecordingLlm(),
        rag=rag or MockRagProvider(),
        tts=tts or MockTtsProvider(),
        navigation=navigation or MockNavigationProvider(),
        catalog=catalog or NoOpCatalogProvider(),
    )


def test_ask_refuses_when_no_verified_facts() -> None:
    llm = RecordingLlm()
    result = _service(llm=llm).ask(AskRequest(text="What is the Wi-Fi password?"))

    assert result.answer == UNKNOWN_ANSWER
    assert result.sources == []
    assert result.route is None
    assert result.card is None
    assert llm.calls == []


def test_ask_uses_rag_and_skips_when_nav_misses() -> None:
    llm = RecordingLlm()
    rag = FakeRag(
        [
            RetrievedChunk(
                source_id="nokia-wiki",
                title="Nokia",
                snippet="Nokia is a Finnish telecommunications company.",
            )
        ]
    )
    result = _service(llm=llm, rag=rag).ask(AskRequest(text="What is Nokia?"))

    assert result.answer == "AI answer"
    assert result.sources[0].source_id == "nokia-wiki"
    assert result.route is None
    assert len(llm.calls) == 1


def test_ask_prefers_navigation_over_rag() -> None:
    llm = RecordingLlm()
    rag = FakeRag(
        [
            RetrievedChunk(source_id="wiki", title="Wiki", snippet="A meeting is a gathering.")
        ]
    )
    result = _service(llm=llm, rag=rag).ask(AskRequest(text="Where is the meeting room?"))

    assert result.route is not None
    assert result.route.name == "Meeting room"
    assert result.sources[0].source_id.startswith("navigation:")
    assert rag.queries == []
    assert len(llm.calls) == 1


def test_ask_includes_base64_audio_when_tts_produces_bytes() -> None:
    class FakeTtsProvider:
        def synthesize(self, text: str) -> bytes:
            return b"fake-audio-bytes"

    result = _service(tts=FakeTtsProvider()).ask(AskRequest(text="Where is the kitchen?"))

    assert result.audio_base64 == "ZmFrZS1hdWRpby1ieXRlcw=="


def test_ask_includes_structured_navigation_context() -> None:
    class FakeNavigationProvider:
        def find(self, query: str) -> Location:
            return Location(
                name="Meeting room",
                floor="1st floor",
                landmark="opposite the restrooms",
                directions="Walk past the demo area. The meeting room is on your right.",
            )

    result = _service(navigation=FakeNavigationProvider()).ask(
        AskRequest(text="Where is the meeting room?")
    )

    assert result.route is not None
    assert result.route.name == "Meeting room"
    assert result.route.floor == "1st floor"
    assert result.route.landmark == "opposite the restrooms"
    assert result.sources[0].source_id == "navigation:meeting-room"


def test_follow_up_reuses_last_navigation_for_there() -> None:
    service = _service()
    first = service.ask(AskRequest(text="Where is the meeting room?"))
    second = service.ask(
        AskRequest(text="How do I get there?", session_id=first.session_id)
    )

    assert second.route is not None
    assert second.route.name == "Meeting room"


def test_follow_up_can_switch_to_another_room() -> None:
    service = _service()
    first = service.ask(AskRequest(text="Where is the restroom?"))
    second = service.ask(
        AskRequest(text="And the meeting room?", session_id=first.session_id)
    )

    assert first.route is not None
    assert first.route.name == "Restrooms"
    assert second.route is not None
    assert second.route.name == "Meeting room"


def test_ask_uses_demo_catalog_and_skips_rag() -> None:
    llm = RecordingLlm()
    rag = FakeRag(
        [RetrievedChunk(source_id="wiki", title="Wiki", snippet="A pole is a stick.")]
    )
    catalog = FakeCatalog(
        CatalogHit(
            kind="demo",
            title="Smart light pole",
            description="A connected street-light demo in the Garage.",
            location="near the Innovation wall",
            url="https://example.com/pole",
            source_id="demo-1",
        )
    )
    result = _service(llm=llm, rag=rag, catalog=catalog).ask(
        AskRequest(text="What is the smart light pole?")
    )

    assert result.card is not None
    assert result.card.kind == "demo"
    assert result.card.title == "Smart light pole"
    assert result.sources[0].source_id == "demo-1"
    assert rag.queries == []
    assert len(llm.calls) == 1


def test_history_is_passed_to_llm_on_later_turns() -> None:
    llm = RecordingLlm()
    rag = FakeRag(
        [RetrievedChunk(source_id="nokia", title="Nokia", snippet="Nokia builds networks.")]
    )
    service = _service(llm=llm, rag=rag)
    first = service.ask(AskRequest(text="What is Nokia?"))
    service.ask(AskRequest(text="What does it build?", session_id=first.session_id))

    assert len(llm.calls) == 2
    assert llm.calls[1]["history"][0]["question"] == "What is Nokia?"
    assert llm.calls[1]["history"][0]["answer"] == "AI answer"


def test_empty_rag_snippet_is_not_a_fact() -> None:
    llm = RecordingLlm()
    rag = FakeRag([RetrievedChunk(source_id="empty", title="Empty", snippet="  ")])
    result = _service(llm=llm, rag=rag).ask(AskRequest(text="What is Nokia?"))

    assert result.answer == UNKNOWN_ANSWER
    assert llm.calls == []


def test_speak_endpoint_returns_base64_audio() -> None:
    class FakeTtsProvider:
        def synthesize(self, text: str) -> bytes:
            return b"welcome-audio"

    application = create_app()
    application.dependency_overrides[get_tts_provider] = lambda: FakeTtsProvider()
    client = TestClient(application)

    response = client.post("/api/v1/conversation/speak", json={"text": "Welcome"})

    assert response.status_code == 200
    assert response.json()["audio_base64"] == "d2VsY29tZS1hdWRpbw=="
