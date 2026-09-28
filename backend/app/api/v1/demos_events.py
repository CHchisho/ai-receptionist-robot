from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.services.knowledge import store

router = APIRouter(prefix="/content")


def _clean(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("must not be blank")
    return cleaned


class DemoWrite(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    location: str = Field(min_length=1, max_length=200)
    url: str | None = Field(default=None, max_length=2000)

    @field_validator("title", "description", "location")
    @classmethod
    def required_text(cls, value: str) -> str:
        return _clean(value)

    @field_validator("url")
    @classmethod
    def optional_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class EventWrite(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    event_time: str = Field(min_length=1, max_length=80)
    room: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)

    @field_validator("title", "event_time", "room", "description")
    @classmethod
    def required_text(cls, value: str) -> str:
        return _clean(value)


@router.get("/demos")
def get_demos():
    return store.list_demos()


@router.post("/demos")
def create_demo(demo: DemoWrite):
    return store.add_demo(
        title=demo.title,
        description=demo.description,
        location=demo.location,
        url=demo.url,
    )


@router.put("/demos/{demo_id}")
def update_demo(demo_id: int, demo: DemoWrite):
    updated = store.update_demo(
        demo_id,
        title=demo.title,
        description=demo.description,
        location=demo.location,
        url=demo.url,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Demo not found")
    return updated


@router.delete("/demos/{demo_id}")
def remove_demo(demo_id: int):
    deleted = store.delete_demo(demo_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Demo not found")

    return {"deleted": True}


@router.get("/events")
def get_events():
    return store.list_events()


@router.post("/events")
def create_event(event: EventWrite):
    return store.add_event(
        title=event.title,
        event_time=event.event_time,
        room=event.room,
        description=event.description,
    )


@router.put("/events/{event_id}")
def update_event(event_id: int, event: EventWrite):
    updated = store.update_event(
        event_id,
        title=event.title,
        event_time=event.event_time,
        room=event.room,
        description=event.description,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return updated


@router.delete("/events/{event_id}")
def remove_event(event_id: int):
    deleted = store.delete_event(event_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")

    return {"deleted": True}
