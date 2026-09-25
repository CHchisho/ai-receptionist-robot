from app.services.rag.base import RetrievedChunk

UNKNOWN_ANSWER = (
    "I don't know. I don't have information about that."
)

SYSTEM_PROMPT = """You are Lena, a friendly receptionist at Nokia Espoo Innovation Garage.

Reply briefly and clearly in 1–4 sentences. Speak the visitor's language when possible.

Use only the verified facts provided in this turn. Previous conversation is for resolving
follow-ups like "and that room?" — it is not a source of new facts.

For navigation, use only the verified location block. If the answer is not in the verified
facts, say you do not know. Never invent facts, schedules, locations, URLs, or confidential
information. Do not read raw URLs aloud."""


def build_user_prompt(
    question: str,
    context: list,
    history: list | None = None,
) -> str:
    parts: list[str] = []

    history_lines = _history_lines(history)
    if history_lines:
        parts.append("Previous conversation:\n" + "\n".join(history_lines))

    chunks = [chunk for chunk in context if isinstance(chunk, RetrievedChunk)]
    if chunks:
        fact_lines = [f"- {chunk.title}: {chunk.snippet}" for chunk in chunks]
        parts.append("Verified facts:\n" + "\n".join(fact_lines))

    parts.append(f"Current question: {question}")
    return "\n\n".join(parts)


def _history_lines(history: list | None) -> list[str]:
    if not history:
        return []
    lines: list[str] = []
    for turn in history:
        if isinstance(turn, dict):
            question = str(turn.get("question") or "").strip()
            answer = str(turn.get("answer") or "").strip()
        else:
            question = str(getattr(turn, "question", "")).strip()
            answer = str(getattr(turn, "answer", "")).strip()
        if question:
            lines.append(f"Visitor: {question}")
        if answer:
            lines.append(f"Lena: {answer}")
    return lines
