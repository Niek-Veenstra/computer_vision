from pathlib import Path

from PIL import Image

from ai_scanner_client.inference.classifier import SymbolClassifier
from ai_scanner_client.inference.detector import YoloSymbolDetector
from ai_scanner_client.models import BoundingBox, DetectedSymbol, PagePrediction


class SymbolRecognitionPipeline:
    """Detect and classify every symbol in a full image."""

    def __init__(
        self,
        detector: YoloSymbolDetector,
        classifier: SymbolClassifier,
        *,
        model_id: str,
        classifier_architecture: str,
        classifier_run_id: str,
        detector_architecture: str,
        detector_run_id: str,
    ) -> None:
        self._detector = detector
        self._classifier = classifier
        self._model_id = model_id
        self._classifier_architecture = classifier_architecture
        self._classifier_run_id = classifier_run_id
        self._detector_architecture = detector_architecture
        self._detector_run_id = detector_run_id

    def predict(
        self,
        image_path: Path,
        *,
        confidence_threshold: float | None = None,
    ) -> PagePrediction:
        if not image_path.is_file():
            raise FileNotFoundError(f"Image does not exist: {image_path}")
        with Image.open(image_path) as source:
            image = source.convert("RGB")
        candidates = self._detector.detect(image, confidence_threshold=confidence_threshold)
        valid_candidates = []
        crops = []
        for candidate in candidates:
            left = max(0.0, min(float(image.width), candidate.left))
            top = max(0.0, min(float(image.height), candidate.top))
            right = max(0.0, min(float(image.width), candidate.right))
            bottom = max(0.0, min(float(image.height), candidate.bottom))
            if right <= left or bottom <= top:
                continue
            valid_candidates.append((candidate, left, top, right, bottom))
            crops.append(image.crop((left, top, right, bottom)))

        predictions = self._classifier.predict_images(crops)
        detections = [
            DetectedSymbol(
                box=BoundingBox(left=left, top=top, right=right, bottom=bottom),
                detection_confidence=candidate.confidence,
                prediction=prediction,
            )
            for (candidate, left, top, right, bottom), prediction in zip(
                valid_candidates, predictions, strict=True
            )
        ]
        detections.sort(key=lambda item: (item.box.top, item.box.left))
        return PagePrediction(
            model_id=self._model_id,
            classifier_architecture=self._classifier_architecture,
            classifier_run_id=self._classifier_run_id,
            detector_architecture=self._detector_architecture,
            detector_run_id=self._detector_run_id,
            image_width=image.width,
            image_height=image.height,
            detections=detections,
        )
