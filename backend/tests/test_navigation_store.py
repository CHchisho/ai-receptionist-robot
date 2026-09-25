from fastapi.testclient import TestClient

from app.main import create_app
from app.services.knowledge import store
from app.services.navigation.sqlite import SqliteNavigationProvider


def test_empty_database_seeds_default_map() -> None:
    locations = store.list_locations()

    assert [item.name for item in locations][:2] == ["Main entrance", "Lounge"]
    kitchen = next(item for item in locations if item.name == "Kitchen")
    assert "coffee" in kitchen.aliases

    found = SqliteNavigationProvider().find("Where is the kitchen?")
    assert found is not None
    assert found.name == "Kitchen"


def test_location_crud_updates_directions() -> None:
    created = store.create_location(
        name="Sauna",
        floor="1st floor",
        landmark="behind the kitchen",
        directions="Walk past the kitchen.",
        aliases=["sauna"],
    )
    found = SqliteNavigationProvider().find("Where is the sauna?")
    assert found is not None
    assert found.directions == "Walk past the kitchen."

    updated = store.update_location(
        created.id,
        name="Sauna",
        floor="2nd floor",
        landmark="behind the kitchen",
        directions="Take the stairs.",
        aliases=["sauna", "sauna cabin"],
    )
    assert updated is not None
    assert updated.floor == "2nd floor"
    assert SqliteNavigationProvider().find("Where is the sauna cabin?").directions == "Take the stairs."

    assert store.delete_location(created.id) is True
    assert SqliteNavigationProvider().find("Where is the sauna?") is None
    assert store.delete_location(created.id) is False


def test_move_location_changes_match_order() -> None:
    first = store.list_locations()[0]
    moved = store.move_location(first.id, "down")
    assert moved is not None
    assert store.list_locations()[1].id == first.id
    assert store.move_location(first.id, "up") is not None
    assert store.list_locations()[0].id == first.id


def test_navigation_api_crud() -> None:
    client = TestClient(create_app())

    listed = client.get("/api/v1/navigation/locations")
    assert listed.status_code == 200
    assert listed.json()["items"][0]["name"] == "Main entrance"

    created = client.post(
        "/api/v1/navigation/locations",
        json={
            "name": "  Server room ",
            "floor": "Basement",
            "landmark": "end of the corridor",
            "directions": "Take the stairs down.",
            "aliases": ["Server Room", "server room", ""],
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Server room"
    assert body["aliases"] == ["server room"]

    updated = client.put(
        f"/api/v1/navigation/locations/{body['id']}",
        json={
            "name": "Server room",
            "floor": "Basement",
            "landmark": "end of the corridor",
            "directions": "Ask at reception first.",
            "aliases": ["server"],
        },
    )
    assert updated.status_code == 200
    assert updated.json()["directions"] == "Ask at reception first."

    missing = client.put(
        "/api/v1/navigation/locations/99999",
        json={
            "name": "Missing",
            "floor": "1",
            "landmark": "none",
            "directions": "none",
            "aliases": [],
        },
    )
    assert missing.status_code == 404

    deleted = client.delete(f"/api/v1/navigation/locations/{body['id']}")
    assert deleted.status_code == 200
    assert client.delete(f"/api/v1/navigation/locations/{body['id']}").status_code == 404
