import json
from pathlib import Path

import pytest

from ai_scanner_client.model_management.manager import ModelManager, NoModelSelectedError
from ai_scanner_client.model_management.registry import ModelNotFoundError, ModelRegistry
from ai_scanner_client.model_management.selection import ModelSelectionStore


def write_bundle(models_directory: Path, model_id: str) -> Path:
    bundle = models_directory / model_id
    bundle.mkdir(parents=True)
    (bundle / "model.keras").write_bytes(b"model")
    (bundle / "class_mapping.json").write_text('["0", "1"]', encoding="utf-8")
    (bundle / "manifest.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "id": model_id,
                "architecture": "cnn_v1",
                "runId": "baseline",
                "format": "keras",
                "modelFile": "model.keras",
                "classMappingFile": "class_mapping.json",
                "preprocessing": {
                    "colorMode": "RGB",
                    "width": 128,
                    "height": 128,
                    "resize": "bilinear",
                    "normalization": "none",
                },
                "deployable": True,
            }
        ),
        encoding="utf-8",
    )
    return bundle


def test_refresh_discovers_bundles_added_after_startup(tmp_path: Path) -> None:
    models_directory = tmp_path / "models"
    registry = ModelRegistry(models_directory)

    assert registry.refresh().models == []

    write_bundle(models_directory, "cnn-v1-baseline")
    snapshot = registry.refresh()

    assert [model.id for model in snapshot.models] == ["cnn-v1-baseline"]
    assert registry.get("cnn-v1-baseline").manifest.architecture == "cnn_v1"


def test_refresh_isolates_an_invalid_bundle(tmp_path: Path) -> None:
    models_directory = tmp_path / "models"
    write_bundle(models_directory, "valid-model")
    invalid = models_directory / "broken-model"
    invalid.mkdir(parents=True)

    snapshot = ModelRegistry(models_directory).refresh()

    assert [model.id for model in snapshot.models] == ["valid-model"]
    assert len(snapshot.invalid_bundles) == 1
    assert snapshot.invalid_bundles[0].directory.endswith("broken-model")
    assert "manifest.json is missing" in snapshot.invalid_bundles[0].reason


def test_model_selection_is_persisted(tmp_path: Path) -> None:
    models_directory = tmp_path / "models"
    write_bundle(models_directory, "model-a")
    write_bundle(models_directory, "model-b")
    selection_path = tmp_path / "state" / "selection.json"

    manager = ModelManager(ModelRegistry(models_directory), ModelSelectionStore(selection_path))
    manager.refresh()

    with pytest.raises(NoModelSelectedError):
        manager.selected_bundle()

    manager.select("model-b")

    restarted_manager = ModelManager(
        ModelRegistry(models_directory),
        ModelSelectionStore(selection_path),
    )
    restarted_manager.refresh()
    assert restarted_manager.selected_bundle().manifest.id == "model-b"


def test_select_rejects_unknown_model(tmp_path: Path) -> None:
    manager = ModelManager(
        ModelRegistry(tmp_path / "models"),
        ModelSelectionStore(tmp_path / "state.json"),
    )
    manager.refresh()

    with pytest.raises(ModelNotFoundError, match="Available models: none"):
        manager.select("missing")
