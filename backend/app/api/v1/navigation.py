from fastapi import APIRouter, HTTPException

from app.schemas.navigation import LocationListResponse, LocationMove, LocationResponse, LocationWrite
from app.services.knowledge import store

router = APIRouter(prefix="/navigation")


def _response(record: store.LocationRecord) -> LocationResponse:
    return LocationResponse(
        id=record.id,
        name=record.name,
        floor=record.floor,
        landmark=record.landmark,
        directions=record.directions,
        aliases=record.aliases,
        sort_order=record.sort_order,
    )


@router.get("/locations", response_model=LocationListResponse)
def list_locations() -> LocationListResponse:
    return LocationListResponse(items=[_response(item) for item in store.list_locations()])


@router.post("/locations", response_model=LocationResponse, status_code=201)
def create_location(payload: LocationWrite) -> LocationResponse:
    record = store.create_location(
        name=payload.name,
        floor=payload.floor,
        landmark=payload.landmark,
        directions=payload.directions,
        aliases=payload.aliases,
    )
    return _response(record)


@router.put("/locations/{location_id}", response_model=LocationResponse)
def update_location(location_id: int, payload: LocationWrite) -> LocationResponse:
    record = store.update_location(
        location_id,
        name=payload.name,
        floor=payload.floor,
        landmark=payload.landmark,
        directions=payload.directions,
        aliases=payload.aliases,
    )
    if record is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return _response(record)


@router.post("/locations/{location_id}/move", response_model=LocationResponse)
def move_location(location_id: int, payload: LocationMove) -> LocationResponse:
    record = store.move_location(location_id, payload.direction)
    if record is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return _response(record)


@router.delete("/locations/{location_id}")
def delete_location(location_id: int) -> dict:
    if not store.delete_location(location_id):
        raise HTTPException(status_code=404, detail="Location not found")
    return {"ok": True}
