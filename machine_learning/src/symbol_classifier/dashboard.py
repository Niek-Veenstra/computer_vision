"""Interactive validation dashboard for the symbol classifier."""

import csv
import os
from pathlib import Path

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import keras
import matplotlib.pyplot as plt
import numpy as np
import streamlit as st
from keras.utils import image_dataset_from_directory
from PIL import Image


MODEL_PATH = Path("symbol_classifier_final.keras")
DATA_DIR = Path("symbols_and_operators/classifier")
CLASS_FILE = Path("symbols_and_operators/classes.txt")
RUNS_DIR = Path("runs/classifier")
LEARNING_CURVE_DIR = Path("runs/learning_curve")
IMAGE_SIZE = (128, 128)
BATCH_SIZE = 32
PROJECT_IMAGE_DIRS = {
    "Uitgesneden symbolen": Path("clipped_images"),
    "Validatieset": DATA_DIR / "val",
    "Trainingsset": DATA_DIR / "train",
    "Bronafbeeldingen": Path("source_images"),
}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp"}


def dataset_signature(directory: Path) -> tuple[tuple[str, int], ...]:
    return tuple(
        (str(path.relative_to(directory)), path.stat().st_mtime_ns)
        for path in sorted(directory.rglob("*.png"))
    )


@st.cache_data(show_spinner="Model evalueren…")
def evaluate_model(
    model_path: str,
    data_dir: str,
    split: str,
    _model_timestamp: int,
    _dataset_signature: tuple[tuple[str, int], ...],
) -> dict:
    model = keras.models.load_model(model_path)
    dataset = image_dataset_from_directory(
        Path(data_dir) / split,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="int",
        shuffle=False,
    )

    probabilities = model.predict(dataset, verbose=0)
    predicted = np.argmax(probabilities, axis=1)
    actual = np.concatenate([labels.numpy() for _, labels in dataset]).astype(np.int32)
    class_count = len(dataset.class_names)
    confusion = np.zeros((class_count, class_count), dtype=np.int32)
    np.add.at(confusion, (actual, predicted), 1)

    true_positives = np.diag(confusion).astype(np.float64)
    predicted_count = confusion.sum(axis=0)
    actual_count = confusion.sum(axis=1)
    precision = np.divide(true_positives, predicted_count, out=np.zeros(class_count), where=predicted_count > 0)
    recall = np.divide(true_positives, actual_count, out=np.zeros(class_count), where=actual_count > 0)
    f1 = np.divide(2 * precision * recall, precision + recall, out=np.zeros(class_count), where=(precision + recall) > 0)
    loss, accuracy = model.evaluate(dataset, verbose=0)

    return {
        "loss": float(loss),
        "accuracy": float(accuracy),
        "macro_precision": float(precision.mean()),
        "balanced_accuracy": float(recall.mean()),
        "macro_f1": float(f1.mean()),
        "class_names": list(dataset.class_names),
        "file_paths": list(dataset.file_paths),
        "actual": actual,
        "predicted": predicted,
        "probabilities": probabilities,
        "confusion": confusion,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "support": actual_count,
    }


@st.cache_resource
def load_inference_model(model_path: str, _model_timestamp: int):
    return keras.models.load_model(model_path)


