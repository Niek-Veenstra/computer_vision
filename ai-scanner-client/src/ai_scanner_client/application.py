from pathlib import Path
from uuid import UUID

from ai_scanner_client.backend.client import ScannerBackendClient
from ai_scanner_client.inference.classifier import SymbolClassifier
from ai_scanner_client.models import MarkerContent, Prediction, RecognitionResult


class PiClientApplication:
    """Application use-cases independent of CLI and hardware input details."""

    def __init__(
        self,
        classifier: SymbolClassifier,
        backend: ScannerBackendClient | None = None,
    ) -> None:
        self._classifier = classifier
        self._backend = backend

    def classify(self, image_path: Path) -> Prediction:
        return self._classifier.predict(image_path)

    def recognize_and_update_marker(
        self,
        document_id: UUID,
        marker_id: UUID,
        image_path: Path,
    ) -> RecognitionResult:
        backend = self._require_backend()
        document = backend.get_document_markers(document_id)
        if not any(marker.id == marker_id for marker in document.markers):
            raise ValueError(f"Marker {marker_id} is not present in document {document_id}")
        prediction = self._classifier.predict(image_path)
        update = backend.update_marker(
            document_id,
            marker_id,
            version=document.version,
            content=[MarkerContent(type="inlineMath", value=prediction.label)],
        )
        return RecognitionResult(prediction=prediction, update=update)

    def _require_backend(self) -> ScannerBackendClient:
        if self._backend is None:
            raise RuntimeError("This operation requires a configured backend client")
        return self._backend
