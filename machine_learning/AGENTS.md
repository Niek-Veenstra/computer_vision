# Machine learning project notes

## Current classifier baseline

- `symbol_classifier_final.keras` is currently a trained CNN v1 model from `build_cnn()`.
- The dashboard's per-class metrics and confusion matrix evaluate that local model.
- CNN v1 has 4,289,615 parameters. About 4.2 million are in the `Flatten()` to `Dense(128)` connection.
- `build_cnn_v2()` is an experimental alternative with convolutional blocks, batch normalization, global average pooling and 424,687 parameters.
- The first full CNN v2 run is `runs/models/cnn_v2/20260923-113833-103317`. It failed validation and must not be treated as an improvement over CNN v1.
- Dashboard-started model runs are isolated under `runs/models/<architecture>/<run-id>/` and never replace the baseline file.
- The dashboard model selector controls metrics, confusion matrices, error examples and inference together. Always report the selected architecture and run when discussing dashboard results.
- Dashboard training records the selected learning rate in run metadata and status. Adam uses that value as its initial learning rate before `ReduceLROnPlateau` can lower it.
- Dashboard-started training stores its process ID in `status.json`. The dashboard may terminate only runs with a `starting` or `running` status below `runs/models/`, after which it records `stopped` while retaining partial artifacts.
- The dashboard may delete only a selected run directory whose resolved path is exactly two levels below `runs/models/`. Keep the baseline model and registered architecture functions protected.
- Classifier images are resized directly to `128×128` with bilinear interpolation, without preserving their aspect ratio. The dashboard's resize comparison defaults to this same operation and uses contrast-based diff metrics to reduce the influence of the shared background.

## Recorded confusion issue

On the current 202-image validation split, CNN v1 handles class `0` as follows:

- 23 actual zero images: 21 correct and 2 predicted as `8`.
- 31 images predicted as zero: 21 correct and 10 false positives.
- Zero precision is approximately 67.7%, recall 91.3% and F1 77.8%.
- The false positives predicted as zero comprise three `6` images, three `4` images, one `8`, one `2`, one `5` and one `/`.

The main zero-class problem is overprediction rather than failure to find actual zeros. Treat the `6 → 0` and `4 → 0` confusion as explicit comparison metrics in later model experiments.

The three full-data learning-curve runs averaged about 79% precision, 90% recall and 84% F1 for zero. Those experiment models were not saved and did not replace `symbol_classifier_final.keras`. The same experiment produced average F1 scores of roughly 75% for `*` and 78% for `-`, based on only 5 and 10 validation images respectively.

## Failed CNN v2 baseline

The first full CNN v2 run used seed 42 and batch size 32. Training stopped after six epochs and restored epoch 1. Training accuracy rose from 18.7% to 56.9%, while validation accuracy remained 2.48% and validation loss rose from 2.87 to 9.49. The restored model predicts all 202 validation images as `class_0` (`*`), resulting in 6.7% balanced accuracy and 0.32% macro-F1.

This train/evaluation collapse makes batch normalization the first suspected cause. Preserve this result under the existing `cnn_v2` identity. Test a new registered model variant when changing the architecture, and change one factor at a time. The first useful ablation is the same convolutional and global-pooling architecture without batch normalization.

## Evaluation guidance

- Compare CNN variants on the same fixed validation set and use multiple seeds.
- Use the registered model names `cnn_v1` and `cnn_v2` when starting `symbol_classifier.model_training`; do not execute arbitrary builder names supplied through the UI.
- Report macro-F1 and balanced accuracy alongside overall accuracy.
- Record per-class precision, recall and F1, especially for `0`, `4`, `6`, `8` and `9`.
- Keep in mind that the current train and validation crops originate from the same two source images. These results do not establish generalization to new handwriting or photographs.
