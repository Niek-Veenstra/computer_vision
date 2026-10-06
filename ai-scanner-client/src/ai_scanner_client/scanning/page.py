from pathlib import Path
from tempfile import TemporaryDirectory

from ai_scanner_client.camera.base import CameraCapture
from ai_scanner_client.camera.preview import GuidedCameraPreview
from ai_scanner_client.inference.pipeline import SymbolRecognitionPipeline
from ai_scanner_client.models import PagePrediction


class CameraPageRecognizer:
    """Capture one full camera frame and run the detector-classifier pipeline."""

    def __init__(
        self,
        pipeline: SymbolRecognitionPipeline,
        camera: CameraCapture,
        preview: GuidedCameraPreview | None = None,
    ) -> None:
        self._pipeline = pipeline
        self._camera = camera
        self._preview = preview or GuidedCameraPreview()

    @property
    def camera_name(self) -> str:
        return self._camera.name

    def predict(
        self,
        *,
        confidence_threshold: float | None = None,
        guided: bool = False,
    ) -> PagePrediction:
        self._camera.open()
        try:
            with TemporaryDirectory(prefix="ai-scanner-page-") as directory:
                image_path = Path(directory) / "capture.png"
                if guided:
                    self._preview.capture(self._camera, image_path)
                else:
                    self._camera.capture(image_path)
                result = self._pipeline.predict(
                    image_path, confidence_threshold=confidence_threshold
                )
                sequence = "".join(
                    detection.prediction.label
                    for detection in sorted(result.detections, key=lambda item: item.box.left)
                )
                return result.model_copy(update={"sequence": sequence})
        finally:
            self._camera.close()
