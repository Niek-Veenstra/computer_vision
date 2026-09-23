"""Train the classifier on nested dataset fractions and record a learning curve."""

import argparse
import csv
import json
import os
import random
from datetime import datetime
from pathlib import Path

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import numpy as np
import tensorflow as tf
from tensorflow import keras

from symbol_classifier import build_cnn


DATA_DIR = Path("symbols_and_operators/classifier")
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".gif"}
IMAGE_SIZE = (128, 128)
DEFAULT_FRACTIONS = (0.25, 0.5, 0.75, 1.0)
DEFAULT_SEEDS = (42, 123, 456)
RESULT_FIELDS = (
    "experiment",
    "fraction",
    "seed",
    "training_images",
    "validation_images",
    "best_epoch",
    "epochs_run",
    "validation_loss",
    "accuracy",
    "balanced_accuracy",
    "macro_precision",
    "macro_f1",
)
PER_CLASS_FIELDS = (
    "experiment",
    "fraction",
    "seed",
    "class_name",
    "training_images",
    "validation_images",
    "precision",
    "recall",
    "f1",
)


def image_files(directory: Path) -> list[Path]:
    return [
        path
        for path in sorted(directory.iterdir())
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]


def discover_split(directory: Path, class_names: list[str] | None = None) -> tuple[list[str], dict[str, list[Path]]]:
    if not directory.is_dir():
        raise FileNotFoundError(f"Dataset split not found: {directory}")

    discovered_names = sorted(path.name for path in directory.iterdir() if path.is_dir())
    if class_names is None:
        class_names = discovered_names
    elif discovered_names != class_names:
        raise ValueError(f"Classes in {directory} do not match the training split")

    files = {class_name: image_files(directory / class_name) for class_name in class_names}
    empty_classes = [class_name for class_name, paths in files.items() if not paths]
    if empty_classes:
        raise ValueError(f"Classes without images in {directory}: {', '.join(empty_classes)}")
    return class_names, files


def validate_fractions(fractions: list[float]) -> list[float]:
    normalized = sorted(set(fractions))
    if not normalized or any(fraction <= 0 or fraction > 1 for fraction in normalized):
        raise ValueError("Fractions must be unique values larger than 0 and at most 1")
    return normalized


def select_nested_subset(
    files_by_class: dict[str, list[Path]],
    class_names: list[str],
    fraction: float,
    seed: int,
) -> tuple[list[str], list[int], list[int]]:
    selected_paths: list[str] = []
    selected_labels: list[int] = []
    class_counts: list[int] = []

    for class_index, class_name in enumerate(class_names):
        candidates = files_by_class[class_name].copy()
        random.Random(f"{seed}:{class_name}").shuffle(candidates)
        selected_count = min(len(candidates), max(1, int(len(candidates) * fraction)))
        selected = candidates[:selected_count]
        selected_paths.extend(str(path) for path in selected)
        selected_labels.extend([class_index] * selected_count)
        class_counts.append(selected_count)

    return selected_paths, selected_labels, class_counts


def flatten_split(
    files_by_class: dict[str, list[Path]], class_names: list[str]
) -> tuple[list[str], list[int], list[int]]:
    paths: list[str] = []
    labels: list[int] = []
    class_counts: list[int] = []
    for class_index, class_name in enumerate(class_names):
        class_paths = files_by_class[class_name]
        paths.extend(str(path) for path in class_paths)
        labels.extend([class_index] * len(class_paths))
        class_counts.append(len(class_paths))
    return paths, labels, class_counts


def decode_image(path: tf.Tensor, label: tf.Tensor) -> tuple[tf.Tensor, tf.Tensor]:
    contents = tf.io.read_file(path)
    image = tf.io.decode_image(contents, channels=3, expand_animations=False)
    image.set_shape((None, None, 3))
    image = tf.image.resize(image, IMAGE_SIZE)
    return image, label


def make_dataset(
    paths: list[str],
    labels: list[int],
    batch_size: int,
    seed: int,
    training: bool,
) -> tf.data.Dataset:
    dataset = tf.data.Dataset.from_tensor_slices((paths, np.asarray(labels, dtype=np.int32)))
    if training:
        dataset = dataset.shuffle(len(paths), seed=seed, reshuffle_each_iteration=True)
    dataset = dataset.map(decode_image, num_parallel_calls=tf.data.AUTOTUNE)
    return dataset.batch(batch_size).prefetch(tf.data.AUTOTUNE)


