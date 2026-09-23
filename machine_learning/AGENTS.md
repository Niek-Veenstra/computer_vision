# Machine learning project notes

## Current classifier baseline

- `symbol_classifier_final.keras` is currently a trained CNN v1 model from `build_cnn()`.
- The dashboard's per-class metrics and confusion matrix evaluate that local model.
- CNN v1 has 4,289,615 parameters. About 4.2 million are in the `Flatten()` to `Dense(128)` connection.
- `build_cnn_v2()` is an experimental alternative with convolutional blocks, batch normalization, global average pooling and 424,687 parameters.
- CNN v2 has not been trained or evaluated yet. Never attribute CNN v1 metrics to CNN v2.

## Recorded confusion issue

On the current 202-image validation split, CNN v1 handles class `0` as follows:

- 23 actual zero images: 21 correct and 2 predicted as `8`.
- 31 images predicted as zero: 21 correct and 10 false positives.
- Zero precision is approximately 67.7%, recall 91.3% and F1 77.8%.
- The false positives predicted as zero comprise three `6` images, three `4` images, one `8`, one `2`, one `5` and one `/`.

The main zero-class problem is overprediction rather than failure to find actual zeros. Treat the `6 → 0` and `4 → 0` confusion as explicit comparison metrics in later model experiments.

The three full-data learning-curve runs averaged about 79% precision, 90% recall and 84% F1 for zero. Those experiment models were not saved and did not replace `symbol_classifier_final.keras`. The same experiment produced average F1 scores of roughly 75% for `*` and 78% for `-`, based on only 5 and 10 validation images respectively.

## Evaluation guidance

- Compare CNN variants on the same fixed validation set and use multiple seeds.
- Report macro-F1 and balanced accuracy alongside overall accuracy.
- Record per-class precision, recall and F1, especially for `0`, `4`, `6`, `8` and `9`.
- Keep in mind that the current train and validation crops originate from the same two source images. These results do not establish generalization to new handwriting or photographs.
