from fastapi.testclient import TestClient

from app.core.dependencies import get_tts_provider
from app.main import create_app
from app.schemas.conversation import AskRequest
from app.services.conversation import ConversationService
from app.services.llm.mock import MockLlmProvider
from app.services.rag.mock import MockRagProvider
from app.services.tts.mock import MockTtsProvider


def test_ask_returns_mock_ai_answer() -> None:
    service = ConversationService(llm=MockLlmProvider(), rag=MockRagProvider(), tts=MockTtsProvider())
    result = service.ask(AskRequest(text="What is Nokia?"))

    assert result.answer == "AI answer"
    assert result.session_id
    assert result.links == []
    assert result.sources == []
    assert result.audio_base64 is None


def test_ask_includes_base64_audio_when_tts_produces_bytes() -> None:
    class FakeTtsProvider:
        def synthesize(self, text: str, language: str) -> bytes:
            return b"fake-audio-bytes"

    service = ConversationService(llm=MockLlmProvider(), rag=MockRagProvider(), tts=FakeTtsProvider())
    result = service.ask(AskRequest(text="What is Nokia?"))

    assert result.audio_base64 == "ZmFrZS1hdWRpby1ieXRlcw=="


def test_speak_endpoint_returns_base64_audio() -> None:
    class FakeTtsProvider:
        def synthesize(self, text: str, language: str) -> bytes:
            return b"welcome-audio"

    application = create_app()
    application.dependency_overrides[get_tts_provider] = lambda: FakeTtsProvider()
    client = TestClient(application)

    response = client.post("/api/v1/conversation/speak", json={"text": "Welcome"})

    assert response.status_code == 200
    assert response.json()["audio_base64"] == "d2VsY29tZS1hdWRpbw=="

def test_ask_uses_finnish_for_llm_and_tts() -> None:
    class RecordingLlmProvider:
        def __init__(self) -> None:
            self.language = None

        def generate(self, question: str, context: list, language: str) -> str:
            self.language = language
            return "Finnish answer"

    class RecordingTtsProvider:
        def __init__(self) -> None:
            self.language = None

        def synthesize(self, text: str, language: str) -> bytes:
            self.language = language
            return b"finnish-audio"

    llm = RecordingLlmProvider()
    tts = RecordingTtsProvider()

    service = ConversationService(
        llm=llm,
        rag=MockRagProvider(),
        tts=tts,
    )

    result = service.ask(
        AskRequest(
            text="Mikä Nokia on?",
            language="fi",
        )
    )

    assert llm.language == "fi"
    assert tts.language == "fi"
    assert result.answer == "Finnish answer"


def test_ask_falls_back_to_english_for_unsupported_language() -> None:
    class RecordingLlmProvider:
        def __init__(self) -> None:
            self.language = None

        def generate(self, question: str, context: list, language: str) -> str:
            self.language = language
            return "English answer"

    class RecordingTtsProvider:
        def __init__(self) -> None:
            self.language = None

        def synthesize(self, text: str, language: str) -> bytes:
            self.language = language
            return b"english-audio"

    llm = RecordingLlmProvider()
    tts = RecordingTtsProvider()

    service = ConversationService(
        llm=llm,
        rag=MockRagProvider(),
        tts=tts,
    )

    result = service.ask(
        AskRequest(
            text="Was ist Nokia?",
            language="de",
        )
    )

    assert llm.language == "en"
    assert tts.language == "en"
    assert result.answer.startswith(
        "I can currently respond in English or Finnish."
    )    