def class_weights(class_counts: list[int]) -> dict[int, float]:
    total = sum(class_counts)
    class_count = len(class_counts)
    return {
        index: total / (class_count * count)
        for index, count in enumerate(class_counts)
    }


def calculate_metrics(
    model: keras.Model,
    validation_dataset: tf.data.Dataset,
    validation_labels: list[int],
    class_count: int,
) -> tuple[dict[str, float], np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    validation_loss, accuracy = model.evaluate(validation_dataset, verbose=0)
    probabilities = model.predict(validation_dataset, verbose=0)
    predicted = np.argmax(probabilities, axis=1)
    actual = np.asarray(validation_labels, dtype=np.int32)
    confusion = np.zeros((class_count, class_count), dtype=np.int32)
    np.add.at(confusion, (actual, predicted), 1)

    true_positives = np.diag(confusion).astype(np.float64)
    predicted_count = confusion.sum(axis=0)
    actual_count = confusion.sum(axis=1)
    precision = np.divide(
        true_positives,
        predicted_count,
        out=np.zeros(class_count),
        where=predicted_count > 0,
    )
    recall = np.divide(
        true_positives,
        actual_count,
        out=np.zeros(class_count),
        where=actual_count > 0,
    )
    f1 = np.divide(
        2 * precision * recall,
        precision + recall,
        out=np.zeros(class_count),
        where=(precision + recall) > 0,
    )
    metrics = {
        "validation_loss": float(validation_loss),
        "accuracy": float(accuracy),
        "balanced_accuracy": float(recall.mean()),
        "macro_precision": float(precision.mean()),
        "macro_f1": float(f1.mean()),
    }
    return metrics, precision, recall, f1, actual_count


def append_rows(path: Path, fields: tuple[str, ...], rows: list[dict]) -> None:
    write_header = not path.exists()
    with path.open("a", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        if write_header:
            writer.writeheader()
        writer.writerows(rows)


def completed_runs(results_path: Path) -> set[tuple[float, int]]:
    if not results_path.exists():
        return set()
    with results_path.open(encoding="utf-8", newline="") as file:
        return {
            (float(row["fraction"]), int(row["seed"]))
            for row in csv.DictReader(file)
        }


def fraction_name(fraction: float) -> str:
    return f"{fraction:g}".replace(".", "_")


def print_design(
    fractions: list[float],
    seeds: list[int],
    train_files: dict[str, list[Path]],
    class_names: list[str],
    validation_count: int,
) -> None:
    print(f"Validation images (fixed): {validation_count}")
    for seed in seeds:
        for fraction in fractions:
            paths, _, counts = select_nested_subset(train_files, class_names, fraction, seed)
            print(
                f"fraction={fraction:.0%}, seed={seed}, training_images={len(paths)}, "
                f"minimum_per_class={min(counts)}, maximum_per_class={max(counts)}"
            )


def run_experiment(args: argparse.Namespace) -> Path | None:
    fractions = validate_fractions(args.fractions)
    seeds = list(dict.fromkeys(args.seeds))
    if not seeds:
        raise ValueError("At least one seed is required")

    class_names, train_files = discover_split(args.data_dir / "train")
    _, validation_files = discover_split(args.data_dir / "val", class_names)
    validation_paths, validation_labels, validation_counts = flatten_split(
        validation_files, class_names
    )
    print_design(
        fractions,
        seeds,
        train_files,
        class_names,
        len(validation_paths),
    )
    if args.dry_run:
        return None

    experiment_dir = args.output_dir or (
        Path("runs/learning_curve") / datetime.now().strftime("%Y%m%d-%H%M%S")
    )
    experiment_dir.mkdir(parents=True, exist_ok=True)
    config = {
        "data_dir": str(args.data_dir),
        "fractions": fractions,
        "seeds": seeds,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "image_size": IMAGE_SIZE,
        "class_names": class_names,
        "validation_images": len(validation_paths),
    }
    config_path = experiment_dir / "config.json"
    if config_path.exists():
        existing_config = json.loads(config_path.read_text(encoding="utf-8"))
        if existing_config != config:
            raise ValueError(
                f"Experiment settings do not match the existing config: {config_path}"
            )
    else:
        config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    results_path = experiment_dir / "results.csv"
    per_class_path = experiment_dir / "per_class.csv"
    completed = completed_runs(results_path)
    try:
        tf.config.experimental.enable_op_determinism()
    except RuntimeError:
        pass

    for seed in seeds:
        for fraction in fractions:
            if (fraction, seed) in completed:
                print(f"Skipping completed run: fraction={fraction:g}, seed={seed}")
                continue

            training_paths, training_labels, training_counts = select_nested_subset(
                train_files, class_names, fraction, seed
            )
            run_dir = experiment_dir / f"fraction_{fraction_name(fraction)}_seed_{seed}"
            run_dir.mkdir(parents=True, exist_ok=True)
            print(
                f"\nTraining fraction={fraction:.0%}, seed={seed}, "
                f"images={len(training_paths)}"
            )

            keras.backend.clear_session()
            keras.utils.set_random_seed(seed)
            training_dataset = make_dataset(
                training_paths, training_labels, args.batch_size, seed, training=True
            )
            validation_dataset = make_dataset(
                validation_paths,
                validation_labels,
                args.batch_size,
                seed,
                training=False,
            )
            model = build_cnn(num_classes=len(class_names))
            callbacks = [
                keras.callbacks.EarlyStopping(
                    monitor="val_accuracy",
                    patience=5,
                    restore_best_weights=True,
                ),
                keras.callbacks.ReduceLROnPlateau(
                    monitor="val_loss",
                    factor=0.5,
                    patience=2,
                    min_lr=1e-6,
                ),
                keras.callbacks.CSVLogger(run_dir / "history.csv"),
                keras.callbacks.TensorBoard(log_dir=run_dir / "tensorboard"),
            ]
            history = model.fit(
                training_dataset,
                validation_data=validation_dataset,
                epochs=args.epochs,
                class_weight=class_weights(training_counts),
                callbacks=callbacks,
                shuffle=False,
                verbose=2,
            )
            if args.save_models:
                model.save(run_dir / "model.keras")

            metrics, precision, recall, f1, validation_support = calculate_metrics(
                model,
                validation_dataset,
                validation_labels,
                len(class_names),
            )
            best_epoch = int(np.argmax(history.history["val_accuracy"])) + 1
            result = {
                "experiment": experiment_dir.name,
                "fraction": fraction,
                "seed": seed,
                "training_images": len(training_paths),
                "validation_images": len(validation_paths),
                "best_epoch": best_epoch,
                "epochs_run": len(history.epoch),
                **metrics,
            }
            append_rows(results_path, RESULT_FIELDS, [result])
            append_rows(
                per_class_path,
                PER_CLASS_FIELDS,
                [
                    {
                        "experiment": experiment_dir.name,
                        "fraction": fraction,
                        "seed": seed,
                        "class_name": class_name,
                        "training_images": training_counts[index],
                        "validation_images": int(validation_support[index]),
                        "precision": float(precision[index]),
                        "recall": float(recall[index]),
                        "f1": float(f1[index]),
                    }
                    for index, class_name in enumerate(class_names)
                ],
            )
            print(
                f"macro_f1={metrics['macro_f1']:.3f}, "
                f"balanced_accuracy={metrics['balanced_accuracy']:.3f}"
            )

    print(f"\nResults written to {results_path}")
    return experiment_dir


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR)
    parser.add_argument("--fractions", type=float, nargs="+", default=DEFAULT_FRACTIONS)
    parser.add_argument("--seeds", type=int, nargs="+", default=DEFAULT_SEEDS)
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Use an explicit directory to resume an interrupted experiment.",
    )
    parser.add_argument(
        "--save-models",
        action="store_true",
        help="Save every trained model in addition to metrics and histories.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show the selected dataset sizes without training models.",
    )
    return parser.parse_args()


def main() -> None:
    run_experiment(parse_args())


if __name__ == "__main__":
    main()
