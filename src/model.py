from cv2.typing import MatLike
import ultralytics.models as models
import cv2

model = models.YOLO("runs/detect/symbol-detector4/weights/best.pt")
img = cv2.imread("dataset/images/f1f0afa5-s2_69.png")

if(img is None):
    exit(1)

results = model(img)
for r in results:
    plotted = r.plot()
    cv2.imshow("Result", plotted);
    cv2.imwrite("output.jpg", plotted);
cv2.waitKey(0)
cv2.destroyAllWindows()
