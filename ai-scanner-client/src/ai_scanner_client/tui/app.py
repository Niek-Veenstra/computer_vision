from collections.abc import Callable
from typing import ClassVar
from uuid import UUID

from textual import on, work
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical, VerticalScroll
from textual.widgets import Button, DataTable, Footer, Header, Label, Static

from ai_scanner_client.backend.client import ScannerBackendClient
from ai_scanner_client.camera.base import CameraCapture
from ai_scanner_client.camera.factory import CameraFactory
from ai_scanner_client.camera.preview import GuidedCameraPreview
from ai_scanner_client.config import ClientSettings
from ai_scanner_client.inference.classifier import SymbolClassifier
from ai_scanner_client.inference.pipeline import SymbolRecognitionPipeline
from ai_scanner_client.model_management.factory import ClassifierFactory
from ai_scanner_client.model_management.manager import ModelManager
from ai_scanner_client.model_management.registry import (
    ModelRegistry,
    ModelSummary,
    RegistrySnapshot,
)
from ai_scanner_client.model_management.selection import ModelSelectionStore
from ai_scanner_client.models import DocumentMarkers, PagePrediction, RecognitionResult, ScanSession
from ai_scanner_client.scanning.page import CameraPageRecognizer
from ai_scanner_client.scanning.session import RecordingSession


class NavigableDataTable(DataTable[str]):
    """Data table that uses horizontal arrows to leave the table."""

    BINDINGS: ClassVar[list[Binding]] = [
        binding for binding in DataTable.BINDINGS if binding.key not in {"left", "right"}
    ] + [
        Binding("left", "focus_previous_control", show=False),
        Binding("right", "focus_next_control", show=False),
    ]

    def action_focus_previous_control(self) -> None:
        self.screen.focus_previous()

    def action_focus_next_control(self) -> None:
        self.screen.focus_next()


class NavigableButton(Button):
    """Button that supports directional focus navigation."""

    BINDINGS: ClassVar[list[Binding]] = [
        *Button.BINDINGS,
        Binding("up", "focus_previous_control", show=False),
        Binding("left", "focus_previous_control", show=False),
        Binding("down", "focus_next_control", show=False),
        Binding("right", "focus_next_control", show=False),
    ]

    def action_focus_previous_control(self) -> None:
        self.screen.focus_previous()

    def action_focus_next_control(self) -> None:
        self.screen.focus_next()


