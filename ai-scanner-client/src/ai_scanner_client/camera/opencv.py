from importlib import import_module
from pathlib import Path
from time import sleep
from types import ModuleType

import numpy as np
from numpy.typing import NDArray

from ai_scanner_client.camera.base import CameraError


class OpenCvCamera:
    """USB/UVC camera adapter backed by OpenCV VideoCapture."""

    def __init__(
        self,
        device: str,
        *,
        width: int,
        height: int,
        warmup_seconds: float,
    ) -> None:
        self._device = int(device) if device.isdecimal() else device
        self._width = width
        self._height = height
        self._warmup_seconds = warmup_seconds
        self._cv2: ModuleType | None = None
        self._capture: object | None = None

    @property
    def name(self) -> str:
        return f"OpenCV camera {self._device}"

    def open(self) -> None:
        if self._capture is not None:
            return
        try:
            cv2 = import_module("cv2")
        except ImportError as error:
            raise CameraError(
                "OpenCV camera support is not installed; run `uv sync --extra camera-opencv`"
            ) from error

        capture = cv2.VideoCapture(self._device)
        if not capture.isOpened():
            capture.release()
            raise CameraError(f"Could not open {self.name}")
        capture.set(cv2.CAP_PROP_FRAME_WIDTH, self._width)
        capture.set(cv2.CAP_PROP_FRAME_HEIGHT, self._height)
        self._cv2 = cv2
        self._capture = capture
        if self._warmup_seconds:
            sleep(self._warmup_seconds)

    def capture(self, destination: Path) -> None:
        frame = self._read_bgr_frame()
        if self._cv2 is None or not self._cv2.imwrite(str(destination), frame):
            raise CameraError(f"Could not save a frame from {self.name}")

    def read_frame(self) -> NDArray[np.uint8]:
        frame = self._read_bgr_frame()
        if self._cv2 is None:
            raise CameraError("OpenCV camera is not open")
        return self._cv2.cvtColor(frame, self._cv2.COLOR_BGR2RGB)

    def _read_bgr_frame(self) -> NDArray[np.uint8]:
        if self._capture is None or self._cv2 is None:
            raise CameraError("OpenCV camera is not open")
        success, frame = self._capture.read()
        if not success or frame is None or frame.size == 0:
            raise CameraError(f"Could not read a frame from {self.name}")
        return np.asarray(frame, dtype=np.uint8)

    def close(self) -> None:
        capture = self._capture
        self._capture = None
        self._cv2 = None
        if capture is not None:
            capture.release()
