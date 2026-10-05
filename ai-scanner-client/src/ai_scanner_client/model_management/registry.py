import hashlib
import json
from pathlib import Path
from threading import RLock

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from pydantic.alias_generators import to_camel

from ai_scanner_client.model_management.bundle import ModelBundle, ModelManifest


class RegistryModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )


class ModelSummary(RegistryModel):
    id: str
    architecture: str
    run_id: str
    format: str
    directory: str


class InvalidBundle(RegistryModel):
    directory: str
    reason: str


class RegistrySnapshot(RegistryModel):
    models_directory: str
    models: list[ModelSummary]
    invalid_bundles: list[InvalidBundle] = Field(default_factory=list)


class ModelNotFoundError(LookupError):
    pass


class ModelRegistry:
    """Discover and validate model bundles below a models directory."""

    def __init__(self, models_directory: Path) -> None:
        self._models_directory = models_directory
        self._bundles: dict[str, ModelBundle] = {}
        self._invalid_bundles: list[InvalidBundle] = []
        self._lock = RLock()

    def refresh(self) -> RegistrySnapshot:
        bundles: dict[str, ModelBundle] = {}
        invalid: list[InvalidBundle] = []
        if self._models_directory.is_dir():
            directories = sorted(path for path in self._models_directory.iterdir() if path.is_dir())
            for directory in directories:
                try:
                    bundle = self._load_bundle(directory)
                    if bundle.manifest.id in bundles:
                        raise ValueError(f"duplicate model id: {bundle.manifest.id}")
                    bundles[bundle.manifest.id] = bundle
                except (OSError, ValueError, json.JSONDecodeError, ValidationError) as error:
                    invalid.append(InvalidBundle(directory=str(directory), reason=str(error)))
        with self._lock:
            self._bundles = bundles
            self._invalid_bundles = invalid
            return self._snapshot_unlocked()

    def snapshot(self) -> RegistrySnapshot:
        with self._lock:
            return self._snapshot_unlocked()

    def get(self, model_id: str) -> ModelBundle:
        with self._lock:
            try:
                return self._bundles[model_id]
            except KeyError as error:
                available = ", ".join(sorted(self._bundles)) or "none"
                raise ModelNotFoundError(
                    f"Model '{model_id}' is unavailable. Available models: {available}"
                ) from error

    def _load_bundle(self, directory: Path) -> ModelBundle:
        manifest_path = directory / "manifest.json"
        if not manifest_path.is_file():
            raise ValueError("manifest.json is missing")
        manifest = ModelManifest.model_validate_json(manifest_path.read_text(encoding="utf-8"))
        if manifest.id != directory.name:
            raise ValueError(
                f"manifest id '{manifest.id}' must match directory name '{directory.name}'"
            )
        if not manifest.deployable:
            raise ValueError("model is marked as non-deployable")
        model_path = self._resolve_artifact(directory, manifest.model_file)
        class_mapping_path = self._resolve_artifact(directory, manifest.class_mapping_file)
        if not model_path.is_file():
            raise ValueError(f"model file is missing: {manifest.model_file}")
        if not class_mapping_path.is_file():
            raise ValueError(f"class mapping is missing: {manifest.class_mapping_file}")
        if manifest.model_sha256 is not None:
            actual_hash = self._sha256(model_path)
            if actual_hash != manifest.model_sha256:
                raise ValueError("model SHA-256 does not match the manifest")
        return ModelBundle(
            manifest=manifest,
            directory=directory.resolve(),
            model_path=model_path,
            class_mapping_path=class_mapping_path,
        )

    @staticmethod
    def _resolve_artifact(directory: Path, filename: str) -> Path:
        relative_path = Path(filename)
        if relative_path.is_absolute():
            raise ValueError("artifact paths must be relative to the bundle")
        bundle_root = directory.resolve()
        artifact = (bundle_root / relative_path).resolve()
        if not artifact.is_relative_to(bundle_root):
            raise ValueError("artifact path escapes the bundle directory")
        return artifact

    @staticmethod
    def _sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as file:
            for block in iter(lambda: file.read(1024 * 1024), b""):
                digest.update(block)
        return digest.hexdigest()

    def _snapshot_unlocked(self) -> RegistrySnapshot:
        summaries = [
            ModelSummary(
                id=bundle.manifest.id,
                architecture=bundle.manifest.architecture,
                run_id=bundle.manifest.run_id,
                format=bundle.manifest.format.value,
                directory=str(bundle.directory),
            )
            for bundle in sorted(self._bundles.values(), key=lambda item: item.manifest.id)
        ]
        return RegistrySnapshot(
            models_directory=str(self._models_directory),
            models=summaries,
            invalid_bundles=list(self._invalid_bundles),
        )
