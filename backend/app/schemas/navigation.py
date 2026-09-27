from pydantic import BaseModel, Field, field_validator


class LocationWrite(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    floor: str = Field(min_length=1, max_length=120)
    landmark: str = Field(min_length=1, max_length=300)
    directions: str = Field(min_length=1, max_length=2000)
    aliases: list[str] = Field(default_factory=list, max_length=40)

    @field_validator("name", "floor")
    @classmethod
    def strip_line(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("must not be blank")
        return cleaned

    @field_validator("landmark", "directions")
    @classmethod
    def strip_block(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("must not be blank")
        return cleaned

    @field_validator("aliases")
    @classmethod
    def clean_aliases(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for item in value:
            alias = " ".join(item.lower().replace("?", " ").replace(".", " ").split())
            if not alias or alias in seen:
                continue
            if len(alias) > 80:
                raise ValueError("an alias is too long")
            seen.add(alias)
            cleaned.append(alias)
        return cleaned


class LocationMove(BaseModel):
    direction: str

    @field_validator("direction")
    @classmethod
    def check_direction(cls, value: str) -> str:
        if value not in {"up", "down"}:
            raise ValueError("direction must be up or down")
        return value


class LocationResponse(BaseModel):
    id: int
    name: str
    floor: str
    landmark: str
    directions: str
    aliases: list[str]
    sort_order: int


class LocationListResponse(BaseModel):
    items: list[LocationResponse]
