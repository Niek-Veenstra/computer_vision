import unittest

import numpy as np

from symbol_classifier.end_to_end import box_iou, match_detections, pipeline_metrics


class EndToEndEvaluationTests(unittest.TestCase):
    def test_box_iou(self):
        self.assertAlmostEqual(
            box_iou(
                np.array([0, 0, 10, 10], dtype=np.float32),
                np.array([5, 5, 15, 15], dtype=np.float32),
            ),
            25 / 175,
        )

    def test_matching_is_one_to_one_and_confidence_ordered(self):
        ground_truth = np.array([[0, 0, 10, 10]], dtype=np.float32)
        predictions = np.array(
            [[0, 0, 10, 10], [0, 0, 9, 9]], dtype=np.float32
        )
        confidences = np.array([0.5, 0.9], dtype=np.float32)

        prediction_to_ground_truth, ground_truth_to_prediction, _ = match_detections(
            ground_truth, predictions, confidences, iou_threshold=0.5
        )

        np.testing.assert_array_equal(prediction_to_ground_truth, [-1, 0])
        np.testing.assert_array_equal(ground_truth_to_prediction, [1])

    def test_pipeline_metrics_separate_all_error_types(self):
        actual_classes = np.array([0, 1, 2], dtype=np.int32)
        predicted_classes = np.array([0, 4, 2], dtype=np.int32)
        prediction_to_ground_truth = np.array([0, 1, -1], dtype=np.int32)

        metrics = pipeline_metrics(
            actual_classes, predicted_classes, prediction_to_ground_truth
        )

        self.assertEqual(metrics["correct"], 1)
        self.assertEqual(metrics["misclassified"], 1)
        self.assertEqual(metrics["missed"], 1)
        self.assertEqual(metrics["false_positives"], 1)
        self.assertAlmostEqual(metrics["detection_precision"], 2 / 3)
        self.assertAlmostEqual(metrics["detection_recall"], 2 / 3)
        self.assertAlmostEqual(metrics["end_to_end_precision"], 1 / 3)
        self.assertAlmostEqual(metrics["end_to_end_recall"], 1 / 3)


if __name__ == "__main__":
    unittest.main()
