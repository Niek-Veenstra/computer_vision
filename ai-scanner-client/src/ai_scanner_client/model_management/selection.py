from contextlib import suppress
from datetime import UTC, datetime
from pathlib import Path

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ModelSelection(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
    )

    model_id: str
    selected_at: datetime


class ModelSelectionStore:
    """Persist the selected model so separate client invocations agree."""

    def __init__(self, path: Path) -> None:
        self._path = path

    def read(self) -> ModelSelection | None:
        if not self._path.is_file():
            return None
        return ModelSelection.model_validate_json(self._path.read_text(encoding="utf-8"))

    def write(self, model_id: str) -> ModelSelection:
        selection = ModelSelection(model_id=model_id, selected_at=datetime.now(UTC))
        self._path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = self._path.with_suffix(f"{self._path.suffix}.tmp")
        temporary_path.write_text(
            selection.model_dump_json(indent=2, by_alias=True) + "\n",
            encoding="utf-8",
        )
        temporary_path.replace(self._path)
        return selection

    def clear(self) -> None:
        with suppress(FileNotFoundError):
            self._path.unlink()
