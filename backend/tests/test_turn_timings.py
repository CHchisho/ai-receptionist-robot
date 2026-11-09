from app.services.knowledge import store


def test_turn_timings_roundtrip() -> None:
    store.save_turn(
        session_id="session-1",
        question="What is receptionist robot",
        answer="It is a demo.",
        retrieved=[],
        system_prompt="system",
        user_prompt="user",
        stt_ms=420,
        llm_ms=610,
        tts_ms=5700,
    )

    turn = store.list_turns("session-1")[0]

    assert turn["stt_ms"] == 420
    assert turn["llm_ms"] == 610
    assert turn["tts_ms"] == 5700


def test_typed_turn_leaves_whisper_empty() -> None:
    store.save_turn(
        session_id="session-2",
        question="typed",
        answer="answer",
        retrieved=[],
        system_prompt="system",
        user_prompt="user",
        llm_ms=100,
        tts_ms=200,
    )

    turn = store.list_turns("session-2")[0]

    assert turn["stt_ms"] is None
    assert turn["llm_ms"] == 100
    assert turn["tts_ms"] == 200


def test_tts_duration_can_be_added_after_the_turn() -> None:
    turn_id = store.save_turn(
        session_id="session-3",
        question="typed",
        answer="answer",
        retrieved=[],
        system_prompt="system",
        user_prompt="user",
        llm_ms=100,
    )

    store.set_turn_tts_ms(turn_id, 2500)
    store.set_turn_tts_ms(turn_id, 800)

    turn = store.list_turns("session-3")[0]
    assert turn["tts_ms"] == 3300
