import hashlib
import hmac

from fastapi import Depends, Header, HTTPException, status

from .config import Settings, get_settings


def require_api_key(
    x_api_key: str = Header(default="", alias="X-API-Key"),
    settings: Settings = Depends(get_settings),
) -> None:
    if not hmac.compare_digest(x_api_key, settings.api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )


def get_owner_hash(
    x_user_id: str = Header(alias="X-User-Id", min_length=1, max_length=128),
    _: None = Depends(require_api_key),
) -> str:
    normalized = x_user_id.strip().lower()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-User-Id header is required.",
        )
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

