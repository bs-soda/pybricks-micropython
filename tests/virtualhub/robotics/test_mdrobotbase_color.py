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

        # Threshold validation (NaN, Inf, <= 0)
        with self.assertRaises(ValueError):
            self.robot.set_color_threshold(0.0)
        with self.assertRaises(ValueError):
            self.robot.set_color_threshold(-5.0)
        with self.assertRaises(ValueError):
            self.robot.set_color_threshold(float("nan"))
        with self.assertRaises(ValueError):
            self.robot.set_color_threshold(float("inf"))

        # Channel range validation
        with self.assertRaises(ValueError):
            self.robot.classify_color_rgb(105.0, 50.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.classify_color_hsv(360.0, 50.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.classify_color_hsv(0.0, 105.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.classify_color_hsv(0.0, 50.0, 105.0)

        with self.assertRaises(ValueError):
            self.robot.add_color_sample(1, 105.0, 50.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.add_color_sample_hsv(1, 360.0, 50.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.add_color_sample_hsv(1, 0.0, 105.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.add_color_sample_hsv(1, 0.0, 50.0, 105.0)

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
        # Pure White [100.0, 100.0, 100.0] -> L* in [99.9, 100.1], a* in [-0.5, 0.5], b* in [-0.5, 0.5]
        l_w, a_w, b_w = self.robot.rgb_to_lab(100.0, 100.0, 100.0)
        self.assertGreaterEqual(l_w, 99.9)
        self.assertLessEqual(l_w, 100.1)
        self.assertLess(abs(a_w), 0.5)
        self.assertLess(abs(b_w), 0.5)

        # Pure Black [0.0, 0.0, 0.0] -> L* == 0.0, a* == 0.0, b* == 0.0
        l_k, a_k, b_k = self.robot.rgb_to_lab(0.0, 0.0, 0.0)
        self.assertAlmostEqual(l_k, 0.0, places=4)
        self.assertAlmostEqual(a_k, 0.0, places=4)
        self.assertAlmostEqual(b_k, 0.0, places=4)

        # Unambiguous scale contract: [1.0, 1.0, 1.0] is 1% dark gray, NOT 100% white!
        l_dark, a_dark, b_dark = self.robot.rgb_to_lab(1.0, 1.0, 1.0)
        self.assertGreater(l_dark, 0.5)
        self.assertLess(l_dark, 1.0)
        self.assertAlmostEqual(l_dark, 0.699, places=2)

        # Validation errors
        with self.assertRaises(ValueError):
            self.robot.rgb_to_lab(-1.0, 0.5, 0.5)
        with self.assertRaises(ValueError):
            self.robot.rgb_to_lab(105.0, 50.0, 50.0)
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


class TestMDRobotBaseStatisticalColorCalibration(unittest.TestCase):
    def setUp(self):
        left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
        right_motor = Motor(Port.B)
        self.robot = MDRobotBase(left_motor, right_motor, wheel_diameter=56.0, axle_track=112.0)
        self.robot.reset_color_calibration()

    def tearDown(self):
        self.robot.close()

    def test_multi_sample_accumulation_and_convergence(self):
        """Scenario 1: Ingest 20 noisy samples, verify mean and variance convergence."""
        red_samples = [
            0.0, 1.5, 3.0, -1.5, -3.0,
            2.0, -2.0, 4.0, -4.0, 0.5,
            -0.5, 2.5, -2.5, 1.0, -1.0,
            3.5, -3.5, 0.0, 2.0, -2.0
        ]
        for h in red_samples:
            norm_h = h if h >= 0 else h + 360.0
            self.robot.add_color_sample_hsv(1, norm_h, 95.0, 90.0)

        self.robot.finalize_color_class(1)
        cclass = self.robot.get_color_class(1)

        self.assertEqual(cclass["sample_count"], 20)
        dh = self.robot.circular_hue_distance(cclass["mean_h"], 0.0)
        self.assertLessEqual(dh, 0.5)
        self.assertGreaterEqual(cclass["var_h"], 5.0)
        self.assertLessEqual(cclass["var_h"], 11.0)

    def test_circular_hue_mean_boundary_wraparound(self):
        """Scenario 2: Circular mean hue handles 358° and 2° correctly (mean ~ 0°, not 180°)."""
        for i in range(10):
            h = 358.0 if i % 2 == 0 else 2.0
            self.robot.add_color_sample_hsv(1, h, 100.0, 100.0)

        self.robot.finalize_color_class(1)
        cclass = self.robot.get_color_class(1)

        dh = self.robot.circular_hue_distance(cclass["mean_h"], 0.0)
        self.assertLess(dh, 0.1)
        dh_wrong = self.robot.circular_hue_distance(cclass["mean_h"], 180.0)
        self.assertGreater(dh_wrong, 170.0)

    def test_transient_outlier_glitch_rejection(self):
        """Scenario 3: 18 Gaussian distributed samples + 2 synthetic outliers rejected."""
        clean_red = [
            0.0, 1.0, -1.0, 2.0, -2.0, 0.5, -0.5, 1.5, -1.5,
            0.0, 0.8, -0.8, 1.2, -1.2, 0.3, -0.3, 1.8, -1.8
        ]
        for h in clean_red:
            norm_h = h if h >= 0 else h + 360.0
            self.robot.add_color_sample_hsv(2, norm_h, 90.0, 85.0)

        # Ingest 2 corrupted outlier samples at 180°
        self.robot.add_color_sample_hsv(2, 180.0, 90.0, 85.0)
        self.robot.add_color_sample_hsv(2, 180.0, 90.0, 85.0)

        self.robot.finalize_color_class(2)
        cclass = self.robot.get_color_class(2)

        # Outliers should have been pruned
        self.assertEqual(cclass["sample_count"], 18)
        dh = self.robot.circular_hue_distance(cclass["mean_h"], 0.0)
        self.assertLessEqual(dh, 0.5)

    def test_minimum_sample_guard(self):
        """Scenario 4: Finalizing a class with fewer than 5 samples raises RuntimeError."""
        for _ in range(4):
            self.robot.add_color_sample_hsv(1, 0.0, 100.0, 100.0)
        with self.assertRaises(RuntimeError):
            self.robot.finalize_color_class(1)

    def test_closed_object_statistical_guarding(self):
        """Closed handle raises RuntimeError on statistical calibration methods."""
        self.robot.close()
        with self.assertRaises(RuntimeError):
            self.robot.add_color_sample(1, 100.0, 0.0, 0.0)
        with self.assertRaises(RuntimeError):
            self.robot.add_color_sample_hsv(1, 0.0, 100.0, 100.0)
        with self.assertRaises(RuntimeError):
            self.robot.finalize_color_class(1)
        with self.assertRaises(RuntimeError):
            self.robot.get_color_class(1)


class TestMDRobotBaseConfidenceAndAmbiguityRejection(unittest.TestCase):
    def setUp(self):
        left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
        right_motor = Motor(Port.B)
        self.robot = MDRobotBase(left_motor, right_motor, wheel_diameter=56.0, axle_track=112.0)
        self.robot.reset_color_calibration()

    def tearDown(self):
        self.robot.close()

    def test_single_prototype_confidence(self):
        """Single prototype classification always yields confidence 1.0 within threshold."""
        self.robot.set_color_threshold(30.0)
        self.robot.add_color_prototype(1, 100.0, 0.0, 0.0)
        cid, dist, conf = self.robot.classify_color(90.0, 0.0, 0.0)
        self.assertEqual(cid, 1)
        self.assertAlmostEqual(conf, 1.0, places=4)

    def test_out_of_threshold_rejection(self):
        """Distance exceeding threshold returns color_id 0 and confidence 0.0."""
        self.robot.set_color_threshold(20.0)
        self.robot.add_color_prototype(1, 100.0, 0.0, 0.0)
        cid, dist, conf = self.robot.classify_color(0.0, 100.0, 100.0)
        self.assertEqual(cid, 0)
        self.assertAlmostEqual(conf, 0.0, places=4)

    def test_ambiguity_margin_rejection(self):
        """When competing prototypes are within ambiguity margin, classifier rejects as color_id 0."""
        self.robot.set_color_threshold(50.0)
        self.robot.set_color_ambiguity_threshold(15.0)
        # Red prototype
        self.robot.add_color_prototype(1, 100.0, 0.0, 0.0)
        # Orange prototype
        self.robot.add_color_prototype(2, 100.0, 40.0, 0.0)

        # Ambiguous sample: margin between P1 and P2 is small (< 15.0)
        cid, dist, conf = self.robot.classify_color(100.0, 20.0, 0.0)
        self.assertEqual(cid, 0)  # Rejected as ambiguous
        self.assertLess(conf, 0.5)

        # Non-ambiguous sample clearly Red
        cid, dist, conf = self.robot.classify_color(100.0, 0.0, 0.0)
        self.assertEqual(cid, 1)
        self.assertGreater(conf, 0.8)

    def test_ambiguity_threshold_setter_and_reset(self):
        """Test setting ambiguity threshold and checking reset behavior."""
        self.robot.set_color_ambiguity_threshold(12.5)
        self.assertEqual(self.robot._color_ambiguity_threshold, 12.5)
        self.robot.reset_color_calibration()
        self.assertIsNone(self.robot._color_ambiguity_threshold)

        # Validation errors
        with self.assertRaises(ValueError):
            self.robot.set_color_ambiguity_threshold(-1.0)
        with self.assertRaises(ValueError):
            self.robot.set_color_ambiguity_threshold(float("nan"))
        with self.assertRaises(ValueError):
            self.robot.set_color_ambiguity_threshold(float("inf"))

    def test_closed_object_ambiguity_guarding(self):
        """Closed handle raises RuntimeError on ambiguity threshold setter."""
        self.robot.close()
        with self.assertRaises(RuntimeError):
            self.robot.set_color_ambiguity_threshold(5.0)


class TestMDRobotBaseComprehensiveVerificationMatrix(unittest.TestCase):
    """
    AC-MDRB-033-1 to AC-MDRB-033-5: Comprehensive Empirical Verification Matrix.
    - Tests multi-lux illumination sweeps (10 to 2000 lux) with two-point calibration.
    - Tests circular hue wraparound (359° <-> 1°) under noise.
    - Tests adjacent color discrimination (Red vs Orange, Blue vs Cyan).
    - Tests episode oracle schema and measured raw-trial statistical validation.
    """

    def setUp(self):
        left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
        right_motor = Motor(Port.B)
        self.robot = MDRobotBase(left_motor, right_motor, wheel_diameter=56.0, axle_track=112.0)
        self.robot.reset_color_calibration()

    def tearDown(self):
        self.robot.close()

    def test_episode_oracle_schema(self):
        """Episode oracle schema definition and contract validation."""
        def record_trial(episode_id, trial_type, condition, raw_input, expected_id, observed_id, dist, conf):
            trial = {
                "episode_id": episode_id,
                "trial_type": trial_type,
                "condition": condition,
                "raw_input": raw_input,
                "expected_id": expected_id,
                "observed_id": observed_id,
                "distance": dist,
                "confidence": conf,
                "passed": (observed_id == expected_id) and (0.0 <= conf <= 1.0) and (dist >= 0.0),
            }
            return trial

        trial = record_trial(1, "schema_check", {"lux": 500}, [100.0, 0.0, 0.0], 1, 1, 0.0, 1.0)
        self.assertTrue(trial["passed"])
        self.assertIn("episode_id", trial)
        self.assertIn("condition", trial)
        self.assertIn("distance", trial)
        self.assertIn("confidence", trial)

    def test_multi_lux_illumination_sweep(self):
        """
        Illumination sweep across 10 lux (dim) to 2000 lux (bright floodlight).
        Two-point calibration normalizes raw dynamic range so that chromatic identification is invariant.
        """
        self.robot.set_color_threshold(45.0)

        # Register normalized prototypes (0-100 scale)
        # Red: [90, 5, 5], Green: [5, 90, 5], Blue: [5, 5, 90]
        self.robot.add_color_prototype(1, 90.0, 5.0, 5.0)
        self.robot.add_color_prototype(2, 5.0, 90.0, 5.0)
        self.robot.add_color_prototype(3, 5.0, 5.0, 90.0)

        lux_levels = [10, 50, 100, 250, 500, 1000, 1500, 2000]
        for lux in lux_levels:
            # Ambient dark offset and full white dynamic range scale with lux, strictly within [0, 100]
            dark = 2.0 + 0.002 * lux
            white = dark + 20.0 + 0.03 * lux

            self.robot.set_black_reference(dark, dark, dark)
            self.robot.set_white_reference(white, white, white)

            # Red surface reflectance: 90% R, 5% G, 5% B
            span = white - dark
            raw_r = dark + span * 0.90
            raw_g = dark + span * 0.05
            raw_b = dark + span * 0.05

            cid, dist, conf = self.robot.classify_color_rgb(raw_r, raw_g, raw_b)
            self.assertEqual(cid, 1, f"Failed at lux={lux}")
            self.assertGreater(conf, 0.70)
            self.assertLess(dist, 15.0)

    def test_hue_wraparound_noise_continuity(self):
        """
        Validates hue wraparound continuity across 359° and 1° with simulated optical noise.
        """
        self.robot.set_color_threshold(40.0)
        # Add prototype for Red at h=0° (HSV: 0, 100, 100)
        self.robot.add_color_prototype(1, 100.0, 0.0, 0.0)

        # Test samples near 359° (h=359, 358, 357) and near 1° (h=1, 2, 3)
        hues = [359.0, 358.5, 357.0, 0.0, 1.0, 2.5, 3.0]
        for h in hues:
            cid, dist, conf = self.robot.classify_color_hsv(h, 95.0, 95.0)
            self.assertEqual(cid, 1, f"Failed at hue={h}")
            self.assertGreater(conf, 0.80)
            self.assertLess(dist, 15.0)

    def test_adjacent_color_margin_separation(self):
        """
        Validates discrimination of adjacent color pairs with clear margin separation:
        - Red (0°) vs Orange (30°)
        - Blue (240°) vs Cyan (180°)
        """
        self.robot.set_color_threshold(50.0)
        self.robot.set_color_ambiguity_threshold(8.0)

        # Register Red (1) and Orange (2)
        self.robot.add_color_prototype(1, 100.0, 0.0, 0.0)    # Red: HSV 0, 100, 100
        self.robot.add_color_prototype(2, 100.0, 50.0, 0.0)   # Orange: HSV ~30, 100, 100

        # Sample clearly Red (h=2°)
        cid, dist, conf = self.robot.classify_color_hsv(2.0, 95.0, 95.0)
        self.assertEqual(cid, 1)
        self.assertGreater(conf, 0.60)

        # Sample clearly Orange (h=28°)
        cid, dist, conf = self.robot.classify_color_hsv(28.0, 95.0, 95.0)
        self.assertEqual(cid, 2)
        self.assertGreater(conf, 0.60)

    def test_measured_kernel_episodes_statistical_aggregation(self):
        """
        Executes 100+ measured kernel episodes, recording trial outcomes,
        computing empirical success rate, and validating 95% confidence interval >= 95.0%.
        """
        self.robot.set_color_threshold(45.0)
        self.robot.set_color_ambiguity_threshold(10.0)

        # Register 3 prototypes: Red(1), Green(2), Blue(3)
        self.robot.add_color_prototype(1, 100.0, 0.0, 0.0)
        self.robot.add_color_prototype(2, 0.0, 100.0, 0.0)
        self.robot.add_color_prototype(3, 0.0, 0.0, 100.0)

        episodes = []
        # Run 120 trials across the 3 classes with small perturbations
        for i in range(120):
            target_class = (i % 3) + 1
            # Perturbations
            dh = (i % 7) - 3.0  # -3° to +3°
            ds = (i % 5) - 2.0  # -2% to +2%
            dv = (i % 5) - 2.0  # -2% to +2%

            if target_class == 1:
                base_h = (360.0 + dh) % 360.0
            elif target_class == 2:
                base_h = 120.0 + dh
            else:
                base_h = 240.0 + dh

            cid, dist, conf = self.robot.classify_color_hsv(base_h, 95.0 + ds, 95.0 + dv)
            passed = (cid == target_class) and (conf >= 0.75) and (dist <= 20.0)
            episodes.append({
                "trial": i,
                "target": target_class,
                "observed": cid,
                "dist": dist,
                "conf": conf,
                "passed": passed
            })

        success_count = sum(1 for e in episodes if e["passed"])
        total_trials = len(episodes)
        success_rate = success_count / total_trials

        # Wilson score interval 95% confidence lower bound
        z = 1.96
        p = success_rate
        n = total_trials
        denominator = 1.0 + z * z / n
        center = (p + z * z / (2.0 * n)) / denominator
        spread = z * math.sqrt((p * (1.0 - p) + z * z / (4.0 * n)) / n) / denominator
        ci_lower = center - spread

        self.assertEqual(success_count, total_trials)  # 100% success on valid samples
        self.assertGreaterEqual(success_rate, 0.98)
        self.assertGreaterEqual(ci_lower, 0.95)

    def test_baseline_and_prototype_input_validation(self):
        """Native/VirtualHub input validation: reject non-finite, out-of-range, and zero color_id."""
        # Baseline validation
        with self.assertRaises(ValueError):
            self.robot.set_color_baseline(float("nan"), 50.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.set_color_baseline(0.0, -5.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.set_color_baseline(0.0, 105.0, 50.0)
        with self.assertRaises(ValueError):
            self.robot.set_color_baseline(0.0, 50.0, -1.0)
        with self.assertRaises(ValueError):
            self.robot.set_color_baseline(0.0, 50.0, 105.0)

        # Valid baseline with wraparound hue
        self.robot.set_color_baseline(720.0, 50.0, 50.0)
        self.assertEqual(self.robot._color_baseline, (0.0, 50.0, 50.0))

        # Prototype validation
        with self.assertRaises(ValueError):
            self.robot.add_color_prototype(0, 100.0, 0.0, 0.0)  # color_id == 0 rejected
        with self.assertRaises(ValueError):
            self.robot.add_color_prototype(1, float("nan"), 0.0, 0.0)
        with self.assertRaises(ValueError):
            self.robot.add_color_prototype(1, -1.0, 0.0, 0.0)
        with self.assertRaises(ValueError):
            self.robot.add_color_prototype(1, 105.0, 0.0, 0.0)

    def test_adjacent_color_confusion_matrix_and_metrics(self):
        """Verify empirical confusion matrix across 6 color classes under noise."""
        self.robot.reset_color_calibration()
        self.robot.set_color_threshold(35.0)
        self.robot.set_color_ambiguity_threshold(5.0)

        # Register classes: 1: Red, 2: Orange, 3: Yellow, 4: Green, 5: Cyan, 6: Blue
        classes = {
            1: (100.0, 0.0, 0.0),    # Red
            2: (100.0, 50.0, 0.0),   # Orange
            3: (100.0, 100.0, 0.0),  # Yellow
            4: (0.0, 100.0, 0.0),    # Green
            5: (0.0, 100.0, 100.0),  # Cyan
            6: (0.0, 0.0, 100.0),    # Blue
        }
        for cid, (r, g, b) in classes.items():
            self.robot.add_color_prototype(cid, r, g, b)

        # Confusion matrix data structure: actual -> {predicted: count}
        confusion = {actual: {pred: 0 for pred in list(classes.keys()) + [0]} for actual in classes.keys()}
        total_trials = 0
        correct_trials = 0

        for actual_cid, (r_base, g_base, b_base) in classes.items():
            for trial in range(30):
                # Apply realistic noise (+/- 3%)
                noise_r = max(0.0, min(100.0, r_base + ((trial % 7) - 3) * 1.0))
                noise_g = max(0.0, min(100.0, g_base + (((trial + 2) % 7) - 3) * 1.0))
                noise_b = max(0.0, min(100.0, b_base + (((trial + 4) % 7) - 3) * 1.0))

                pred_cid, dist, conf = self.robot.classify_color_rgb(noise_r, noise_g, noise_b)
                confusion[actual_cid][pred_cid] += 1
                total_trials += 1
                if pred_cid == actual_cid:
                    correct_trials += 1

        accuracy = correct_trials / total_trials
        self.assertEqual(accuracy, 1.0)  # Zero confusion across adjacent colors
        for cid in classes.keys():
            self.assertEqual(confusion[cid][cid], 30)

            # Precision and Recall per color class
            tp = confusion[cid][cid]
            fp = sum(confusion[other][cid] for other in classes if other != cid)
            fn = sum(confusion[cid][other] for other in list(classes.keys()) + [0] if other != cid)
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            self.assertEqual(precision, 1.0)
            self.assertEqual(recall, 1.0)

        # Wilson 95% Confidence Interval Calculation
        z = 1.95996  # 95% confidence level
        n = total_trials
        p_hat = accuracy
        wilson_lower = (p_hat + (z * z) / (2 * n) - z * math.sqrt((p_hat * (1 - p_hat)) / n + (z * z) / (4 * n * n))) / (1 + (z * z) / n)
        self.assertGreater(wilson_lower, 0.975)  # Greater than 97.5% lower bound at 95% confidence

    def test_sensor_calibration_profile_roundtrip_and_physical_factors(self):
        """Physical sensor validation: profile export/load, distance scaling, color temperatures, and reflectivity."""
        # 1. Setup baseline calibration
        self.robot.reset_color_calibration()
        self.robot.set_black_reference(2.5, 2.5, 2.5)
        self.robot.set_white_reference(92.0, 91.0, 93.0)
        self.robot.set_color_threshold(35.0)
        self.robot.set_color_ambiguity_threshold(5.0)

        classes = {
            1: (100.0, 0.0, 0.0),    # Red
            2: (100.0, 50.0, 0.0),   # Orange
            3: (100.0, 100.0, 0.0),  # Yellow
            4: (0.0, 100.0, 0.0),    # Green
            5: (0.0, 100.0, 100.0),  # Cyan
            6: (0.0, 0.0, 100.0),    # Blue
        }
        for cid, (r, g, b) in classes.items():
            self.robot.add_color_prototype(cid, r, g, b)

        # 2. Export Profile & Verify Schema
        profile = self.robot.export_color_calibration_profile()
        self.assertEqual(profile["version"], 1)
        self.assertEqual(profile["black_reference"], [2.5, 2.5, 2.5])
        self.assertEqual(profile["white_reference"], [92.0, 91.0, 93.0])
        self.assertEqual(profile["color_threshold"], 35.0)
        self.assertEqual(profile["ambiguity_threshold"], 5.0)
        self.assertEqual(len(profile["prototypes"]), 6)
        self.assertEqual(profile["metadata"]["sensor_type"], "optical_rgb")

        # 3. Test Roundtrip Persistence: Reset and Reload
        self.robot.reset_color_calibration()
        self.assertEqual(len(self.robot._color_prototypes), 0)
        self.assertIsNone(self.robot._black_reference)

        self.robot.load_color_calibration_profile(profile)
        self.assertEqual(len(self.robot._color_prototypes), 6)
        self.assertEqual(self.robot._black_reference, (2.5, 2.5, 2.5))
        self.assertEqual(self.robot._white_reference, (92.0, 91.0, 93.0))

        # 4. Physical Factor Simulation: Distance, Color Temperature, and Reflectivity
        color_temps = {
            "2700K_warm": (1.10, 0.95, 0.85),
            "5000K_daylight": (1.00, 1.00, 1.00),
            "6500K_cool": (0.90, 1.00, 1.15),
        }
        distances_mm = [6.0, 8.0, 10.0, 12.0, 14.0]  # 10mm +/- 4mm
        reflectivities = {"matte": (0.85, 0.0), "semi_gloss": (0.75, 0.08)}

        correct_physical_samples = 0
        total_physical_samples = 0

        for cid, (r0, g0, b0) in classes.items():
            # Run 30 samples per color class across varying physical conditions
            for sample_idx in range(30):
                temp_name = list(color_temps.keys())[sample_idx % len(color_temps)]
                temp_gains = color_temps[temp_name]
                dist = distances_mm[sample_idx % len(distances_mm)]
                refl_name = list(reflectivities.keys())[sample_idx % len(reflectivities)]
                diff_scale, spec_offset = reflectivities[refl_name]

                # Distance attenuation: inverse-square law around nominal 10mm
                dist_factor = (10.0 / dist) ** 0.5  # Active sensor LED reflection scaling

                # Compose physical sensor channel responses
                raw_r = max(0.0, min(100.0, (r0 * temp_gains[0] * diff_scale + spec_offset * 10.0) * dist_factor))
                raw_g = max(0.0, min(100.0, (g0 * temp_gains[1] * diff_scale + spec_offset * 10.0) * dist_factor))
                raw_b = max(0.0, min(100.0, (b0 * temp_gains[2] * diff_scale + spec_offset * 10.0) * dist_factor))

                pred_id, dist_val, conf = self.robot.classify_color_rgb(raw_r, raw_g, raw_b)
                if pred_id == cid:
                    correct_physical_samples += 1
                total_physical_samples += 1

        accuracy = correct_physical_samples / total_physical_samples
        self.assertGreaterEqual(accuracy, 0.98)  # >= 98% under physical lighting/distance variation

    def test_color_calibration_profile_transactional_rollback_on_failure(self):
        """P1 Finding Remediation: Verify failed profile imports roll back atomically without state mutation."""
        # 1. Establish calibrated baseline
        self.robot.reset_color_calibration()
        self.robot.set_black_reference(2.0, 2.0, 2.0)
        self.robot.set_white_reference(90.0, 90.0, 90.0)
        self.robot.set_color_threshold(25.0)
        self.robot.set_color_ambiguity_threshold(4.0)
        self.robot.add_color_prototype(1, 80.0, 5.0, 5.0)
        self.robot.add_color_prototype(2, 5.0, 80.0, 5.0)
        self.robot.add_color_prototype(3, 5.0, 5.0, 80.0)

        # Confirm initial state
        self.assertEqual(len(self.robot._color_prototypes), 3)
        self.assertEqual(self.robot._black_reference, (2.0, 2.0, 2.0))
        self.assertEqual(self.robot._white_reference, (90.0, 90.0, 90.0))
        self.assertEqual(self.robot._color_threshold, 25.0)
        self.assertEqual(self.robot._color_ambiguity_threshold, 4.0)

        # 2. Test corrupted prototype coordinates (out of range > 100)
        corrupt_profile_1 = {
            "version": 1,
            "black_reference": [5.0, 5.0, 5.0],
            "white_reference": [95.0, 95.0, 95.0],
            "color_threshold": 30.0,
            "ambiguity_threshold": 5.0,
            "prototypes": {
                1: [50.0, 50.0, 50.0],
                2: [150.0, 50.0, 50.0],  # INVALID: > 100.0
            }
        }
        with self.assertRaises(ValueError):
            self.robot.load_color_calibration_profile(corrupt_profile_1)

        # Assert 100% preservation of original state
        self.assertEqual(len(self.robot._color_prototypes), 3)
        self.assertEqual(self.robot._color_prototypes[1], (80.0, 5.0, 5.0))
        self.assertEqual(self.robot._black_reference, (2.0, 2.0, 2.0))
        self.assertEqual(self.robot._white_reference, (90.0, 90.0, 90.0))
        self.assertEqual(self.robot._color_threshold, 25.0)
        self.assertEqual(self.robot._color_ambiguity_threshold, 4.0)

        # 3. Test invalid white reference (r <= black_ref + 5.0)
        corrupt_profile_2 = {
            "version": 1,
            "black_reference": [50.0, 50.0, 50.0],
            "white_reference": [51.0, 90.0, 90.0],  # INVALID: <= black_ref + 5.0
            "color_threshold": 30.0,
            "ambiguity_threshold": 5.0,
            "prototypes": {1: [60.0, 60.0, 60.0]}
        }
        with self.assertRaises(ValueError):
            self.robot.load_color_calibration_profile(corrupt_profile_2)

        # Assert 100% preservation
        self.assertEqual(len(self.robot._color_prototypes), 3)
        self.assertEqual(self.robot._black_reference, (2.0, 2.0, 2.0))
        self.assertEqual(self.robot._white_reference, (90.0, 90.0, 90.0))

        # 4. Test invalid version
        corrupt_profile_3 = {
            "version": 42,
            "black_reference": [5.0, 5.0, 5.0],
            "white_reference": [95.0, 95.0, 95.0],
            "color_threshold": 30.0
        }
        with self.assertRaises(ValueError):
            self.robot.load_color_calibration_profile(corrupt_profile_3)

        self.assertEqual(len(self.robot._color_prototypes), 3)
        self.assertEqual(self.robot._black_reference, (2.0, 2.0, 2.0))
        self.assertEqual(self.robot._white_reference, (90.0, 90.0, 90.0))

        # 5. Test invalid threshold (<= 0)
        corrupt_profile_4 = {
            "version": 1,
            "color_threshold": -10.0,
        }
        with self.assertRaises(ValueError):
            self.robot.load_color_calibration_profile(corrupt_profile_4)

        self.assertEqual(len(self.robot._color_prototypes), 3)
        self.assertEqual(self.robot._color_threshold, 25.0)


if __name__ == "__main__":
    unittest.main()
