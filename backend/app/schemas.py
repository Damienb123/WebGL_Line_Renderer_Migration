from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


LineVertices = Annotated[list[float], Field(min_length=0, max_length=20000)]


class LineStyle(BaseModel):
    model_config = ConfigDict(extra="forbid")

    color: str = Field(default="#ff0000", pattern=r"^#[0-9a-fA-F]{6}$")
    width: float = Field(default=2, ge=1, le=64)
    smooth: bool = False


class LineDocumentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(default="Untitled drawing", min_length=1, max_length=120)
    vertices: LineVertices = Field(default_factory=list)
    style: LineStyle = Field(default_factory=LineStyle)

    @field_validator("vertices")
    @classmethod
    def vertices_must_be_coordinate_pairs(cls, vertices: list[float]) -> list[float]:
        if len(vertices) % 2 != 0:
            raise ValueError("vertices must contain x,y coordinate pairs")
        for value in vertices:
            if value < -1.25 or value > 1.25:
                raise ValueError("vertex coordinates must stay near WebGL clip space")
        return vertices


class LineDocumentUpdate(LineDocumentCreate):
    pass


class LineDocument(LineDocumentCreate):
    id: str
    created_at: datetime
    updated_at: datetime


class LineDocumentSummary(BaseModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    vertex_count: int


class LineDocumentList(BaseModel):
    items: list[LineDocumentSummary]

