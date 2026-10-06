from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import UUID

from ai_scanner_client.backend.client import ScannerBackendClient
from ai_scanner_client.camera.base import CameraCapture
from ai_scanner_client.inference.classifier import SymbolClassifier
from ai_scanner_client.models import (
    DocumentMarkers,
    MarkerContent,
    RecognitionResult,
    ScanSession,
)


class RecordingSession:
    """Coordinates one server-assigned document scanning session."""

    def __init__(
        self,
        classifier: SymbolClassifier,
        backend: ScannerBackendClient,
        camera: CameraCapture,
    ) -> None:
        self._classifier = classifier
        self._backend = backend
        self._camera = camera
        self._session: ScanSession | None = None
        self._document: DocumentMarkers | None = None
        self._capture_directory: TemporaryDirectory[str] | None = None

    @property
    def camera_name(self) -> str:
        return self._camera.name

    @property
    def session(self) -> ScanSession:
        if self._session is None:
            raise RuntimeError("No recording session is active")
        return self._session

    @property
    def document(self) -> DocumentMarkers:
        if self._document is None:
            raise RuntimeError("No document is loaded for recording")
        return self._document

    def start(self) -> tuple[ScanSession, DocumentMarkers]:
        session = self._backend.get_active_scan_session()
        document = self._backend.get_document_markers(session.document_id)
        if document.document_id != session.document_id:
            raise RuntimeError("Backend returned markers for a different document")
        self._camera.open()
        try:
            self._capture_directory = TemporaryDirectory(prefix="ai-scanner-")
        except Exception:
            self._camera.close()
            raise
        self._session = session
        self._document = document
        return session, document

    def scan(self, marker_id: UUID) -> RecognitionResult:
        document = self.document
        marker = next((item for item in document.markers if item.id == marker_id), None)
        if marker is None:
            raise ValueError(f"Marker {marker_id} is not present in the active document")

        if self._capture_directory is None:
            raise RuntimeError("Camera capture directory is not available")
        image_path = Path(self._capture_directory.name) / "capture.png"
        try:
            self._camera.capture(image_path)
            prediction = self._classifier.predict(image_path)
        finally:
            image_path.unlink(missing_ok=True)
        content = [MarkerContent(type="inlineMath", value=prediction.label)]
        update = self._backend.update_marker(
            document.document_id,
            marker_id,
            version=document.version,
            content=content,
        )
        document.version = update.version
        marker.content = content
        return RecognitionResult(prediction=prediction, update=update)

    def complete(self) -> ScanSession:
        session = self._backend.finish_scan_session(self.session.id)
        try:
            self._close_camera()
        finally:
            self._session = None
            self._document = None
        return session

    def close(self) -> None:
        try:
            self._close_camera()
        finally:
            self._backend.close()

    def _close_camera(self) -> None:
        try:
            self._camera.close()
        finally:
            if self._capture_directory is not None:
                self._capture_directory.cleanup()
            self._capture_directory = None
