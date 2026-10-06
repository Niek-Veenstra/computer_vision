from pathlib import Path
from typing import Literal

from pydantic import AnyHttpUrl, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class ClientSettings(BaseSettings):
    """Configuration loaded from environment variables or a local `.env` file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="PI_CLIENT_",
        extra="ignore",
    )

    backend_url: AnyHttpUrl = AnyHttpUrl("http://localhost:3000")
    scanner_api_key: SecretStr | None = None
    models_directory: Path = Path("models")
    model_selection_path: Path = Path(".state/model-selection.json")
    request_timeout_seconds: float = Field(default=10.0, gt=0, le=120)
    camera_backend: Literal["picamera2", "opencv"] = "picamera2"
    camera_device: str = "0"
    camera_width: int = Field(default=1280, ge=128, le=8192)
    camera_height: int = Field(default=720, ge=128, le=8192)
    camera_warmup_seconds: float = Field(default=1.0, ge=0, le=30)

    def require_scanner_api_key(self) -> str:
        if self.scanner_api_key is None:
            raise ValueError("PI_CLIENT_SCANNER_API_KEY is required for backend commands")
        return self.scanner_api_key.get_secret_value()
