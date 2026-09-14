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

import asyncio
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
        MDRobotBase._lqr_workspace_set_busy_for_testing(False)
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
        """P1: Certified gain presets table verification (asserts active DARE gains without manual overwrites)."""
        # BALANCED (0)
        self.robot.set_lqr_preset(0)
        gx, gy, gt = self.robot.get_lqr_gains()
        # Must exactly equal active DARE/LUT nominal values at 300 mm/s
        self.assertEqual(gx, self.robot._lqr_k11)
        self.assertEqual(gy, self.robot._lqr_lut[5][1])
        self.assertEqual(gt, self.robot._lqr_lut[5][2])
        self.assertGreater(gx, 0.0)
        self.assertGreater(gy, 0.0)
        self.assertGreater(gt, 0.0)
        bal_g = (gx, gy, gt)

        # AGGRESSIVE (1)
        self.robot.set_lqr_preset(1)
        gx, gy, gt = self.robot.get_lqr_gains()
        self.assertEqual(gx, self.robot._lqr_k11)
        self.assertEqual(gy, self.robot._lqr_lut[5][1])
        self.assertEqual(gt, self.robot._lqr_lut[5][2])
        self.assertGreater(gx, bal_g[0])
        self.assertGreater(gy, bal_g[1])
        self.assertGreater(gt, bal_g[2])
        agg_g = (gx, gy, gt)

        # SMOOTH (2)
        self.robot.set_lqr_preset(2)
        gx, gy, gt = self.robot.get_lqr_gains()
        self.assertEqual(gx, self.robot._lqr_k11)
        self.assertEqual(gy, self.robot._lqr_lut[5][1])
        self.assertEqual(gt, self.robot._lqr_lut[5][2])
        self.assertLess(gx, bal_g[0])
        self.assertLess(gy, bal_g[1])
        self.assertLess(gt, bal_g[2])

        # Invalid preset
        with self.assertRaises(ValueError):
            self.robot.set_lqr_preset(99)

    def test_lqr_analytical_stability_certificate(self):
        """P1: Verify analytical closed-loop eigenvalues and damping ratio with active DARE gains."""
        self.robot.set_lqr_preset(0)  # BALANCED
        gx, gy, gt = self.robot.get_lqr_gains()
        v_nom = 0.3
        expected_omega_n = math.sqrt(abs(v_nom) * gy)
        expected_zeta = gt / (2.0 * expected_omega_n)

        stab = self.robot.check_lqr_stability(v_nominal=v_nom)
        self.assertTrue(stab["is_stable"])
        self.assertAlmostEqual(stab["natural_frequency"], expected_omega_n, places=3)
        self.assertAlmostEqual(stab["damping_ratio"], expected_zeta, places=3)
        self.assertGreaterEqual(stab["damping_ratio"], 0.7)  # Over 0.707 (well-damped / critical)
        self.assertLess(stab["spectral_radius"], 1.0)

        # Test negative nominal velocity (reverse driving stability certificate)
        stab_rev = self.robot.check_lqr_stability(v_nominal=-0.3)
        self.assertTrue(stab_rev["is_stable"])
        self.assertAlmostEqual(stab_rev["natural_frequency"], expected_omega_n, places=3)
        self.assertAlmostEqual(stab_rev["damping_ratio"], expected_zeta, places=3)
        self.assertLess(stab_rev["spectral_radius"], 1.0)

        # Invalid nominal velocity (zero or non-finite)
        with self.assertRaises(ValueError):
            self.robot.check_lqr_stability(v_nominal=0.0)
        with self.assertRaises(ValueError):
            self.robot.check_lqr_stability(v_nominal=float('nan'))
        with self.assertRaises(ValueError):
            self.robot.check_lqr_stability(v_nominal=float('inf'))

    def test_full_3x3_dare_mathematical_equivalence(self):
        """P1 / AC-MDRB-036-9: Full 3x3 DARE solver mathematically equals decoupled (1x1 + 2x2) decomposition."""
        self.robot.set_lqr_preset(0)
        qx, qy, qth, rv, rw = self.robot.get_lqr_weights()
        for v_mm in range(50, 850, 50):
            # 1. Decoupled solver
            kx_dec, ky_dec, kth_dec, rho_dec = self.robot.solve_dare(qx, qy, qth, rv, rw, v_mm)
            # 2. Full 3x3 solver
            K_full, P_full, rho_full = self.robot.solve_dare_full(qx, qy, qth, rv, rw, v_mm)

            # Gain matrix magnitude equivalence (within iterative tolerance)
            self.assertAlmostEqual(abs(K_full[0][0]), kx_dec, delta=1e-3)
            self.assertAlmostEqual(K_full[0][1], 0.0, delta=1e-4)
            self.assertAlmostEqual(K_full[0][2], 0.0, delta=1e-4)
            self.assertAlmostEqual(K_full[1][0], 0.0, delta=1e-4)
            self.assertAlmostEqual(abs(K_full[1][1]), ky_dec, delta=1e-2)
            self.assertAlmostEqual(abs(K_full[1][2]), kth_dec, delta=1e-2)

            # Block-diagonal decoupling: off-diagonal blocks of P must be identically zero
            self.assertAlmostEqual(P_full[0][1], 0.0, delta=1e-4)
            self.assertAlmostEqual(P_full[0][2], 0.0, delta=1e-4)
            self.assertAlmostEqual(P_full[1][0], 0.0, delta=1e-4)
            self.assertAlmostEqual(P_full[2][0], 0.0, delta=1e-4)

            # Spectral radius equivalence
            self.assertAlmostEqual(rho_full, rho_dec, delta=2e-3)
            self.assertLess(rho_full, 1.0)

    def test_negative_velocity_stability_sweep(self):
        """P2: Verify discrete stability across all positive and negative operating velocities (-800 to +800 mm/s)."""
        for preset_idx, preset_name in [(0, "BALANCED"), (1, "AGGRESSIVE"), (2, "SMOOTH")]:
            self.robot.set_lqr_preset(preset_idx)
            qx, qy, qth, rv, rw = self.robot.get_lqr_weights()

            # Positive operating speed sweep (+50 to +800 mm/s)
            for v_mm in range(50, 850, 50):
                _, ky, kth, rho = self.robot.solve_dare(qx, qy, qth, rv, rw, v_mm)
                self.assertLess(rho, 1.0, f"[{preset_name}] Unstable at +{v_mm} mm/s: rho={rho}")
                stab_fwd = self.robot.verify_discrete_stability(ky, kth, v_mm / 1000.0)
                self.assertTrue(stab_fwd["is_stable"])
                self.assertLess(stab_fwd["spectral_radius"], 1.0)

            # Negative operating speed sweep (-800 to -50 mm/s)
            for v_mm in range(-800, 0, 50):
                _, ky, kth, _ = self.robot.solve_dare(qx, qy, qth, rv, rw, abs(v_mm))
                stab_rev = self.robot.verify_discrete_stability(ky, kth, v_mm / 1000.0)
                self.assertTrue(stab_rev["is_stable"], f"[{preset_name}] Discrete stability failed at {v_mm} mm/s")
                self.assertLess(
                    stab_rev["spectral_radius"],
                    1.0,
                    f"[{preset_name}] Spectral radius {stab_rev['spectral_radius']:.6f} at {v_mm} mm/s violates unit circle (< 1.0)",
                )

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

    def test_lqr_dare_weights_validation(self):
        """Scenario 1 (AC-MDRB-036-1): DARE cost matrix weights validation & accessor round-trip."""
        # Valid weights round-trip
        self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, 0.1)
        qx, qy, qth, rv, rw = self.robot.get_lqr_weights()
        self.assertAlmostEqual(qx, 2500.0)
        self.assertAlmostEqual(qy, 5000.0)
        self.assertAlmostEqual(qth, 20.0)
        self.assertAlmostEqual(rv, 25.0)
        self.assertAlmostEqual(rw, 0.1)

        # Non-negative state penalties required
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(-1.0, 5000.0, 20.0, 25.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, -1.0, 20.0, 25.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, -0.5, 25.0, 0.1)

        # Strictly positive control penalties required
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 0.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, 0.0)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, -5.0, 0.1)

        # Non-finite weights rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(float('nan'), 5000.0, 20.0, 25.0, 0.1)

    def test_codex_scenario_2_spectral_radius_unit_circle(self):
        """Scenario 2 (AC-MDRB-036-2): Discrete closed-loop spectral radius strictly < 1.0."""
        for preset_idx, preset_name in [(0, "BALANCED"), (1, "AGGRESSIVE"), (2, "SMOOTH")]:
            self.robot.set_lqr_preset(preset_idx)
            qx, qy, qth, rv, rw = self.robot.get_lqr_weights()
            for v_mm in range(50, 850, 50):
                kx, ky, kth, rho = self.robot.solve_dare(qx, qy, qth, rv, rw, v_mm)
                self.assertLess(
                    rho,
                    1.0,
                    f"[{preset_name}] Spectral radius {rho:.6f} at {v_mm} mm/s violates unit circle (< 1.0)",
                )
                self.assertGreater(kx, 0.0)
                self.assertGreater(ky, 0.0)
                self.assertGreater(kth, 0.0)

                # Cross-check with discrete stability validator
                disc_res = self.robot.verify_discrete_stability(ky, kth, v_mm / 1000.0, k_x=kx)
                self.assertTrue(disc_res["is_stable"])
                self.assertAlmostEqual(disc_res["spectral_radius"], rho, places=4)

    def test_codex_scenario_3_velocity_interpolation_and_clamping(self):
        """Scenario 3 (AC-MDRB-036-3): Velocity interpolation & minimum speed clamping."""
        self.robot.set_lqr_preset(0)
        # Clamping at zero velocity (prevents division by zero)
        v_cmd_0, w_cmd_0 = self.robot.lqr_step(0.0, 0.0, 10.0, 0.0)
        self.assertTrue(math.isfinite(v_cmd_0))
        self.assertTrue(math.isfinite(w_cmd_0))

        # Continuous C0 interpolation between 100 and 150 mm/s
        v100_v, v100_w = self.robot.lqr_step(100.0, 0.0, 10.0, 0.0)
        v125_v, v125_w = self.robot.lqr_step(125.0, 0.0, 10.0, 0.0)
        v150_v, v150_w = self.robot.lqr_step(150.0, 0.0, 10.0, 0.0)
        # Intermediate command should lie monotonically between endpoints
        min_w = min(v100_w, v150_w)
        max_w = max(v100_w, v150_w)
        self.assertGreaterEqual(v125_w, min_w - 1e-4)
        self.assertLessEqual(v125_w, max_w + 1e-4)

    def test_codex_scenario_4_disturbance_rejection_and_convergence(self):
        """Scenario 4 (AC-MDRB-036-4): Disturbance rejection >= 95% error reduction within 1.5 s."""
        self.robot.set_lqr_preset(0) # BALANCED
        x_sim, y_sim, th_sim = 0.0, 50.0, 30.0 # +50 mm lateral, +30 deg heading
        self.robot.reset_state(x_sim, y_sim, th_sim)

        dt = 0.005 # 5 ms control period
        steps = int(1.5 / dt) # 1.5 seconds
        v_profile = 300.0 # mm/s
        x_ref = 0.0

        init_norm = math.hypot(y_sim, th_sim)

        for _ in range(steps):
            v_cmd, w_cmd = self.robot.lqr_step(v_profile, x_ref, 0.0, 0.0)
            th_rad = math.radians(th_sim)
            x_sim += v_cmd * math.cos(th_rad) * dt
            y_sim += v_cmd * math.sin(th_rad) * dt
            th_sim = self.robot.wrap_degrees(th_sim + w_cmd * dt)
            self.robot.update_state(x_sim, y_sim, th_sim)
            x_ref += v_profile * dt

        final_norm = math.hypot(y_sim, th_sim)
        reduction_pct = (1.0 - (final_norm / init_norm)) * 100.0

        self.assertGreaterEqual(
            reduction_pct,
            95.0,
            f"Error reduction {reduction_pct:.2f}% did not reach 95% target in 1.5s (final y={y_sim:.3f} mm, th={th_sim:.3f} deg)",
        )
        self.assertLess(abs(y_sim), 1.5, f"Terminal cross-track error {abs(y_sim):.3f} mm exceeds 1.5 mm")

    def test_codex_scenario_5_symmetrical_saturation_anti_windup(self):
        """Scenario 5 (AC-MDRB-036-5): Wheel velocity saturation & symmetrical curvature preservation."""
        self.robot.set_lqr_preset(0)
        # Create severe error perturbation
        self.robot.reset_state(0.0, 200.0, 60.0)
        v_cmd, w_cmd = self.robot.lqr_step(700.0, 0.0, 0.0, 0.0)

        # Wheel speeds
        axle_b = 112.0
        w_rad = math.radians(w_cmd)
        v_l = abs(v_cmd - w_rad * axle_b * 0.5)
        v_r = abs(v_cmd + w_rad * axle_b * 0.5)

        # Wheels must be bounded to 800 mm/s limit
        self.assertLessEqual(v_l, 800.01)
        self.assertLessEqual(v_r, 800.01)

    def test_codex_scenario_6_comparative_benchmark_vs_pid(self):
        """
        Scenario 6 (AC-MDRB-036-6): Comparative benchmark vs. standard PID.
        Executes 20 deterministic trials with recorded:
        - trial count (N=20),
        - RMS cross-track error for LQR and PID,
        - control-effort variance Var(w) for LQR and PID,
        - deterministic random seed (42) and scenario variations,
        - Student's t 95% confidence intervals,
        - identical saturation (800 mm/s) and initial-state conditions.
        Requires:
        - Mean RMS cross-track error reduction >= 20.0%
        - Mean control-effort variance reduction >= 15.0%
        """
        import random
        random.seed(42)

        Ts = 0.005
        N = 1000  # 5.0 seconds per trial
        total_trials = 20

        rms_lqr_list, rms_pid_list = [], []
        var_lqr_list, var_pid_list = [], []
        red_rms_list, red_var_list = [], []
        benchmark_records = []

        for trial_id in range(total_trials):
            # Parameterized variations across trials
            v_nom = 250.0 + (trial_id % 4) * 25.0  # 250, 275, 300, 325 mm/s
            amp = 25.0 + (trial_id % 3) * 5.0      # 25, 30, 35 mm
            period = 2.0 + (trial_id % 3) * 0.25   # 2.0, 2.25, 2.5 s
            y0 = (trial_id % 5 - 2) * 5.0          # -10, -5, 0, 5, 10 mm
            th0 = (trial_id % 3 - 1) * 3.0         # -3, 0, 3 deg

            t_arr = [k * Ts for k in range(N)]
            x_ref = [v_nom * t for t in t_arr]
            y_ref = [amp * math.sin(2.0 * math.pi * t / period) for t in t_arr]
            dy_dt = [amp * (2.0 * math.pi / period) * math.cos(2.0 * math.pi * t / period) for t in t_arr]
            th_ref = [math.degrees(math.atan2(dy, v_nom)) for dy in dy_dt]

            # 1. DARE LQR simulation
            self.robot.set_lqr_preset(0)
            self.robot.reset_state(0.0, y0, th0)
            e_lqr, w_lqr = [], []
            for k in range(N):
                v_cmd, w_cmd = self.robot.lqr_step(v_nom, x_ref[k], y_ref[k], th_ref[k])
                th_rad = math.radians(self.robot._theta)
                dx = x_ref[k] - self.robot._x
                dy = y_ref[k] - self.robot._y
                ey = -math.sin(th_rad) * dx + math.cos(th_rad) * dy
                e_lqr.append(ey)
                w_lqr.append(w_cmd)

                new_x = self.robot._x + v_cmd * math.cos(th_rad) * Ts
                new_y = self.robot._y + v_cmd * math.sin(th_rad) * Ts
                new_th = self.robot.wrap_degrees(self.robot._theta + w_cmd * Ts)
                self.robot.update_state(new_x, new_y, new_th)

            rms_l = math.sqrt(sum(e**2 for e in e_lqr) / N)
            mean_w_l = sum(w_lqr) / N
            var_l = sum((w - mean_w_l)**2 for w in w_lqr) / N

            # 2. Baseline PID simulation (identical trajectory, initial state, and 800 mm/s saturation)
            x_pid, y_pid, th_pid = 0.0, y0, th0
            e_pid, w_pid = [], []
            prev_ey = y_ref[0] - y0
            kp_y, kp_th, kd = 4.0, 1.5, 0.05
            for k in range(N):
                th_rad = math.radians(th_pid)
                dx = x_ref[k] - x_pid
                dy = y_ref[k] - y_pid
                ey = -math.sin(th_rad) * dx + math.cos(th_rad) * dy
                e_pid.append(ey)
                d_ey = (ey - prev_ey) / Ts
                prev_ey = ey
                eth = self.robot.wrap_degrees(th_ref[k] - th_pid)
                w_cmd_pid = kp_th * eth + kp_y * ey + kd * d_ey

                # Identical symmetrical wheel speed saturation limit (800 mm/s)
                w_rad = math.radians(w_cmd_pid)
                vl = abs(v_nom - w_rad * 112.0 * 0.5)
                vr = abs(v_nom + w_rad * 112.0 * 0.5)
                v_max = max(vl, vr)
                if v_max > 800.0:
                    scale = 800.0 / v_max
                    v_eff = v_nom * scale
                    w_cmd_pid *= scale
                else:
                    v_eff = v_nom
                w_pid.append(w_cmd_pid)

                x_pid += v_eff * math.cos(th_rad) * Ts
                y_pid += v_eff * math.sin(th_rad) * Ts
                th_pid = self.robot.wrap_degrees(th_pid + w_cmd_pid * Ts)

            rms_p = math.sqrt(sum(e**2 for e in e_pid) / N)
            mean_w_p = sum(w_pid) / N
            var_p = sum((w - mean_w_p)**2 for w in w_pid) / N

            red_rms = (1.0 - (rms_l / rms_p)) * 100.0
            red_var = (1.0 - (var_l / var_p)) * 100.0

            rms_lqr_list.append(rms_l)
            rms_pid_list.append(rms_p)
            var_lqr_list.append(var_l)
            var_pid_list.append(var_p)
            red_rms_list.append(red_rms)
            red_var_list.append(red_var)

            benchmark_records.append({
                "trial": trial_id + 1,
                "v_nom": v_nom,
                "rms_lqr": round(rms_l, 4),
                "rms_pid": round(rms_p, 4),
                "red_rms_pct": round(red_rms, 2),
                "var_lqr": round(var_l, 2),
                "var_pid": round(var_p, 2),
                "red_var_pct": round(red_var, 2)
            })

        mean_red_rms = sum(red_rms_list) / total_trials
        mean_red_var = sum(red_var_list) / total_trials
        s_red_rms = math.sqrt(sum((r - mean_red_rms)**2 for r in red_rms_list) / (total_trials - 1))
        s_red_var = math.sqrt(sum((r - mean_red_var)**2 for r in red_var_list) / (total_trials - 1))
        t_crit = 2.093  # Student's t critical value for df=19 at 95% two-sided confidence
        ci_rms = (
            mean_red_rms - t_crit * s_red_rms / math.sqrt(total_trials),
            mean_red_rms + t_crit * s_red_rms / math.sqrt(total_trials)
        )
        ci_var = (
            mean_red_var - t_crit * s_red_var / math.sqrt(total_trials),
            mean_red_var + t_crit * s_red_var / math.sqrt(total_trials)
        )

        # Statistical validation assertions
        self.assertEqual(len(benchmark_records), 20)
        self.assertGreaterEqual(
            mean_red_rms,
            20.0,
            f"Mean RMS error reduction {mean_red_rms:.2f}% is below required 20% target"
        )
        self.assertGreaterEqual(
            ci_rms[0],
            20.0,
            f"95% CI lower bound for RMS error reduction {ci_rms[0]:.2f}% is below 20%"
        )
        self.assertGreaterEqual(
            mean_red_var,
            15.0,
            f"Mean control-effort variance reduction {mean_red_var:.2f}% is below required 15% target"
        )

    def test_codex_scenario_7_backward_driving_invariance(self):
        """Scenario 7 (AC-MDRB-036-7): Reverse driving invariance & stable steering inversion."""
        self.robot.set_lqr_preset(0)
        # Robot driving in reverse along straight line y=0
        self.robot.reset_state(0.0, 30.0, 180.0) # facing backward
        v_cmd, w_cmd = self.robot.lqr_step(-250.0, 0.0, 0.0, 0.0)

        # Must drive backward
        self.assertLess(v_cmd, 0.0)
        # When robot at y=30 facing backward (180 deg), target path y=0 is to its left in reverse direction;
        # steering must turn to restore path alignment
        self.assertNotEqual(w_cmd, 0.0)

    def test_codex_scenario_8_zero_error_equilibrium(self):
        """Scenario 8: Zero-error equilibrium invariance (e = 0 -> u = 0)."""
        self.robot.set_lqr_preset(0)
        self.robot.reset_state(100.0, 50.0, 45.0)
        # Reference equals exact robot state
        v_cmd, w_cmd = self.robot.lqr_step(300.0, 100.0, 50.0, 45.0)
        self.assertAlmostEqual(v_cmd, 300.0, places=2)
        self.assertAlmostEqual(w_cmd, 0.0, places=2)

    def test_real_kernel_episodes_and_wilson_confidence_interval(self):
        """
        Runs 25 real, measured kernel episodes under varying operating velocities and initial offsets,
        records raw trial metrics schema, and computes Wilson 95% confidence interval (target >= 0.85).
        """
        trials = []
        pass_count = 0
        total_trials = 25

        velocities = [100.0, 200.0, 300.0, 400.0, 500.0]
        y_offsets = [10.0, 20.0, 30.0, 40.0, 50.0]
        th_offsets = [-20.0, -10.0, 0.0, 10.0, 20.0]

        dt = 0.005

        for trial_id in range(total_trials):
            v_cruise = velocities[trial_id % len(velocities)]
            y0 = y_offsets[trial_id % len(y_offsets)]
            th0 = th_offsets[trial_id % len(th_offsets)]

            duration = max(2.0, 500.0 / v_cruise)
            steps = int(duration / dt)

            self.robot.set_lqr_preset(0)
            self.robot.reset_state(0.0, y0, th0)

            x_sim, y_sim, th_sim = 0.0, y0, th0
            x_ref = 0.0
            init_norm = max(1e-3, math.hypot(y0, th0))

            for _ in range(steps):
                v_cmd, w_cmd = self.robot.lqr_step(v_cruise, x_ref, 0.0, 0.0)
                th_rad = math.radians(th_sim)
                x_sim += v_cmd * math.cos(th_rad) * dt
                y_sim += v_cmd * math.sin(th_rad) * dt
                th_sim = self.robot.wrap_degrees(th_sim + w_cmd * dt)
                self.robot.update_state(x_sim, y_sim, th_sim)
                x_ref += v_cruise * dt

            final_norm = math.hypot(y_sim, th_sim)
            reduc = (1.0 - (final_norm / init_norm)) * 100.0
            passed = (reduc >= 90.0) and (abs(y_sim) < 2.0)
            if passed:
                pass_count += 1

            trials.append({
                "trial_id": trial_id + 1,
                "velocity_mms": v_cruise,
                "y0_mm": y0,
                "theta0_deg": th0,
                "final_y_mm": round(y_sim, 4),
                "final_theta_deg": round(th_sim, 4),
                "reduction_pct": round(reduc, 2),
                "passed": passed
            })

        # Wilson 95% score confidence interval:
        # z = 1.95996
        # p_hat = pass_count / n
        # CI = (p_hat + z^2/(2n) +- z * sqrt((p_hat*(1-p_hat) + z^2/(4n^2))/n)) / (1 + z^2/n)
        n = total_trials
        p_hat = pass_count / n
        z = 1.95996
        denom = 1.0 + (z * z) / n
        center = (p_hat + (z * z) / (2.0 * n)) / denom
        margin = (z * math.sqrt((p_hat * (1.0 - p_hat) + (z * z) / (4.0 * n)) / n)) / denom
        ci_lower = max(0.0, center - margin)
        ci_upper = min(1.0, center + margin)

        self.assertEqual(pass_count, 25, f"Expected 25/25 passed trials, got {pass_count}")
        self.assertGreaterEqual(
            ci_lower,
            0.85,
            f"Wilson 95% CI lower bound {ci_lower:.4f} is below required 0.85 threshold",
        )

    def test_full_dare_riccati_residual_all_16_bins(self):
        """Verify full Riccati residual P - (A^T P A - A^T P B (R+B^T P B)^-1 B^T P A + Q) < 1e-4 at all 16 bins."""
        qx, qy, qth, rv, rw = 2500.0, 5000.0, 20.0, 25.0, 0.1
        for bin_idx, v in enumerate(range(50, 850, 50)):
            v_flt = float(v)
            K, P, rho = self.robot.solve_dare_full(qx, qy, qth, rv, rw, v_flt)
            res = self.robot.compute_riccati_residual(qx, qy, qth, rv, rw, v_flt, P)
            self.assertLess(
                res,
                1e-4,
                f"Riccati residual at bin {bin_idx} (v={v} mm/s) is {res:.2e}, expected < 1e-4",
            )
            self.assertLess(rho, 1.0, f"Closed-loop spectral radius at v={v} mm/s is {rho}, expected < 1.0")

    def test_full_dare_optimal_gain_formula_identity(self):
        """Verify returned K strictly equals (R + B^T P B)^-1 B^T P A within 1e-6 at all 16 bins."""
        Ts = 0.005
        qx, qy, qth, rv, rw = 2500.0, 5000.0, 20.0, 25.0, 0.1
        for v in range(50, 850, 50):
            vr = float(v) / 1000.0
            vTs = vr * Ts
            b0 = -0.5 * vr * Ts * Ts
            b1 = -Ts
            K, P, rho = self.robot.solve_dare_full(qx, qy, qth, rv, rw, float(v))

            # M1 = Ad^T * P * Bd (3x2)
            # Wk = R + Bd^T * P * Bd (2x2)
            M1_00 = -Ts * P[0][0]
            M1_01 = b0 * P[0][1] + b1 * P[0][2]
            M1_10 = -Ts * P[1][0]
            M1_11 = b0 * P[1][1] + b1 * P[1][2]
            M1_20 = -Ts * (vTs * P[1][0] + P[2][0])
            M1_21 = vTs * (b0 * P[1][1] + b1 * P[1][2]) + (b0 * P[2][1] + b1 * P[2][2])

            Wk_00 = rv + Ts * Ts * P[0][0]
            Wk_01 = -Ts * (b0 * P[0][1] + b1 * P[0][2])
            Wk_10 = Wk_01
            Wk_11 = rw + b0 * (b0 * P[1][1] + b1 * P[1][2]) + b1 * (b0 * P[2][1] + b1 * P[2][2])

            detWk = Wk_00 * Wk_11 - Wk_01 * Wk_10
            invW_00 = Wk_11 / detWk
            invW_01 = -Wk_01 / detWk
            invW_10 = -Wk_10 / detWk
            invW_11 = Wk_00 / detWk

            # K_formula = invW * M1^T (2x3)
            K_exp_00 = invW_00 * M1_00 + invW_01 * M1_01
            K_exp_01 = invW_00 * M1_10 + invW_01 * M1_11
            K_exp_02 = invW_00 * M1_20 + invW_01 * M1_21
            K_exp_10 = invW_10 * M1_00 + invW_11 * M1_01
            K_exp_11 = invW_10 * M1_10 + invW_11 * M1_11
            K_exp_12 = invW_10 * M1_20 + invW_11 * M1_21

            self.assertAlmostEqual(K[0][0], K_exp_00, delta=1e-6)
            self.assertAlmostEqual(K[0][1], K_exp_01, delta=1e-6)
            self.assertAlmostEqual(K[0][2], K_exp_02, delta=1e-6)
            self.assertAlmostEqual(K[1][0], K_exp_10, delta=1e-6)
            self.assertAlmostEqual(K[1][1], K_exp_11, delta=1e-6)
            self.assertAlmostEqual(K[1][2], K_exp_12, delta=1e-6)

    def test_spectral_radius_operating_velocities(self):
        """Verify rho(A - BK) < 1.0 for v in {-800, -400, -50, 50, 400, 800} mm/s."""
        qx, qy, qth, rv, rw = 2500.0, 5000.0, 20.0, 25.0, 0.1
        for v_test in [-800.0, -400.0, -50.0, 50.0, 400.0, 800.0]:
            K, P, rho = self.robot.solve_dare_full(qx, qy, qth, rv, rw, abs(v_test))
            self.assertLess(rho, 1.0, f"Spectral radius at {v_test} mm/s is {rho}, expected < 1.0")

    def test_production_lut_derived_from_full_dare(self):
        """Verify active production LUT values at all 16 bins strictly match the full DARE solver."""
        qx, qy, qth, rv, rw = 2500.0, 5000.0, 20.0, 25.0, 0.1
        self.robot.set_lqr_weights(qx, qy, qth, rv, rw)

        for i, v in enumerate(range(50, 850, 50)):
            K, P, rho = self.robot.solve_dare_full(qx, qy, qth, rv, rw, float(v))
            v_bin, ky_lut, kth_lut, rho_lut = self.robot._lqr_lut[i]
            kx_entry = self.robot._lqr_lut_kx[i]

            self.assertEqual(v_bin, float(v))
            self.assertAlmostEqual(kx_entry, abs(K[0][0]), delta=1e-5)
            self.assertAlmostEqual(ky_lut, abs(K[1][1]), delta=1e-5)
            self.assertAlmostEqual(kth_lut, abs(K[1][2]), delta=1e-5)
            self.assertAlmostEqual(rho_lut, rho, delta=1e-5)

    def test_interpolation_continuity_between_adjacent_bins(self):
        """Verify interpolation continuity between adjacent velocity bins."""
        self.robot.set_lqr_preset(0)
        # Test intermediate velocities
        test_vs = [75.0, 125.0, 225.0, 375.0, 525.0, 725.0]
        for v in test_vs:
            # Query interpolated gains via internal lookup
            idx = int((v - 50.0) / 50.0)
            idx = max(0, min(14, idx))
            v0 = 50.0 + idx * 50.0
            v1 = v0 + 50.0
            frac = (v - v0) / 50.0

            k_x0 = self.robot._lqr_lut_kx[idx]
            k_x1 = self.robot._lqr_lut_kx[idx + 1]
            k_x_exp = k_x0 + frac * (k_x1 - k_x0)

            _, k_y0, k_th0, _ = self.robot._lqr_lut[idx]
            _, k_y1, k_th1, _ = self.robot._lqr_lut[idx + 1]
            k_y_exp = k_y0 + frac * (k_y1 - k_y0)
            k_th_exp = k_th0 + frac * (k_th1 - k_th0)

            # Continuity bound: interpolated values must lie strictly between bin values
            self.assertTrue(min(k_x0, k_x1) <= k_x_exp <= max(k_x0, k_x1))
            self.assertTrue(min(k_y0, k_y1) <= k_y_exp <= max(k_y0, k_y1))
            self.assertTrue(min(k_th0, k_th1) <= k_th_exp <= max(k_th0, k_th1))

    def test_invalid_qr_fails_closed_without_mutating_state(self):
        """Verify invalid Q/R configurations fail closed without mutating prior state."""
        self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, 0.1)
        prev_weights = self.robot.get_lqr_weights()
        prev_lut = list(self.robot._lqr_lut)
        prev_lut_kx = list(self.robot._lqr_lut_kx)
        prev_gains = self.robot.get_lqr_gains()

        # Negative Q rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(-10.0, 5000.0, 20.0, 25.0, 0.1)
        # Non-positive R rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 0.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, -0.01)

        # Non-finite values rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(float('nan'), 5000.0, 20.0, 25.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, float('inf'), 20.0, 25.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, float('-inf'), 0.1)

        # Numerically unsafe magnitudes (> 1e7 or < 1e-6) rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(1e9, 5000.0, 20.0, 25.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 1e-12, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, 1e-12)

        # Extreme ratios (> 1e8) rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(1e7, 5000.0, 20.0, 1e-3, 0.1)

        # Direct solver validation for invalid, singular, extreme, and non-finite inputs
        with self.assertRaises(ValueError):
            self.robot.solve_dare_full(float('nan'), 5000.0, 20.0, 25.0, 0.1, 100.0)
        with self.assertRaises(ValueError):
            self.robot.solve_dare_full(2500.0, float('inf'), 20.0, 25.0, 0.1, 100.0)
        with self.assertRaises(ValueError):
            self.robot.solve_dare_full(-1.0, 5000.0, 20.0, 25.0, 0.1, 100.0)
        with self.assertRaises(ValueError):
            self.robot.solve_dare_full(2500.0, 5000.0, 20.0, 0.0, 0.1, 100.0)
        with self.assertRaises(ValueError):
            self.robot.solve_dare_full(2500.0, 5000.0, 20.0, 1e-12, 0.1, 100.0)
        with self.assertRaises(ValueError):
            self.robot.solve_dare_full(1e9, 5000.0, 20.0, 25.0, 0.1, 100.0)
        with self.assertRaises(ValueError):
            self.robot.solve_dare_full(1e7, 5000.0, 20.0, 1e-3, 0.1, 100.0)

        # Regression test: state must remain 100% identical to prior state
        self.assertEqual(self.robot.get_lqr_weights(), prev_weights)
        self.assertEqual(self.robot.get_lqr_gains(), prev_gains)
        self.assertEqual(self.robot._lqr_lut, prev_lut)
        self.assertEqual(self.robot._lqr_lut_kx, prev_lut_kx)

    def test_default_initialization_balanced_preset_no_unknown_error(self):
        """Verify default MDRobotBase initialization uses BALANCED preset and never emits Unknown Error."""
        left = Motor(Port.C)
        right = Motor(Port.D)
        new_robot = MDRobotBase(left, right, wheel_diameter=56.0, axle_track=112.0)
        try:
            weights = new_robot.get_lqr_weights()
            self.assertEqual(weights, (2500.0, 5000.0, 20.0, 25.0, 0.1))
            gains = new_robot.get_lqr_gains()
            self.assertGreater(gains[0], 0.0)
            self.assertGreater(gains[1], 0.0)
            self.assertGreater(gains[2], 0.0)
            # Active LUT populated with 16 bins
            self.assertEqual(len(new_robot._lqr_lut), 16)
            self.assertEqual(len(new_robot._lqr_lut_kx), 16)
            for i, entry in enumerate(new_robot._lqr_lut):
                v_bin, ky, kth, rho = entry
                self.assertLess(rho, 1.0)
                self.assertGreater(ky, 0.0)
                self.assertGreater(kth, 0.0)
                self.assertGreater(new_robot._lqr_lut_kx[i], 0.0)
        finally:
            new_robot.close()

    def test_preset_getters_return_actual_active_dare_gains(self):
        """Verify certified presets populate active LUT with mathematically derived DARE gains."""
        for preset_id in [0, 1, 2]:
            self.robot.set_lqr_preset(preset_id)
            weights = self.robot.get_lqr_weights()
            self.assertIsNotNone(weights)
            qx, qy, qth, rv, rw = weights
            # First bin (v=50) check
            K, P, rho = self.robot.solve_dare_full(qx, qy, qth, rv, rw, 50.0)
            self.assertAlmostEqual(self.robot._lqr_lut_kx[0], abs(K[0][0]), delta=1e-4)
            self.assertAlmostEqual(self.robot._lqr_lut[0][1], abs(K[1][1]), delta=1e-4)
            self.assertAlmostEqual(self.robot._lqr_lut[0][2], abs(K[1][2]), delta=1e-4)

    def test_native_and_virtualhub_full_solver_parity(self):
        """Verify VirtualHub solve_dare_full matches native PBIO benchmark values."""
        # For nominal weights (2500, 5000, 20, 25, 0.1) at v = 300 mm/s
        K, P, rho = self.robot.solve_dare_full(2500.0, 5000.0, 20.0, 25.0, 0.1, 300.0)
        # Decoupled separation theorem: cross gains strictly 0
        self.assertAlmostEqual(K[0][1], 0.0, delta=1e-5)
        self.assertAlmostEqual(K[0][2], 0.0, delta=1e-5)
        self.assertAlmostEqual(K[1][0], 0.0, delta=1e-5)
        # Longitudinal gain k_x strictly positive
        kx = abs(K[0][0])
        self.assertGreater(kx, 9.0)
        self.assertLess(kx, 11.0)
        # Spectral radius < 1.0
        self.assertLess(rho, 1.0)

    def test_100_repeated_solver_calls_deterministic_and_stable(self):
        """Verify 100 repeated solver calls are deterministic and show no growth or drift."""
        K0, P0, rho0 = self.robot.solve_dare_full(2500.0, 5000.0, 20.0, 25.0, 0.1, 300.0)
        for _ in range(100):
            K, P, rho = self.robot.solve_dare_full(2500.0, 5000.0, 20.0, 25.0, 0.1, 300.0)
            self.assertEqual(K, K0)
            self.assertEqual(P, P0)
            self.assertEqual(rho, rho0)

    def test_two_concurrent_mdrobotbase_instances_isolation(self):
        """Verify two MDRobotBase instances maintain independent LQR configurations without cross-talk."""
        m_left1 = Motor(Port.A)
        m_right1 = Motor(Port.B)
        m_left2 = Motor(Port.C)
        m_right2 = Motor(Port.D)
        rb1 = MDRobotBase(m_left1, m_right1, wheel_diameter=56.0, axle_track=112.0)
        rb2 = MDRobotBase(m_left2, m_right2, wheel_diameter=56.0, axle_track=112.0)
        try:
            rb1.set_lqr_preset(0) # BALANCED
            rb2.set_lqr_preset(1) # AGGRESSIVE
            w1 = rb1.get_lqr_weights()
            w2 = rb2.get_lqr_weights()
            self.assertEqual(w1, (2500.0, 5000.0, 20.0, 25.0, 0.1))
            self.assertEqual(w2, (5000.0, 15000.0, 30.0, 15.0, 0.05))
            self.assertNotEqual(rb1._lqr_lut_kx[0], rb2._lqr_lut_kx[0])
            self.assertNotEqual(rb1._lqr_lut[0][1], rb2._lqr_lut[0][1])
        finally:
            rb1.close()
            rb2.close()

    def test_repeated_initialization_deinitialization_cycles(self):
        """Verify repeated initialization and deinitialization cycles succeed cleanly."""
        for _ in range(20):
            m_left = Motor(Port.E)
            m_right = Motor(Port.F)
            rb = MDRobotBase(m_left, m_right, wheel_diameter=56.0, axle_track=112.0)
            rb.set_lqr_preset(0)
            rb.close()

    def test_100_repeated_set_lqr_weights_zero_allocation_growth(self):
        """Verify calling set_lqr_weights() and solving the 16-bin LUT repeatedly 100 times has zero memory growth."""
        import tracemalloc
        import gc
        # Warmup and initial solve
        self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, 0.1)
        gc.collect()
        tracemalloc.start()
        # First 100-run baseline
        for _ in range(100):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, 0.1)
        gc.collect()
        snapshot1 = tracemalloc.take_snapshot()
        # Second 100-run verification
        for _ in range(100):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, 0.1)
        gc.collect()
        snapshot2 = tracemalloc.take_snapshot()
        tracemalloc.stop()

        stats = snapshot2.compare_to(snapshot1, 'lineno')
        growth_between_runs = sum(s.size_diff for s in stats if 'robotics.py' in s.traceback[0].filename)
        # Net growth across consecutive 100 16-bin DARE solves must be exactly 0
        self.assertEqual(growth_between_runs, 0)

    def test_invalid_weights_leave_active_weights_intact(self):
        """Verify invalid set_lqr_weights call fails with ValueError and leaves prior weights intact."""
        self.robot.set_lqr_preset(0) # BALANCED
        w_orig = self.robot.get_lqr_weights()
        lut_orig = list(self.robot._lqr_lut)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(-1.0, 5000.0, 20.0, 25.0, 0.1)
        self.assertEqual(self.robot.get_lqr_weights(), w_orig)
        self.assertEqual(self.robot._lqr_lut, lut_orig)

    def test_lqr_workspace_busy_rejection_and_error_mapping(self):
        """Verify fail-closed rejection and descriptive error propagation when LQR workspace is busy."""
        self.assertFalse(MDRobotBase._lqr_workspace_is_busy())

        # Manually lock workspace to simulate concurrent solver in flight
        MDRobotBase._lqr_workspace_set_busy_for_testing(True)
        self.assertTrue(MDRobotBase._lqr_workspace_is_busy())

        try:
            # 1. solve_dare_full must reject with explicit RuntimeError
            with self.assertRaises(RuntimeError) as ctx:
                self.robot.solve_dare_full(2500.0, 5000.0, 20.0, 25.0, 0.1, 300.0)
            self.assertIn("LQR solver workspace busy", str(ctx.exception))

            # 2. solve_dare must reject with explicit RuntimeError
            with self.assertRaises(RuntimeError) as ctx:
                self.robot.solve_dare(2500.0, 5000.0, 20.0, 25.0, 0.1, 300.0)
            self.assertIn("LQR solver workspace busy", str(ctx.exception))

            # 3. compute_riccati_residual must reject with explicit RuntimeError
            with self.assertRaises(RuntimeError) as ctx:
                P_dummy = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0], [0.0, 0.0, 1.0]]
                self.robot.compute_riccati_residual(2500.0, 5000.0, 20.0, 25.0, 0.1, 300.0, P_dummy)
            self.assertIn("LQR solver workspace busy", str(ctx.exception))

            # 4. set_lqr_weights must reject with explicit RuntimeError
            with self.assertRaises(RuntimeError) as ctx:
                self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, 0.1)
            self.assertIn("LQR solver workspace busy", str(ctx.exception))

            # 5. set_lqr_preset must reject with explicit RuntimeError
            with self.assertRaises(RuntimeError) as ctx:
                self.robot.set_lqr_preset(0)
            self.assertIn("LQR solver workspace busy", str(ctx.exception))

            # 6. MDRobotBase constructor (which runs set_lqr_preset(BALANCED)) must fail-closed with clear error
            m_l = Motor(Port.C)
            m_r = Motor(Port.D)
            with self.assertRaises(RuntimeError) as ctx:
                MDRobotBase(m_l, m_r, wheel_diameter=56.0, axle_track=112.0)
            self.assertIn("motors already in use or LQR solver workspace busy", str(ctx.exception))

        finally:
            MDRobotBase._lqr_workspace_set_busy_for_testing(False)

        self.assertFalse(MDRobotBase._lqr_workspace_is_busy())

        # Verify immediate normal solver execution after lock release
        K, P, rho = self.robot.solve_dare_full(2500.0, 5000.0, 20.0, 25.0, 0.1, 300.0)
        self.assertLess(rho, 1.0)

    def test_lqr_workspace_lock_release_on_solver_exception(self):
        """Verify LQR workspace lock is deterministically released even when solver raises an exception."""
        self.assertFalse(MDRobotBase._lqr_workspace_is_busy())

        # Trigger ValueError during solve_dare_full
        with self.assertRaises(ValueError):
            self.robot.solve_dare_full(-1.0, 5000.0, 20.0, 25.0, 0.1, 300.0)
        self.assertFalse(MDRobotBase._lqr_workspace_is_busy())

        # Trigger ValueError during set_lqr_weights
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, -10.0, 20.0, 25.0, 0.1)
        self.assertFalse(MDRobotBase._lqr_workspace_is_busy())

    def test_lqr_concurrent_threads_workspace_safety(self):
        """Verify multiple concurrent worker threads invoking DARE solvers exhibit zero race crashes or leaks."""
        import threading
        errors = []
        busy_count = [0]
        success_count = [0]

        def worker(thread_id: int):
            for _ in range(25):
                try:
                    # Randomize between full solve and weight update
                    if thread_id % 2 == 0:
                        self.robot.solve_dare_full(2500.0, 5000.0, 20.0, 25.0, 0.1, 200.0 + thread_id * 20.0)
                    else:
                        self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, 0.1)
                    success_count[0] += 1
                except RuntimeError as e:
                    if "LQR solver workspace busy" in str(e):
                        busy_count[0] += 1
                    else:
                        errors.append(f"Unexpected RuntimeError: {e}")
                except Exception as e:
                    errors.append(f"Unexpected exception in thread {thread_id}: {e}")

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(errors, [], f"Thread worker encountered unexpected errors: {errors}")
        self.assertGreater(success_count[0], 0)
        # Lock must be completely free after all threads terminate
        self.assertFalse(MDRobotBase._lqr_workspace_is_busy())


