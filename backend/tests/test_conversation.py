from app.schemas.conversation import AskRequest
from app.services.conversation import ConversationService
from app.services.llm.mock import MockLlmProvider
from app.services.rag.mock import MockRagProvider


def test_ask_returns_mock_ai_answer() -> None:
    service = ConversationService(llm=MockLlmProvider(), rag=MockRagProvider())
    result = service.ask(AskRequest(text="What is Nokia?"))

    assert result.answer == "AI answer"
    assert result.session_id
    assert result.links == []
    assert result.sources == []
