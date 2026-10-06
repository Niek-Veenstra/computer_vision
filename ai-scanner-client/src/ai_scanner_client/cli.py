from pathlib import Path
from uuid import UUID

import typer
from pydantic import BaseModel

from ai_scanner_client.application import PiClientApplication
from ai_scanner_client.backend.client import ScannerBackendClient
from ai_scanner_client.camera.factory import CameraFactory
from ai_scanner_client.camera.preview import GuidedCameraPreview
from ai_scanner_client.config import ClientSettings
from ai_scanner_client.inference.classifier import SymbolClassifier
from ai_scanner_client.inference.pipeline import SymbolRecognitionPipeline
from ai_scanner_client.model_management.factory import ClassifierFactory
from ai_scanner_client.model_management.manager import ModelManager
from ai_scanner_client.model_management.registry import ModelRegistry
from ai_scanner_client.model_management.selection import ModelSelectionStore
from ai_scanner_client.scanning.page import CameraPageRecognizer

cli = typer.Typer(no_args_is_help=True, pretty_exceptions_show_locals=False)
models_cli = typer.Typer(no_args_is_help=True, help="Discover and select inference models.")
cli.add_typer(models_cli, name="models")


def _settings() -> ClientSettings:
    return ClientSettings()


def _model_manager(settings: ClientSettings) -> ModelManager:
    return ModelManager(
        ModelRegistry(settings.models_directory),
        ModelSelectionStore(settings.model_selection_path),
        ClassifierFactory(),
    )


def _classifier(settings: ClientSettings, model_id: str | None = None) -> SymbolClassifier:
    manager = _model_manager(settings)
    manager.refresh()
    return manager.create_classifier(model_id)


def _pipeline(settings: ClientSettings, model_id: str | None = None) -> SymbolRecognitionPipeline:
    manager = _model_manager(settings)
    manager.refresh()
    return manager.create_pipeline(model_id)


def _backend(settings: ClientSettings) -> ScannerBackendClient:
    return ScannerBackendClient(
        str(settings.backend_url),
        settings.require_scanner_api_key(),
        timeout_seconds=settings.request_timeout_seconds,
    )


def _print_model(value: BaseModel) -> None:
    typer.echo(value.model_dump_json(indent=2, by_alias=True))


@models_cli.command("refresh")
def refresh_models() -> None:
    """Rescan the models directory and report valid and invalid bundles."""
    manager = _model_manager(_settings())
    _print_model(manager.refresh())


@models_cli.command("list")
def list_models() -> None:
    """List all valid, deployable model bundles currently on disk."""
    manager = _model_manager(_settings())
    _print_model(manager.refresh())


@models_cli.command("select")
def select_model(model_id: str) -> None:
    """Persist the model used by subsequent inference commands."""
    manager = _model_manager(_settings())
    manager.refresh()
    _print_model(manager.select(model_id))


@models_cli.command("current")
def current_model() -> None:
    """Show the persisted model selection."""
    manager = _model_manager(_settings())
    manager.refresh()
    selection = manager.current_selection()
    if selection is None:
        raise typer.BadParameter("No model is selected")
    manager.selected_bundle()
    _print_model(selection)


@cli.command()
def tui() -> None:
    """Open the interactive terminal user interface."""
    from ai_scanner_client.tui.app import AiScannerTui

    AiScannerTui(_settings()).run()


@cli.command()
def predict(
    image: Path,
    model: str | None = typer.Option(None, "--model", help="One-off model ID override."),
) -> None:
    """Classify one local symbol image without contacting the backend."""
    settings = _settings()
    application = PiClientApplication(_classifier(settings, model))
    _print_model(application.classify(image))


@cli.command("predict-page")
def predict_page(
    image: Path,
    model: str | None = typer.Option(None, "--model", help="One-off model ID override."),
    confidence: float | None = typer.Option(
        None,
        "--confidence",
        min=0.01,
        max=1.0,
        help="Override the detector confidence threshold from the manifest.",
    ),
) -> None:
    """Detect and classify all symbols in one local page image."""
    result = _pipeline(_settings(), model).predict(image, confidence_threshold=confidence)
    _print_model(result)


@cli.command("predict-camera")
def predict_camera(
    model: str | None = typer.Option(None, "--model", help="One-off model ID override."),
    confidence: float | None = typer.Option(
        None,
        "--confidence",
        min=0.01,
        max=1.0,
        help="Override the detector confidence threshold from the manifest.",
    ),
    preview: bool = typer.Option(
        True,
        "--preview/--no-preview",
        help="Show a live camera frame with a sequence guide before capture.",
    ),
) -> None:
    """Capture one Raspberry Pi camera frame and run the full symbol pipeline."""
    settings = _settings()
    recognizer = CameraPageRecognizer(
        _pipeline(settings, model),
        CameraFactory().create(settings),
        GuidedCameraPreview(
            width_ratio=settings.preview_guide_width_ratio,
            height_ratio=settings.preview_guide_height_ratio,
        ),
    )
    _print_model(recognizer.predict(confidence_threshold=confidence, guided=preview))


@cli.command()
def whoami() -> None:
    """Validate the scanner key and print the scanner identity."""
    settings = _settings()
    with _backend(settings) as backend:
        _print_model(backend.get_identity())


@cli.command()
def markers(document_id: UUID) -> None:
    """Read the current markers and version of a document."""
    settings = _settings()
    with _backend(settings) as backend:
        _print_model(backend.get_document_markers(document_id))


@cli.command("recognize-marker")
def recognize_marker(
    document_id: UUID,
    marker_id: UUID,
    image: Path,
    model: str | None = typer.Option(None, "--model", help="One-off model ID override."),
) -> None:
    """Classify an image and write the label to an existing document marker."""
    settings = _settings()
    with _backend(settings) as backend:
        application = PiClientApplication(_classifier(settings, model), backend)
        _print_model(application.recognize_and_update_marker(document_id, marker_id, image))


def main() -> None:
    cli()
