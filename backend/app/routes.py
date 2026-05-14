import json
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from .config import Settings, get_settings
from .database import decode_payload, session
from .schemas import (
    LineDocument,
    LineDocumentCreate,
    LineDocumentList,
    LineDocumentSummary,
    LineDocumentUpdate,
)
from .security import get_owner_hash

router = APIRouter(prefix="/api/v1/line-documents", tags=["line-documents"])


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def payload_for(document: LineDocumentCreate) -> str:
    return json.dumps(
        {
            "vertices": document.vertices,
            "style": document.style.model_dump(),
        },
        separators=(",", ":"),
    )


@router.post("", response_model=LineDocument, status_code=status.HTTP_201_CREATED)
def save_line_document(
    document: LineDocumentCreate,
    owner_hash: str = Depends(get_owner_hash),
    settings: Settings = Depends(get_settings),
) -> dict:
    document_id = uuid4().hex
    now = utc_now()
    with session(settings.database_path) as conn:
        conn.execute(
            """
            INSERT INTO line_documents (id, owner_hash, name, payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (document_id, owner_hash, document.name, payload_for(document), now, now),
        )
        row = conn.execute(
            "SELECT id, name, payload, created_at, updated_at FROM line_documents WHERE id = ?",
            (document_id,),
        ).fetchone()
    return decode_payload(row)


@router.get("", response_model=LineDocumentList)
def list_line_documents(
    owner_hash: str = Depends(get_owner_hash),
    limit: int = Query(default=25, ge=1, le=100),
    settings: Settings = Depends(get_settings),
) -> LineDocumentList:
    with session(settings.database_path) as conn:
        rows = conn.execute(
            """
            SELECT id, name, payload, created_at, updated_at
            FROM line_documents
            WHERE owner_hash = ?
            ORDER BY updated_at DESC
            LIMIT ?
            """,
            (owner_hash, limit),
        ).fetchall()
    summaries = []
    for row in rows:
        payload = json.loads(row["payload"])
        summaries.append(
            LineDocumentSummary(
                id=row["id"],
                name=row["name"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                vertex_count=len(payload["vertices"]) // 2,
            )
        )
    return LineDocumentList(items=summaries)


@router.get("/{document_id}", response_model=LineDocument)
def load_line_document(
    document_id: str,
    owner_hash: str = Depends(get_owner_hash),
    settings: Settings = Depends(get_settings),
) -> dict:
    with session(settings.database_path) as conn:
        row = conn.execute(
            """
            SELECT id, name, payload, created_at, updated_at
            FROM line_documents
            WHERE id = ? AND owner_hash = ?
            """,
            (document_id, owner_hash),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Line document not found.")
    return decode_payload(row)


@router.put("/{document_id}", response_model=LineDocument)
def update_line_document(
    document_id: str,
    document: LineDocumentUpdate,
    owner_hash: str = Depends(get_owner_hash),
    settings: Settings = Depends(get_settings),
) -> dict:
    now = utc_now()
    with session(settings.database_path) as conn:
        cursor = conn.execute(
            """
            UPDATE line_documents
            SET name = ?, payload = ?, updated_at = ?
            WHERE id = ? AND owner_hash = ?
            """,
            (document.name, payload_for(document), now, document_id, owner_hash),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Line document not found.")
        row = conn.execute(
            """
            SELECT id, name, payload, created_at, updated_at
            FROM line_documents
            WHERE id = ? AND owner_hash = ?
            """,
            (document_id, owner_hash),
        ).fetchone()
    return decode_payload(row)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_line_document(
    document_id: str,
    owner_hash: str = Depends(get_owner_hash),
    settings: Settings = Depends(get_settings),
) -> Response:
    with session(settings.database_path) as conn:
        cursor = conn.execute(
            "DELETE FROM line_documents WHERE id = ? AND owner_hash = ?",
            (document_id, owner_hash),
        )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Line document not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

