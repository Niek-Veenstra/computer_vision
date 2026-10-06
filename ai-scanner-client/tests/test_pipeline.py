from pathlib import Path

from PIL import Image

from ai_scanner_client.inference.detector import DetectionCandidate
from ai_scanner_client.inference.pipeline import SymbolRecognitionPipeline
from ai_scanner_client.models import Prediction


class FakeDetector:
    def detect(
        self, image: Image.Image, *, confidence_threshold: float | None = None
    ) -> list[DetectionCandidate]:
        assert image.size == (100, 80)
        assert confidence_threshold == 0.4
        return [
            DetectionCandidate(50, 20, 75, 60, 0.8),
            DetectionCandidate(-5, 10, 20, 30, 0.9),
            DetectionCandidate(10, 10, 10, 20, 0.7),
        ]


class FakeClassifier:
    def predict(self, image_path: Path) -> Prediction:
        raise AssertionError("The pipeline should classify crops as one batch")

    def predict_images(self, images: list[Image.Image]) -> list[Prediction]:
        assert [image.size for image in images] == [(25, 40), (20, 20)]
        return [
            Prediction(
                model_id="pipeline-v1",
                architecture="cnn_v1",
                run_id="baseline",
                label="8",
                confidence=0.8,
                class_index=12,
            ),
            Prediction(
                model_id="pipeline-v1",
                architecture="cnn_v1",
                run_id="baseline",
                label="0",
                confidence=0.7,
                class_index=4,
            ),
        ]


def test_pipeline_detects_clamps_batches_and_classifies(tmp_path: Path) -> None:
    image_path = tmp_path / "page.png"
    Image.new("RGB", (100, 80), color="white").save(image_path)
    pipeline = SymbolRecognitionPipeline(
        FakeDetector(),  # type: ignore[arg-type]
        FakeClassifier(),  # type: ignore[arg-type]
        model_id="pipeline-v1",
        classifier_architecture="cnn_v1",
        classifier_run_id="baseline",
        detector_architecture="yolo11n",
        detector_run_id="symbol-detector4",
    )

    result = pipeline.predict(image_path, confidence_threshold=0.4)

    assert result.model_id == "pipeline-v1"
    assert result.detector_run_id == "symbol-detector4"
    assert len(result.detections) == 2
    assert result.detections[0].box.left == 0
    assert result.detections[0].prediction.label == "0"
    assert result.detections[1].prediction.label == "8"
