from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from ai_scanner_client.models import (
    DocumentMarker,
    DocumentMarkers,
    MarkerUpdateResult,
    Prediction,
    ScanSession,
)
from ai_scanner_client.scanning.session import RecordingSession

DOCUMENT_ID = UUID("15d79d83-e70c-4afb-8ab7-c291b26a2843")
MARKER_ID = UUID("4b284755-6379-420f-88be-2a67dfc7a928")
SCANNER_ID = UUID("ca3999a4-1479-41ed-b03e-604b6cd3a7a8")
SESSION_ID = UUID("7ebf4db5-284d-42c2-8c59-424ef0e870aa")


class FakeClassifier:
    def predict(self, image_path: Path) -> Prediction:
        assert image_path.name == "capture.png"
        assert image_path.read_bytes() == b"camera frame"
        return Prediction(
            model_id="cnn-v1",
            architecture="cnn",
            run_id="run-1",
            label="8",
            confidence=0.95,
            class_index=8,
        )


class FakeBackend:
    def __init__(self) -> None:
        now = datetime.now(UTC)
        self.session = ScanSession(
            id=SESSION_ID,
            document_id=DOCUMENT_ID,
            scanner_id=SCANNER_ID,
            status="active",
            created_at=now,
            completed_at=None,
        )
        self.document = DocumentMarkers(
            document_id=DOCUMENT_ID,
            version=3,
            markers=[DocumentMarker(id=MARKER_ID, label="Answer", content=[])],
        )
        self.update_version: int | None = None
        self.closed = False

    def get_active_scan_session(self) -> ScanSession:
        return self.session

    def get_document_markers(self, document_id: UUID) -> DocumentMarkers:
        assert document_id == DOCUMENT_ID
        return self.document

    def update_marker(
        self,
        document_id: UUID,
        marker_id: UUID,
        **kwargs: object,
    ) -> MarkerUpdateResult:
        assert document_id == DOCUMENT_ID
        assert marker_id == MARKER_ID
        self.update_version = int(kwargs["version"])
        return MarkerUpdateResult(
            operation_id=UUID("9b084736-09b9-4532-84bb-e51d7ee2e692"),
            document_id=DOCUMENT_ID,
            marker_id=MARKER_ID,
            version=4,
            applied=True,
        )

    def finish_scan_session(self, session_id: UUID) -> ScanSession:
        assert session_id == SESSION_ID
        return self.session.model_copy(
            update={"status": "completed", "completed_at": datetime.now(UTC)}
        )

    def close(self) -> None:
        self.closed = True


class FakeCamera:
    name = "Test camera"

    def __init__(self) -> None:
        self.opened = False
        self.captured = False

    def open(self) -> None:
        self.opened = True

    def capture(self, destination: Path) -> None:
        assert self.opened
        destination.write_bytes(b"camera frame")
        self.captured = True

    def close(self) -> None:
        self.opened = False


def test_recording_session_loads_scans_and_completes() -> None:
    backend = FakeBackend()
    camera = FakeCamera()
    recording = RecordingSession(  # type: ignore[arg-type]
        FakeClassifier(),
        backend,
        camera,
    )

    session, document = recording.start()
    result = recording.scan(MARKER_ID)
    completed = recording.complete()
    recording.close()

    assert session.id == SESSION_ID
    assert document.version == 4
    assert backend.update_version == 3
    assert result.prediction.label == "8"
    assert camera.captured is True
    assert camera.opened is False
    assert document.markers[0].content[0].value == "8"
    assert completed.status == "completed"
    assert backend.closed is True
