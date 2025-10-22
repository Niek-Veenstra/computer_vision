import cv2;


image_str = input("Enter imaage from images dir.\n")

image = cv2.imread(f"./images/{image_str}");
r = cv2.selectROI("Select crop area",image);

im_cropped = image[int(r[1]):int(r[1]+r[3]),int(r[0]):int(r[0]+r[2])];

cv2.imshow("cropped img", im_cropped);
