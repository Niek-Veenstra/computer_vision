import ultralytics.models as models
model = models.YOLO()
results = model.train(
    data="dataset/dataset.yaml",
    epochs=100,
    imgsz=640,
    batch=16,
    name="symbol-detector"
)
