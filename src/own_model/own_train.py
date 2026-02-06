import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
import json
from tensorflow import keras
import own_model
from own_model.dataset import get_dataset

TARGET_SIZE = (128, 128)
BATCH_SIZE = 32
EPOCHS = 25
NUM_CLASSES = 15

def compute_class_weights(train_ds, num_classes: int):
    counts = [0] * num_classes
    for _, y in train_ds.unbatch():
        counts[int(y.numpy())] += 1

    total = sum(counts)

    # Balance the weights.
    weights = {i: (total / (num_classes * max(1, counts[i]))) for i in range(num_classes)}
    return weights, counts

def main():
    train_set, validation_set = get_dataset(
        "symbols_operators",
        TARGET_SIZE,
        batch_size=BATCH_SIZE,        
    )
    with open("class_mapping.json", "w") as f:
        json.dump(train_set.class_names, f, indent=2)

    model = own_model.build_cnn(num_classes=NUM_CLASSES)

    class_weights, counts = compute_class_weights(train_set, NUM_CLASSES)
    print("Class counts:", counts)
    print("Using class weights:", class_weights)

    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=5,
            restore_best_weights=True
        ),
        keras.callbacks.ModelCheckpoint(
            filepath="symbol_classifier.keras",
            monitor="val_accuracy",
            save_best_only=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=2,
            min_lr=1e-6
        ),
    ]

    model.fit(
        train_set,
        validation_data=validation_set,
        epochs=EPOCHS,
        class_weight=class_weights,
        callbacks=callbacks,
    )

    model.save("symbol_classifier_final.keras")
    print("Done traing. Saved as symbol_classifier.keras and symbol_classifier_final.keras")

if __name__ == "__main__":
    main()
