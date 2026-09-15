import json
from pathlib import Path
from typing import Any


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "feedback.json"


def save_feedback(rating: int, comment: str) -> dict[str, Any]:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    feedback_item = {
        "rating": rating,
        "comment": comment,
    }

    if DATA_FILE.exists():
        try:
            feedback_list = json.loads(DATA_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            feedback_list = []
    else:
        feedback_list = []

    feedback_list.append(feedback_item)

    DATA_FILE.write_text(
        json.dumps(feedback_list, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return feedback_item