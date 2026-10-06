import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from textual.widgets import Button, DataTable, Static

from ai_scanner_client.config import ClientSettings
from ai_scanner_client.model_management.selection import ModelSelectionStore
from ai_scanner_client.models import DocumentMarker, DocumentMarkers, ScanSession
from ai_scanner_client.tui.app import AiScannerTui


def write_bundle(models_directory: Path) -> None:
    bundle = models_directory / "cnn-v1-test"
    bundle.mkdir(parents=True)
    (bundle / "model.keras").write_bytes(b"model")
    (bundle / "class_mapping.json").write_text('["0", "1"]', encoding="utf-8")
    (bundle / "manifest.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "id": "cnn-v1-test",
                "architecture": "cnn_v1",
                "runId": "test-run",
                "format": "keras",
                "modelFile": "model.keras",
                "classMappingFile": "class_mapping.json",
                "deployable": True,
            }
        ),
        encoding="utf-8",
    )


def test_tui_discovers_and_selects_model(tmp_path: Path) -> None:
    models_directory = tmp_path / "models"
    selection_path = tmp_path / "state" / "selection.json"
    write_bundle(models_directory)
    settings = ClientSettings(
        models_directory=models_directory,
        model_selection_path=selection_path,
    )
    app = AiScannerTui(settings)

    async def exercise_app() -> None:
        async with app.run_test() as pilot:
            await app.workers.wait_for_complete()
            table = app.query_one("#models-table", DataTable)
            assert table.row_count == 1
            assert "1 valid model" in str(app.query_one("#models-status", Static).content)
            assert app.query_one("#start-recording", Button).disabled is False
            assert app.query_one("#scan-marker", Button).disabled is True
            assert app.focused is table

            await pilot.press("right")
            assert app.focused is app.query_one("#refresh-models", Button)

            await pilot.press("down")
            assert app.focused is app.query_one("#select-model", Button)

            await pilot.press("enter")
            await app.workers.wait_for_complete()

            app._display_recording(
                ScanSession(
                    id=UUID("7ebf4db5-284d-42c2-8c59-424ef0e870aa"),
                    document_id=UUID("15d79d83-e70c-4afb-8ab7-c291b26a2843"),
                    scanner_id=UUID("ca3999a4-1479-41ed-b03e-604b6cd3a7a8"),
                    status="active",
                    created_at=datetime.now(UTC),
                    completed_at=None,
                ),
                DocumentMarkers(
                    document_id=UUID("15d79d83-e70c-4afb-8ab7-c291b26a2843"),
                    version=1,
                    markers=[
                        DocumentMarker(
                            id=UUID("4b284755-6379-420f-88be-2a67dfc7a928"),
                            label="Answer",
                            content=[],
                        )
                    ],
                ),
                "Test camera",
            )
            await pilot.pause()
            markers = app.query_one("#markers-table", DataTable)
            assert app.focused is markers

            await pilot.press("right")
            scan_button = app.query_one("#scan-marker", Button)
            assert app.focused is scan_button

            await pilot.press("left")
            assert app.focused is markers

            app.marker_highlighted(DataTable.RowHighlighted(markers, -1, None))  # type: ignore[arg-type]
            assert app._selected_marker_id is None

    asyncio.run(exercise_app())

    selection = ModelSelectionStore(selection_path).read()
    assert selection is not None
    assert selection.model_id == "cnn-v1-test"
