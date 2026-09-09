# SPDX-License-Identifier: MIT
# Copyright (c) 2025-2026 The Pybricks Authors

"""
Regression Test Suite for MDRobotBase Color Classification Invariants (G-MDRB-028).
Validates:
- Dual RGB and HSV ingestion parity (Scenario 1 & 2)
- Structured 3-element return tuple (color_id, distance, confidence) (Scenario 3)
- Fail-closed invalid input rejection (Scenario 4)
- Guarding with _require_open on closed handles
- Threshold-based Color.NONE rejection and confidence normalization
"""

import math
import os
import sys
import unittest

_pkg_dir = os.path.dirname(os.path.abspath(__file__))
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction
from pybricks.robotics import MDRobotBase


class TestMDRobotBaseColorContract(unittest.TestCase):
    def setUp(self):
        left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
        right_motor = Motor(Port.B)
        self.robot = MDRobotBase(left_motor, right_motor, wheel_diameter=56.0, axle_track=112.0)
        self.robot.reset_color_calibration()

    def tearDown(self):
        self.robot.close()

    def test_uncalibrated_behavior(self):
        """Uncalibrated classifier returns Color.NONE (0), large distance, and 0.0 confidence."""
        cid, dist, conf = self.robot.classify_color_rgb(100.0, 0.0, 0.0)
        self.assertEqual(cid, 0)
        self.assertGreaterEqual(dist, 99999.0)
        self.assertEqual(conf, 0.0)

        cid_hsv, dist_hsv, conf_hsv = self.robot.classify_color_hsv(0.0, 100.0, 100.0)
        self.assertEqual(cid_hsv, 0)
        self.assertGreaterEqual(dist_hsv, 99999.0)
        self.assertEqual(conf_hsv, 0.0)

    def test_rgb_and_hsv_parity(self):
        """Equivalent chromatic vectors produce identical classification IDs and metrics."""
        # Register prototypes: Red=1, Green=2, Blue=3
        self.robot.add_color_prototype(1, 100.0, 0.0, 0.0)
        self.robot.add_color_prototype(2, 0.0, 100.0, 0.0)
        self.robot.add_color_prototype(3, 0.0, 0.0, 100.0)

        # Pure Red: RGB (100, 0, 0) vs HSV (0, 100, 100)
        rgb_res = self.robot.classify_color_rgb(100.0, 0.0, 0.0)
        hsv_res = self.robot.classify_color_hsv(0.0, 100.0, 100.0)
        self.assertEqual(rgb_res[0], 1)
        self.assertEqual(hsv_res[0], 1)
        self.assertAlmostEqual(rgb_res[1], hsv_res[1], places=2)
        self.assertAlmostEqual(rgb_res[2], hsv_res[2], places=2)

        # Pure Green: RGB (0, 100, 0) vs HSV (120, 100, 100)
        rgb_res = self.robot.classify_color_rgb(0.0, 100.0, 0.0)
        hsv_res = self.robot.classify_color_hsv(120.0, 100.0, 100.0)
        self.assertEqual(rgb_res[0], 2)
        self.assertEqual(hsv_res[0], 2)
        self.assertAlmostEqual(rgb_res[1], hsv_res[1], places=2)
        self.assertAlmostEqual(rgb_res[2], hsv_res[2], places=2)

        # Pure Blue: RGB (0, 0, 100) vs HSV (240, 100, 100)
        rgb_res = self.robot.classify_color_rgb(0.0, 0.0, 100.0)
        hsv_res = self.robot.classify_color_hsv(240.0, 100.0, 100.0)
        self.assertEqual(rgb_res[0], 3)
        self.assertEqual(hsv_res[0], 3)
        self.assertAlmostEqual(rgb_res[1], hsv_res[1], places=2)
        self.assertAlmostEqual(rgb_res[2], hsv_res[2], places=2)

    def test_structured_return_tuple_invariants(self):
        """Return tuple has exactly 3 elements with types (int, float, float) and valid intervals."""
        self.robot.add_color_prototype(1, 100.0, 0.0, 0.0)
        result = self.robot.classify_color(100.0, 0.0, 0.0)
        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 3)

        cid, dist, conf = result
        self.assertIsInstance(cid, int)
        self.assertIsInstance(dist, float)
        self.assertIsInstance(conf, float)
        self.assertGreaterEqual(dist, 0.0)
        self.assertGreaterEqual(conf, 0.0)
        self.assertLessEqual(conf, 1.0)

    def test_threshold_rejection(self):
        """Out-of-range color readings are rejected as Color.NONE (0) with zero confidence."""
        self.robot.set_color_threshold(15.0)
        self.robot.add_color_prototype(1, 100.0, 0.0, 0.0)

        # Very dark or neutral color
        cid, dist, conf = self.robot.classify_color_rgb(20.0, 20.0, 20.0)
        self.assertEqual(cid, 0)
        self.assertGreater(dist, 15.0)
        self.assertEqual(conf, 0.0)

    def test_fail_closed_invalid_inputs(self):
        """Negative and non-finite inputs raise ValueError immediately."""
        # Negative inputs
        with self.assertRaises(ValueError):
            self.robot.classify_color_rgb(-1.0, 50.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.classify_color_hsv(-1.0, 50.0, 50.0)

        # Non-finite inputs (NaN, Inf)
        with self.assertRaises(ValueError):
            self.robot.classify_color_rgb(float("nan"), 50.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.classify_color_hsv(float("inf"), 50.0, 50.0)

    def test_closed_object_guarding(self):
        """Closed MDRobotBase instance raises RuntimeError on color classification queries."""
        self.robot.close()
        with self.assertRaises(RuntimeError):
            self.robot.classify_color_rgb(100.0, 0.0, 0.0)
        with self.assertRaises(RuntimeError):
            self.robot.classify_color_hsv(0.0, 100.0, 100.0)
        with self.assertRaises(RuntimeError):
            self.robot.classify_color(100.0, 0.0, 0.0)


if __name__ == "__main__":
    unittest.main()
