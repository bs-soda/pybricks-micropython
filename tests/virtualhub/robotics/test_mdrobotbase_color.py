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

    # -------------------------------------------------------------------------
    # G-MDRB-029: Two-Point Sensor Calibration Tests
    # -------------------------------------------------------------------------

    def test_two_point_dark_offset_subtraction(self):
        """Scenario 1: Sensor reading matching black reference yields exactly normalized [0.0, 0.0, 0.0]."""
        self.robot.set_black_reference(20.0, 15.0, 10.0)
        self.robot.set_white_reference(220.0, 215.0, 210.0)
        rn, gn, bn = self.robot.normalize_color(20.0, 15.0, 10.0)
        self.assertEqual(rn, 0.0)
        self.assertEqual(gn, 0.0)
        self.assertEqual(bn, 0.0)

        # Values below dark reference clamp to 0.0
        rn, gn, bn = self.robot.normalize_color(0.0, 0.0, 0.0)
        self.assertEqual((rn, gn, bn), (0.0, 0.0, 0.0))

    def test_two_point_white_gain_normalization(self):
        """Scenario 2: Sensor reading matching white reference yields exactly normalized [1.0, 1.0, 1.0]."""
        self.robot.set_black_reference(20.0, 15.0, 10.0)
        self.robot.set_white_reference(220.0, 215.0, 210.0)
        rn, gn, bn = self.robot.normalize_color(220.0, 215.0, 210.0)
        self.assertEqual(rn, 1.0)
        self.assertEqual(gn, 1.0)
        self.assertEqual(bn, 1.0)

        # Values above white reference clamp to 1.0
        rn, gn, bn = self.robot.normalize_color(300.0, 300.0, 300.0)
        self.assertEqual((rn, gn, bn), (1.0, 1.0, 1.0))

    def test_two_point_mid_scale_linearity(self):
        """Scenario 3: Mid-scale readings preserve proportional linearity within 0.001 tolerance."""
        self.robot.set_black_reference(0.0, 0.0, 0.0)
        self.robot.set_white_reference(100.0, 100.0, 100.0)
        rn, gn, bn = self.robot.normalize_color(50.0, 25.0, 75.0)
        self.assertAlmostEqual(rn, 0.5, delta=0.001)
        self.assertAlmostEqual(gn, 0.25, delta=0.001)
        self.assertAlmostEqual(bn, 0.75, delta=0.001)

    def test_two_point_degenerate_range_rejection(self):
        """Scenario 4: Degenerate or inverted dynamic ranges fail closed raising ValueError."""
        self.robot.set_black_reference(50.0, 50.0, 50.0)

        # Difference <= 5.0 must raise ValueError
        with self.assertRaises(ValueError):
            self.robot.set_white_reference(52.0, 52.0, 52.0)

        # Inverted range (white < black) must raise ValueError
        with self.assertRaises(ValueError):
            self.robot.set_white_reference(40.0, 40.0, 40.0)

        # Negative and non-finite values
        with self.assertRaises(ValueError):
            self.robot.set_black_reference(-1.0, 10.0, 10.0)
        with self.assertRaises(ValueError):
            self.robot.set_white_reference(float("nan"), 100.0, 100.0)
        with self.assertRaises(ValueError):
            self.robot.normalize_color(-5.0, 50.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.normalize_color(float("inf"), 50.0, 50.0)

    def test_two_point_multi_lux_illumination_invariance(self):
        """Scenario 5: Identical surface reflectance yields invariant normalized reflection under varying lux."""
        # Low ambient (500 lux)
        self.robot.set_black_reference(10.0, 10.0, 10.0)
        self.robot.set_white_reference(110.0, 110.0, 110.0)
        r1, g1, b1 = self.robot.normalize_color(90.0, 30.0, 20.0)

        # High ambient (1500 lux)
        self.robot.set_black_reference(30.0, 30.0, 30.0)
        self.robot.set_white_reference(330.0, 330.0, 330.0)
        r2, g2, b2 = self.robot.normalize_color(270.0, 90.0, 60.0)

        # Drift must be < 5% (0.05)
        self.assertAlmostEqual(r1, 0.8, delta=0.001)
        self.assertAlmostEqual(g1, 0.2, delta=0.001)
        self.assertAlmostEqual(b1, 0.1, delta=0.001)
        self.assertLess(abs(r2 - r1), 0.05)
        self.assertLess(abs(g2 - g1), 0.05)
        self.assertLess(abs(b2 - b1), 0.05)

    def test_two_point_closed_object_guarding(self):
        """Closed instance raises RuntimeError on two-point calibration calls."""
        self.robot.close()
        with self.assertRaises(RuntimeError):
            self.robot.set_black_reference(0.0, 0.0, 0.0)
        with self.assertRaises(RuntimeError):
            self.robot.set_white_reference(100.0, 100.0, 100.0)
        with self.assertRaises(RuntimeError):
            self.robot.normalize_color(50.0, 50.0, 50.0)

    def test_circular_hue_distance_scenarios(self):
        """Scenario 1 & 2: Circular hue distance shortest-arc computation and symmetry."""
        dh1 = self.robot.circular_hue_distance(359.0, 1.0)
        dh2 = self.robot.circular_hue_distance(1.0, 359.0)
        self.assertAlmostEqual(dh1, 2.0, places=4)
        self.assertAlmostEqual(dh2, 2.0, places=4)
        self.assertEqual(dh1, dh2)

        # Opposite angles
        dh_opp = self.robot.circular_hue_distance(0.0, 180.0)
        self.assertAlmostEqual(dh_opp, 180.0, places=4)
        self.assertLessEqual(dh_opp, 180.0)

        # Angle wrapping
        self.assertAlmostEqual(self.robot.circular_hue_distance(720.0, 10.0), 10.0, places=4)
        self.assertAlmostEqual(self.robot.circular_hue_distance(-10.0, 10.0), 20.0, places=4)

        # Non-finite values
        self.assertEqual(self.robot.circular_hue_distance(float("nan"), 1.0), 180.0)
        self.assertEqual(self.robot.circular_hue_distance(float("inf"), 1.0), 180.0)

    def test_cie_lab_reference_transformations(self):
        """Scenario 3 & 4: CIE Lab pure white and pure black reference mapping."""
        # Pure White [1.0, 1.0, 1.0] -> L* in [99.9, 100.1], a* in [-0.5, 0.5], b* in [-0.5, 0.5]
        l_w, a_w, b_w = self.robot.rgb_to_lab(1.0, 1.0, 1.0)
        self.assertGreaterEqual(l_w, 99.9)
        self.assertLessEqual(l_w, 100.1)
        self.assertLess(abs(a_w), 0.5)
        self.assertLess(abs(b_w), 0.5)

        # Pure Black [0.0, 0.0, 0.0] -> L* == 0.0, a* == 0.0, b* == 0.0
        l_k, a_k, b_k = self.robot.rgb_to_lab(0.0, 0.0, 0.0)
        self.assertAlmostEqual(l_k, 0.0, places=4)
        self.assertAlmostEqual(a_k, 0.0, places=4)
        self.assertAlmostEqual(b_k, 0.0, places=4)

        # Percentage scale [100.0, 100.0, 100.0]
        l_w2, a_w2, b_w2 = self.robot.rgb_to_lab(100.0, 100.0, 100.0)
        self.assertGreaterEqual(l_w2, 99.9)
        self.assertLessEqual(l_w2, 100.1)

        # Validation errors
        with self.assertRaises(ValueError):
            self.robot.rgb_to_lab(-1.0, 0.5, 0.5)
        with self.assertRaises(ValueError):
            self.robot.rgb_to_lab(float("nan"), 0.5, 0.5)
        with self.assertRaises(ValueError):
            self.robot.rgb_to_lab(float("inf"), 0.5, 0.5)

    def test_similar_color_discrimination_and_wraparound(self):
        """Scenario 5: Circular hue wraparound classification & similar color discrimination."""
        self.robot.set_color_threshold(40.0)
        # Add prototypes:
        # 1: Red (100, 0, 0)
        self.robot.add_color_prototype(1, 100.0, 0.0, 0.0)
        # 2: Orange (100, 50, 0)
        self.robot.add_color_prototype(2, 100.0, 50.0, 0.0)
        # 3: Cyan (0, 100, 100)
        self.robot.add_color_prototype(3, 0.0, 100.0, 100.0)
        # 4: Blue (0, 0, 100)
        self.robot.add_color_prototype(4, 0.0, 0.0, 100.0)

        # Red sample with wraparound hue h=359°
        cid, dist, conf = self.robot.classify_color_hsv(359.0, 100.0, 100.0)
        self.assertEqual(cid, 1)
        self.assertLess(dist, 10.0)
        self.assertGreater(conf, 0.5)

        # Warm test sample h=10°: closer to Red (0°) than Orange (30°)
        cid, dist, conf = self.robot.classify_color_hsv(10.0, 100.0, 100.0)
        self.assertEqual(cid, 1)

        # Warm test sample h=25°: closer to Orange (30°) than Red (0°)
        cid, dist, conf = self.robot.classify_color_hsv(25.0, 100.0, 100.0)
        self.assertEqual(cid, 2)

        # Cyan vs Blue discrimination: sample h=185° matches Cyan (3)
        cid, dist, conf = self.robot.classify_color_hsv(185.0, 100.0, 100.0)
        self.assertEqual(cid, 3)

        # Sample h=235° matches Blue (4)
        cid, dist, conf = self.robot.classify_color_hsv(235.0, 100.0, 100.0)
        self.assertEqual(cid, 4)

    def test_closed_object_perceptual_guarding(self):
        """Closed instance raises RuntimeError on circular hue and lab calls."""
        self.robot.close()
        with self.assertRaises(RuntimeError):
            self.robot.circular_hue_distance(359.0, 1.0)
        with self.assertRaises(RuntimeError):
            self.robot.rgb_to_lab(1.0, 1.0, 1.0)


if __name__ == "__main__":
    unittest.main()
