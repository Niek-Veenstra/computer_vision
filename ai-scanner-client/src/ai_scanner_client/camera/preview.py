from contextlib import suppress
from importlib import import_module
from pathlib import Path
from types import ModuleType
from typing import ClassVar

import numpy as np
from PIL import Image

from ai_scanner_client.camera.base import CameraCapture, CameraError


class CaptureCancelledError(CameraError):
    """Raised when the user closes or cancels the guided preview."""


def guide_box(
    frame_width: int,
    frame_height: int,
    width_ratio: float,
    height_ratio: float,
) -> tuple[int, int, int, int]:
    width = max(1, round(frame_width * width_ratio))
    height = max(1, round(frame_height * height_ratio))
    left = (frame_width - width) // 2
    top = (frame_height - height) // 2
    return left, top, left + width, top + height


class GuidedCameraPreview:
    """Show a live frame with a centered single-line sequence guide."""

    CAPTURE_KEYS: ClassVar[frozenset[int]] = frozenset({10, 13, 32})
    ESCAPE_KEY: ClassVar[int] = 27

    def __init__(
        self,
        *,
        width_ratio: float = 0.85,
        height_ratio: float = 0.35,
        window_title: str = "AI Scanner - plaats de volledige reeks in het kader",
        cv2_module: ModuleType | None = None,
    ) -> None:
        if not 0 < width_ratio <= 1 or not 0 < height_ratio <= 1:
            raise ValueError("Guide ratios must be greater than 0 and at most 1")
        self._width_ratio = width_ratio
        self._height_ratio = height_ratio
        self._window_title = window_title
        self._cv2 = cv2_module

    def capture(self, camera: CameraCapture, destination: Path) -> None:
        cv2 = self._cv2 or self._load_cv2()
        try:
            try:
                while True:
                    frame = camera.read_frame()
                    if frame.ndim != 3 or frame.shape[2] != 3 or frame.size == 0:
                        raise CameraError(f"Camera returned an invalid frame shape: {frame.shape}")
                    height, width = frame.shape[:2]
                    left, top, right, bottom = guide_box(
                        width, height, self._width_ratio, self._height_ratio
                    )
                    preview = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                    cv2.rectangle(preview, (left, top), (right, bottom), (0, 255, 0), 3)
                    cv2.putText(
                        preview,
                        "Plaats 1 horizontale reeks in het kader - SPATIE/ENTER: scan - ESC: stop",
                        (20, 35),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.65,
                        (0, 255, 0),
                        2,
                        cv2.LINE_AA,
                    )
                    cv2.imshow(self._window_title, preview)
                    key = cv2.waitKey(1) & 0xFF
                    if key in self.CAPTURE_KEYS:
                        crop = np.ascontiguousarray(frame[top:bottom, left:right])
                        Image.fromarray(crop).save(destination)
                        return
                    if (
                        key == self.ESCAPE_KEY
                        or cv2.getWindowProperty(self._window_title, cv2.WND_PROP_VISIBLE) < 1
                    ):
                        raise CaptureCancelledError("Camera preview geannuleerd")
            except (CameraError, CaptureCancelledError):
                raise
            except Exception as error:
                raise CameraError(
                    "De cameravoorvertoning kon niet worden geopend. Start de client in "
                    "een grafische desktopsessie of gebruik --no-preview."
                ) from error
        finally:
            with suppress(Exception):
                cv2.destroyWindow(self._window_title)

    @staticmethod
    def _load_cv2() -> ModuleType:
        try:
            return import_module("cv2")
        except ImportError as error:
            raise CameraError(
                "Guided preview requires OpenCV; run `uv sync --extra pipeline`"
            ) from error
