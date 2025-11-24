import tensorflow as tf
import tensorflow.python.keras
from keras.utils import image_dataset_from_directory

def load_dataset(path, image_size=(128,128), batch_size=32):
    ds = image_dataset_from_directory(
        path,
        image_size=image_size,
        batch_size=batch_size
    )
    return ds

image_paths = [
    "data/img1.png",
    "data/img2.png",
    "data/img3.png",
]
labels = [0, 1, 2]  

TARGET_SIZE = (128, 128)

def preprocess(path, label):
    img = tf.io.read_file(path)
    img = tf.image.decode_png(img)  
    img = tf.image.resize(img, TARGET_SIZE)
    img = tf.divide(img ,255.0)
    return img, label

paths_ds = tf.constant(image_paths)
labels_ds = tf.constant(labels, dtype=tf.int32)

ds = tf.data.Dataset.from_tensor_slices((paths_ds, labels_ds))
ds = ds.map(preprocess, num_parallel_calls=tf.data.AUTOTUNE)
ds = ds.batch(32).prefetch(tf.data.AUTOTUNE)
