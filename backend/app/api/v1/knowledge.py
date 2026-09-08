from fastapi import APIRouter

router = APIRouter()


@router.get("/knowledge/sources")
def list_sources() -> dict:
    """Placeholder for content-owner knowledge management"""
    return {"items": [], "message": "Knowledge management is not implemented yet"}
