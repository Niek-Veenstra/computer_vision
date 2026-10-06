from ai_scanner_client.inference.classifier import SymbolClassifier
from ai_scanner_client.inference.pipeline import SymbolRecognitionPipeline
from ai_scanner_client.model_management.bundle import ModelBundle
from ai_scanner_client.model_management.factory import ClassifierFactory, PipelineFactory
from ai_scanner_client.model_management.registry import ModelRegistry, RegistrySnapshot
from ai_scanner_client.model_management.selection import ModelSelection, ModelSelectionStore


class NoModelSelectedError(RuntimeError):
    pass


class ModelManager:
    """Refresh, select and instantiate models without application-level path handling."""

    def __init__(
        self,
        registry: ModelRegistry,
        selection_store: ModelSelectionStore,
        classifier_factory: ClassifierFactory | None = None,
        pipeline_factory: PipelineFactory | None = None,
    ) -> None:
        self._registry = registry
        self._selection_store = selection_store
        self._classifier_factory = classifier_factory or ClassifierFactory()
        self._pipeline_factory = pipeline_factory or PipelineFactory(self._classifier_factory)

    def refresh(self) -> RegistrySnapshot:
        return self._registry.refresh()

    def select(self, model_id: str) -> ModelSelection:
        self._registry.get(model_id)
        return self._selection_store.write(model_id)

    def current_selection(self) -> ModelSelection | None:
        return self._selection_store.read()

    def selected_bundle(self) -> ModelBundle:
        selection = self.current_selection()
        if selection is None:
            raise NoModelSelectedError(
                "No model is selected. Run `ai-scanner-client models select <MODEL_ID>`."
            )
        return self._registry.get(selection.model_id)

    def get_bundle(self, model_id: str) -> ModelBundle:
        return self._registry.get(model_id)

    def create_classifier(self, model_id: str | None = None) -> SymbolClassifier:
        bundle = self._registry.get(model_id) if model_id is not None else self.selected_bundle()
        return self._classifier_factory.create(bundle)

    def create_pipeline(self, model_id: str | None = None) -> SymbolRecognitionPipeline:
        bundle = self._registry.get(model_id) if model_id is not None else self.selected_bundle()
        return self._pipeline_factory.create(bundle)
