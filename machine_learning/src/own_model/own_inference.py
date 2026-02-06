import keras
import os
from PIL import Image
import numpy as np
from keras.models import Model
import json

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
model = keras.models.load_model("symbol_classifier_final.keras")
class_names = []
with open("class_mapping.json") as f:
    class_names = json.load(f)

def predict_image(path: str):
    img = Image.open(path).convert("RGB").resize((128, 128))

    arr = np.asarray(img, dtype=np.float32)
    arr = arr[None, ...]
    preds = model.predict(arr)
    print(f"Class {preds}")
    class_index = int(np.argmax(preds))
    conf = float(np.max(preds))
    return class_names[class_index], conf

cls, conf = predict_image("new_symbols_operators_dataset/class_3/b4b8af9d-IMG_2129_236.png")
print("Predicted class:", cls, "confidence:", conf)
