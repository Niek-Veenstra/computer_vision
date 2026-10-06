from pathlib import Path
from typing import Protocol


class CameraError(RuntimeError):
    """Raised when a configured camera cannot capture an image."""


class CameraCapture(Protocol):
    """One camera opened exclusively for the lifetime of a scan session."""

    @property
    def name(self) -> str: ...

    def open(self) -> None: ...

    def capture(self, destination: Path) -> None: ...

    def close(self) -> None: ...
