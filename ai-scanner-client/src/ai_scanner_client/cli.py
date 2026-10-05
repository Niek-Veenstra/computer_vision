from pathlib import Path
from uuid import UUID

import typer
from pydantic import BaseModel

from ai_scanner_client.application import PiClientApplication
from ai_scanner_client.backend.client import ScannerBackendClient
from ai_scanner_client.config import ClientSettings
from ai_scanner_client.inference.classifier import SymbolClassifier
from ai_scanner_client.model_management.factory import ClassifierFactory
from ai_scanner_client.model_management.manager import ModelManager
from ai_scanner_client.model_management.registry import ModelRegistry
from ai_scanner_client.model_management.selection import ModelSelectionStore

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
def predict(
    image: Path,
    model: str | None = typer.Option(None, "--model", help="One-off model ID override."),
) -> None:
    """Classify one local symbol image without contacting the backend."""
    settings = _settings()
    application = PiClientApplication(_classifier(settings, model))
    _print_model(application.classify(image))


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
