from pathlib import Path

from ai_scanner_client.models import BoundingBox, DetectedSymbol, PagePrediction, Prediction
from ai_scanner_client.scanning.page import CameraPageRecognizer


class FakeCamera:
    name = "Test Pi camera"

    def __init__(self) -> None:
        self.opened = False
        self.closed = False
        self.capture_path: Path | None = None

    def open(self) -> None:
        self.opened = True

    def capture(self, destination: Path) -> None:
        assert self.opened
        destination.write_bytes(b"camera frame")
        self.capture_path = destination

    def close(self) -> None:
        self.opened = False
        self.closed = True


class FakePreview:
    def __init__(self) -> None:
        self.used = False

    def capture(self, camera: FakeCamera, destination: Path) -> None:
        assert camera.opened
        self.used = True
        destination.write_bytes(b"camera frame")
        camera.capture_path = destination


class FakePipeline:
    def predict(
        self, image_path: Path, *, confidence_threshold: float | None = None
    ) -> PagePrediction:
        assert image_path.read_bytes() == b"camera frame"
        assert confidence_threshold == 0.45
        return PagePrediction(
            model_id="pipeline-v1",
            classifier_architecture="cnn_v1",
            classifier_run_id="baseline",
            detector_architecture="yolo11n",
            detector_run_id="symbol-detector4",
            image_width=1280,
            image_height=720,
            detections=[
                DetectedSymbol(
                    box=BoundingBox(left=80, top=10, right=100, bottom=40),
                    detection_confidence=0.9,
                    prediction=Prediction(
                        model_id="pipeline-v1",
                        architecture="cnn_v1",
                        run_id="baseline",
                        label="2",
                        confidence=0.8,
                        class_index=2,
                    ),
                ),
                DetectedSymbol(
                    box=BoundingBox(left=10, top=12, right=30, bottom=42),
                    detection_confidence=0.8,
                    prediction=Prediction(
                        model_id="pipeline-v1",
                        architecture="cnn_v1",
                        run_id="baseline",
                        label="1",
                        confidence=0.7,
                        class_index=1,
                    ),
                ),
            ],
        )


def test_camera_page_recognizer_captures_predicts_and_cleans_up() -> None:
    camera = FakeCamera()
    recognizer = CameraPageRecognizer(
        FakePipeline(),  # type: ignore[arg-type]
        camera,
    )

    result = recognizer.predict(confidence_threshold=0.45)

    assert result.model_id == "pipeline-v1"
    assert result.sequence == "12"
    assert recognizer.camera_name == "Test Pi camera"
    assert camera.closed is True
    assert camera.capture_path is not None
    assert not camera.capture_path.exists()


def test_camera_page_recognizer_uses_guided_preview() -> None:
    camera = FakeCamera()
    preview = FakePreview()
    recognizer = CameraPageRecognizer(
        FakePipeline(),  # type: ignore[arg-type]
        camera,
        preview,  # type: ignore[arg-type]
    )

    result = recognizer.predict(confidence_threshold=0.45, guided=True)

    assert preview.used is True
    assert result.sequence == "12"
    assert camera.closed is True
