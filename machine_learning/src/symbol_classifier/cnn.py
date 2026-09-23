import keras.layers as layers
import keras.models as models
from keras import optimizers

def build_cnn(num_classes=14, learning_rate=0.001):
    model = models.Sequential([
        layers.Rescaling(1./255),
        layers.RandomRotation(0.05),
        layers.RandomZoom(0.001),

        layers.Conv2D(16, (5, 5), activation='relu', padding='same'),
        layers.MaxPooling2D((2, 2)),

        layers.Conv2D(32, (5, 5), activation='relu', padding='same'),
        layers.MaxPooling2D((2, 2)),

        layers.Flatten(),

        layers.Dense(128, activation='relu'),
        layers.Dropout(0.5),

        layers.Dense(num_classes, activation='softmax')
    ])

    model.compile(
        optimizer=optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    return model


def build_cnn_v2(num_classes=14, learning_rate=0.001):
    """Build a lower-parameter CNN with normalized convolutional features."""
    model = models.Sequential([
        layers.Rescaling(1./255),

        layers.Conv2D(32, (3, 3), padding='same', use_bias=False),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        layers.Conv2D(64, (3, 3), padding='same', use_bias=False),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        layers.Conv2D(128, (3, 3), padding='same', use_bias=False),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        layers.Conv2D(256, (3, 3), padding='same', use_bias=False),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),

        layers.Flatten(),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='softmax')
    ], name="symbol_classifier_cnn_v2")

    model.compile(
        optimizer=optimizers.Adam(learning_rate=learning_rate),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    return model


MODEL_BUILDERS = {
    "cnn_v1": build_cnn,
    "cnn_v2": build_cnn_v2,
}

MODEL_LABELS = {
    "cnn_v1": "build_cnn() — CNN v1 Flatten baseline",
    "cnn_v2": "build_cnn_v2() — CNN v2 Global average pooling",
}
