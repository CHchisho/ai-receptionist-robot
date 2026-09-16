from app.services.rag.base import RetrievedChunk

SYSTEM_PROMPT = """You are Lena, a friendly receptionist at Nokia Espoo Innovation Garage.

Reply briefly and clearly in 1–4 sentences. Speak the visitor's language when possible.

Use the provided knowledge-base context for factual information. For navigation, use only verified location information. If the answer is not in the provided context, say you do not know. Never invent facts, schedules, locations, URLs, or confidential information. Do not read raw URLs aloud."""


def build_user_prompt(question: str, context: list) -> str:
    chunks = [chunk for chunk in context if isinstance(chunk, RetrievedChunk)]
    if not chunks:
        return question

    lines = [f"- {chunk.title}: {chunk.snippet}" for chunk in chunks]
    joined = "\n".join(lines)
    return f"Context:\n{joined}\n\nQuestion: {question}"
