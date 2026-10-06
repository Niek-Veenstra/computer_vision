from ai_scanner_client.camera.factory import CameraFactory
from ai_scanner_client.camera.opencv import OpenCvCamera
from ai_scanner_client.camera.picamera2 import Picamera2Camera
from ai_scanner_client.config import ClientSettings


def test_camera_factory_creates_explicit_picamera2_backend() -> None:
    camera = CameraFactory().create(
        ClientSettings(camera_backend="picamera2", camera_device="1")
    )

    assert isinstance(camera, Picamera2Camera)
    assert camera.name == "Picamera2 camera 1"


def test_camera_factory_creates_explicit_opencv_backend() -> None:
    camera = CameraFactory().create(
        ClientSettings(camera_backend="opencv", camera_device="/dev/video2")
    )

    assert isinstance(camera, OpenCvCamera)
    assert camera.name == "OpenCV camera /dev/video2"
