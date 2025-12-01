import tensorflow.python.keras
from keras.utils import image_dataset_from_directory

TARGET_SIZE = (128, 128)
train_ds = image_dataset_from_directory(
    "new_symbols_operators_dataset",
    image_size=TARGET_SIZE,
    batch_size=32,
    label_mode="int",
    validation_split=0.2,
    subset="training",
    seed=42,
)
