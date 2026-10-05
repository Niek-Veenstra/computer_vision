# AI Scanner Client notes

- Keep this project independently deployable from the training project.
- Put orchestration in classes under `src/ai_scanner_client`; do not add loose workflow scripts.
- `ScannerBackendClient` owns HTTP details and scanner authentication.
- `SymbolClassifier` implementations own model loading and prediction.
- Preserve the baseline preprocessing: RGB input, direct 128 x 128 bilinear resize, float32,
  and no additional normalization.
- Load inference models once and reuse them across predictions.
- Never log or serialize the scanner API key.
- Keep model files and `.env` out of version control.
- Discover deployable models through `ModelRegistry`; do not hardcode model IDs or artifact paths.
- Keep each model, class mapping, and manifest together in one direct child of `models/`.
- Never automatically select the newest discovered model. Selection must be explicit and persistent.
- Include model ID, architecture, and run ID in inference results.
- Add tests for API contracts and inference preprocessing when behavior changes.
