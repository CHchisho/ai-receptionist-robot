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
        def synthesize(self, text: str) -> bytes:
            return b"fake-audio-bytes"

    service = ConversationService(llm=MockLlmProvider(), rag=MockRagProvider(), tts=FakeTtsProvider())
    result = service.ask(AskRequest(text="What is Nokia?"))

    assert result.audio_base64 == "ZmFrZS1hdWRpby1ieXRlcw=="
