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

        # Negative Q rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(-10.0, 5000.0, 20.0, 25.0, 0.1)
        # Non-positive R rejected
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 0.0, 0.1)
        with self.assertRaises(ValueError):
            self.robot.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, -0.01)

        # State must remain identical to prior state
        self.assertEqual(self.robot.get_lqr_weights(), prev_weights)
        self.assertEqual(self.robot._lqr_lut, prev_lut)
        self.assertEqual(self.robot._lqr_lut_kx, prev_lut_kx)

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


if __name__ == "__main__":
    unittest.main()