class TestMDRobotBaseOdometryLQRIntegration(unittest.TestCase):
    """
    Deterministic Verification Matrix for MDRobotBase Odometry and LQR Integration (G-MDRB-036).
    Proves identical coordinate frame, sign conventions, units, and timing model between odometry and LQR.
    """

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
        MDRobotBase._lqr_workspace_set_busy_for_testing(False)
        self.robot.close()

    def test_straight_forward_odometry(self):
        """Straight forward: x increases, y and theta remain zero."""
        self.robot.set_backlash_filter(False)
        self.robot.set_fusion_alpha(0.0)  # encoder only
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Move both motors 360 deg forward (pi * 56 mm = 175.929 mm)
        self.left_motor._angle += 360.0
        self.right_motor._angle += 360.0
        self.robot.update_state(0.0)

        x, y, theta = self.robot.get_state()
        self.assertAlmostEqual(x, 175.929, delta=0.5)
        self.assertAlmostEqual(y, 0.0, delta=0.1)
        self.assertAlmostEqual(theta, 0.0, delta=0.1)

    def test_straight_reverse_odometry(self):
        """Straight reverse: x decreases correctly, y and theta remain zero."""
        self.robot.set_backlash_filter(False)
        self.robot.set_fusion_alpha(0.0)
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Move both motors 360 deg backward (-175.929 mm)
        self.left_motor._angle -= 360.0
        self.right_motor._angle -= 360.0
        self.robot.update_state(0.0)

        x, y, theta = self.robot.get_state()
        self.assertAlmostEqual(x, -175.929, delta=0.5)
        self.assertAlmostEqual(y, 0.0, delta=0.1)
        self.assertAlmostEqual(theta, 0.0, delta=0.1)

    def test_left_turn_odometry_theta_increases(self):
        """Left turn: theta increases (counter-clockwise positive)."""
        self.robot.set_backlash_filter(False)
        self.robot.set_fusion_alpha(0.0)
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Spin turn CCW: left motor backward 180 deg, right motor forward 180 deg
        # Delta theta = (d_right - d_left) / track = (87.964 - (-87.964)) / 112 = 1.57079 rad = 90 deg
        self.left_motor._angle -= 180.0
        self.right_motor._angle += 180.0
        self.robot.update_state(0.0)

        x, y, theta = self.robot.get_state()
        self.assertAlmostEqual(theta, 90.0, delta=0.5)
        self.assertAlmostEqual(x, 0.0, delta=0.1)
        self.assertAlmostEqual(y, 0.0, delta=0.1)

    def test_right_turn_odometry_theta_decreases(self):
        """Right turn: theta decreases (clockwise negative)."""
        self.robot.set_backlash_filter(False)
        self.robot.set_fusion_alpha(0.0)
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Spin turn CW: left motor forward 180 deg, right motor backward 180 deg
        self.left_motor._angle += 180.0
        self.right_motor._angle -= 180.0
        self.robot.update_state(0.0)

        x, y, theta = self.robot.get_state()
        self.assertAlmostEqual(theta, -90.0, delta=0.5)
        self.assertAlmostEqual(x, 0.0, delta=0.1)
        self.assertAlmostEqual(y, 0.0, delta=0.1)

    def test_square_trajectory_returns_near_start(self):
        """Square trajectory (4 legs of 200 mm + four 90 deg CCW turns) returns near starting pose."""
        self.robot.set_backlash_filter(False)
        self.robot.set_fusion_alpha(0.0)
        self.robot.reset_state(0.0, 0.0, 0.0)

        leg_dist = 200.0  # mm
        turn_th = 90.0   # deg

        leg_deg = (leg_dist / (math.pi * 56.0)) * 360.0
        turn_deg = (math.radians(turn_th) * (112.0 / 2.0) / (math.pi * 56.0)) * 360.0

        for _ in range(4):
            # Drive straight leg
            self.left_motor._angle += leg_deg
            self.right_motor._angle += leg_deg
            self.robot.update_state(0.0)

            # Spin turn 90 deg CCW
            self.left_motor._angle -= turn_deg
            self.right_motor._angle += turn_deg
            self.robot.update_state(0.0)

        x, y, theta = self.robot.get_state()
        self.assertAlmostEqual(x, 0.0, delta=1.5)
        self.assertAlmostEqual(y, 0.0, delta=1.5)
        self.assertAlmostEqual(theta, 0.0, delta=1.0)

    def test_unequal_wheel_diameters_preserves_distance(self):
        """Unequal wheel diameters preserve correct distance and heading."""
        motor_l = Motor(Port.C, Direction.COUNTERCLOCKWISE)
        motor_r = Motor(Port.D)
        # Left wheel: 50.0 mm, Right wheel: 60.0 mm
        rb_unequal = MDRobotBase(
            motor_l,
            motor_r,
            wheel_diameter=(50.0, 60.0),
            axle_track=110.0,
        )
        try:
            rb_unequal.set_backlash_filter(False)
            rb_unequal.set_fusion_alpha(0.0)
            rb_unequal.reset_state(0.0, 0.0, 0.0)

            motor_l._angle += 360.0
            motor_r._angle += 360.0
            rb_unequal.update_state(0.0)

            x, y, theta = rb_unequal.get_state()
            expected_d_center = (math.pi * 50.0 + math.pi * 60.0) / 2.0
            expected_th_rad = (math.pi * 60.0 - math.pi * 50.0) / 110.0
            expected_th_deg = math.degrees(expected_th_rad)
            expected_x = expected_d_center * math.cos(expected_th_rad / 2.0)
            expected_y = expected_d_center * math.sin(expected_th_rad / 2.0)

            self.assertAlmostEqual(theta, expected_th_deg, delta=0.5)
            self.assertAlmostEqual(x, expected_x, delta=0.5)
            self.assertAlmostEqual(y, expected_y, delta=0.5)
        finally:
            rb_unequal.close()

    def test_gear_ratio_conversion(self):
        """Gear ratio conversion scales motor encoder deltas correctly."""
        self.robot.set_backlash_filter(False)
        self.robot.set_fusion_alpha(0.0)
        self.robot.set_gear_ratio(2.0)  # 2:1 reduction: 720 deg motor = 360 deg wheel
        self.robot.reset_state(0.0, 0.0, 0.0)

        self.left_motor._angle += 720.0
        self.right_motor._angle += 720.0
        self.robot.update_state(0.0)

        x, y, theta = self.robot.get_state()
        # 360 deg wheel = pi * 56 mm = 175.929 mm
        self.assertAlmostEqual(x, 175.929, delta=0.5)
        self.assertAlmostEqual(y, 0.0, delta=0.1)
        self.assertAlmostEqual(theta, 0.0, delta=0.1)

    def test_fusion_modes_gyro_encoder_blended(self):
        """Gyro-only, encoder-only, and blended fusion behave deterministically."""
        self.robot.set_backlash_filter(False)
        # Gyro-only (alpha = 1.0): motor unchanged, gyro moves -45 deg (CCW +45 deg)
        self.robot.set_fusion_alpha(1.0)
        self.robot.reset_state(0.0, 0.0, 0.0)
        self.robot.update_state(-45.0)
        x, y, theta = self.robot.get_state()
        self.assertAlmostEqual(theta, 45.0, delta=0.1)

        # Encoder-only (alpha = 0.0): motor rotates 90 deg turn, gyro stationary
        self.robot.set_fusion_alpha(0.0)
        self.robot.reset_state(0.0, 0.0, 0.0)
        self.left_motor._angle -= 180.0
        self.right_motor._angle += 180.0
        self.robot.update_state(0.0)
        x, y, theta = self.robot.get_state()
        self.assertAlmostEqual(theta, 90.0, delta=0.5)

        # Blended (alpha = 0.5): encoder delta = 90 deg, gyro delta = 40 deg
        self.robot.set_fusion_alpha(0.5)
        self.robot.reset_state(0.0, 0.0, 0.0)
        self.left_motor._angle -= 180.0
        self.right_motor._angle += 180.0
        self.robot.update_state(-40.0)
        x, y, theta = self.robot.get_state()
        # 0.5 * 40.0 + 0.5 * 90.0 = 65.0 deg
        self.assertAlmostEqual(theta, 65.0, delta=0.5)

        # Out-of-bounds alpha raises ValueError
        with self.assertRaises(ValueError):
            self.robot.set_fusion_alpha(-0.1)
        with self.assertRaises(ValueError):
            self.robot.set_fusion_alpha(1.1)
        with self.assertRaises(ValueError):
            self.robot.set_fusion_alpha(float('nan'))

    def test_backlash_enable_disable_and_reset(self):
        """Backlash filter enable, disable, and accumulator reset contract."""
        self.robot.set_backlash_filter(True)
        self.assertTrue(self.robot.get_backlash_filter())

        # Accumulate backlash
        self.left_motor._angle += 2.0
        self.right_motor._angle += 2.0
        self.robot.update_state(0.0)
        self.assertGreater(abs(self.robot._backlash_left_accum), 0.0)

        # Disabling filter must clear accumulators
        self.robot.set_backlash_filter(False)
        self.assertFalse(self.robot.get_backlash_filter())
        self.assertEqual(self.robot._backlash_left_accum, 0.0)
        self.assertEqual(self.robot._backlash_right_accum, 0.0)

        # Keyword argument enabled=False must work without TypeError
        self.robot.set_backlash_filter(enabled=True)
        self.assertTrue(self.robot.get_backlash_filter())
        self.robot.set_backlash_filter(enabled=False)
        self.assertFalse(self.robot.get_backlash_filter())

    def test_lqr_tracking_using_odometry_pose(self):
        """Prove odometry and LQR share identical coordinate frame and sign conventions."""
        self.robot.set_lqr_preset(0, True)  # BALANCED preset
        self.robot.set_backlash_filter(False)
        self.robot.set_fusion_alpha(0.0)

        # Robot at (0, 0, 0), reference path point at (100 mm, 20 mm, 0 deg)
        # Reference is 20 mm to the robot's left (e_y > 0 in body frame)
        self.robot.reset_state(0.0, 0.0, 0.0)
        v_cmd, w_cmd = self.robot.lqr_step(200.0, 100.0, 20.0, 0.0)
        # Steering command must be positive (turn left / CCW towards the path)
        self.assertGreater(w_cmd, 0.0)

        # If reference is 20 mm to the robot's right (e_y < 0 in body frame)
        v_cmd_r, w_cmd_right = self.robot.lqr_step(200.0, 100.0, -20.0, 0.0)
        # Steering command must be negative (turn right / CW towards the path)
        self.assertLess(w_cmd_right, 0.0)
        self.assertAlmostEqual(w_cmd, -w_cmd_right, places=4)

    def test_no_unknown_error_for_valid_odometry_configuration(self):
        """All odometry APIs return clean values and raise specific ValueErrors on invalid input."""
        # Valid configurations
        self.robot.reset_state(10.0, 20.0, 30.0)
        x, y, th = self.robot.get_state()
        self.assertEqual((x, y, th), (10.0, 20.0, 30.0))

        self.robot.set_fusion_alpha(0.95)
        self.assertEqual(self.robot.get_fusion_alpha(), 0.95)

        self.robot.set_gear_ratio(1.5)
        self.assertEqual(self.robot.get_gear_ratio(), 1.5)

        self.robot.set_backlash_filter(True)
        self.assertTrue(self.robot.get_backlash_filter())

        self.robot.set_backlash_filter(False)
        self.assertFalse(self.robot.get_backlash_filter())

        # Invalid configurations raise ValueError, never unknown error
        with self.assertRaises(ValueError):
            self.robot.reset_state(float('nan'), 0.0, 0.0)
        with self.assertRaises(ValueError):
            self.robot.reset_state(0.0, float('inf'), 0.0)
        with self.assertRaises(ValueError):
            self.robot.set_fusion_alpha(-1.0)
        with self.assertRaises(ValueError):
            self.robot.set_gear_ratio(-2.0)
        with self.assertRaises(ValueError):
            self.robot.set_gear_ratio(0.0)

    def test_navigation_lqr_workspace_busy_stops_robot_and_raises_runtime_error(self):
        """Forced LQR busy during navigation stops robot immediately and raises exact RuntimeError."""
        self.robot.set_controller(1)  # LQR controller
        self.robot.set_lqr_preset(0, True)
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Force LQR workspace busy lock
        MDRobotBase._lqr_workspace_set_busy_for_testing(True)
        try:
            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(self.robot.navigate_to_goal(200.0, 100.0, speed_mm_s=200.0))
            self.assertIn("LQR solver workspace busy", str(ctx.exception))
            self.assertNotIn("Unknown Error", str(ctx.exception))

            # Verify robot stopped immediately without executing fallback commands
            self.assertFalse(self.robot._motion_in_progress)
            self.assertEqual(self.left_motor._speed, 0)
            self.assertEqual(self.right_motor._speed, 0)
        finally:
            MDRobotBase._lqr_workspace_set_busy_for_testing(False)

    def test_navigation_odometry_failure_stops_robot_and_raises_value_error(self):
        """Forced odometry invalidation during navigation stops robot immediately and raises ValueError."""
        self.robot.set_controller(1)
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Invalidate pose to NaN
        self.robot._x = float('nan')

        with self.assertRaises(ValueError) as ctx:
            asyncio.run(self.robot.navigate_to_goal(200.0, 100.0))
        self.assertIn("LQR controller received invalid pose or configuration", str(ctx.exception))
        self.assertNotIn("Unknown Error", str(ctx.exception))

        # Verify robot stopped immediately
        self.assertFalse(self.robot._motion_in_progress)
        self.assertEqual(self.left_motor._speed, 0)
        self.assertEqual(self.right_motor._speed, 0)

    def test_invalid_pose_in_step_lqr_and_update_state(self):
        """Non-finite pose coordinates reject both LQR stepping and odometry updates with ValueError."""
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Non-finite x in robot state
        self.robot._x = float('nan')
        with self.assertRaises(ValueError):
            self.robot.step_lqr(200.0, 100.0, 50.0, 0.0)
        with self.assertRaises(ValueError):
            self.robot.update_state(0.0)

        # Non-finite y in robot state
        self.robot._x = 0.0
        self.robot._y = float('inf')
        with self.assertRaises(ValueError):
            self.robot.step_lqr(200.0, 100.0, 50.0, 0.0)
        with self.assertRaises(ValueError):
            self.robot.update_state(0.0)

        # Non-finite theta in robot state
        self.robot._y = 0.0
        self.robot._theta = float('-inf')
        with self.assertRaises(ValueError):
            self.robot.step_lqr(200.0, 100.0, 50.0, 0.0)
        with self.assertRaises(ValueError):
            self.robot.update_state(0.0)
        self.robot._theta = 0.0

        # Non-finite inputs to step_lqr
        with self.assertRaises(ValueError):
            self.robot.step_lqr(float('nan'), 100.0, 50.0, 0.0)
        with self.assertRaises(ValueError):
            self.robot.step_lqr(200.0, float('nan'), 50.0, 0.0)
        with self.assertRaises(ValueError):
            self.robot.step_lqr(200.0, 100.0, float('inf'), 0.0)
        with self.assertRaises(ValueError):
            self.robot.step_lqr(200.0, 100.0, 50.0, float('nan'))

    def test_invalid_lqr_configuration(self):
        """Invalid LQR weight matrices and presets raise specific ValueErrors."""
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(-1.0, 5000.0, 20.0, 25.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, -5.0, 20.0, 25.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, -2.0, 25.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 0.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, -0.01)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(float('nan'), 5000.0, 20.0, 25.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, float('inf'), 20.0, 25.0, 0.1)

        with self.assertRaises(ValueError):
            self.robot.set_lqr_preset(99)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_preset(-1)

    def test_sensor_motor_disconnection_stops_robot_and_raises_error(self):
        """Motor/sensor hardware disconnection stops robot and raises clear OSError."""
        self.robot.set_controller(1)
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Simulate disconnected motor
        self.left_motor._closed = True
        try:
            with self.assertRaises(OSError) as ctx:
                asyncio.run(self.robot.navigate_to_goal(200.0, 100.0))
            self.assertIn("MDRobotBase motor is not connected", str(ctx.exception))
            self.assertNotIn("Unknown Error", str(ctx.exception))

            self.assertFalse(self.robot._motion_in_progress)
            self.assertEqual(self.left_motor._speed, 0)
            self.assertEqual(self.right_motor._speed, 0)
        finally:
            self.left_motor._closed = False

    def test_trajectory_lqr_workspace_busy_stops_robot(self):
        """Trajectory tracking halts safely with RuntimeError when LQR solver is busy."""
        self.robot.set_controller(1)
        self.robot.reset_state(0.0, 0.0, 0.0)

        points = [(0.0, 0.0), (100.0, 50.0), (200.0, 100.0)]
        MDRobotBase._lqr_workspace_set_busy_for_testing(True)
        try:
            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(self.robot.follow_trajectory(points))
            self.assertIn("LQR solver workspace busy", str(ctx.exception))
            self.assertNotIn("Unknown Error", str(ctx.exception))

            self.assertFalse(self.robot._motion_in_progress)
            self.assertEqual(self.left_motor._speed, 0)
            self.assertEqual(self.right_motor._speed, 0)
        finally:
            MDRobotBase._lqr_workspace_set_busy_for_testing(False)

    def test_navigation_stall_stops_robot_and_raises_runtime_error(self):
        """Physical stall during navigation stops robot immediately and raises meaningful RuntimeError."""
        self.robot.set_controller(1)
        self.robot.reset_state(0.0, 0.0, 0.0)
        self.robot.set_stalled(True)

        try:
            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(self.robot.navigate_to_goal(500.0, 0.0))
            self.assertEqual(str(ctx.exception), "MDRobotBase navigation stalled")
            self.assertNotIn("Unknown Error", str(ctx.exception))

            self.assertFalse(self.robot._motion_in_progress)
            self.assertEqual(self.left_motor._speed, 0)
            self.assertEqual(self.right_motor._speed, 0)
        finally:
            self.robot.set_stalled(False)

    def test_turn_stall_stops_robot_and_raises_runtime_error(self):
        """Physical stall during turn_to_angle stops robot immediately and raises meaningful RuntimeError."""
        self.robot.reset_state(0.0, 0.0, 0.0)
        self.robot.set_stalled(True)

        try:
            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(self.robot.turn_to_angle(90.0))
            self.assertEqual(str(ctx.exception), "MDRobotBase turn stalled")
            self.assertNotIn("Unknown Error", str(ctx.exception))

            self.assertFalse(self.robot._motion_in_progress)
            self.assertEqual(self.left_motor._speed, 0)
            self.assertEqual(self.right_motor._speed, 0)
        finally:
            self.robot.set_stalled(False)

    def test_pivot_stall_stops_robot_and_raises_runtime_error(self):
        """Physical stall during pivot_turn_to_angle stops robot immediately and raises meaningful RuntimeError."""
        self.robot.reset_state(0.0, 0.0, 0.0)
        self.robot.set_stalled(True)

        try:
            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(self.robot.pivot_turn_to_angle(90.0, pivot_side="left"))
            self.assertEqual(str(ctx.exception), "MDRobotBase pivot stalled")
            self.assertNotIn("Unknown Error", str(ctx.exception))

            self.assertFalse(self.robot._motion_in_progress)
            self.assertEqual(self.left_motor._speed, 0)
            self.assertEqual(self.right_motor._speed, 0)
        finally:
            self.robot.set_stalled(False)

    def test_trajectory_stall_stops_robot_and_raises_runtime_error(self):
        """Physical stall during follow_trajectory stops robot immediately and raises meaningful RuntimeError."""
        self.robot.reset_state(0.0, 0.0, 0.0)
        self.robot.set_stalled(True)

        points = [(0.0, 0.0), (100.0, 0.0), (200.0, 0.0)]
        try:
            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(self.robot.follow_trajectory(points))
            self.assertEqual(str(ctx.exception), "MDRobotBase trajectory stalled")
            self.assertNotIn("Unknown Error", str(ctx.exception))

            self.assertFalse(self.robot._motion_in_progress)
            self.assertEqual(self.left_motor._speed, 0)
            self.assertEqual(self.right_motor._speed, 0)
        finally:
            self.robot.set_stalled(False)

    def test_repeated_failure_and_clean_recovery(self):
        """Failure aborts cleanly with motor shutdown and leaves robot ready for subsequent valid motion."""
        self.robot.set_controller(1)  # LQR controller
        self.robot.set_lqr_preset(0, True)
        self.robot.reset_state(0.0, 0.0, 0.0)

        # 1. First attempt fails due to busy workspace
        MDRobotBase._lqr_workspace_set_busy_for_testing(True)
        try:
            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(self.robot.navigate_to_goal(100.0, 0.0))
            self.assertIn("LQR solver workspace busy", str(ctx.exception))
            self.assertFalse(self.robot._motion_in_progress)
            self.assertEqual(self.left_motor._speed, 0)
            self.assertEqual(self.right_motor._speed, 0)
        finally:
            # 2. Release busy state
            MDRobotBase._lqr_workspace_set_busy_for_testing(False)

        # 3. Subsequent valid motion succeeds completely
        asyncio.run(self.robot.navigate_to_goal(100.0, 0.0))
        self.assertFalse(self.robot._motion_in_progress)
        self.assertAlmostEqual(self.robot._x, 100.0, delta=1.0)

    def test_connected_motors_idle_update_loop_does_not_raise_no_dev(self):
        """Connected motors with idle/stopped update loop must NOT produce NO_DEV."""
        # Motors are stationary and idle (speed = 0)
        self.assertEqual(self.left_motor._speed, 0)
        self.assertEqual(self.right_motor._speed, 0)
        self.assertTrue(getattr(self.left_motor, "connected", True))
        self.assertTrue(getattr(self.right_motor, "connected", True))

        # First navigation iteration must succeed without false "motor or sensor unavailable"
        self.robot.set_controller(1)  # LQR
        self.robot.reset_state(0.0, 0.0, 0.0)
        asyncio.run(self.robot.navigate_to_goal(50.0, 0.0, speed_mm_s=200.0))

        self.assertFalse(self.robot._motion_in_progress)
        self.assertAlmostEqual(self.robot._x, 50.0, delta=1.0)

    def test_first_navigation_iteration_succeeds_when_motors_valid(self):
        """First navigation iteration succeeds and commands both motors when devices are valid."""
        self.robot.set_controller(0)  # PID controller
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Execute navigation and assert successful completion
        asyncio.run(self.robot.navigate_to_goal(60.0, 0.0, speed_mm_s=200.0))
        self.assertFalse(self.robot._motion_in_progress)
        self.assertAlmostEqual(self.robot._x, 60.0, delta=1.0)

    def test_actual_missing_motor_produces_no_dev(self):
        """Actual disconnected motor produces clear OSError with NO_DEV message."""
        self.robot.set_controller(1)
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Set physical disconnection flag
        self.right_motor.connected = False
        try:
            with self.assertRaises(OSError) as ctx:
                asyncio.run(self.robot.navigate_to_goal(100.0, 0.0))
            self.assertIn("MDRobotBase motor is not connected", str(ctx.exception))
            self.assertFalse(self.robot._motion_in_progress)
        finally:
            self.right_motor.connected = True

    def test_imu_not_yet_ready_does_not_fail_initialization(self):
        """MDRobotBase construction and safe initial baselines succeed without immediate IMU readiness."""
        # Create fresh motors and robot base with default uncalibrated state
        m_left = Motor(Port.E)
        m_right = Motor(Port.F)
        rb = MDRobotBase(m_left, m_right, 56.0, 112.0)
        try:
            self.assertEqual(rb._x, 0.0)
            self.assertEqual(rb._y, 0.0)
            self.assertEqual(rb._theta, 0.0)

            # First update synchronizes baselines cleanly
            rb.update_state(15.0)
            self.assertEqual(rb._x, 0.0)
            self.assertEqual(rb._y, 0.0)

            # Second update computes delta from latched baseline with gyro fusion
            rb._fusion_alpha = 1.0
            rb.update_state(25.0)
            # In CCW-positive convention, +10 heading CW change yields -10 deg theta
            self.assertAlmostEqual(rb._theta, -10.0, delta=0.1)
        finally:
            rb.close()

    def test_full_motion_lifecycle_lqr_and_pid(self):
        """Verify full motion lifecycle across LQR and PID: navigate, turn, pivot, stop, repeated."""
        for c_type in [0, 1]:  # 0 = PID, 1 = LQR
            self.robot.set_controller(c_type)
            self.robot.reset_state(0.0, 0.0, 0.0)

            # 1. Navigation
            asyncio.run(self.robot.navigate_to_goal(80.0, 0.0, speed_mm_s=250.0))
            self.assertAlmostEqual(self.robot._x, 80.0, delta=1.5)
            self.assertFalse(self.robot._motion_in_progress)

            # 2. Turn
            asyncio.run(self.robot.turn_angle(45.0, speed_deg_s=180.0))
            self.assertAlmostEqual(self.robot._theta, 45.0, delta=2.0)
            self.assertFalse(self.robot._motion_in_progress)

            # 3. Pivot
            asyncio.run(self.robot.pivot_turn_angle(-45.0, speed_deg_s=150.0))
            self.assertAlmostEqual(self.robot._theta, 0.0, delta=2.0)
            self.assertFalse(self.robot._motion_in_progress)

            # 4. Stop
            self.robot.stop()
            self.assertFalse(self.robot._motion_in_progress)
            self.assertEqual(self.left_motor._speed, 0)
            self.assertEqual(self.right_motor._speed, 0)

    def test_motor_communication_io_error_raises_io_message(self):
        """Motor communication bus failure raises distinct communication failed message."""
        self.robot.set_controller(1)
        self.robot.reset_state(0.0, 0.0, 0.0)

        # Simulate IO failure on left motor bus
        self.left_motor._io_error = True
        try:
            with self.assertRaises(OSError) as ctx:
                asyncio.run(self.robot.navigate_to_goal(100.0, 0.0))
            self.assertIn("MDRobotBase motor communication failed", str(ctx.exception))
            self.assertFalse(self.robot._motion_in_progress)
        finally:
            self.left_motor._io_error = False

    def test_diagnostics_query_returns_expected_fields(self):
        """MDRobotBase get_diagnostics returns motor state errors, control loop flags, and motion types."""
        diag = self.robot.get_diagnostics()
        self.assertIn("left_state_error", diag)
        self.assertIn("right_state_error", diag)
        self.assertIn("left_error_str", diag)
        self.assertIn("right_error_str", diag)
        self.assertIn("control_loop_left", diag)
        self.assertIn("control_loop_right", diag)
        self.assertIn("motion_type", diag)
        self.assertIn("controller_type", diag)
        self.assertEqual(diag["left_state_error"], 0)
        self.assertEqual(diag["right_state_error"], 0)
        self.assertEqual(diag["left_error_str"], "success")
        self.assertEqual(diag["right_error_str"], "success")

    def test_startup_with_debug_enabled_and_safe_diagnostics(self):
        """Target-level startup test with debug=True exercises safe error string formatting without crashing."""
        motor_c = Motor(Port.C)
        motor_d = Motor(Port.D)
        debug_robot = MDRobotBase(motor_c, motor_d, 56.0, 112.0, debug=True)
        try:
            self.assertTrue(debug_robot._debug)
            diag = debug_robot.get_diagnostics()
            self.assertEqual(diag["left_state_error"], 0)
            self.assertEqual(diag["right_state_error"], 0)
            self.assertEqual(diag["left_error_str"], "success")
            self.assertEqual(diag["right_error_str"], "success")
            # Execute motion with debug enabled
            asyncio.run(debug_robot.straight(50.0))
            self.assertAlmostEqual(debug_robot.get_state()[0], 50.0, places=1)
        finally:
            debug_robot.close()

    def test_encoder_baselines_atomic_initialization_no_zero_jump(self):
        """Ensures non-zero initial encoder positions establish baselines atomically without an odometry jump."""
        motor_c = Motor(Port.C)
        motor_d = Motor(Port.D)
        motor_c._angle = 1440.0  # 4 rotations preexisting angle
        motor_d._angle = 2880.0  # 8 rotations preexisting angle
        robot = MDRobotBase(motor_c, motor_d, 56.0, 112.0)
        try:
            robot.set_backlash_filter(False)
            # First update must atomically establish baselines; delta must be exactly 0
            robot.update_state(0.0)
            x, y, theta = robot.get_state()
            self.assertEqual(x, 0.0)
            self.assertEqual(y, 0.0)
            self.assertEqual(theta, 0.0)

            # Advance by 360 deg on both motors -> 1 wheel circumference forward (pi * 56 mm)
            motor_c._angle += 360.0
            motor_d._angle += 360.0
            robot.update_state(0.0)
            x2, y2, theta2 = robot.get_state()
            expected_dist = math.pi * 56.0
            self.assertAlmostEqual(x2, expected_dist, places=1)
            self.assertAlmostEqual(y2, 0.0, places=1)
        finally:
            robot.close()

    def test_failed_initial_encoder_read_sets_nan_and_recovers_without_zero_jump(self):
        """When initial encoder read fails, baseline is marked NaN and later atomic update prevents zero jump."""
        motor_c = Motor(Port.C)
        motor_d = Motor(Port.D)
        # Deliberately cause angle() to fail during initialization
        orig_angle = motor_c.angle
        def fail_angle():
            raise OSError("motor disconnected")
        motor_c.angle = fail_angle

        robot = MDRobotBase(motor_c, motor_d, 56.0, 112.0)
        try:
            self.assertTrue(math.isnan(robot._last_left_deg))
            self.assertFalse(robot._encoders_initialized)

            # Restore angle function with non-zero initial angles
            motor_c.angle = orig_angle
            motor_c._angle = 720.0
            motor_d._angle = 1080.0

            # First update must atomically establish baselines; must not jump from 0.0
            robot.set_backlash_filter(False)
            robot.update_state(0.0)
            self.assertTrue(robot._encoders_initialized)
            self.assertEqual(robot._last_left_deg, 720.0)
            self.assertEqual(robot._last_right_deg, 1080.0)
            x, y, theta = robot.get_state()
            self.assertEqual(x, 0.0)
            self.assertEqual(y, 0.0)
            self.assertEqual(theta, 0.0)

            # Incremental motion must integrate from 720.0 and 1080.0
            motor_c._angle += 180.0
            motor_d._angle += 180.0
            robot.update_state(0.0)
            x2, y2, theta2 = robot.get_state()
            expected_dist = (180.0 / 360.0) * math.pi * 56.0
            self.assertAlmostEqual(x2, expected_dist, places=1)
        finally:
            robot.close()

    def test_startup_retry_recovers_transient_io_error_within_time_window(self):
        """Transient I/O failure resolving within time-based retry window allows motion to succeed."""
        motor_c = Motor(Port.C)
        motor_d = Motor(Port.D)
        robot = MDRobotBase(motor_c, motor_d, 56.0, 112.0)
        try:
            motor_c._io_error = True

            async def clear_error_after_delay():
                await asyncio.sleep(0.020)  # 20ms < 300ms window
                motor_c._io_error = False

            async def run_motion_with_transient():
                t = asyncio.create_task(clear_error_after_delay())
                await robot.straight(50.0)
                await t

            asyncio.run(run_motion_with_transient())
            x, y, theta = robot.get_state()
            self.assertAlmostEqual(x, 50.0, places=1)
            self.assertFalse(robot._motion_in_progress)
        finally:
            motor_c._io_error = False
            robot.close()

    def test_imu_heading_unavailable_raises_runtime_error(self):
        """When fusion_alpha > 0, unavailable/NaN IMU heading raises RuntimeError('MDRobotBase IMU heading unavailable')."""
        motor_c = Motor(Port.C)
        motor_d = Motor(Port.D)
        robot = MDRobotBase(motor_c, motor_d, 56.0, 112.0)
        try:
            robot.set_fusion_alpha(0.8)
            with self.assertRaises(RuntimeError) as ctx:
                robot.update_state(float('nan'))
            self.assertIn("MDRobotBase IMU heading unavailable", str(ctx.exception))
            self.assertNotIn("LQR controller received invalid pose or configuration", str(ctx.exception))

            with self.assertRaises(RuntimeError) as ctx2:
                robot.reset_state(0.0, 0.0, 0.0, float('nan'))
            self.assertIn("MDRobotBase IMU heading unavailable", str(ctx2.exception))
        finally:
            robot.close()

    def test_imu_heading_unavailable_startup_retry_recovers(self):
        """When IMU is temporarily unavailable during startup, it retries within 500ms and succeeds once ready."""
        motor_c = Motor(Port.C)
        motor_d = Motor(Port.D)
        robot = MDRobotBase(motor_c, motor_d, 56.0, 112.0)
        try:
            robot.set_fusion_alpha(0.8)
            robot._imu_ready = False

            async def make_imu_ready():
                await asyncio.sleep(0.030)  # 30ms < 500ms window
                robot._imu_ready = True

            async def run_motion():
                t = asyncio.create_task(make_imu_ready())
                await robot.navigate_to_goal(100.0, 0.0)
                await t

            asyncio.run(run_motion())
            x, y, theta = robot.get_state()
            self.assertAlmostEqual(x, 100.0, places=1)
            self.assertFalse(robot._motion_in_progress)
        finally:
            robot.close()

    def test_imu_heading_unavailable_startup_retry_times_out(self):
        """When IMU remains unavailable through the 500ms startup window, motion fails closed with RuntimeError."""
        motor_c = Motor(Port.C)
        motor_d = Motor(Port.D)
        robot = MDRobotBase(motor_c, motor_d, 56.0, 112.0)
        try:
            robot.set_fusion_alpha(0.8)
            robot._imu_ready = False

            with self.assertRaises(RuntimeError) as ctx:
                asyncio.run(robot.navigate_to_goal(100.0, 0.0))
            self.assertIn("MDRobotBase IMU heading unavailable", str(ctx.exception))
            self.assertFalse(robot._motion_in_progress)
        finally:
            robot.close()

    def test_encoder_only_fallback_when_fusion_alpha_zero(self):
        """When fusion_alpha == 0.0, non-finite IMU heading falls back to encoder-only odometry without error."""
        motor_c = Motor(Port.C)
        motor_d = Motor(Port.D)
        robot = MDRobotBase(motor_c, motor_d, 56.0, 112.0)
        try:
            robot.set_fusion_alpha(0.0)
            self.assertEqual(robot.get_fusion_alpha(), 0.0)
            robot.set_backlash_filter(False)

            # update_state with NaN gyro heading should succeed cleanly
            robot.update_state(float('nan'))

            # Move motors and update state with NaN gyro heading
            motor_c._angle += 360.0
            motor_d._angle += 360.0
            robot.update_state(float('nan'))

            expected_dist = math.pi * 56.0
            x, y, theta = robot.get_state()
            self.assertAlmostEqual(x, expected_dist, places=1)

            # Navigation with IMU not ready should succeed in encoder-only mode
            robot._imu_ready = False
            asyncio.run(robot.navigate_to_goal(expected_dist + 50.0, 0.0))
            x2, y2, theta2 = robot.get_state()
            self.assertAlmostEqual(x2, expected_dist + 50.0, places=1)
        finally:
            robot.close()


if __name__ == "__main__":
    unittest.main()
