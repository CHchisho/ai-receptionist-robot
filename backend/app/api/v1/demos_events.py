from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.knowledge import store

router = APIRouter(prefix="/content")


class DemoCreate(BaseModel):
    title: str
    description: str
    location: str
    url: str | None = None


class EventCreate(BaseModel):
    title: str
    event_time: str
    room: str
    description: str


@router.get("/demos")
def get_demos():
    return store.list_demos()


@router.post("/demos")
def create_demo(demo: DemoCreate):
    return store.add_demo(
        title=demo.title,
        description=demo.description,
        location=demo.location,
        url=demo.url,
    )


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
def create_event(event: EventCreate):
    return store.add_event(
        title=event.title,
        event_time=event.event_time,
        room=event.room,
        description=event.description,
    )


@router.delete("/events/{event_id}")
def remove_event(event_id: int):
    deleted = store.delete_event(event_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")

    return {"deleted": True}
