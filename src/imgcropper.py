import cv2
from cv2.typing import MatLike


image_str = input("Enter imaage from images dir.\n")
dataset_basename = input("Enter image basename.\n")

image = cv2.imread(f"./images/{image_str}");
if image is None:
    exit(1)

rois = cv2.selectROIs("Select crop areas",image,showCrosshair=True, fromCenter=False);
for idx,(x,y,w,h) in enumerate(rois):
    roi = image[y:y+h, x:x+w]
    cv2.imwrite(f"./clipped_images/{dataset_basename}_{idx}.png",roi)
cv2.waitKey(0);
