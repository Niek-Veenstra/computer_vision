from ai_scanner_client.camera.base import CameraCapture
from ai_scanner_client.camera.opencv import OpenCvCamera
from ai_scanner_client.camera.picamera2 import Picamera2Camera
from ai_scanner_client.config import ClientSettings


class CameraFactory:
    """Creates the one explicitly configured camera adapter."""

    def create(self, settings: ClientSettings) -> CameraCapture:
        common = {
            "width": settings.camera_width,
            "height": settings.camera_height,
            "warmup_seconds": settings.camera_warmup_seconds,
        }
        if settings.camera_backend == "picamera2":
            try:
                camera_number = int(settings.camera_device)
            except ValueError as error:
                raise ValueError("Picamera2 camera device must be a numeric index") from error
            return Picamera2Camera(camera_number, **common)
        if settings.camera_backend == "opencv":
            return OpenCvCamera(settings.camera_device, **common)
        raise ValueError(f"Unsupported camera backend: {settings.camera_backend}")