class AiScannerTui(App[None]):
    """Interactive model management, inference and backend status UI."""

    TITLE = "AI Scanner Client"
    SUB_TITLE = "Raspberry Pi inference"
    CSS_PATH = "app.tcss"

    BINDINGS: ClassVar[list[tuple[str, str, str]]] = [
        ("r", "refresh_models", "Refresh models"),
        ("s", "select_model", "Select model"),
        ("b", "check_backend", "Check backend"),
        ("p", "scan_sequence", "Scan sequence"),
        ("q", "quit", "Quit"),
    ]

    def __init__(
        self,
        settings: ClientSettings,
        model_manager: ModelManager | None = None,
        backend_factory: Callable[[], ScannerBackendClient] | None = None,
        camera_factory: Callable[[], CameraCapture] | None = None,
    ) -> None:
        super().__init__()
        self._settings = settings
        self._model_manager = model_manager or ModelManager(
            ModelRegistry(settings.models_directory),
            ModelSelectionStore(settings.model_selection_path),
            ClassifierFactory(),
        )
        self._models: dict[str, ModelSummary] = {}
        self._backend_factory = backend_factory or self._create_backend
        self._camera_factory = camera_factory or self._create_camera
        self._highlighted_model_id: str | None = None
        self._loaded_classifier: SymbolClassifier | None = None
        self._loaded_pipeline: SymbolRecognitionPipeline | None = None
        self._loaded_model_id: str | None = None
        self._recording: RecordingSession | None = None
        self._selected_marker_id: UUID | None = None

    def compose(self) -> ComposeResult:
        yield Header()
        with VerticalScroll(id="content"):
            with Horizontal(id="workspace"):
                with Vertical(id="models-panel", classes="panel"):
                    yield Label("Models", classes="panel-title")
                    table: DataTable[str] = NavigableDataTable(
                        id="models-table",
                        cursor_type="row",
                        zebra_stripes=True,
                    )
                    table.add_columns("", "Model", "Architecture", "Run", "Format")
                    yield table
                    with Horizontal(classes="button-row"):
                        yield NavigableButton("Refresh", id="refresh-models", variant="default")
                        yield NavigableButton("Select", id="select-model", variant="primary")
                    yield Static("Models have not been scanned yet.", id="models-status")
                with VerticalScroll(id="details-panel", classes="panel"):
                    yield Label("Model details", classes="panel-title")
                    yield Static("Highlight a model to inspect it.", id="model-details")
                    yield Label("Backend", classes="panel-title section-title")
                    yield NavigableButton("Check connection", id="check-backend")
                    yield Static("Backend has not been checked.", id="backend-status")
                    yield Label("Sequence scanner", classes="panel-title section-title")
                    yield NavigableButton(
                        "Open camera preview",
                        id="scan-sequence",
                        variant="success",
                        disabled=True,
                    )
                    yield Static("Select a model bundle with a detector.", id="sequence-status")
            with Vertical(id="recording-panel", classes="panel"):
                yield Label("Recording session", classes="panel-title")
                with Horizontal(classes="button-row recording-actions"):
                    yield NavigableButton("Start session", id="start-recording", variant="primary")
                    yield NavigableButton(
                        "Complete session",
                        id="complete-recording",
                        disabled=True,
                    )
                yield Static(
                    "Create a scan session in the portal, then start it here.",
                    id="recording-status",
                )
                markers: DataTable[str] = NavigableDataTable(
                    id="markers-table",
                    cursor_type="row",
                    zebra_stripes=True,
                )
                markers.add_columns("", "Marker", "Label", "Content")
                yield markers
                with Horizontal(classes="button-row recording-actions"):
                    yield NavigableButton(
                        "Capture and scan marker",
                        id="scan-marker",
                        variant="success",
                        disabled=True,
                    )
                yield Static(
                    "Select a marker and press Enter to capture from the camera.",
                    id="camera-help",
                )
                yield Static("", id="recording-result")
        yield Footer()

    def on_mount(self) -> None:
        self.query_one("#models-table", DataTable).focus()
        self.action_refresh_models()

    def on_unmount(self) -> None:
        if self._recording is not None:
            self._recording.close()

    @on(DataTable.RowHighlighted, "#models-table")
    def model_highlighted(self, event: DataTable.RowHighlighted) -> None:
        if event.row_key is None:
            self._highlighted_model_id = None
            return
        model_id = str(event.row_key.value)
        if model_id in self._models:
            self._highlighted_model_id = model_id
            self._show_model_details(model_id)

    @on(DataTable.RowSelected, "#models-table")
    def model_selected(self, event: DataTable.RowSelected) -> None:
        if event.row_key is None:
            return
        self._highlighted_model_id = str(event.row_key.value)
        self.action_select_model()

    @on(DataTable.RowSelected, "#markers-table")
    def marker_selected(self, event: DataTable.RowSelected) -> None:
        if event.row_key is None:
            self._selected_marker_id = None
            return
        try:
            self._selected_marker_id = UUID(str(event.row_key.value))
        except ValueError:
            self._selected_marker_id = None
            return
        self.action_scan_marker()

    @on(DataTable.RowHighlighted, "#markers-table")
    def marker_highlighted(self, event: DataTable.RowHighlighted) -> None:
        if event.row_key is None:
            self._selected_marker_id = None
            return
        try:
            self._selected_marker_id = UUID(str(event.row_key.value))
        except ValueError:
            self._selected_marker_id = None

    @on(Button.Pressed, "#refresh-models")
    def refresh_button_pressed(self) -> None:
        self.action_refresh_models()

    @on(Button.Pressed, "#select-model")
    def select_button_pressed(self) -> None:
        self.action_select_model()

    @on(Button.Pressed, "#check-backend")
    def backend_button_pressed(self) -> None:
        self.action_check_backend()

    @on(Button.Pressed, "#start-recording")
    def start_recording_button_pressed(self) -> None:
        self.action_start_recording()

    @on(Button.Pressed, "#complete-recording")
    def complete_recording_button_pressed(self) -> None:
        self.action_complete_recording()

    @on(Button.Pressed, "#scan-marker")
    def scan_marker_button_pressed(self) -> None:
        self.action_scan_marker()

    @on(Button.Pressed, "#scan-sequence")
    def scan_sequence_button_pressed(self) -> None:
        self.action_scan_sequence()

    def action_refresh_models(self) -> None:
        self.query_one("#models-status", Static).update("Scanning models…")
        self._refresh_models_worker()

    def action_select_model(self) -> None:
        if self._highlighted_model_id is None:
            self.notify("Highlight a model first.", severity="warning")
            return
        self.query_one("#models-status", Static).update(f"Selecting {self._highlighted_model_id}…")
        self._select_model_worker(self._highlighted_model_id)

    def action_check_backend(self) -> None:
        self.query_one("#backend-status", Static).update("Checking backend…")
        self._check_backend_worker()

    def action_start_recording(self) -> None:
        if self._recording is not None:
            self.notify("A recording session is already active.", severity="warning")
            return
        self.query_one("#recording-status", Static).update("Loading active scan session...")
        self.query_one("#recording-result", Static).update("")
        self._start_recording_worker()

    def action_complete_recording(self) -> None:
        if self._recording is None:
            self.notify("No recording session is active.", severity="warning")
            return
        self.query_one("#recording-status", Static).update("Completing scan session...")
        self._complete_recording_worker()

    def action_scan_marker(self) -> None:
        if self._recording is None or self._selected_marker_id is None:
            self.notify("Start a session and select a marker first.", severity="warning")
            return
        self.query_one("#recording-status", Static).update(
            "Capturing an image and scanning the selected marker..."
        )
        self._scan_marker_worker(self._selected_marker_id)

    def action_scan_sequence(self) -> None:
        if self._recording is not None:
            self.notify(
                "Complete the active recording session before opening the sequence camera.",
                severity="warning",
            )
            return
        self.query_one("#sequence-status", Static).update(
            "Opening camera preview… Place one horizontal sequence inside the guide."
        )
        self._scan_sequence_worker()

    @work(thread=True, group="models", exclusive=True, exit_on_error=False)
    def _refresh_models_worker(self) -> None:
        try:
            snapshot = self._model_manager.refresh()
        except Exception as error:
            self.call_from_thread(self._show_worker_error, "models-status", error)
            return
        self.call_from_thread(self._display_snapshot, snapshot)

    @work(thread=True, group="selection", exclusive=True, exit_on_error=False)
    def _select_model_worker(self, model_id: str) -> None:
        try:
            selection = self._model_manager.select(model_id)
            snapshot = self._model_manager.refresh()
        except Exception as error:
            self.call_from_thread(self._show_worker_error, "models-status", error)
            return
        self._loaded_classifier = None
        self._loaded_pipeline = None
        self._loaded_model_id = None
        self.call_from_thread(self._display_snapshot, snapshot)
        self.call_from_thread(
            self.notify,
            f"Selected model {selection.model_id}",
            severity="information",
        )

    @work(thread=True, group="sequence", exclusive=True, exit_on_error=False)
    def _scan_sequence_worker(self) -> None:
        try:
            bundle = self._model_manager.selected_bundle()
            if self._loaded_pipeline is None or self._loaded_model_id != bundle.manifest.id:
                self._loaded_pipeline = self._model_manager.create_pipeline(bundle.manifest.id)
                self._loaded_model_id = bundle.manifest.id
            recognizer = CameraPageRecognizer(
                self._loaded_pipeline,
                self._camera_factory(),
                GuidedCameraPreview(
                    width_ratio=self._settings.preview_guide_width_ratio,
                    height_ratio=self._settings.preview_guide_height_ratio,
                ),
            )
            result = recognizer.predict(guided=True)
        except Exception as error:
            self.call_from_thread(self._show_worker_error, "sequence-status", error)
            return
        self.call_from_thread(self._display_sequence_result, result)

    @work(thread=True, group="backend", exclusive=True, exit_on_error=False)
    def _check_backend_worker(self) -> None:
        try:
            with ScannerBackendClient(
                str(self._settings.backend_url),
                self._settings.require_scanner_api_key(),
                timeout_seconds=self._settings.request_timeout_seconds,
            ) as backend:
                identity = backend.get_identity()
        except Exception as error:
            self.call_from_thread(self._show_worker_error, "backend-status", error)
            return
        self.call_from_thread(self._display_backend_identity, identity.name, str(identity.id))

    @work(thread=True, group="recording", exclusive=True, exit_on_error=False)
    def _start_recording_worker(self) -> None:
        backend: ScannerBackendClient | None = None
        recording: RecordingSession | None = None
        try:
            bundle = self._model_manager.selected_bundle()
            if self._loaded_classifier is None or self._loaded_model_id != bundle.manifest.id:
                self._loaded_classifier = self._model_manager.create_classifier(bundle.manifest.id)
                self._loaded_model_id = bundle.manifest.id
            backend = self._backend_factory()
            camera = self._camera_factory()
            recording = RecordingSession(self._loaded_classifier, backend, camera)
            session, document = recording.start()
            self._recording = recording
        except Exception as error:
            if recording is not None:
                recording.close()
            elif backend is not None:
                backend.close()
            self.call_from_thread(self._show_worker_error, "recording-status", error)
            return
        self.call_from_thread(self._display_recording, session, document, recording.camera_name)

    @work(thread=True, group="recording", exclusive=True, exit_on_error=False)
    def _scan_marker_worker(self, marker_id: UUID) -> None:
        try:
            if self._recording is None:
                raise RuntimeError("No recording session is active")
            result = self._recording.scan(marker_id)
            document = self._recording.document
        except Exception as error:
            self.call_from_thread(self._show_worker_error, "recording-status", error)
            return
        self.call_from_thread(self._display_marker_result, result, document)

    @work(thread=True, group="recording", exclusive=True, exit_on_error=False)
    def _complete_recording_worker(self) -> None:
        try:
            if self._recording is None:
                raise RuntimeError("No recording session is active")
            recording = self._recording
            session = recording.complete()
            recording.close()
            self._recording = None
        except Exception as error:
            self.call_from_thread(self._show_worker_error, "recording-status", error)
            return
        self.call_from_thread(self._display_completed_recording, session)

    def _display_snapshot(self, snapshot: RegistrySnapshot) -> None:
        table = self.query_one("#models-table", DataTable)
        table.clear()
        self._models = {model.id: model for model in snapshot.models}
        current = self._model_manager.current_selection()
        current_id = current.model_id if current is not None else None
        preferred_row = 0
        for index, model in enumerate(snapshot.models):
            is_selected = model.id == current_id
            if is_selected:
                preferred_row = index
            table.add_row(
                "●" if is_selected else "",
                model.id,
                model.architecture,
                model.run_id,
                model.format,
                key=model.id,
            )
        valid_count = len(snapshot.models)
        invalid_count = len(snapshot.invalid_bundles)
        self.query_one("#models-status", Static).update(
            f"{valid_count} valid model(s), {invalid_count} invalid bundle(s)."
        )
        if snapshot.models:
            table.move_cursor(row=preferred_row)
            self._highlighted_model_id = snapshot.models[preferred_row].id
            self._show_model_details(self._highlighted_model_id)
        else:
            self._highlighted_model_id = None
            details = "No valid model bundles found."
            if snapshot.invalid_bundles:
                issues = "\n".join(
                    f"• {item.directory}: {item.reason}" for item in snapshot.invalid_bundles
                )
                details = f"{details}\n\nRejected bundles:\n{issues}"
            self.query_one("#model-details", Static).update(details)
        selected_model = next((model for model in snapshot.models if model.id == current_id), None)
        self.query_one("#scan-sequence", Button).disabled = (
            selected_model is None or not selected_model.has_detector or self._recording is not None
        )
        self.query_one("#sequence-status", Static).update(
            "Ready: open the camera and place one horizontal sequence in the guide."
            if selected_model is not None and selected_model.has_detector
            else "Select a model bundle with a detector."
        )

    def _show_model_details(self, model_id: str) -> None:
        try:
            bundle = self._model_manager.get_bundle(model_id)
        except LookupError as error:
            self.query_one("#model-details", Static).update(str(error))
            return
        manifest = bundle.manifest
        preprocessing = manifest.preprocessing
        selected = self._model_manager.current_selection()
        selected_text = "yes" if selected and selected.model_id == model_id else "no"
        details = [
            f"ID: {manifest.id}",
            f"Architecture: {manifest.architecture}",
            f"Run: {manifest.run_id}",
            f"Format: {manifest.format.value}",
            f"Selected: {selected_text}",
            "",
            (f"Input: {preprocessing.width}x{preprocessing.height} {preprocessing.color_mode}"),
            f"Resize: {preprocessing.resize}",
            f"Normalization: {preprocessing.normalization}",
            f"Model: {bundle.model_path}",
        ]
        if manifest.detector is not None:
            details.extend(
                [
                    "",
                    f"Detector: {manifest.detector.architecture}",
                    f"Detector run: {manifest.detector.run_id}",
                    f"Detector model: {bundle.detector_path}",
                ]
            )
        self.query_one("#model-details", Static).update("\n".join(details))

    def _display_backend_identity(self, name: str, scanner_id: str) -> None:
        self.query_one("#backend-status", Static).update(f"Connected as {name} ({scanner_id})")

    def _display_recording(
        self,
        session: ScanSession,
        document: DocumentMarkers,
        camera_name: str,
    ) -> None:
        self.query_one("#recording-status", Static).update(
            f"Session {session.id} - {camera_name} - "
            f"document {document.document_id} - version {document.version}"
        )
        self.query_one("#start-recording", Button).disabled = True
        self.query_one("#complete-recording", Button).disabled = False
        self.query_one("#scan-marker", Button).disabled = not document.markers
        self.query_one("#scan-sequence", Button).disabled = True
        self._display_markers(document)
        if document.markers:
            self.query_one("#markers-table", DataTable).focus()

    def _display_markers(
        self,
        document: DocumentMarkers,
        preferred_marker_id: UUID | None = None,
    ) -> None:
        table = self.query_one("#markers-table", DataTable)
        table.clear()
        for marker in document.markers:
            content = " ".join(item.value for item in marker.content)
            table.add_row(
                "*" if content else "",
                str(marker.id),
                marker.label or "",
                content,
                key=str(marker.id),
            )
        if document.markers:
            preferred_row = 0
            if preferred_marker_id is not None:
                preferred_row = next(
                    (
                        index
                        for index, marker in enumerate(document.markers)
                        if marker.id == preferred_marker_id
                    ),
                    0,
                )
            else:
                preferred_row = next(
                    (index for index, marker in enumerate(document.markers) if not marker.content),
                    0,
                )
            self._selected_marker_id = document.markers[preferred_row].id
            table.move_cursor(row=preferred_row)
        else:
            self._selected_marker_id = None

    def _display_marker_result(
        self,
        result: RecognitionResult,
        document: DocumentMarkers,
    ) -> None:
        self.query_one("#recording-status", Static).update(
            f"Marker updated - document version {document.version}"
        )
        self.query_one("#recording-result", Static).update(
            f"{result.prediction.label} ({result.prediction.confidence:.1%}) via "
            f"{result.prediction.model_id} / {result.prediction.run_id}"
        )
        scanned_index = next(
            index
            for index, marker in enumerate(document.markers)
            if marker.id == result.update.marker_id
        )
        next_index = min(scanned_index + 1, len(document.markers) - 1)
        self._display_markers(document, document.markers[next_index].id)

    def _display_completed_recording(self, session: ScanSession) -> None:
        self.query_one("#recording-status", Static).update(f"Session {session.id} completed.")
        self.query_one("#start-recording", Button).disabled = False
        self.query_one("#complete-recording", Button).disabled = True
        self.query_one("#scan-marker", Button).disabled = True
        selected = self._model_manager.current_selection()
        selected_model = self._models.get(selected.model_id) if selected is not None else None
        self.query_one("#scan-sequence", Button).disabled = (
            selected_model is None or not selected_model.has_detector
        )
        self.query_one("#markers-table", DataTable).clear()
        self._selected_marker_id = None
        self.query_one("#start-recording", Button).focus()

    def _display_sequence_result(self, result: PagePrediction) -> None:
        sequence = result.sequence or "(geen symbolen gevonden)"
        self.query_one("#sequence-status", Static).update(
            f"Sequence: {sequence} · {len(result.detections)} detectie(s) · "
            f"{result.detector_architecture}/{result.detector_run_id} → "
            f"{result.classifier_architecture}/{result.classifier_run_id}"
        )
        self.query_one("#scan-sequence", Button).focus()

    def _create_backend(self) -> ScannerBackendClient:
        return ScannerBackendClient(
            str(self._settings.backend_url),
            self._settings.require_scanner_api_key(),
            timeout_seconds=self._settings.request_timeout_seconds,
        )

    def _create_camera(self) -> CameraCapture:
        return CameraFactory().create(self._settings)

    def _show_worker_error(self, widget_id: str, error: Exception) -> None:
        message = f"{type(error).__name__}: {error}"
        self.query_one(f"#{widget_id}", Static).update(message)
        self.notify(message, severity="error", timeout=8)
