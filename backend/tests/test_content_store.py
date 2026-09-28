from fastapi.testclient import TestClient

from app.main import create_app


def test_demo_and_event_can_be_updated() -> None:
    client = TestClient(create_app())

    created = client.post(
        "/api/v1/content/demos",
        json={
            "title": "Smart Light Pole",
            "description": "A connected street light.",
            "location": "Main Hall",
            "url": "",
        },
    )
    assert created.status_code == 200
    demo = created.json()
    assert demo["url"] is None

    updated = client.put(
        f"/api/v1/content/demos/{demo['id']}",
        json={
            "title": "  Smart Light Pole  ",
            "description": "Shows live energy use.",
            "location": "Demo Area",
            "url": " https://example.com/pole ",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Smart Light Pole"
    assert updated.json()["description"] == "Shows live energy use."
    assert updated.json()["url"] == "https://example.com/pole"

    missing = client.put(
        "/api/v1/content/demos/99999",
        json={
            "title": "Missing",
            "description": "Gone",
            "location": "Nowhere",
        },
    )
    assert missing.status_code == 404

    event = client.post(
        "/api/v1/content/events",
        json={
            "title": "AI Workshop",
            "event_time": "14:00",
            "room": "Room 201",
            "description": "Workshop about artificial intelligence.",
        },
    )
    assert event.status_code == 200
    event_id = event.json()["id"]

    changed = client.put(
        f"/api/v1/content/events/{event_id}",
        json={
            "title": "AI Workshop",
            "event_time": "15:00",
            "room": "Room 202",
            "description": "Moved to the afternoon.",
        },
    )
    assert changed.status_code == 200
    assert changed.json()["event_time"] == "15:00"
    assert changed.json()["room"] == "Room 202"

    blank = client.post(
        "/api/v1/content/demos",
        json={"title": "   ", "description": "x", "location": "Hall"},
    )
    assert blank.status_code == 422
