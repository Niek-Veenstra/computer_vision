"""Train a registered classifier architecture and store an isolated model run."""

import argparse
import json
import os
import traceback
from datetime import datetime
from pathlib import Path

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import numpy as np
from tensorflow import keras

from symbol_classifier import MODEL_BUILDERS, MODEL_LABELS
from symbol_classifier.dataset import get_dataset


DATA_DIR = Path("symbols_and_operators/classifier")
MODEL_RUNS_DIR = Path("runs/models")
IMAGE_SIZE = (128, 128)
BATCH_SIZE = 32
NUM_CLASSES = 15


def write_json(path: Path, value: dict | list) -> None:
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    temporary_path.write_text(json.dumps(value, indent=2), encoding="utf-8")
    temporary_path.replace(path)


def compute_class_weights(train_dataset, class_count: int) -> tuple[dict[int, float], list[int]]:
    counts = [0] * class_count
    for _, labels in train_dataset.unbatch():
        counts[int(labels.numpy())] += 1
    total = sum(counts)
    weights = {
        index: total / (class_count * max(1, count))
        for index, count in enumerate(counts)
    }
    return weights, counts


def evaluate_model(model, validation_dataset, class_names: list[str]) -> dict:
    loss, accuracy = model.evaluate(validation_dataset, verbose=0)
    probabilities = model.predict(validation_dataset, verbose=0)
    predicted = np.argmax(probabilities, axis=1)
    actual = np.concatenate(
        [labels.numpy() for _, labels in validation_dataset]
    ).astype(np.int32)
    class_count = len(class_names)
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

    return {
        "loss": float(loss),
        "accuracy": float(accuracy),
        "balanced_accuracy": float(recall.mean()),
        "macro_precision": float(precision.mean()),
        "macro_f1": float(f1.mean()),
        "confusion": confusion.tolist(),
        "per_class": [
            {
                "class_name": class_name,
                "support": int(actual_count[index]),
                "precision": float(precision[index]),
                "recall": float(recall[index]),
                "f1": float(f1[index]),
            }
            for index, class_name in enumerate(class_names)
        ],
    }


class StatusCallback(keras.callbacks.Callback):
    def __init__(self, status_path: Path, base_status: dict):
        super().__init__()
        self.status_path = status_path
        self.base_status = base_status

    def on_epoch_end(self, epoch, logs=None):
        metrics = {
            key: float(value)
            for key, value in (logs or {}).items()
            if value is not None
        }
        write_json(
            self.status_path,
            {
                **self.base_status,
                "state": "running",
                "current_epoch": epoch + 1,
                "latest_metrics": metrics,
                "updated_at": datetime.now().isoformat(timespec="seconds"),
            },
        )


def train_model(
    model_name: str,
    epochs: int,
    seed: int,
    batch_size: int,
    run_dir: Path,
) -> Path:
    if model_name not in MODEL_BUILDERS:
        raise ValueError(f"Unknown model architecture: {model_name}")

    run_dir.mkdir(parents=True, exist_ok=False)
    status_path = run_dir / "status.json"
    started_at = datetime.now().isoformat(timespec="seconds")
    base_status = {
        "model_name": model_name,
        "model_label": MODEL_LABELS[model_name],
        "run_id": run_dir.name,
        "epochs": epochs,
        "seed": seed,
        "batch_size": batch_size,
        "started_at": started_at,
    }
    write_json(
        status_path,
        {
            **base_status,
            "state": "starting",
            "current_epoch": 0,
            "updated_at": started_at,
        },
    )

    try:
        keras.backend.clear_session()
        keras.utils.set_random_seed(seed)
        train_dataset, validation_dataset = get_dataset(
            str(DATA_DIR),
            IMAGE_SIZE,
            batch_size=batch_size,
            seed=seed,
        )
        class_names = list(train_dataset.class_names)
        class_weights, class_counts = compute_class_weights(
            train_dataset, len(class_names)
        )
        model = MODEL_BUILDERS[model_name](num_classes=len(class_names))
        model.build((None, *IMAGE_SIZE, 3))
        metadata = {
            **base_status,
            "data_dir": str(DATA_DIR),
            "image_size": IMAGE_SIZE,
            "class_names": class_names,
            "class_counts": class_counts,
            "parameters": model.count_params(),
        }
        write_json(run_dir / "metadata.json", metadata)

        callbacks = [
            keras.callbacks.EarlyStopping(
                monitor="val_accuracy",
                patience=5,
                restore_best_weights=True,
            ),
            keras.callbacks.ModelCheckpoint(
                filepath=run_dir / "best.keras",
                monitor="val_accuracy",
                save_best_only=True,
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss",
                factor=0.5,
                patience=2,
                min_lr=1e-6,
            ),
            keras.callbacks.CSVLogger(run_dir / "history.csv"),
            keras.callbacks.TensorBoard(log_dir=run_dir / "tensorboard"),
            StatusCallback(status_path, base_status),
        ]
        history = model.fit(
            train_dataset,
            validation_data=validation_dataset,
            epochs=epochs,
            class_weight=class_weights,
            callbacks=callbacks,
            shuffle=False,
            verbose=2,
        )
        model_path = run_dir / "final.keras"
        model.save(model_path)
        metrics = evaluate_model(model, validation_dataset, class_names)
        write_json(run_dir / "metrics.json", metrics)
        best_epoch = int(np.argmax(history.history["val_accuracy"])) + 1
        completed_at = datetime.now().isoformat(timespec="seconds")
        write_json(
            status_path,
            {
                **base_status,
                "state": "completed",
                "current_epoch": len(history.epoch),
                "best_epoch": best_epoch,
                "metrics": {
                    key: metrics[key]
                    for key in (
                        "loss",
                        "accuracy",
                        "balanced_accuracy",
                        "macro_precision",
                        "macro_f1",
                    )
                },
                "model_path": str(model_path),
                "updated_at": completed_at,
                "completed_at": completed_at,
            },
        )
        print(f"Completed model run: {run_dir}")
        return run_dir
    except Exception as error:
        write_json(
            status_path,
            {
                **base_status,
                "state": "failed",
                "error": str(error),
                "traceback": traceback.format_exc(),
                "updated_at": datetime.now().isoformat(timespec="seconds"),
            },
        )
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", choices=tuple(MODEL_BUILDERS), required=True)
    parser.add_argument("--epochs", type=int, default=25)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--run-dir", type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.epochs < 1:
        raise ValueError("Epochs must be at least 1")
    if args.batch_size < 1:
        raise ValueError("Batch size must be at least 1")
    run_dir = args.run_dir or (
        MODEL_RUNS_DIR
        / args.model
        / datetime.now().strftime("%Y%m%d-%H%M%S")
    )
    train_model(
        model_name=args.model,
        epochs=args.epochs,
        seed=args.seed,
        batch_size=args.batch_size,
        run_dir=run_dir,
    )


if __name__ == "__main__":
    main()