def project_images(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    return [
        path
        for path in sorted(directory.rglob("*"))
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]


def symbol_for(folder: str, symbols: list[str]) -> str:
    return symbols[int(folder.removeprefix("class_"))]


def confusion_figure(matrix: np.ndarray, labels: list[str], normalized: bool) -> plt.Figure:
    values = matrix.astype(np.float64)
    if normalized:
        totals = values.sum(axis=1, keepdims=True)
        values = np.divide(values, totals, out=np.zeros_like(values), where=totals > 0)

    figure, axis = plt.subplots(figsize=(9, 8))
    image = axis.imshow(values, cmap="Blues", vmin=0, vmax=1 if normalized else None)
    figure.colorbar(image, ax=axis, fraction=0.046, pad=0.04)
    axis.set(
        xlabel="Voorspelde klasse",
        ylabel="Werkelijke klasse",
        xticks=range(len(labels)),
        yticks=range(len(labels)),
        xticklabels=labels,
        yticklabels=labels,
    )
    axis.tick_params(axis="x", rotation=45)
    threshold = values.max() / 2 if values.size else 0
    for row in range(values.shape[0]):
        for column in range(values.shape[1]):
            text = f"{values[row, column]:.0%}" if normalized else str(matrix[row, column])
            axis.text(column, row, text, ha="center", va="center", fontsize=7,
                      color="white" if values[row, column] > threshold else "black")
    figure.tight_layout()
    return figure


def class_counts(directory: Path, class_names: list[str]) -> np.ndarray:
    return np.array(
        [len(project_images(directory / class_name)) for class_name in class_names],
        dtype=np.int32,
    )


def dataset_balance_figure(counts: np.ndarray, labels: list[str], title: str) -> plt.Figure:
    figure, axis = plt.subplots(figsize=(7, 4.5))
    wedges, _, _ = axis.pie(
        counts,
        autopct="%1.1f%%",
        pctdistance=0.78,
        startangle=90,
        textprops={"fontsize": 8},
    )
    axis.legend(
        wedges,
        [f"{label}: {count}" for label, count in zip(labels, counts)],
        title="Klasse: aantal",
        loc="center left",
        bbox_to_anchor=(1, 0.5),
    )
    axis.set_title(title)
    axis.axis("equal")
    figure.tight_layout()
    return figure


def latest_history() -> Path | None:
    histories = sorted(RUNS_DIR.glob("*/history.csv"), key=lambda path: path.stat().st_mtime, reverse=True)
    return histories[0] if histories else None


def history_figure(history_path: Path) -> plt.Figure:
    with history_path.open(encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    epochs = [int(row["epoch"]) + 1 for row in rows]
    figure, (loss_axis, accuracy_axis) = plt.subplots(1, 2, figsize=(11, 4))
    loss_axis.plot(epochs, [float(row["loss"]) for row in rows], label="Training")
    loss_axis.plot(epochs, [float(row["val_loss"]) for row in rows], label="Validatie")
    loss_axis.set(title="Loss", xlabel="Epoch", ylabel="Loss")
    loss_axis.legend()
    accuracy_axis.plot(epochs, [float(row["accuracy"]) for row in rows], label="Training")
    accuracy_axis.plot(epochs, [float(row["val_accuracy"]) for row in rows], label="Validatie")
    accuracy_axis.set(title="Accuracy", xlabel="Epoch", ylabel="Accuracy", ylim=(0, 1))
    accuracy_axis.legend()
    figure.tight_layout()
    return figure


def latest_learning_curve_results() -> Path | None:
    results = sorted(
        LEARNING_CURVE_DIR.glob("*/results.csv"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    return results[0] if results else None


def read_learning_curve(results_path: Path) -> list[dict]:
    with results_path.open(encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    numeric_fields = {
        "fraction": float,
        "seed": int,
        "training_images": int,
        "validation_images": int,
        "best_epoch": int,
        "epochs_run": int,
        "validation_loss": float,
        "accuracy": float,
        "balanced_accuracy": float,
        "macro_precision": float,
        "macro_f1": float,
    }
    for row in rows:
        for field, conversion in numeric_fields.items():
            row[field] = conversion(row[field])
    return rows


def learning_curve_figure(rows: list[dict], metric: str, label: str) -> plt.Figure:
    grouped: dict[int, list[float]] = {}
    for row in rows:
        grouped.setdefault(row["training_images"], []).append(row[metric])

    training_sizes = sorted(grouped)
    means = [float(np.mean(grouped[size])) for size in training_sizes]
    deviations = [
        float(np.std(grouped[size], ddof=1)) if len(grouped[size]) > 1 else 0.0
        for size in training_sizes
    ]
    figure, axis = plt.subplots(figsize=(7, 4.5))
    for size in training_sizes:
        axis.scatter(
            [size] * len(grouped[size]),
            grouped[size],
            color="tab:blue",
            alpha=0.35,
            zorder=2,
        )
    axis.errorbar(
        training_sizes,
        means,
        yerr=deviations,
        color="tab:blue",
        marker="o",
        capsize=5,
        linewidth=2,
        label="Gemiddelde ± standaardafwijking",
        zorder=3,
    )
    axis.set(
        title=f"Learning curve — {label}",
        xlabel="Aantal trainingsafbeeldingen",
        ylabel=label,
    )
    if metric != "validation_loss":
        axis.set_ylim(0, 1)
    axis.grid(alpha=0.25)
    axis.legend()
    figure.tight_layout()
    return figure


def main() -> None:
    st.set_page_config(page_title="Classifierprestaties", page_icon="📊", layout="wide")
    st.title("Prestaties van de symboolclassifier")
    st.caption("Evaluatie op symbols_and_operators/classifier/val")

    missing = [
        str(path)
        for path in (MODEL_PATH, DATA_DIR / "train", DATA_DIR / "val", CLASS_FILE)
        if not path.exists()
    ]
    if missing:
        st.error("Ontbrekende bestanden: " + ", ".join(missing))
        st.stop()

    validation_results = evaluate_model(
        str(MODEL_PATH),
        str(DATA_DIR),
        "val",
        MODEL_PATH.stat().st_mtime_ns,
        dataset_signature(DATA_DIR / "val"),
    )
    training_results = evaluate_model(
        str(MODEL_PATH),
        str(DATA_DIR),
        "train",
        MODEL_PATH.stat().st_mtime_ns,
        dataset_signature(DATA_DIR / "train"),
    )
    symbols = CLASS_FILE.read_text(encoding="utf-8").splitlines()
    display_labels = [symbol_for(folder, symbols) for folder in validation_results["class_names"]]

    columns = st.columns(5)
    columns[0].metric("Accuracy", f"{validation_results['accuracy']:.1%}")
    columns[1].metric("Balanced accuracy", f"{validation_results['balanced_accuracy']:.1%}")
    columns[2].metric("Macro-F1", f"{validation_results['macro_f1']:.1%}")
    columns[3].metric("Macro-precision", f"{validation_results['macro_precision']:.1%}")
    columns[4].metric("Loss", f"{validation_results['loss']:.3f}")

    (
        performance_tab,
        confusion_tab,
        errors_tab,
        inference_tab,
        dataset_tab,
        learning_curve_tab,
        training_tab,
    ) = st.tabs(
        [
            "Per klasse",
            "Confusion matrix",
            "Fouten",
            "Inference",
            "Dataset",
            "Learning curve",
            "Trainingscurves",
        ]
    )

    with performance_tab:
        rows = []
        for index, folder in enumerate(validation_results["class_names"]):
            rows.append({
                "Klasse": folder,
                "Symbool": display_labels[index],
                "Voorbeelden": int(validation_results["support"][index]),
                "Precision": float(validation_results["precision"][index]),
                "Recall": float(validation_results["recall"][index]),
                "F1": float(validation_results["f1"][index]),
            })
        st.dataframe(
            rows,
            hide_index=True,
            width="stretch",
            column_config={
                "Precision": st.column_config.ProgressColumn(format="percent", min_value=0, max_value=1),
                "Recall": st.column_config.ProgressColumn(format="percent", min_value=0, max_value=1),
                "F1": st.column_config.ProgressColumn(format="percent", min_value=0, max_value=1),
            },
        )
        figure, axis = plt.subplots(figsize=(11, 4))
        axis.bar(display_labels, validation_results["f1"])
        axis.set(title="F1 per klasse", xlabel="Symbool", ylabel="F1", ylim=(0, 1))
        st.pyplot(figure)

    with confusion_tab:
        selected_split = st.radio(
            "Gegevens",
            ("Validatie", "Training"),
            horizontal=True,
            help="Training laat zien wat het model op geleerde voorbeelden doet; validatie is de relevantere controle.",
        )
        normalized = st.toggle("Normaliseer per werkelijke klasse", value=True)
        matrix_results = validation_results if selected_split == "Validatie" else training_results
        st.metric(f"Accuracy op {selected_split.lower()}", f"{matrix_results['accuracy']:.1%}")
        st.pyplot(confusion_figure(matrix_results["confusion"], display_labels, normalized))

    with errors_tab:
        errors = np.flatnonzero(validation_results["actual"] != validation_results["predicted"])
        st.write(
            f"{len(errors)} van de {len(validation_results['actual'])} "
            "validatiebeelden zijn verkeerd geclassificeerd."
        )
        if len(errors):
            selected = st.selectbox(
                "Foutvoorbeeld",
                errors.tolist(),
                format_func=lambda index: (
                    f"{Path(validation_results['file_paths'][index]).name}: "
                    f"{display_labels[validation_results['actual'][index]]} → "
                    f"{display_labels[validation_results['predicted'][index]]}"
                ),
            )
            predicted_index = validation_results["predicted"][selected]
            st.image(validation_results["file_paths"][selected], width=240)
            st.write({
                "Werkelijk": display_labels[validation_results["actual"][selected]],
                "Voorspeld": display_labels[predicted_index],
                "Zekerheid": f"{validation_results['probabilities'][selected, predicted_index]:.1%}",
            })

    with inference_tab:
        st.write("Test het huidige eindmodel met een uitgesneden symbool.")
        source = st.radio("Afbeeldingsbron", ("Projectbestand", "Uploaden"), horizontal=True)
        selected_image = None

        if source == "Projectbestand":
            directory_label = st.selectbox("Projectmap", tuple(PROJECT_IMAGE_DIRS))
            directory = PROJECT_IMAGE_DIRS[directory_label]
            available_images = project_images(directory)
            if available_images:
                selected_image = st.selectbox(
                    "Afbeelding",
                    available_images,
                    format_func=lambda path: str(path.relative_to(directory)),
                )
            else:
                st.warning(f"Geen afbeeldingen gevonden in {directory}.")
        else:
            selected_image = st.file_uploader(
                "Afbeelding", type=tuple(extension.removeprefix(".") for extension in IMAGE_EXTENSIONS)
            )

        if selected_image is not None:
            with Image.open(selected_image) as source_image:
                image = source_image.convert("RGB")
            array = np.asarray(image.resize(IMAGE_SIZE), dtype=np.float32)[None, ...]
            model = load_inference_model(str(MODEL_PATH), MODEL_PATH.stat().st_mtime_ns)
            probabilities = model.predict(array, verbose=0)[0]
            top_indices = np.argsort(probabilities)[::-1][:5]
            st.image(image, width=280)
            st.success(
                f"Voorspelling: {display_labels[top_indices[0]]} "
                f"({probabilities[top_indices[0]]:.1%} zekerheid)"
            )
            st.dataframe(
                [
                    {
                        "Klasse": validation_results["class_names"][index],
                        "Symbool": display_labels[index],
                        "Zekerheid": float(probabilities[index]),
                    }
                    for index in top_indices
                ],
                hide_index=True,
                width="stretch",
                column_config={
                    "Zekerheid": st.column_config.ProgressColumn(
                        format="percent", min_value=0, max_value=1
                    )
                },
            )

    with dataset_tab:
        st.subheader("Klasseverdeling")
        st.write("Bekijk hoe de voorbeelden over de 15 klassen zijn verdeeld.")
        train_counts = class_counts(DATA_DIR / "train", validation_results["class_names"])
        validation_counts = class_counts(DATA_DIR / "val", validation_results["class_names"])
        total_counts = train_counts + validation_counts
        selected_dataset = st.radio(
            "Datasetdeel",
            ("Totaal", "Training", "Validatie"),
            horizontal=True,
        )
        counts_by_dataset = {
            "Totaal": total_counts,
            "Training": train_counts,
            "Validatie": validation_counts,
        }
        selected_counts = counts_by_dataset[selected_dataset]
        st.pyplot(
            dataset_balance_figure(
                selected_counts,
                display_labels,
                f"Klasseverdeling — {selected_dataset.lower()}",
            ),
            width="content",
        )
        selected_total = int(selected_counts.sum())
        st.dataframe(
            [
                {
                    "Klasse": folder,
                    "Symbool": display_labels[index],
                    "Aantal": int(selected_counts[index]),
                    "Percentage": (
                        float(selected_counts[index] / selected_total) if selected_total else 0.0
                    ),
                }
                for index, folder in enumerate(validation_results["class_names"])
            ],
            hide_index=True,
            width="stretch",
            column_config={
                "Percentage": st.column_config.ProgressColumn(
                    format="percent", min_value=0, max_value=1
                )
            },
        )

    with learning_curve_tab:
        st.subheader("Invloed van de hoeveelheid trainingsdata")
        results_path = latest_learning_curve_results()
        st.code(
            "python -m symbol_classifier.experiments.learning_curve",
            language="powershell",
        )
        if results_path:
            learning_rows = read_learning_curve(results_path)
            st.caption(
                f"Laatste experiment: {results_path.parent.name} — "
                f"{len(learning_rows)} voltooide runs"
            )
            metric_options = {
                "Macro-F1": "macro_f1",
                "Balanced accuracy": "balanced_accuracy",
                "Accuracy": "accuracy",
                "Macro-precision": "macro_precision",
                "Validatieloss": "validation_loss",
            }
            selected_metric_label = st.selectbox("Metric", tuple(metric_options))
            selected_metric = metric_options[selected_metric_label]
            st.pyplot(
                learning_curve_figure(
                    learning_rows,
                    selected_metric,
                    selected_metric_label,
                ),
                width="content",
            )
            st.dataframe(
                [
                    {
                        "Trainingsdeel": row["fraction"],
                        "Trainingsbeelden": row["training_images"],
                        "Seed": row["seed"],
                        "Beste epoch": row["best_epoch"],
                        "Accuracy": row["accuracy"],
                        "Balanced accuracy": row["balanced_accuracy"],
                        "Macro-F1": row["macro_f1"],
                        "Validatieloss": row["validation_loss"],
                    }
                    for row in sorted(
                        learning_rows,
                        key=lambda row: (row["training_images"], row["seed"]),
                    )
                ],
                hide_index=True,
                width="stretch",
                column_config={
                    "Trainingsdeel": st.column_config.NumberColumn(format="percent"),
                    "Accuracy": st.column_config.NumberColumn(format="percent"),
                    "Balanced accuracy": st.column_config.NumberColumn(format="percent"),
                    "Macro-F1": st.column_config.NumberColumn(format="percent"),
                },
            )
            st.caption(
                "De punten zijn individuele seeds; de lijn toont het gemiddelde en "
                "de foutbalken tonen één standaardafwijking."
            )
        else:
            st.info(
                "Er zijn nog geen resultaten. Voer eerst het bovenstaande commando uit. "
                "Met --dry-run kun je de subsets controleren zonder modellen te trainen."
            )

    with training_tab:
        history_path = latest_history()
        if history_path:
            st.caption(f"Laatste run: {history_path.parent.name}")
            st.pyplot(history_figure(history_path))
        else:
            st.info("Er is nog geen gelogde trainingsrun. Train opnieuw om curves te verzamelen.")
        st.code("python -m tensorboard.main --logdir runs/classifier", language="powershell")

    st.caption(
        "De train- en validatie-uitsneden komen uit dezelfde twee bronafbeeldingen. "
        "Deze cijfers zijn daardoor een interne controle en geen onafhankelijke test op nieuwe beelden."
    )


if __name__ == "__main__":
    main()
