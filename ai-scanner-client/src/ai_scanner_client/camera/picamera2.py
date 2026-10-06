from importlib import import_module
from pathlib import Path
from time import sleep

import numpy as np
from numpy.typing import NDArray
from PIL import Image

from ai_scanner_client.camera.base import CameraError


class Picamera2Camera:
    """Raspberry Pi CSI camera adapter backed by Picamera2/libcamera."""

    def __init__(
        self,
        camera_number: int,
        *,
        width: int,
        height: int,
        warmup_seconds: float,
    ) -> None:
        self._camera_number = camera_number
        self._width = width
        self._height = height
        self._warmup_seconds = warmup_seconds
        self._camera: object | None = None

    @property
    def name(self) -> str:
        return f"Picamera2 camera {self._camera_number}"

    def open(self) -> None:
        if self._camera is not None:
            return
        try:
            picamera2_module = import_module("picamera2")
        except ImportError as error:
            raise CameraError(
                "Picamera2 is not available. Install `python3-picamera2` on the Raspberry Pi "
                "and create the uv environment with system site packages."
            ) from error

        camera = picamera2_module.Picamera2(self._camera_number)
        try:
            configuration = camera.create_still_configuration(
                main={"size": (self._width, self._height), "format": "RGB888"}
            )
            camera.configure(configuration)
            camera.start()
        except Exception as error:
            camera.close()
            raise CameraError(f"Could not open {self.name}: {error}") from error
        self._camera = camera
        if self._warmup_seconds:
            sleep(self._warmup_seconds)

    def capture(self, destination: Path) -> None:
        if self._camera is None:
            raise CameraError("Picamera2 camera is not open")
        try:
            self._camera.capture_file(str(destination))
        except Exception as error:
            raise CameraError(f"Could not capture an image from {self.name}: {error}") from error

    def read_frame(self) -> NDArray[np.uint8]:
        if self._camera is None:
            raise CameraError("Picamera2 camera is not open")
        try:
            frame = self._camera.capture_array()
        except Exception as error:
            raise CameraError(f"Could not read a frame from {self.name}: {error}") from error
        array = np.asarray(frame, dtype=np.uint8)
        if array.ndim != 3 or array.shape[2] < 3:
            raise CameraError(f"Camera returned an invalid frame shape: {array.shape}")
        return np.asarray(Image.fromarray(array[..., :3]).convert("RGB"), dtype=np.uint8)

    def close(self) -> None:
        camera = self._camera
        self._camera = None
        if camera is not None:
            try:
                camera.stop()
            finally:
                camera.close()
