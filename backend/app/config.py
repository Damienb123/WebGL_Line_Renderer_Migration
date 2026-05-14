from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="TRACE_", env_file=".env", extra="ignore")

    api_key: str = Field(default="dev-trace-api-key", min_length=12)
    database_path: Path = Field(default=Path("trace_lines.db"))
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])


@lru_cache
def get_settings() -> Settings:
    return Settings()

