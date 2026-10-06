"""Shared calculations for detector-to-classifier pipeline evaluation."""

from pathlib import Path

import numpy as np
from PIL import Image


def read_yolo_ground_truth(image_path: Path, label_path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Read class ids and absolute xyxy boxes from a YOLO annotation file."""
    with Image.open(image_path) as image:
        width, height = image.size

    class_ids: list[int] = []
    boxes: list[list[float]] = []
    for line_number, line in enumerate(
        label_path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if not line.strip():
            continue
        parts = line.split()
        if len(parts) != 5:
            raise ValueError(
                f"Invalid YOLO annotation in {label_path} on line {line_number}"
            )
        class_text, x_text, y_text, width_text, height_text = parts
        class_ids.append(int(class_text))
        center_x = float(x_text) * width
        center_y = float(y_text) * height
        box_width = float(width_text) * width
        box_height = float(height_text) * height
        boxes.append(
            [
                center_x - box_width / 2,
                center_y - box_height / 2,
                center_x + box_width / 2,
                center_y + box_height / 2,
            ]
        )

    return np.asarray(class_ids, dtype=np.int32), np.asarray(boxes, dtype=np.float32).reshape(-1, 4)


def box_iou(first: np.ndarray, second: np.ndarray) -> float:
    """Calculate intersection over union for two xyxy boxes."""
    intersection_width = max(0.0, min(first[2], second[2]) - max(first[0], second[0]))
    intersection_height = max(0.0, min(first[3], second[3]) - max(first[1], second[1]))
    intersection = intersection_width * intersection_height
    first_area = max(0.0, first[2] - first[0]) * max(0.0, first[3] - first[1])
    second_area = max(0.0, second[2] - second[0]) * max(0.0, second[3] - second[1])
    union = first_area + second_area - intersection
    return float(intersection / union) if union else 0.0


def match_detections(
    ground_truth_boxes: np.ndarray,
    predicted_boxes: np.ndarray,
    predicted_confidences: np.ndarray,
    iou_threshold: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Greedily match confident detections to unused ground-truth objects."""
    prediction_to_ground_truth = np.full(len(predicted_boxes), -1, dtype=np.int32)
    ground_truth_to_prediction = np.full(len(ground_truth_boxes), -1, dtype=np.int32)
    matched_ious = np.zeros(len(predicted_boxes), dtype=np.float32)

    for prediction_index in np.argsort(predicted_confidences)[::-1]:
        candidates = [
            (box_iou(predicted_boxes[prediction_index], box), ground_truth_index)
            for ground_truth_index, box in enumerate(ground_truth_boxes)
            if ground_truth_to_prediction[ground_truth_index] == -1
        ]
        if not candidates:
            continue
        best_iou, ground_truth_index = max(candidates)
        if best_iou < iou_threshold:
            continue
        prediction_to_ground_truth[prediction_index] = ground_truth_index
        ground_truth_to_prediction[ground_truth_index] = prediction_index
        matched_ious[prediction_index] = best_iou

    return prediction_to_ground_truth, ground_truth_to_prediction, matched_ious


def pipeline_metrics(
    ground_truth_class_ids: np.ndarray,
    predicted_class_ids: np.ndarray,
    prediction_to_ground_truth: np.ndarray,
) -> dict[str, float | int]:
    """Separate detection quality, matched-crop classification and full-pipeline quality."""
    matched_predictions = np.flatnonzero(prediction_to_ground_truth >= 0)
    matched_ground_truth = prediction_to_ground_truth[matched_predictions]
    correct = int(
        np.sum(
            predicted_class_ids[matched_predictions]
            == ground_truth_class_ids[matched_ground_truth]
        )
    )
    matched = int(len(matched_predictions))
    predicted = int(len(predicted_class_ids))
    actual = int(len(ground_truth_class_ids))
    false_positives = predicted - matched
    missed = actual - matched
    misclassified = matched - correct

    detection_precision = matched / predicted if predicted else 0.0
    detection_recall = matched / actual if actual else 0.0
    classification_accuracy = correct / matched if matched else 0.0
    end_to_end_precision = correct / predicted if predicted else 0.0
    end_to_end_recall = correct / actual if actual else 0.0
    denominator = end_to_end_precision + end_to_end_recall

    return {
        "ground_truth": actual,
        "predictions": predicted,
        "matched": matched,
        "correct": correct,
        "misclassified": misclassified,
        "missed": missed,
        "false_positives": false_positives,
        "detection_precision": detection_precision,
        "detection_recall": detection_recall,
        "classification_accuracy_on_matches": classification_accuracy,
        "end_to_end_precision": end_to_end_precision,
        "end_to_end_recall": end_to_end_recall,
        "end_to_end_f1": (
            2 * end_to_end_precision * end_to_end_recall / denominator
            if denominator
            else 0.0
        ),
    }
