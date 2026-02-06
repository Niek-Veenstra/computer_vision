import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import numpy as np
import keras
import tensorflow as tf
import matplotlib.pyplot as plt
from keras.utils import image_dataset_from_directory
from keras.models import Model

DATA_DIR = "symbols_operators"
MODEL_PATH = "symbol_classifier_final.keras"
IMG_SIZE = (128, 128)
BATCH_SIZE = 32

def make_val_dataset():
    val_ds = image_dataset_from_directory(
        f"{DATA_DIR}/val",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        seed=42,
        label_mode="int",
        shuffle=False, 
    )
    return val_ds

def plot_confusion_matrix(confusion_matrix, class_names, out_path="confusion_matrix.png"):
    fig, ax = plt.subplots(figsize=(10, 10))
    im = ax.imshow(confusion_matrix, interpolation="nearest", cmap="Blues")
    fig.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(len(class_names)),
        yticks=np.arange(len(class_names)),
        xticklabels=class_names,
        yticklabels=class_names,
        ylabel="True label",
        xlabel="Predicted label",
        title="Confusion Matrix",
    )

    plt.setp(ax.get_xticklabels(), rotation=45, ha="right")

    thresh = confusion_matrix.max() / 2.0 if confusion_matrix.max() > 0 else 0
    for i in range(confusion_matrix.shape[0]):
        for j in range(confusion_matrix.shape[1]):
            v = int(confusion_matrix[i, j])
            ax.text(
                j, i, v,
                ha="center", va="center",
                color="white" if confusion_matrix[i, j] > thresh else "black"
            )

    plt.tight_layout()

    fig.savefig(out_path, dpi=200)
    print(f"Saved confusion matrix to: {out_path}")
    plt.show(block=True)


def main():
    model: Model = keras.models.load_model(MODEL_PATH)
    val_ds = make_val_dataset()
    class_names = val_ds.class_names
    num_classes = len(class_names)

    print("Class mapping (index -> folder):")
    for i, n in enumerate(class_names):
        print(i, "->", n)

    loss, acc = model.evaluate(val_ds, verbose=0)
    print(f"\nOverall val loss: {loss:.4f}")
    print(f"Overall val acc : {acc:.4f}")

    y_true = []
    y_pred = []

    for x, y in val_ds:
        probs = model.predict(x, verbose=0)
        pred = np.argmax(probs, axis=1)
        y_true.extend(y.numpy().tolist())
        y_pred.extend(pred.tolist())

    y_true = np.array(y_true, dtype=np.int32)
    y_pred = np.array(y_pred, dtype=np.int32)

    # 3) Confusion matrix
    confusion_matrix = tf.math.confusion_matrix(y_true, y_pred, num_classes=num_classes).numpy()

    # 4) Per-class precision/recall/F1
    eps = 1e-12
    per_class = []
    for i in range(num_classes):
        tp = confusion_matrix[i, i]
        fp = confusion_matrix[:, i].sum() - tp
        fn = confusion_matrix[i, :].sum() - tp

        precision = tp / (tp + fp + eps)
        recall = tp / (tp + fn + eps)
        f1 = 2 * precision * recall / (precision + recall + eps)
        support = confusion_matrix[i, :].sum()

        per_class.append((i, class_names[i], support, precision, recall, f1))

    # Sort by worst F1
    per_class_sorted = sorted(per_class, key=lambda r: r[5])

    print("\nPer-class metrics (sorted by F1 ascending):")
    print(f"{'idx':>3}  {'class':>10}  {'support':>7}  {'prec':>7}  {'rec':>7}  {'f1':>7}")
    for i, name, support, p, r, f1 in per_class_sorted:
        print(f"{i:>3}  {name:>10}  {support:>7}  {p:>7.3f}  {r:>7.3f}  {f1:>7.3f}")

    # 5) Top confusion pairs (most common mistakes)
    print("\nTop confusion pairs (true -> predicted):")
    confusions = []
    for i in range(num_classes):
        for j in range(num_classes):
            if i == j:
                continue
            if confusion_matrix[i, j] > 0:
                confusions.append((confusion_matrix[i, j], i, j))
    confusions.sort(reverse=True)

    for n, i, j in confusions[:15]:
        print(f"{n:>5}x  {class_names[i]} -> {class_names[j]}")
    plot_confusion_matrix(confusion_matrix, val_ds.class_names)



if __name__ == "__main__":
    main()
