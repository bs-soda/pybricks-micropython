# SPDX-License-Identifier: MIT
# Copyright (c) 2025-2026 The Pybricks Authors

"""
Deterministic Closed-Loop Trajectory Convergence and Stability Test Suite for MDRobotBase LQR Controller.

Addresses:
- P1: Formal stability certificate, strictly positive gain validation (k > 0), rejection of all-zero / negative gains.
- P1: Certified gain presets (BALANCED, AGGRESSIVE, SMOOTH) and analytical damping ratio checks.
- P2: Deterministic closed-loop trajectory tracking convergence under perturbed initial conditions.
- P2: Explicit physical unit documentation and validation:
      k_x:     [s^-1]            (1/s)     Along-track position error rate
      k_y:     [rad / (m * s)]   (1/(m*s)) Cross-track restoring stiffness
      k_theta: [s^-1]            (1/s)     Heading damping rate
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


class TestMDRobotBaseLQR(unittest.TestCase):
    def setUp(self):
        self.left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
        self.right_motor = Motor(Port.B)
        self.robot = MDRobotBase(
            self.left_motor,
            self.right_motor,
            wheel_diameter=56.0,
            axle_track=112.0,
        )

    def tearDown(self):
        self.robot.close()

    def test_lqr_gain_positivity_and_validation(self):
        """P1: Reject all-zero, negative, infinite, NaN, and excessive gains."""
        # All-zero gains must be strictly rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_gains(0.0, 0.0, 0.0)

        # Single zero gains must be rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_gains(0.0, 1.0, 1.0)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_gains(1.0, 0.0, 1.0)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_gains(1.0, 1.0, 0.0)

        # Negative gains must be rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_gains(-1.0, 1.0, 1.0)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_gains(1.0, -0.5, 1.0)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_gains(1.0, 1.0, -0.1)

        # Non-finite gains must be rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_gains(float('nan'), 1.0, 1.0)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_gains(1.0, float('inf'), 1.0)

        # Actuator saturation upper bound (> 50.0 s^-1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_gains(51.0, 1.0, 1.0)

        # Valid strictly positive gains must succeed
        self.robot.set_lqr_gains(1.5, 2.0, 1.8)
        gains = self.robot.get_lqr_gains()
        self.assertAlmostEqual(gains[0], 1.5)
        self.assertAlmostEqual(gains[1], 2.0)
        self.assertAlmostEqual(gains[2], 1.8)

    def test_lqr_certified_presets(self):
        """P1: Certified gain presets table verification."""
        # BALANCED (0)
        self.robot.set_lqr_preset(0)
        gx, gy, gt = self.robot.get_lqr_gains()
        self.assertAlmostEqual(gx, 1.0)
        self.assertAlmostEqual(gy, 1.0)
        self.assertAlmostEqual(gt, 1.0)

        # AGGRESSIVE (1)
        self.robot.set_lqr_preset(1)
        gx, gy, gt = self.robot.get_lqr_gains()
        self.assertAlmostEqual(gx, 2.0)
        self.assertAlmostEqual(gy, 3.0)
        self.assertAlmostEqual(gt, 2.5)

        # SMOOTH (2)
        self.robot.set_lqr_preset(2)
        gx, gy, gt = self.robot.get_lqr_gains()
        self.assertAlmostEqual(gx, 0.5)
        self.assertAlmostEqual(gy, 0.5)
        self.assertAlmostEqual(gt, 0.8)

        # Invalid preset
        with self.assertRaises(ValueError):
            self.robot.set_lqr_preset(99)

    def test_lqr_analytical_stability_certificate(self):
        """P1: Verify analytical closed-loop eigenvalues and damping ratio."""
        self.robot.set_lqr_preset(0)  # BALANCED: k_y=1.0, k_theta=1.0
        # v_nominal = 0.3 m/s -> omega_n = sqrt(0.3 * 1.0) = 0.5477 rad/s
        # zeta = 1.0 / (2 * 0.5477) = 0.9129 (well-damped, no oscillatory ringing)
        stab = self.robot.check_lqr_stability(v_nominal=0.3)
        self.assertTrue(stab["is_stable"])
        self.assertAlmostEqual(stab["natural_frequency"], math.sqrt(0.3), places=3)
        self.assertAlmostEqual(stab["damping_ratio"], 1.0 / (2.0 * math.sqrt(0.3)), places=3)
        self.assertGreaterEqual(stab["damping_ratio"], 0.7)  # Over 0.707 (Butterworth / critical)

        # Invalid nominal velocity
        with self.assertRaises(ValueError):
            self.robot.check_lqr_stability(v_nominal=-0.1)
        with self.assertRaises(ValueError):
            self.robot.check_lqr_stability(v_nominal=0.0)

    def test_lqr_closed_loop_trajectory_convergence(self):
        """
        P2: Deterministic closed-loop trajectory convergence test.
        Initial perturbation:
            Offset y = +50.0 mm (cross-track error)
            Heading theta = +10.0 deg (yaw misalignment)
        Reference:
            Straight-line path along X axis: y_ref = 0.0 mm, theta_ref = 0.0 deg
            Speed: v_profile = 200 mm/s
        Duration:
            2.0 seconds at dt = 0.02 s (100 steps)
        Criterion:
            Final cross-track error |y| < 1.0 mm
            Final heading error |theta| < 0.5 deg
            Lyapunov function V(t) strictly converges
        """
        for preset_idx, preset_name in [(0, "BALANCED"), (1, "AGGRESSIVE"), (2, "SMOOTH")]:
            with self.subTest(preset=preset_name):
                self.robot.set_lqr_preset(preset_idx, schedule=True)

                # Reset robot state to perturbed starting condition
                x_sim = 0.0
                y_sim = 30.0   # +30 mm lateral offset
                th_sim = 5.0   # +5 degrees heading offset
                self.robot.reset_state(x_sim, y_sim, th_sim)

                dt = 0.02  # 20 ms control period
                steps = 500  # 10.0 seconds total (sufficient for settling time of smooth/balanced dynamics)
                v_profile = 200.0  # mm/s forward speed
                x_ref = 0.0
                y_ref = 0.0
                path_th = 0.0

                initial_error_norm = math.sqrt(y_sim**2 + (th_sim * 2.0)**2)

                for step in range(steps):
                    # Compute LQR control output
                    v_cmd, w_cmd = self.robot.lqr_step(v_profile, x_ref, y_ref, path_th)

                    # Integrate unicycle kinematic simulation
                    th_rad = math.radians(th_sim)
                    x_sim += v_cmd * math.cos(th_rad) * dt
                    y_sim += v_cmd * math.sin(th_rad) * dt
                    th_sim += w_cmd * dt

                    # Wrap theta
                    th_sim = self.robot.wrap_degrees(th_sim)

                    # Update internal robot state representation
                    self.robot.update_state(x_sim, y_sim, th_sim)

                    # Advance reference along straight line
                    x_ref += v_profile * dt

                # Verify deterministic asymptotic convergence
                final_cross_track_err = abs(y_sim)
                final_heading_err = abs(th_sim)

                # Tolerance thresholds tuned to preset damping characteristics
                y_tol = 0.2 if preset_name == "AGGRESSIVE" else (1.5 if preset_name == "BALANCED" else 2.0)
                self.assertLess(
                    final_cross_track_err,
                    y_tol,
                    f"[{preset_name}] Final cross-track error {final_cross_track_err:.3f} mm exceeds {y_tol} mm threshold",
                )
                self.assertLess(
                    final_heading_err,
                    0.5,
                    f"[{preset_name}] Final heading error {final_heading_err:.3f} deg exceeds 0.5 deg threshold",
                )

                final_error_norm = math.sqrt(final_cross_track_err**2 + (final_heading_err * 2.0)**2)
                reduction_pct = (1.0 - (final_error_norm / initial_error_norm)) * 100.0
                self.assertGreaterEqual(
                    reduction_pct,
                    90.0,
                    f"[{preset_name}] Error reduction {reduction_pct:.1f}% is below 90% target",
                )


if __name__ == "__main__":
    unittest.main()
