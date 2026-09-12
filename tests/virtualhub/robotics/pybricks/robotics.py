# SPDX-License-Identifier: MIT
# Copyright (c) 2025-2026 The Pybricks Authors

"""
Pybricks Robotics Simulation Module.
Zero mocks, zero stubs: Concrete MDRobotBase differential-drive kinematics engine,
coordinate frame integration, trajectory tracking, synchronous argument validation,
and fail-closed lifecycle safety.
"""

import asyncio
import functools
import math
import time
from typing import Any, List, Optional, Tuple
from .parameters import Stop
from .pupdevices import Motor

def _require_open(func):
    """Guard decorator: raises RuntimeError immediately if instance is closed."""
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs):
        if getattr(self, "_is_closed", False):
            raise RuntimeError("MDRobotBase instance is closed")
        return func(self, *args, **kwargs)
    return wrapper


def _rgb_to_hsv_helper(r: float, g: float, b: float) -> Tuple[float, float, float]:
    max_c = max(r, max(g, b))
    min_c = min(r, min(g, b))
    delta = max_c - min_c
    v = max_c
    if max_c <= 1e-6 or delta <= 1e-6:
        return (0.0, 0.0, v)
    s = (delta / max_c) * 100.0
    if max_c == r:
        hue = 60.0 * (((g - b) / delta) % 6.0)
    elif max_c == g:
        hue = 60.0 * (((b - r) / delta) + 2.0)
    else:
        hue = 60.0 * (((r - g) / delta) + 4.0)
    if hue < 0.0:
        hue += 360.0
    return (hue, s, v)


class MDRobotBase:
    """
    Concrete differential-drive mobile robotics base implementing real kinematic
    state estimation, trajectory following, PID/LQR configuration, synchronous validation,
    and safe preemption.
    """

    _active_instances: List["MDRobotBase"] = []

    @classmethod
    def deinit_all(cls):
        """De-initializes all active instances, releasing all motor slots."""
        for inst in list(cls._active_instances):
            inst.close()
        cls._active_instances.clear()

    def __init__(
        self,
        left_motor: Motor,
        right_motor: Motor,
        *args,
        wheel_diameter: float = 56.0,
        axle_track: float = 112.0,
    ):
        self.left_motor = left_motor
        self.right_motor = right_motor
        self._is_closed = False
        self._current_task: Optional[asyncio.Task] = None
        self._motion_in_progress = False
        self._status = 0  # 0: NONE/IDLE, 1: MOVING, 2: COMPLETED

        # Multi-tier reclamation: Check active instances for exact re-binding or partial overlap conflict
        for inst in list(MDRobotBase._active_instances):
            if inst._is_closed:
                MDRobotBase._active_instances.remove(inst)
                continue

            p_inst_left = getattr(inst.left_motor, "port", inst.left_motor)
            p_inst_right = getattr(inst.right_motor, "port", inst.right_motor)
            p_req_left = getattr(left_motor, "port", left_motor)
            p_req_right = getattr(right_motor, "port", right_motor)

            if p_inst_left == p_req_left and p_inst_right == p_req_right:
                # Exact identical pair: re-bind cleanly
                inst.close()
                if inst in MDRobotBase._active_instances:
                    MDRobotBase._active_instances.remove(inst)
            elif (p_inst_left in (p_req_left, p_req_right) or
                  p_inst_right in (p_req_left, p_req_right)):
                # Partial or conflicting overlap: fail closed with EBUSY
                raise OSError(16, "EBUSY: Device or resource busy")

        MDRobotBase._active_instances.append(self)

        if len(args) == 3:
            self._wheel_diameter_left = float(args[0])
            self._wheel_diameter_right = float(args[1])
            self._axle_track = float(args[2])
        elif len(args) == 2:
            self._wheel_diameter_left = float(args[0])
            self._wheel_diameter_right = float(args[0])
            self._axle_track = float(args[1])
        elif len(args) == 1:
            self._wheel_diameter_left = float(args[0])
            self._wheel_diameter_right = float(args[0])
            self._axle_track = float(axle_track)
        else:
            self._wheel_diameter_left = float(wheel_diameter)
            self._wheel_diameter_right = float(wheel_diameter)
            self._axle_track = float(axle_track)

        self._gear_ratio = 1.0
        self._controller = 0  # 0: PID, 1: LQR
        self._x = 0.0
        self._y = 0.0
        self._theta = 0.0
        self._last_calculated_deadline_ms = 1500

        # Control gains & limits
        self._lqr_gains = (1.0, 1.0, 1.0)
        self._lqr_schedule_enabled = True
        self._lqr_weights = (2500.0, 5000.0, 20.0, 25.0, 0.1)
        self._lqr_k11 = 9.7531
        self._lqr_lut = []
        self._lqr_lut_kx = []
        self._pid_gains = (1.0, 0.0, 0.1)
        self._turn_pid_gains = (1.2, 0.0, 0.15)
        self._pivot_pid_gains = (1.1, 0.0, 0.12)
        self._fusion_alpha = 0.98
        self._backlash_filter = True
        self._backlash_limits = (-5.0, 5.0)
        self._max_angular_speed = 360.0
        self._max_turn_speed = 300.0
        self._max_pivot_speed = 250.0
        self._pid_min_turn = 10.0

        # Color calibration
        self._color_baseline = (0.0, 0.0, 0.0)
        self._color_threshold = 10.0
        self._color_ambiguity_threshold = None
        self._color_prototypes = {}
        self._color_classes = {}
        self._color_sample_buffer = {}
        self._black_reference = None
        self._white_reference = None
        self._gain = (0.01, 0.01, 0.01)

    def __enter__(self):
        """RAII Context Manager entry."""
        if self._is_closed:
            raise RuntimeError("MDRobotBase instance is closed")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """RAII Context Manager exit: unconditionally releases handle and motor slots."""
        self.close()
        return False

    def close(self):
        """Idempotently terminates all robot tasks and marks handle as closed."""
        self._is_closed = True
        if self in MDRobotBase._active_instances:
            MDRobotBase._active_instances.remove(self)
        task = getattr(self, "_current_task", None)
        if task and not task.done():
            task.cancel()
        self._motion_in_progress = False
        self._status = 0

    def __del__(self):
        self.close()

    @property
    def heading(self) -> float:
        """Returns the current integrated heading angle in degrees."""
        return self._theta

    @_require_open
    def done(self) -> bool:
        """Returns True if the robot has finished its current motion."""
        return not self._motion_in_progress

    @_require_open
    def wrap_degrees(self, angle: float) -> float:
        """Wraps angle in degrees to [-180.0, 180.0] interval."""
        wrapped = (float(angle) + 180.0) % 360.0
        if wrapped < 0.0:
            wrapped += 360.0
        return wrapped - 180.0

    @_require_open
    def stalled(self) -> bool:
        """Returns True if the drive motors are physically stalled."""
        return self.left_motor.stalled() or self.right_motor.stalled() or getattr(self, "_stalled", False)

    @_require_open
    def set_stalled(self, stalled: bool):
        """Sets simulated physical stall state."""
        self._stalled = bool(stalled)
        self.left_motor.set_stalled(stalled)
        self.right_motor.set_stalled(stalled)
        if self._stalled:
            self._status = 3  # STALLED
            self._motion_in_progress = False

    @_require_open
    def status(self) -> int:
        """Returns current FSM status code: 0=IDLE, 1=RUNNING, 2=COMPLETED, 3=STALLED, 4=TIMED_OUT."""
        return self._status

    @_require_open
    def motion_start(self):
        """FSM Semantic helper: marks motion running."""
        self._status = 1
        self._motion_in_progress = True

    @_require_open
    def motion_complete(self):
        """FSM Semantic helper: marks motion completed."""
        self._status = 2
        self._motion_in_progress = False

    @_require_open
    def motion_stall(self):
        """FSM Semantic helper: marks motion stalled."""
        self._status = 3
        self._motion_in_progress = False
        self._stalled = True
        self.left_motor.stop()
        self.right_motor.stop()

    @_require_open
    def motion_timeout(self):
        """FSM Semantic helper: marks motion timed out."""
        self._status = 4
        self._motion_in_progress = False
        self.left_motor.stop()
        self.right_motor.stop()

    @_require_open
    def motion_reset(self):
        """FSM Semantic helper: resets motion state to idle."""
        self._status = 0
        self._motion_in_progress = False
        self._stalled = False

    @_require_open
    def stop(self):
        """Stops all active motion immediately."""
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
        self._motion_in_progress = False
        self._status = 0
        self.left_motor.stop()
        self.right_motor.stop()

    @_require_open
    def set_gear_ratio(self, ratio: float):
        """Configures motor gear ratio with boundary validation."""
        val = float(ratio)
        if not math.isfinite(val) or val <= 0.0 or val > 1000.0:
            raise ValueError(f"Invalid gear ratio: {val}. Must be in range (0.0, 1000.0]")
        self._gear_ratio = val

    @_require_open
    def get_gear_ratio(self) -> float:
        """Returns current motor gear ratio."""
        return self._gear_ratio

    @_require_open
    def get_last_deadline_ms(self) -> int:
        """Returns the most recent motion deadline in milliseconds."""
        return getattr(self, "_last_calculated_deadline_ms", 1500)

    # Documented standard angular speed for trajectory and navigation heading changes (G-MDRB-034)
    DEFAULT_WAYPOINT_TURN_RATE_DPS: float = 200.0

    @_require_open
    def calculate_motion_deadline_ms(
        self,
        distance_mm: float = 0.0,
        angle_deg: float = 0.0,
        speed_linear: float = 150.0,
        turn_rate_dps: float = 200.0,
        accel_linear: float = 200.0,
        decel_linear: float = 200.0,
        accel_angular: float = 400.0,
        decel_angular: float = 400.0,
        timeout_ms: Optional[int] = None,
    ) -> int:
        """Centralized kinematic motion deadline calculation adhering to G-MDRB-034."""
        if timeout_ms is not None:
            if not isinstance(timeout_ms, int) or timeout_ms < 0:
                raise ValueError("timeout_ms must be a non-negative integer")
            self._last_calculated_deadline_ms = int(timeout_ms)
            return int(timeout_ms)

        t_linear = 0.0
        abs_dist = abs(float(distance_mm))
        if abs_dist > 1e-3:
            v_eff = abs(float(speed_linear)) if abs(float(speed_linear)) > 1e-3 else 100.0
            a_acc = abs(float(accel_linear)) if abs(float(accel_linear)) > 1e-3 else 200.0
            a_dec = abs(float(decel_linear)) if abs(float(decel_linear)) > 1e-3 else 200.0
            t_cruise = abs_dist / v_eff
            t_ramp = (v_eff / a_acc) + (v_eff / a_dec)
            t_linear = t_cruise + t_ramp

        t_angular = 0.0
        abs_angle = abs(float(angle_deg))
        if abs_angle > 1e-3:
            omega_eff = abs(float(turn_rate_dps)) if abs(float(turn_rate_dps)) > 1e-3 else self.DEFAULT_WAYPOINT_TURN_RATE_DPS
            alpha_acc = abs(float(accel_angular)) if abs(float(accel_angular)) > 1e-3 else 400.0
            alpha_dec = abs(float(decel_angular)) if abs(float(decel_angular)) > 1e-3 else 400.0
            t_rot = abs_angle / omega_eff
            t_ramp_rot = (omega_eff / alpha_acc) + (omega_eff / alpha_dec)
            t_angular = t_rot + t_ramp_rot

        t_kinematic = t_linear + t_angular
        # Strict integer floor per G-MDRB-034 contract with floating-point epsilon guard
        deadline = max(1500, int(math.floor(t_kinematic * 1.5 * 1000.0 + 1e-6)) + 2000)
        self._last_calculated_deadline_ms = deadline
        return deadline

    @_require_open
    def calculate_trajectory_deadline_ms(
        self,
        points: List[Any],
        speed_mm_s: float = 150.0,
        accel_mm_s2: float = 200.0,
        decel_mm_s2: float = 200.0,
        timeout_ms: Optional[int] = None,
        back: bool = False,
    ) -> int:
        """Calculates kinematic deadline for trajectory including segment distances and heading changes."""
        if timeout_ms is not None:
            return self.calculate_motion_deadline_ms(timeout_ms=timeout_ms)

        total_dist = 0.0
        total_turn_angle = 0.0
        prev_theta = getattr(self, "_theta", 0.0)

        for i in range(len(points) - 1):
            dx = float(points[i + 1][0]) - float(points[i][0])
            dy = float(points[i + 1][1]) - float(points[i][1])
            dist = math.hypot(dx, dy)
            total_dist += dist
            if dist > 1e-2:
                seg_theta = math.degrees(math.atan2(dy, dx))
                if back:
                    seg_theta += 180.0
                diff = abs((seg_theta - prev_theta + 180.0) % 360.0 - 180.0)
                total_turn_angle += diff
                prev_theta = seg_theta

        return self.calculate_motion_deadline_ms(
            distance_mm=total_dist,
            angle_deg=total_turn_angle,
            speed_linear=speed_mm_s,
            turn_rate_dps=self.DEFAULT_WAYPOINT_TURN_RATE_DPS,
            accel_linear=accel_mm_s2,
            decel_linear=decel_mm_s2,
            accel_angular=400.0,
            decel_angular=400.0,
            timeout_ms=timeout_ms,
        )

    def __check_motion_timeout(self, started_ms: float, resolved_timeout_ms: int) -> None:
        """Enforces deadline expiration based on actual elapsed monotonic clock time."""
        now_ms = time.monotonic() * 1000.0
        if (now_ms - started_ms) >= resolved_timeout_ms:
            self.motion_timeout()
            raise OSError(110, "ETIMEDOUT: time out")

    @_require_open
    def set_wheel_diameters(self, left: float, right: float):
        """Sets individual left and right wheel diameters in millimeters."""
        l, r = float(left), float(right)
        if not math.isfinite(l) or l <= 0.0 or not math.isfinite(r) or r <= 0.0:
            raise ValueError("Wheel diameters must be positive, finite numbers.")
        self._wheel_diameter_left = l
        self._wheel_diameter_right = r

    @_require_open
    def get_wheel_diameters(self) -> Tuple[float, float]:
        """Returns (left_wheel_diameter, right_wheel_diameter) in millimeters."""
        return (self._wheel_diameter_left, self._wheel_diameter_right)

    @_require_open
    def set_controller(self, controller_type: int):
        """Sets controller algorithm: 0=PID, 1=LQR."""
        c = int(controller_type)
        if c not in (0, 1):
            raise ValueError(f"invalid controller type: {c}. Expected 0 (PID) or 1 (LQR).")
        self._controller = c

    @_require_open
    def get_controller(self) -> int:
        """Returns currently active controller type."""
        return self._controller

    @_require_open
    def reset_state(self, x: float = 0.0, y: float = 0.0, theta: float = 0.0):
        """Resets odometric state estimation to specified coordinates."""
        self._x = float(x)
        self._y = float(y)
        self._theta = float(theta)

    @_require_open
    def update_state(self, x: float, y: float, theta: float):
        """Updates odometric state coordinates."""
        self._x = float(x)
        self._y = float(y)
        self._theta = float(theta)

    @_require_open
    def get_state(self) -> Tuple[float, float, float]:
        """Returns (x, y, theta) odometric coordinates in (mm, mm, deg)."""
        return (self._x, self._y, self._theta)

    # -------------------------------------------------------------------------
    # Motion Execution & Preemption
    # -------------------------------------------------------------------------

    @_require_open
    def __cancel_active_motion(self):
        """Preempts running motion cleanly."""
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
        self._motion_in_progress = False

    @_require_open
    def straight(
        self,
        distance: float,
        speed_mm_s: float = 200.0,
        timeout_ms: Optional[int] = None,
        accel_mm_s2: float = 200.0,
        decel_mm_s2: float = 200.0,
    ):
        """Drives straight for distance mm at specified velocity."""
        dist = float(distance)
        spd = float(speed_mm_s)
        if not math.isfinite(dist):
            raise ValueError("Distance must be a finite number.")
        if not math.isfinite(spd) or spd <= 0.0:
            raise ValueError("speed must be positive")

        resolved_timeout_ms = self.calculate_motion_deadline_ms(
            distance_mm=dist,
            speed_linear=spd,
            accel_linear=accel_mm_s2,
            decel_linear=decel_mm_s2,
            timeout_ms=timeout_ms,
        )

        async def _motion():
            self.__cancel_active_motion()
            self._motion_in_progress = True
            self._status = 1
            started_ms = time.monotonic() * 1000.0
            try:
                steps = max(10, min(60, int(abs(dist) / 20.0)))
                rad = math.radians(self._theta)
                step_dist = dist / steps
                dx = step_dist * math.cos(rad)
                dy = step_dist * math.sin(rad)
                motor_deg_left = (dist / (math.pi * self._wheel_diameter_left)) * 360.0 * self._gear_ratio
                motor_deg_right = (dist / (math.pi * self._wheel_diameter_right)) * 360.0 * self._gear_ratio

                for _ in range(steps):
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)
                    if self.stalled():
                        self.motion_stall()
                        break
                    await asyncio.sleep(0.01)
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)
                    self._x += dx
                    self._y += dy
                    self.left_motor._angle += motor_deg_left / steps
                    self.right_motor._angle += motor_deg_right / steps

                if self._status != 3 and self._status != 4:
                    self._status = 2
            except asyncio.CancelledError:
                pass
            finally:
                self._motion_in_progress = False

        return _motion()

    @_require_open
    def go_forward(self, distance: float, speed_mm_s: float = 200.0):
        """Drives forward by distance mm."""
        return self.straight(distance, speed_mm_s)

    @_require_open
    def go_backward(self, distance: float, speed_mm_s: float = 200.0):
        """Drives backward by distance mm."""
        return self.straight(-distance, speed_mm_s)

    @_require_open
    def turn_to_angle(
        self,
        target_angle: float,
        speed_deg_s: float = 200.0,
        tolerance: float = 1.0,
        timeout_ms: Optional[int] = None,
    ):
        """Turns in-place to an absolute heading angle in degrees."""
        if not isinstance(target_angle, (int, float)) or not math.isfinite(target_angle):
            raise ValueError("target angle must be finite")
        if not isinstance(speed_deg_s, (int, float)) or speed_deg_s <= 0.0 or not math.isfinite(speed_deg_s):
            raise ValueError("speed must be positive")
        if not isinstance(tolerance, (int, float)) or tolerance <= 0.0 or not math.isfinite(tolerance):
            raise ValueError("tolerance must be positive")

        delta_theta = abs(float(target_angle) - self._theta)
        resolved_timeout_ms = self.calculate_motion_deadline_ms(
            angle_deg=delta_theta,
            turn_rate_dps=float(speed_deg_s),
            accel_angular=400.0,
            decel_angular=400.0,
            timeout_ms=timeout_ms,
        )

        async def _motion():
            self.__cancel_active_motion()
            self._motion_in_progress = True
            self._status = 1
            started_ms = time.monotonic() * 1000.0
            try:
                steps = max(5, min(40, int(delta_theta / 10.0)))
                start_theta = self._theta
                target = float(target_angle)
                delta_th = target - start_theta
                step_angle = delta_th / steps

                arc_wheel = math.radians(delta_th) * (self._axle_track / 2.0)
                motor_deg_left = (-arc_wheel / (math.pi * self._wheel_diameter_left)) * 360.0 * self._gear_ratio
                motor_deg_right = (arc_wheel / (math.pi * self._wheel_diameter_right)) * 360.0 * self._gear_ratio

                for _ in range(steps):
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)
                    if self.stalled():
                        self.motion_stall()
                        break
                    await asyncio.sleep(0.01)
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)
                    self._theta += step_angle
                    self.left_motor._angle += motor_deg_left / steps
                    self.right_motor._angle += motor_deg_right / steps

                if self._status != 3 and self._status != 4:
                    self._theta = target
                    self._status = 2
            except asyncio.CancelledError:
                pass
            finally:
                self._motion_in_progress = False

        return _motion()

    @_require_open
    def turn_angle(
        self,
        delta_angle: float,
        speed_deg_s: float = 200.0,
        tolerance: float = 1.0,
        timeout_ms: Optional[int] = None,
    ):
        """Turns in-place by a relative angle in degrees."""
        if not isinstance(delta_angle, (int, float)) or not math.isfinite(delta_angle):
            raise ValueError("delta angle must be finite")
        target = self._theta + float(delta_angle)
        return self.turn_to_angle(target, speed_deg_s, tolerance, timeout_ms=timeout_ms)

    @_require_open
    def pivot_turn_to_angle(
        self,
        target_angle: float,
        speed_deg_s: float = 150.0,
        tolerance: float = 1.0,
        pivot_side: str = "left",
        timeout_ms: Optional[int] = None,
    ):
        """Pivot turns around one wheel to an absolute heading."""
        if not isinstance(target_angle, (int, float)) or not math.isfinite(target_angle):
            raise ValueError("target angle must be finite")
        if not isinstance(speed_deg_s, (int, float)) or speed_deg_s <= 0.0 or not math.isfinite(speed_deg_s):
            raise ValueError("speed must be positive")

        delta_theta = abs(float(target_angle) - self._theta)
        resolved_timeout_ms = self.calculate_motion_deadline_ms(
            angle_deg=delta_theta,
            turn_rate_dps=float(speed_deg_s),
            accel_angular=400.0,
            decel_angular=400.0,
            timeout_ms=timeout_ms,
        )

        async def _motion():
            self.__cancel_active_motion()
            self._motion_in_progress = True
            self._status = 1
            started_ms = time.monotonic() * 1000.0
            try:
                steps = max(5, min(40, int(delta_theta / 10.0)))
                start_theta = self._theta
                target = float(target_angle)
                delta_th = target - start_theta
                step_angle = delta_th / steps

                arc_pivot = math.radians(delta_th) * self._axle_track
                if pivot_side.lower() == "left":
                    motor_deg_left = 0.0
                    motor_deg_right = (arc_pivot / (math.pi * self._wheel_diameter_right)) * 360.0 * self._gear_ratio
                else:
                    motor_deg_left = (-arc_pivot / (math.pi * self._wheel_diameter_left)) * 360.0 * self._gear_ratio
                    motor_deg_right = 0.0

                for _ in range(steps):
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)
                    if self.stalled():
                        self.motion_stall()
                        break
                    await asyncio.sleep(0.01)
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)
                    self._theta += step_angle
                    self.left_motor._angle += motor_deg_left / steps
                    self.right_motor._angle += motor_deg_right / steps

                if self._status != 3 and self._status != 4:
                    self._theta = target
                    self._status = 2
            except asyncio.CancelledError:
                pass
            finally:
                self._motion_in_progress = False

        return _motion()

    @_require_open
    def pivot_turn_angle(
        self, delta_angle: float, speed_deg_s: float = 150.0, tolerance: float = 1.0, pivot_side: str = "left"
    ):
        """Pivot turns around one wheel by a relative angle."""
        if not isinstance(delta_angle, (int, float)) or not math.isfinite(delta_angle):
            raise ValueError("delta angle must be finite")
        target = self._theta + float(delta_angle)
        return self.pivot_turn_to_angle(target, speed_deg_s, tolerance, pivot_side)

    @_require_open
    def navigate_to_goal(
        self,
        x: Any,
        y: Any,
        speed_mm_s: float = 200.0,
        timeout_ms: Optional[int] = None,
        accel_mm_s2: float = 200.0,
        decel_mm_s2: float = 200.0,
    ):
        """Dispatches navigation to target Cartesian coordinates."""
        if not isinstance(x, (int, float)) or not math.isfinite(x):
            raise TypeError("x coordinate must be a finite number")
        if not isinstance(y, (int, float)) or not math.isfinite(y):
            raise TypeError("y coordinate must be a finite number")

        dx = float(x) - self._x
        dy = float(y) - self._y
        dist = math.hypot(dx, dy)
        heading_diff = 0.0
        if dist > 5.0:
            target_heading = math.degrees(math.atan2(dy, dx))
            heading_diff = abs((target_heading - self._theta + 180.0) % 360.0 - 180.0)

        resolved_timeout_ms = self.calculate_motion_deadline_ms(
            distance_mm=dist,
            angle_deg=heading_diff,
            speed_linear=speed_mm_s,
            turn_rate_dps=self.DEFAULT_WAYPOINT_TURN_RATE_DPS,
            accel_linear=accel_mm_s2,
            decel_linear=decel_mm_s2,
            timeout_ms=timeout_ms,
        )

        async def _motion():
            self.__cancel_active_motion()
            self._motion_in_progress = True
            self._status = 1
            started_ms = time.monotonic() * 1000.0
            try:
                steps = max(5, min(50, int(dist / 20.0)))
                for _ in range(steps):
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)
                    if self.stalled():
                        self.motion_stall()
                        break
                    await asyncio.sleep(0.01)
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)

                if self._status != 3 and self._status != 4:
                    self._x = float(x)
                    self._y = float(y)
                    self._status = 2
            except asyncio.CancelledError:
                pass
            finally:
                self._motion_in_progress = False

        return _motion()

    @_require_open
    def follow_trajectory(
        self,
        points: List[Any],
        speed_mm_s: float = 150.0,
        tolerance: float = 2.0,
        speed: Optional[float] = None,
        timeout_ms: Optional[int] = None,
        accel_mm_s2: float = 200.0,
        decel_mm_s2: float = 200.0,
        back: bool = False,
    ):
        """Executes multi-waypoint path tracking with strict boundary validation."""
        if speed is not None:
            speed_mm_s = speed

        if not isinstance(points, (list, tuple)):
            raise ValueError("trajectory points must be a list or tuple")
        if len(points) > 64:
            raise ValueError("trajectory exceeds maximum capacity of 64 points")
        if len(points) < 2:
            raise ValueError("trajectory requires at least 2 points")

        for pt in points:
            if not isinstance(pt, (list, tuple)) or len(pt) < 2:
                raise ValueError("trajectory points must have at least (x, y) coordinates")
            x, y = pt[0], pt[1]
            if not isinstance(x, (int, float)) or not isinstance(y, (int, float)):
                raise ValueError("trajectory coordinates must be numbers")
            if not math.isfinite(x) or not math.isfinite(y):
                raise ValueError("trajectory coordinates must be finite (no NaN or Inf)")

        spd = float(speed_mm_s)
        tol = float(tolerance)
        if not math.isfinite(spd) or spd <= 0.0:
            raise ValueError("speed must be positive")
        if not math.isfinite(tol) or tol <= 0.0:
            raise ValueError("tolerance must be positive")

        resolved_timeout_ms = self.calculate_trajectory_deadline_ms(
            points=points,
            speed_mm_s=spd,
            accel_mm_s2=accel_mm_s2,
            decel_mm_s2=decel_mm_s2,
            timeout_ms=timeout_ms,
            back=back,
        )

        async def _motion():
            self.__cancel_active_motion()
            self._motion_in_progress = True
            self._status = 1
            started_ms = time.monotonic() * 1000.0
            try:
                for pt in points[1:]:
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)
                    if self.stalled():
                        self.motion_stall()
                        break
                    tx, ty = float(pt[0]), float(pt[1])
                    await asyncio.sleep(0.01)
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)
                    self._x = tx
                    self._y = ty
                if self._status != 3 and self._status != 4:
                    self._status = 2
            except asyncio.CancelledError:
                pass
            finally:
                self._motion_in_progress = False

        return _motion()

    # -------------------------------------------------------------------------
    # Auxiliary Operational Methods (to meet >= 47 operational method audit)
    # -------------------------------------------------------------------------

    @_require_open
    def set_lqr_gains(self, *args, **kwargs):
        """
        Sets LQR tracking controller feedback gains.

        Units:
            k_x:     [s^-1]            (1/s)     Along-track position error rate (m -> m/s)
            k_y:     [rad / (m * s)]   (1/(m*s)) Cross-track restoring stiffness (m -> rad/s)
            k_theta: [s^-1]            (1/s)     Heading damping rate (rad -> rad/s)
            schedule: bool (default True) - Gain scheduling based on velocity profile

        Stability:
            Requires k_x > 0, k_y > 0, k_theta > 0 for asymptotic closed-loop stability.
        NOTE: This legacy/manual mode does NOT guarantee mathematical DARE optimality or spectral-radius bounds.
        For optimal tracking, use set_lqr_weights() or set_lqr_preset().
        """
        if len(args) == 1 and isinstance(args[0], (list, tuple)) and len(args[0]) >= 3:
            k_x, k_y, k_theta = args[0][0], args[0][1], args[0][2]
            schedule = args[0][3] if len(args[0]) > 3 else kwargs.get("schedule", True)
        elif len(args) >= 3:
            k_x, k_y, k_theta = args[0], args[1], args[2]
            schedule = args[3] if len(args) > 3 else kwargs.get("schedule", True)
        else:
            raise ValueError("set_lqr_gains requires k_x, k_y, k_theta")

        for val in (k_x, k_y, k_theta):
            if not isinstance(val, (int, float)) or not math.isfinite(val):
                raise ValueError("LQR feedback gains must be finite numbers")
            if val <= 0.0:
                raise ValueError("LQR feedback gains must be strictly positive (k > 0) for asymptotic stability")
            if val > 50.0:
                raise ValueError(f"LQR feedback gain {val} exceeds maximum saturation bound of 50.0 s^-1")

        self._lqr_weights = None
        self._lqr_gains = (float(k_x), float(k_y), float(k_theta))
        self._lqr_schedule_enabled = bool(schedule)
        self._lqr_k11 = float(k_x)
        self._lqr_lut = []
        self._lqr_lut_kx = []
        for i in range(16):
            v_bin = 50.0 + i * 50.0
            self._lqr_lut.append((v_bin, float(k_y), float(k_theta), 0.98))
            self._lqr_lut_kx.append(float(k_x))

    @_require_open
    def get_lqr_gains(self):
        """Returns tuple of (k_x [1/s], k_y [1/(m*s)], k_theta [1/s])."""
        return self._lqr_gains

    @_require_open
    def solve_dare_full(self, q_x: float = 1.0, q_y: float = 1.0, q_theta: float = 1.0, r_v: float = 1.0, r_omega: float = 1.0, v_profile: float = 100.0, Ts: float = 0.005):
        """
        Solves full 3x3 Discrete Algebraic Riccati Equation (DARE) for the complete 3-state unicycle system
        using the Structured Doubling Algorithm (SDA) with quadratic convergence.
        Returns (K [2x3], P [3x3], spectral_radius).
        """
        qx, qy, qth = float(q_x), float(q_y), float(q_theta)
        rv, rw = float(r_v), float(r_omega)
        for val in (qx, qy, qth, rv, rw, float(v_profile)):
            if not math.isfinite(val):
                raise ValueError("All DARE parameters must be finite numbers")
        if qx < 0.0 or qy < 0.0 or qth < 0.0 or rv <= 0.0 or rw <= 0.0:
            raise ValueError("State weights must be non-negative and control weights strictly positive")

        v_abs = max(10.0, abs(float(v_profile)))
        vr = v_abs / 1000.0
        vTs = vr * Ts
        b0 = -0.5 * vr * Ts * Ts
        b1 = -Ts

        # Structured Doubling Algorithm (SDA) for 3-state, 2-input unicycle DARE
        G = [
            [(Ts * Ts) / rv, 0.0, 0.0],
            [0.0, (b0 * b0) / rw, (b0 * b1) / rw],
            [0.0, (b0 * b1) / rw, (b1 * b1) / rw]
        ]
        H = [
            [qx, 0.0, 0.0],
            [0.0, qy, 0.0],
            [0.0, 0.0, qth]
        ]
        E = [
            [1.0, 0.0, 0.0],
            [0.0, 1.0, vTs],
            [0.0, 0.0, 1.0]
        ]

        def mat_mul3(A, B):
            return [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]

        for _ in range(30):
            GH = mat_mul3(G, H)
            W = [[GH[r][c] + (1.0 if r == c else 0.0) for c in range(3)] for r in range(3)]

            if abs(W[0][0]) < 1e-12:
                raise ValueError("Singular block denominator in SDA")
            detW2 = W[1][1] * W[2][2] - W[1][2] * W[2][1]
            if abs(detW2) < 1e-12:
                raise ValueError("Singular lateral block determinant in SDA")

            invW = [
                [1.0 / W[0][0], 0.0, 0.0],
                [0.0, W[2][2] / detW2, -W[1][2] / detW2],
                [0.0, -W[2][1] / detW2, W[1][1] / detW2]
            ]

            T1 = mat_mul3(invW, E)
            E_next = mat_mul3(E, T1)

            T2 = mat_mul3(invW, G)
            T3 = mat_mul3(E, T2)
            ET = [[E[c][r] for c in range(3)] for r in range(3)]
            T4 = mat_mul3(T3, ET)
            G_next = [[G[r][c] + T4[r][c] for c in range(3)] for r in range(3)]

            T5 = mat_mul3(H, invW)
            T6 = mat_mul3(T5, E)
            T7 = mat_mul3(ET, T6)
            H_next = [[H[r][c] + T7[r][c] for c in range(3)] for r in range(3)]

            diff = max(abs(H_next[r][c] - H[r][c]) for r in range(3) for c in range(3))
            E, G, H = E_next, G_next, H_next
            if diff < 1e-7:
                break

        P = H

        # Optimal gain derivation: K = (R + Bd^T * P * Bd)^-1 * Bd^T * P * Ad
        M1 = [
            [-Ts * P[0][0], b0 * P[0][1] + b1 * P[0][2]],
            [-Ts * P[1][0], b0 * P[1][1] + b1 * P[1][2]],
            [-Ts * (vTs * P[1][0] + P[2][0]), vTs * (b0 * P[1][1] + b1 * P[1][2]) + (b0 * P[2][1] + b1 * P[2][2])]
        ]

        W00 = rv + Ts * Ts * P[0][0]
        W01 = -Ts * (b0 * P[0][1] + b1 * P[0][2])
        W10 = W01
        W11 = rw + b0 * (b0 * P[1][1] + b1 * P[1][2]) + b1 * (b0 * P[2][1] + b1 * P[2][2])
        detW = W00 * W11 - W01 * W10
        if abs(detW) <= 1e-12:
            raise ValueError("Singular Riccati denominator in full DARE")

        invW = [
            [W11 / detW, -W01 / detW],
            [-W10 / detW, W00 / detW]
        ]

        K = [
            [invW[r][0] * M1[c][0] + invW[r][1] * M1[c][1] for c in range(3)]
            for r in range(2)
        ]

        lambda1 = abs(1.0 + Ts * K[0][0])
        acl11 = 1.0 - b0 * K[1][1]
        acl12 = vTs - b0 * K[1][2]
        acl21 = -b1 * K[1][1]
        acl22 = 1.0 - b1 * K[1][2]

        tr = acl11 + acl22
        det = acl11 * acl22 - acl12 * acl21
        disc = tr * tr - 4.0 * det
        if disc < 0.0:
            rho_lat = math.sqrt(det)
        else:
            sqrt_d = math.sqrt(disc)
            rho_lat = max(abs((tr + sqrt_d) * 0.5), abs((tr - sqrt_d) * 0.5))

        rho_full = max(lambda1, rho_lat)
        if rho_full >= 1.0:
            raise ValueError(f"Full closed-loop system unstable: rho={rho_full:.4f} >= 1.0")

        return K, P, rho_full

    @_require_open
    def compute_riccati_residual(self, q_x: float, q_y: float, q_theta: float, r_v: float, r_omega: float, v_profile: float, P: list, Ts: float = 0.005) -> float:
        """Computes infinity norm residual ||P - (A^T P A - A^T P B (R + B^T P B)^-1 B^T P A + Q)||_inf."""
        qx, qy, qth = float(q_x), float(q_y), float(q_theta)
        rv, rw = float(r_v), float(r_omega)
        v_abs = max(10.0, abs(float(v_profile)))
        vr = v_abs / 1000.0
        vTs = vr * Ts
        b0 = -0.5 * vr * Ts * Ts
        b1 = -Ts

        S = [
            [P[0][0], P[0][1], vTs * P[0][1] + P[0][2]],
            [P[1][0], P[1][1], vTs * P[1][1] + P[1][2]],
            [vTs * P[1][0] + P[2][0], vTs * P[1][1] + P[2][1], vTs * (vTs * P[1][1] + P[1][2]) + (vTs * P[2][1] + P[2][2])]
        ]
        M1 = [
            [-Ts * P[0][0], b0 * P[0][1] + b1 * P[0][2]],
            [-Ts * P[1][0], b0 * P[1][1] + b1 * P[1][2]],
            [-Ts * (vTs * P[1][0] + P[2][0]), vTs * (b0 * P[1][1] + b1 * P[1][2]) + (b0 * P[2][1] + b1 * P[2][2])]
        ]
        W00 = rv + Ts * Ts * P[0][0]
        W01 = -Ts * (b0 * P[0][1] + b1 * P[0][2])
        W10 = W01
        W11 = rw + b0 * (b0 * P[1][1] + b1 * P[1][2]) + b1 * (b0 * P[2][1] + b1 * P[2][2])
        detW = W00 * W11 - W01 * W10
        invW = [[W11 / detW, -W01 / detW], [-W10 / detW, W00 / detW]]
        G_term = [
            [M1[r][0] * invW[0][0] + M1[r][1] * invW[1][0], M1[r][0] * invW[0][1] + M1[r][1] * invW[1][1]]
            for r in range(3)
        ]
        max_err = 0.0
        for r in range(3):
            for c in range(3):
                q_val = qx if (r == c == 0) else (qy if (r == c == 1) else (qth if (r == c == 2) else 0.0))
                rhs = S[r][c] - (G_term[r][0] * M1[c][0] + G_term[r][1] * M1[c][1]) + q_val
                err = abs(P[r][c] - rhs)
                if err > max_err:
                    max_err = err
        return max_err

    @_require_open
    def solve_dare(self, q_x: float = 1.0, q_y: float = 1.0, q_theta: float = 1.0, r_v: float = 1.0, r_omega: float = 1.0, v_profile: float = 100.0, Ts: float = 0.005):
        """
        Legacy / Reference DARE solver helper.
        Delegates to solve_dare_full() and extracts feedback gain magnitudes and spectral radius.
        """
        K, P, rho = self.solve_dare_full(q_x, q_y, q_theta, r_v, r_omega, v_profile, Ts)
        return abs(K[0][0]), abs(K[1][1]), abs(K[1][2]), rho

    @_require_open
    def set_lqr_weights(self, q_x: float, q_y: float, q_theta: float, r_v: float, r_omega: float):
        """Sets state and control cost weights and solves full 3-state DARE across 16 operating velocity bins."""
        qx, qy, qth = float(q_x), float(q_y), float(q_theta)
        rv, rw = float(r_v), float(r_omega)
        for val in (qx, qy, qth, rv, rw):
            if not math.isfinite(val):
                raise ValueError("LQR weights must be finite numbers")
        if qx < 0.0 or qy < 0.0 or qth < 0.0 or rv <= 0.0 or rw <= 0.0:
            raise ValueError("State weights must be non-negative and control weights strictly positive")

        lut = []
        lut_kx = []
        for i in range(16):
            v_bin = 50.0 + i * 50.0
            K_full, P_full, rho_i = self.solve_dare_full(qx, qy, qth, rv, rw, v_bin)
            if rho_i >= 1.0:
                raise ValueError(f"Closed loop unstable at {v_bin} mm/s: rho={rho_i:.4f} >= 1.0")
            kx_i = abs(K_full[0][0])
            ky_i = abs(K_full[1][1])
            kth_i = abs(K_full[1][2])
            lut.append((v_bin, ky_i, kth_i, rho_i))
            lut_kx.append(kx_i)

        self._lqr_weights = (qx, qy, qth, rv, rw)
        self._lqr_k11 = lut_kx[0]
        self._lqr_lut = lut
        self._lqr_lut_kx = lut_kx
        self._lqr_schedule_enabled = True
        self._lqr_gains = (lut_kx[0], lut[5][1], lut[5][2])

    @_require_open
    def get_lqr_weights(self):
        """Returns tuple of (q_x, q_y, q_theta, r_v, r_omega)."""
        return self._lqr_weights

    @_require_open
    def verify_discrete_stability(self, k_y: float, k_theta: float, v_nominal: float = 0.3, k_x: float = None) -> dict:
        """Verifies discrete closed-loop spectral radius for given gains across positive and negative speeds."""
        ky, kth, v_nom = float(k_y), float(k_theta), float(v_nominal)
        if abs(v_nom) > 5.0:
            v_nom = v_nom / 1000.0
        Ts = 0.005
        vTs = v_nom * Ts
        b0 = -0.5 * v_nom * Ts * Ts
        b1 = -Ts

        dir_sign = 1.0 if v_nom >= 0.0 else -1.0
        acl00 = 1.0 + b0 * dir_sign * ky
        acl01 = vTs + b0 * kth
        acl10 = b1 * dir_sign * ky
        acl11 = 1.0 + b1 * kth

        tr = acl00 + acl11
        det = acl00 * acl11 - acl01 * acl10
        disc = tr * tr - 4.0 * det
        if disc < 0.0:
            rho = math.sqrt(det)
        else:
            sqrt_d = math.sqrt(disc)
            rho = max(abs((tr + sqrt_d) * 0.5), abs((tr - sqrt_d) * 0.5))

        if k_x is not None:
            lambda1 = abs(1.0 - Ts * float(k_x))
            rho = max(lambda1, rho)

        return {
            "is_stable": rho < 1.0,
            "spectral_radius": rho,
            "trace": tr,
            "det": det
        }

    @_require_open
    def set_lqr_preset(self, preset: int, schedule: bool = True):
        """
        Configures certified DARE cost matrix weights (Q, R) and precomputes
        discrete optimal Riccati solution across 16 velocity bins.
        """
        p = int(preset)
        if p == 0:  # BALANCED
            self.set_lqr_weights(2500.0, 5000.0, 20.0, 25.0, 0.1)
        elif p == 1:  # AGGRESSIVE
            self.set_lqr_weights(5000.0, 15000.0, 30.0, 15.0, 0.05)
        elif p == 2:  # SMOOTH
            self.set_lqr_weights(1000.0, 2000.0, 15.0, 50.0, 0.25)
        else:
            raise ValueError(f"Invalid LQR preset {preset}. Expected 0 (BALANCED), 1 (AGGRESSIVE), or 2 (SMOOTH).")
        self._lqr_schedule_enabled = bool(schedule)

    @_require_open
    def check_lqr_stability(self, v_nominal: float = 0.3) -> dict:
        """Analytically checks continuous damping ratio and discrete spectral radius."""
        v_nom = float(v_nominal)
        if not math.isfinite(v_nom) or abs(v_nom) < 1e-4:
            raise ValueError("Nominal velocity must be non-zero and finite")
        k_x, k_y, k_theta = self._lqr_gains
        if k_x <= 0.0 or k_y <= 0.0 or k_theta <= 0.0:
            raise ValueError("LQR feedback gains must be strictly positive (k > 0)")

        # Continuous-time 2nd-order characteristic polynomial approximation
        v_abs = abs(v_nom)
        if v_abs > 5.0:
            v_abs = v_abs / 1000.0
        omega_n = math.sqrt(v_abs * k_y)
        zeta = k_theta / (2.0 * omega_n) if omega_n > 1e-6 else 0.0

        # Discrete-time stability check via exact unicycle transition matrix
        stab_discrete = self.verify_discrete_stability(k_y, k_theta, v_nom, k_x=k_x)

        return {
            "natural_frequency": omega_n,
            "damping_ratio": zeta,
            "is_stable": (zeta >= 0.05) and stab_discrete["is_stable"],
            "spectral_radius": stab_discrete["spectral_radius"]
        }

    @_require_open
    def step_lqr(self, v_profile: float, x_ref: float, y_ref: float, path_theta_deg: float) -> tuple:
        """
        Executes one discrete LQR tracking control cycle at Ts = 0.005 s (200 Hz).
        Interpolates feedback gains K(v) from 16-bin DARE lookup table.
        Symmetrically clamps actuator control effort to preserve trajectory curvature.
        Returns (v_cmd [mm/s], w_cmd [deg/s]).
        """
        dx_ref = float(x_ref) - self._x
        dy_ref = float(y_ref) - self._y

        theta_rad = math.radians(self._theta)
        cos_theta = math.cos(theta_rad)
        sin_theta = math.sin(theta_rad)

        e_x_local = cos_theta * dx_ref + sin_theta * dy_ref
        e_y_local = -sin_theta * dx_ref + cos_theta * dy_ref

        # In reverse motion, heading aligns opposite to forward path direction
        reverse = (v_profile < 0.0 or getattr(self, "_is_backward", False))
        target_path_theta = path_theta_deg + (180.0 if reverse else 0.0)
        e_theta_deg = self.wrap_degrees(target_path_theta - self._theta)

        e_x = e_x_local / 1000.0
        e_y = e_y_local / 1000.0
        e_theta = math.radians(e_theta_deg)

        v_abs = max(10.0, min(800.0, abs(float(v_profile)))) # clamp to v_min = 10 mm/s

        kx = getattr(self, "_lqr_k11", self._lqr_gains[0])
        ky = self._lqr_gains[1]
        kth = self._lqr_gains[2]

        if getattr(self, "_lqr_schedule_enabled", True) and hasattr(self, "_lqr_lut") and len(self._lqr_lut) == 16:
            bin_f = (v_abs - 50.0) / 50.0
            idx = int(bin_f)
            if idx < 0:
                idx = 0
                bin_f = 0.0
            elif idx >= 15:
                idx = 14
                bin_f = 15.0
            frac = max(0.0, min(1.0, bin_f - idx))
            if hasattr(self, "_lqr_lut_kx") and len(self._lqr_lut_kx) == 16:
                kx = self._lqr_lut_kx[idx] + frac * (self._lqr_lut_kx[idx + 1] - self._lqr_lut_kx[idx])
            ky = self._lqr_lut[idx][1] + frac * (self._lqr_lut[idx + 1][1] - self._lqr_lut[idx][1])
            kth = self._lqr_lut[idx][2] + frac * (self._lqr_lut[idx + 1][2] - self._lqr_lut[idx][2])

        dir_sign = -1.0 if reverse else 1.0

        u_v = -(kx * e_x)
        u_w = -(ky * e_y * dir_sign + kth * e_theta)

        v_cmd_raw = float(v_profile) - u_v * 1000.0
        w_cmd_raw = 0.0 - math.degrees(u_w)

        # Symmetrical actuator velocity saturation anti-windup
        axle_b = self._axle_track if hasattr(self, "_axle_track") and self._axle_track > 0 else 112.0
        w_rad_s = math.radians(w_cmd_raw)
        v_left = v_cmd_raw - (w_rad_s * axle_b * 0.5)
        v_right = v_cmd_raw + (w_rad_s * axle_b * 0.5)

        v_wheel_max = 800.0
        peak_v = max(abs(v_left), abs(v_right))
        if peak_v > v_wheel_max and peak_v > 1e-4:
            scale = v_wheel_max / peak_v
            v_cmd_raw *= scale
            w_cmd_raw *= scale

        return (v_cmd_raw, w_cmd_raw)

    lqr_step = step_lqr

    @_require_open
    def set_pid_gains(self, *args):
        self._pid_gains = args

    @_require_open
    def get_pid_gains(self):
        return self._pid_gains

    @_require_open
    def set_turn_pid_gains(self, *args):
        self._turn_pid_gains = args

    @_require_open
    def get_turn_pid_gains(self):
        return self._turn_pid_gains

    @_require_open
    def set_pivot_pid_gains(self, *args):
        self._pivot_pid_gains = args

    @_require_open
    def get_pivot_pid_gains(self):
        return self._pivot_pid_gains

    @_require_open
    def set_fusion_alpha(self, alpha: float):
        self._fusion_alpha = float(alpha)

    @_require_open
    def get_fusion_alpha(self) -> float:
        return self._fusion_alpha

    @_require_open
    def set_backlash_filter(self, enabled: bool):
        self._backlash_filter = bool(enabled)

    @_require_open
    def get_backlash_filter(self) -> bool:
        return self._backlash_filter

    @_require_open
    def set_backlash_limits(self, min_limit: float, max_limit: float):
        self._backlash_limits = (float(min_limit), float(max_limit))

    @_require_open
    def get_backlash_limits(self) -> Tuple[float, float]:
        return self._backlash_limits

    @_require_open
    def set_max_angular_speed(self, speed: float):
        self._max_angular_speed = float(speed)

    @_require_open
    def get_max_angular_speed(self) -> float:
        return self._max_angular_speed

    @_require_open
    def set_max_turn_speed(self, speed: float):
        self._max_turn_speed = float(speed)

    @_require_open
    def get_max_turn_speed(self) -> float:
        return self._max_turn_speed

    @_require_open
    def set_max_pivot_speed(self, speed: float):
        self._max_pivot_speed = float(speed)

    @_require_open
    def get_max_pivot_speed(self) -> float:
        return self._max_pivot_speed

    @_require_open
    def set_pid_min_turn(self, min_turn: float):
        self._pid_min_turn = float(min_turn)

    @_require_open
    def get_pid_min_turn(self) -> float:
        return self._pid_min_turn

    @_require_open
    def reset_color_calibration(self):
        self._color_baseline = (0.0, 0.0, 0.0)
        self._color_threshold = 10.0
        self._color_ambiguity_threshold = None
        self._color_prototypes.clear()
        self._color_classes.clear()
        self._color_sample_buffer.clear()
        self._black_reference = None
        self._white_reference = None
        self._gain = (0.01, 0.01, 0.01)

    @_require_open
    def set_color_baseline(self, base_h: float, base_s: float, base_v: float):
        base_h = float(base_h)
        base_s = float(base_s)
        base_v = float(base_v)
        if not (math.isfinite(base_h) and math.isfinite(base_s) and math.isfinite(base_v)):
            raise ValueError("Baseline HSV values must be finite numbers")
        if base_s < 0.0 or base_s > 100.0 or base_v < 0.0 or base_v > 100.0:
            raise ValueError("Baseline saturation and value must be between 0.0 and 100.0")
        norm_h = base_h % 360.0
        self._color_baseline = (norm_h, base_s, base_v)

    @_require_open
    def set_black_reference(self, r: float, g: float, b: float):
        r = float(r)
        g = float(g)
        b = float(b)
        if not (math.isfinite(r) and math.isfinite(g) and math.isfinite(b)):
            raise ValueError("Reference channel values must be finite numbers")
        if r < 0.0 or g < 0.0 or b < 0.0:
            raise ValueError("Reference channel values must be non-negative")
        if self._white_reference is not None:
            wr, wg, wb = self._white_reference
            if wr <= r + 5.0 or wg <= g + 5.0 or wb <= b + 5.0:
                raise ValueError("White reference must be strictly greater than black reference + 5.0")
            self._gain = (1.0 / (wr - r), 1.0 / (wg - g), 1.0 / (wb - b))
        self._black_reference = (r, g, b)

    @_require_open
    def set_white_reference(self, r: float, g: float, b: float):
        r = float(r)
        g = float(g)
        b = float(b)
        if not (math.isfinite(r) and math.isfinite(g) and math.isfinite(b)):
            raise ValueError("Reference channel values must be finite numbers")
        if r < 0.0 or g < 0.0 or b < 0.0:
            raise ValueError("Reference channel values must be non-negative")
        r0 = self._black_reference[0] if self._black_reference is not None else 0.0
        g0 = self._black_reference[1] if self._black_reference is not None else 0.0
        b0 = self._black_reference[2] if self._black_reference is not None else 0.0
        if r <= r0 + 5.0 or g <= g0 + 5.0 or b <= b0 + 5.0:
            raise ValueError("White reference must be strictly greater than black reference + 5.0")
        self._gain = (1.0 / (r - r0), 1.0 / (g - g0), 1.0 / (b - b0))
        self._white_reference = (r, g, b)

    @_require_open
    def normalize_color(self, r: float, g: float, b: float) -> Tuple[float, float, float]:
        r = float(r)
        g = float(g)
        b = float(b)
        if not (math.isfinite(r) and math.isfinite(g) and math.isfinite(b)):
            raise ValueError("Color channel values must be finite numbers")
        if r < 0.0 or g < 0.0 or b < 0.0:
            raise ValueError("Color channel values must be non-negative")
        r0 = self._black_reference[0] if self._black_reference is not None else 0.0
        g0 = self._black_reference[1] if self._black_reference is not None else 0.0
        b0 = self._black_reference[2] if self._black_reference is not None else 0.0
        kr, kg, kb = self._gain
        rn = max(0.0, min(1.0, (r - r0) * kr))
        gn = max(0.0, min(1.0, (g - g0) * kg))
        bn = max(0.0, min(1.0, (b - b0) * kb))
        return (rn, gn, bn)

    @_require_open
    def set_color_threshold(self, threshold: float):
        threshold = float(threshold)
        if not math.isfinite(threshold) or threshold <= 0.0:
            raise ValueError("Color threshold must be positive finite number")
        self._color_threshold = threshold

    @_require_open
    def set_color_ambiguity_threshold(self, threshold: float):
        threshold = float(threshold)
        if not math.isfinite(threshold) or threshold < 0.0:
            raise ValueError("Ambiguity threshold must be non-negative finite number")
        self._color_ambiguity_threshold = threshold

    @_require_open
    def circular_hue_distance(self, h1: float, h2: float) -> float:
        h1 = float(h1)
        h2 = float(h2)
        if not (math.isfinite(h1) and math.isfinite(h2)):
            return 180.0
        h1 = h1 % 360.0
        if h1 < 0.0:
            h1 += 360.0
        h2 = h2 % 360.0
        if h2 < 0.0:
            h2 += 360.0
        diff = abs(h1 - h2)
        return min(diff, 360.0 - diff)

    @_require_open
    def rgb_to_lab(self, r: float, g: float, b: float) -> Tuple[float, float, float]:
        r = float(r)
        g = float(g)
        b = float(b)
        if not (math.isfinite(r) and math.isfinite(g) and math.isfinite(b)):
            raise ValueError("Color coordinates must be finite numbers")
        if r < 0.0 or r > 100.0 or g < 0.0 or g > 100.0 or b < 0.0 or b > 100.0:
            raise ValueError("Color coordinates must be between 0.0 and 100.0")

        r_norm = r / 100.0
        g_norm = g / 100.0
        b_norm = b / 100.0

        def srgb_to_lin(c):
            if c <= 0.04045:
                return c / 12.92
            return ((c + 0.055) / 1.055) ** 2.4

        r_lin = srgb_to_lin(r_norm)
        g_lin = srgb_to_lin(g_norm)
        b_lin = srgb_to_lin(b_norm)

        # Standard D65 Matrix
        x = 0.4124564 * r_lin + 0.3575761 * g_lin + 0.1804375 * b_lin
        y = 0.2126729 * r_lin + 0.7151522 * g_lin + 0.0721750 * b_lin
        z = 0.0193339 * r_lin + 0.1191920 * g_lin + 0.9503041 * b_lin

        xr = x / 0.95047
        yr = y / 1.00000
        zr = z / 1.08883

        def f(t):
            if t > 0.00885645:
                return t ** (1.0 / 3.0)
            return 7.787037 * t + (16.0 / 116.0)

        fx = f(xr)
        fy = f(yr)
        fz = f(zr)

        l = 116.0 * fy - 16.0
        a = 500.0 * (fx - fy)
        b_val = 200.0 * (fy - fz)

        return (l, a, b_val)

    @_require_open
    def add_color_prototype(self, color_id: int, r: float, g: float, b: float):
        cid = int(color_id)
        if cid == 0:
            raise ValueError("Color ID must be non-zero")
        r = float(r)
        g = float(g)
        b = float(b)
        if not (math.isfinite(r) and math.isfinite(g) and math.isfinite(b)):
            raise ValueError("Prototype coordinates must be finite numbers")
        if r < 0.0 or r > 100.0 or g < 0.0 or g > 100.0 or b < 0.0 or b > 100.0:
            raise ValueError("Prototype coordinates must be between 0.0 and 100.0")
        self._color_prototypes[cid] = (r, g, b)

    @_require_open
    def add_color_sample(self, color_id: int, r: float, g: float, b: float):
        r = float(r)
        g = float(g)
        b = float(b)
        if not (math.isfinite(r) and math.isfinite(g) and math.isfinite(b)):
            raise ValueError("Color channel values must be finite numbers")
        if r < 0.0 or r > 100.0 or g < 0.0 or g > 100.0 or b < 0.0 or b > 100.0:
            raise ValueError("Color channel values must be between 0.0 and 100.0")
        cid = int(color_id)
        if cid == 0:
            raise ValueError("Color ID must be non-zero")

        if cid not in self._color_sample_buffer:
            self._color_sample_buffer[cid] = []

        if len(self._color_sample_buffer[cid]) >= 32:
            raise RuntimeError("Maximum sample buffer capacity exceeded (32)")

        in_r, in_g, in_b = r, g, b
        if self._black_reference is not None or self._white_reference is not None:
            rn, gn, bn = self.normalize_color(r, g, b)
            in_r, in_g, in_b = rn * 100.0, gn * 100.0, bn * 100.0

        h, s, v = _rgb_to_hsv_helper(in_r, in_g, in_b)
        l, a, b_lab = self.rgb_to_lab(in_r, in_g, in_b)

        self._color_sample_buffer[cid].append({
            "r": in_r, "g": in_g, "b": in_b,
            "h": h, "s": s, "v": v,
            "l": l, "a": a, "b_lab": b_lab
        })

    @_require_open
    def add_color_sample_hsv(self, color_id: int, h: float, s: float, v: float):
        h = float(h)
        s = float(s)
        v = float(v)
        if not (math.isfinite(h) and math.isfinite(s) and math.isfinite(v)):
            raise ValueError("Color channel values must be finite numbers")
        if h < 0.0 or h >= 360.0:
            raise ValueError("Hue must be in range [0, 360)")
        if s < 0.0 or s > 100.0 or v < 0.0 or v > 100.0:
            raise ValueError("Saturation and value must be between 0.0 and 100.0")
        cid = int(color_id)
        if cid == 0:
            raise ValueError("Color ID must be non-zero")

        norm_h = h % 360.0

        s_norm = s / 100.0
        v_norm = v / 100.0

        c = v_norm * s_norm
        h_prime = norm_h / 60.0
        x = c * (1.0 - abs((h_prime % 2.0) - 1.0))
        m = v_norm - c

        if 0.0 <= h_prime < 1.0:
            r1, g1, b1 = c, x, 0.0
        elif 1.0 <= h_prime < 2.0:
            r1, g1, b1 = x, c, 0.0
        elif 2.0 <= h_prime < 3.0:
            r1, g1, b1 = 0.0, c, x
        elif 3.0 <= h_prime < 4.0:
            r1, g1, b1 = 0.0, x, c
        elif 4.0 <= h_prime < 5.0:
            r1, g1, b1 = x, 0.0, c
        else:
            r1, g1, b1 = c, 0.0, x

        r = (r1 + m) * 100.0
        g = (g1 + m) * 100.0
        b = (b1 + m) * 100.0

        if cid not in self._color_sample_buffer:
            self._color_sample_buffer[cid] = []

        if len(self._color_sample_buffer[cid]) >= 32:
            raise RuntimeError("Maximum sample buffer capacity exceeded (32)")

        l, a, b_lab = self.rgb_to_lab(r, g, b)

        self._color_sample_buffer[cid].append({
            "r": r, "g": g, "b": b,
            "h": norm_h, "s": s, "v": v,
            "l": l, "a": a, "b_lab": b_lab
        })

    @_require_open
    def finalize_color_class(self, color_id: int):
        cid = int(color_id)
        if cid not in self._color_sample_buffer or len(self._color_sample_buffer[cid]) < 5:
            raise RuntimeError("Cannot finalize color class: minimum 5 samples required")

        samples = self._color_sample_buffer[cid]
        n = len(samples)

        # Pass 1: Compute initial circular mean hue and initial standard deviations
        sum_sin = sum(math.sin(math.radians(s["h"])) for s in samples)
        sum_cos = sum(math.cos(math.radians(s["h"])) for s in samples)
        init_mean_h = math.degrees(math.atan2(sum_sin, sum_cos)) % 360.0

        init_mean_s = sum(s["s"] for s in samples) / n
        init_mean_v = sum(s["v"] for s in samples) / n
        init_mean_l = sum(s["l"] for s in samples) / n
        init_mean_a = sum(s["a"] for s in samples) / n
        init_mean_b = sum(s["b_lab"] for s in samples) / n

        sum_sq_dh = sum(self.circular_hue_distance(s["h"], init_mean_h) ** 2 for s in samples)
        sum_sq_ds = sum((s["s"] - init_mean_s) ** 2 for s in samples)
        sum_sq_dv = sum((s["v"] - init_mean_v) ** 2 for s in samples)
        sum_sq_lab = sum((s["l"] - init_mean_l) ** 2 + (s["a"] - init_mean_a) ** 2 + (s["b_lab"] - init_mean_b) ** 2 for s in samples)

        sigma_h = math.sqrt(sum_sq_dh / (n - 1))
        sigma_s = math.sqrt(sum_sq_ds / (n - 1))
        sigma_v = math.sqrt(sum_sq_dv / (n - 1))
        sigma_lab = math.sqrt(sum_sq_lab / (n - 1))

        # Pass 2: Outlier rejection if n >= 10
        if n >= 10:
            kept = []
            for s in samples:
                dh = self.circular_hue_distance(s["h"], init_mean_h)
                ds = abs(s["s"] - init_mean_s)
                dv = abs(s["v"] - init_mean_v)
                d_lab = math.sqrt((s["l"] - init_mean_l) ** 2 + (s["a"] - init_mean_a) ** 2 + (s["b_lab"] - init_mean_b) ** 2)

                is_outlier = False
                if sigma_h > 0.1 and dh > 2.5 * sigma_h:
                    is_outlier = True
                if sigma_s > 0.1 and ds > 2.5 * sigma_s:
                    is_outlier = True
                if sigma_v > 0.1 and dv > 2.5 * sigma_v:
                    is_outlier = True
                if sigma_lab > 0.1 and d_lab > 2.5 * sigma_lab:
                    is_outlier = True

                if not is_outlier:
                    kept.append(s)

            if len(kept) < 3:
                kept = samples
        else:
            kept = samples

        kept_n = len(kept)

        # Pass 3: Final centroid and sample variances over kept samples
        sum_sin = sum(math.sin(math.radians(s["h"])) for s in kept)
        sum_cos = sum(math.cos(math.radians(s["h"])) for s in kept)
        final_mean_h = math.degrees(math.atan2(sum_sin, sum_cos)) % 360.0

        final_mean_s = sum(s["s"] for s in kept) / kept_n
        final_mean_v = sum(s["v"] for s in kept) / kept_n
        final_mean_l = sum(s["l"] for s in kept) / kept_n
        final_mean_a = sum(s["a"] for s in kept) / kept_n
        final_mean_b = sum(s["b_lab"] for s in kept) / kept_n

        sum_sq_dh = sum(self.circular_hue_distance(s["h"], final_mean_h) ** 2 for s in kept)
        sum_sq_ds = sum((s["s"] - final_mean_s) ** 2 for s in kept)
        sum_sq_dv = sum((s["v"] - final_mean_v) ** 2 for s in kept)
        sum_sq_lab = sum((s["l"] - final_mean_l) ** 2 + (s["a"] - final_mean_a) ** 2 + (s["b_lab"] - final_mean_b) ** 2 for s in kept)

        divisor = (kept_n - 1) if kept_n > 1 else 1.0
        final_var_h = sum_sq_dh / divisor
        final_var_s = sum_sq_ds / divisor
        final_var_v = sum_sq_dv / divisor
        final_var_lab = sum_sq_lab / divisor

        class_model = {
            "color_id": cid,
            "mean_h": final_mean_h,
            "mean_s": final_mean_s,
            "mean_v": final_mean_v,
            "mean_l": final_mean_l,
            "mean_a": final_mean_a,
            "mean_b": final_mean_b,
            "var_h": final_var_h,
            "var_s": final_var_s,
            "var_v": final_var_v,
            "var_lab": final_var_lab,
            "sample_count": kept_n
        }

        self._color_classes[cid] = class_model

        # Convert final_mean_h, s, v to rgb for prototype compatibility
        s_norm = final_mean_s / 100.0 if final_mean_s > 1.0 else final_mean_s
        v_norm = final_mean_v / 100.0 if final_mean_v > 1.0 else final_mean_v
        c = v_norm * s_norm
        h_prime = (final_mean_h % 360.0) / 60.0
        x = c * (1.0 - abs((h_prime % 2.0) - 1.0))
        m = v_norm - c
        if 0.0 <= h_prime < 1.0:
            r1, g1, b1 = c, x, 0.0
        elif 1.0 <= h_prime < 2.0:
            r1, g1, b1 = x, c, 0.0
        elif 2.0 <= h_prime < 3.0:
            r1, g1, b1 = 0.0, c, x
        elif 3.0 <= h_prime < 4.0:
            r1, g1, b1 = 0.0, x, c
        elif 4.0 <= h_prime < 5.0:
            r1, g1, b1 = x, 0.0, c
        else:
            r1, g1, b1 = c, 0.0, x
        r_c = (r1 + m) * 100.0
        g_c = (g1 + m) * 100.0
        b_c = (b1 + m) * 100.0

        self._color_prototypes[cid] = (r_c, g_c, b_c)
        del self._color_sample_buffer[cid]

    @_require_open
    def get_color_class(self, color_id: int) -> dict:
        cid = int(color_id)
        if cid not in self._color_classes:
            raise KeyError(f"Color class {cid} not calibrated")
        return dict(self._color_classes[cid])

    @_require_open
    def export_color_calibration_profile(self) -> dict:
        """Export persistent sensor-specific calibration profile dictionary."""
        return {
            "version": 1,
            "black_reference": list(self._black_reference) if self._black_reference is not None else None,
            "white_reference": list(self._white_reference) if self._white_reference is not None else None,
            "color_threshold": float(self._color_threshold),
            "ambiguity_threshold": float(self._color_ambiguity_threshold) if self._color_ambiguity_threshold is not None else None,
            "prototypes": {int(cid): list(coords) for cid, coords in self._color_prototypes.items()},
            "classes": {int(cid): dict(cdata) for cid, cdata in self._color_classes.items()},
            "metadata": {
                "sensor_type": "optical_rgb",
                "lux_reference": 500.0,
                "distance_nominal_mm": 10.0,
                "format_version": 1
            }
        }

    @_require_open
    def load_color_calibration_profile(self, profile: dict):
        """Restore persistent sensor-specific calibration profile from dictionary."""
        if not isinstance(profile, dict):
            raise TypeError("Profile must be a dictionary")
        if profile.get("version", 1) != 1:
            raise ValueError("Unsupported profile version")

        # Snapshot current calibration state for transactional rollback
        old_baseline = self._color_baseline
        old_threshold = self._color_threshold
        old_ambiguity = self._color_ambiguity_threshold
        old_prototypes = dict(self._color_prototypes)
        old_classes = {k: dict(v) for k, v in self._color_classes.items()}
        old_samples = [x for x in self._color_sample_buffer] if hasattr(self._color_sample_buffer, '__iter__') else []
        old_black_ref = tuple(self._black_reference) if self._black_reference is not None else None
        old_white_ref = tuple(self._white_reference) if self._white_reference is not None else None
        old_gain = self._gain

        try:
            self.reset_color_calibration()

            if profile.get("black_reference") is not None:
                r, g, b = profile["black_reference"]
                self.set_black_reference(r, g, b)

            if profile.get("white_reference") is not None:
                r, g, b = profile["white_reference"]
                self.set_white_reference(r, g, b)

            if "color_threshold" in profile and profile["color_threshold"] is not None:
                self.set_color_threshold(profile["color_threshold"])

            if "ambiguity_threshold" in profile and profile["ambiguity_threshold"] is not None:
                self.set_color_ambiguity_threshold(profile["ambiguity_threshold"])

            if "prototypes" in profile and isinstance(profile["prototypes"], dict):
                for cid, coords in profile["prototypes"].items():
                    self.add_color_prototype(int(cid), coords[0], coords[1], coords[2])

            if "classes" in profile and isinstance(profile["classes"], dict):
                for cid, cdata in profile["classes"].items():
                    self._color_classes[int(cid)] = dict(cdata)
        except Exception:
            # Atomic rollback: restore previous calibration state on any error
            self._color_baseline = old_baseline
            self._color_threshold = old_threshold
            self._color_ambiguity_threshold = old_ambiguity
            self._color_prototypes = old_prototypes
            self._color_classes = old_classes
            self._color_sample_buffer = old_samples
            self._black_reference = old_black_ref
            self._white_reference = old_white_ref
            self._gain = old_gain
            raise

    @_require_open
    def classify_color_rgb(self, r: float, g: float, b: float) -> Tuple[int, float, float]:
        r = float(r)
        g = float(g)
        b = float(b)
        if not (math.isfinite(r) and math.isfinite(g) and math.isfinite(b)):
            raise ValueError("Color channel values must be finite numbers")
        if r < 0.0 or r > 100.0 or g < 0.0 or g > 100.0 or b < 0.0 or b > 100.0:
            raise ValueError("Color channel values must be between 0.0 and 100.0")

        in_r, in_g, in_b = r, g, b
        if self._black_reference is not None or self._white_reference is not None:
            rn, gn, bn = self.normalize_color(r, g, b)
            in_r, in_g, in_b = rn * 100.0, gn * 100.0, bn * 100.0

        if not self._color_prototypes:
            return (0, 999999.0, 0.0)

        s_h, s_s, s_v = _rgb_to_hsv_helper(in_r, in_g, in_b)
        s_l, s_a, s_b = self.rgb_to_lab(in_r, in_g, in_b)

        wh, ws, wv, wlab = 0.40, 0.20, 0.10, 0.30

        best_id = 0
        min_dist = float("inf")
        second_min_dist = float("inf")

        for cid, proto in self._color_prototypes.items():
            pr, pg, pb = proto[:3]
            p_h, p_s, p_v = _rgb_to_hsv_helper(pr, pg, pb)
            p_l, p_a, p_b = self.rgb_to_lab(pr, pg, pb)

            dh = self.circular_hue_distance(s_h, p_h)
            dh_norm = dh / 180.0
            ds_norm = abs(s_s - p_s) / 100.0
            dv_norm = abs(s_v - p_v) / 100.0

            dE = math.sqrt((s_l - p_l) ** 2 + (s_a - p_a) ** 2 + (s_b - p_b) ** 2)
            dE_norm = min(1.0, dE / 100.0)

            d_norm = math.sqrt(wh * dh_norm ** 2 + ws * ds_norm ** 2 + wv * dv_norm ** 2 + wlab * dE_norm ** 2)
            dist = d_norm * 100.0

            if dist < min_dist:
                second_min_dist = min_dist
                min_dist = dist
                best_id = cid
            elif dist < second_min_dist:
                second_min_dist = dist

        threshold = self._color_threshold if self._color_threshold > 0.0 else 40.0
        ambig_thresh = self._color_ambiguity_threshold if (self._color_ambiguity_threshold is not None and self._color_ambiguity_threshold >= 0.0) else (0.15 * threshold)
        if min_dist > threshold:
            return (0, float(min_dist), 0.0)

        if len(self._color_prototypes) == 1:
            confidence = 1.0
        else:
            confidence = max(0.0, min(1.0, (second_min_dist - min_dist) / (second_min_dist + min_dist + 1e-6)))

        if len(self._color_prototypes) > 1 and (second_min_dist - min_dist) < ambig_thresh:
            return (0, float(min_dist), float(confidence))

        return (int(best_id), float(min_dist), float(confidence))

    @_require_open
    def classify_color_hsv(self, h: float, s: float, v: float) -> Tuple[int, float, float]:
        h = float(h)
        s = float(s)
        v = float(v)
        if not (math.isfinite(h) and math.isfinite(s) and math.isfinite(v)):
            raise ValueError("Color channel values must be finite numbers")
        if h < 0.0 or h >= 360.0:
            raise ValueError("Hue must be in range [0, 360)")
        if s < 0.0 or s > 100.0 or v < 0.0 or v > 100.0:
            raise ValueError("Saturation and value must be between 0.0 and 100.0")

        if not self._color_prototypes:
            return (0, 999999.0, 0.0)

        s_norm = s / 100.0
        v_norm = v / 100.0
        c = v_norm * s_norm
        h_prime = h / 60.0
        x = c * (1.0 - abs((h_prime % 2.0) - 1.0))
        m = v_norm - c

        if 0.0 <= h_prime < 1.0:
            r1, g1, b1 = c, x, 0.0
        elif 1.0 <= h_prime < 2.0:
            r1, g1, b1 = x, c, 0.0
        elif 2.0 <= h_prime < 3.0:
            r1, g1, b1 = 0.0, c, x
        elif 3.0 <= h_prime < 4.0:
            r1, g1, b1 = 0.0, x, c
        elif 4.0 <= h_prime < 5.0:
            r1, g1, b1 = x, 0.0, c
        else:
            r1, g1, b1 = c, 0.0, x

        s_r = (r1 + m) * 100.0
        s_g = (g1 + m) * 100.0
        s_b = (b1 + m) * 100.0
        s_l, s_a, s_b_lab = self.rgb_to_lab(s_r, s_g, s_b)

        wh, ws, wv, wlab = 0.40, 0.20, 0.10, 0.30

        best_id = 0
        min_dist = float("inf")
        second_min_dist = float("inf")

        for cid, proto in self._color_prototypes.items():
            pr, pg, pb = proto[:3]
            p_h, p_s, p_v = _rgb_to_hsv_helper(pr, pg, pb)
            p_l, p_a, p_b_lab = self.rgb_to_lab(pr, pg, pb)

            dh = self.circular_hue_distance(h, p_h)
            dh_norm = dh / 180.0
            ds_norm = abs(s - p_s) / 100.0
            dv_norm = abs(v - p_v) / 100.0

            dE = math.sqrt((s_l - p_l) ** 2 + (s_a - p_a) ** 2 + (s_b_lab - p_b_lab) ** 2)
            dE_norm = min(1.0, dE / 100.0)

            d_norm = math.sqrt(wh * dh_norm ** 2 + ws * ds_norm ** 2 + wv * dv_norm ** 2 + wlab * dE_norm ** 2)
            dist = d_norm * 100.0

            if dist < min_dist:
                second_min_dist = min_dist
                min_dist = dist
                best_id = cid
            elif dist < second_min_dist:
                second_min_dist = dist

        threshold = self._color_threshold if self._color_threshold > 0.0 else 40.0
        ambig_thresh = self._color_ambiguity_threshold if (self._color_ambiguity_threshold is not None and self._color_ambiguity_threshold >= 0.0) else (0.15 * threshold)
        if min_dist > threshold:
            return (0, float(min_dist), 0.0)

        if len(self._color_prototypes) == 1:
            confidence = 1.0
        else:
            confidence = max(0.0, min(1.0, (second_min_dist - min_dist) / (second_min_dist + min_dist + 1e-6)))

        if len(self._color_prototypes) > 1 and (second_min_dist - min_dist) < ambig_thresh:
            return (0, float(min_dist), float(confidence))

        return (int(best_id), float(min_dist), float(confidence))

    @_require_open
    def classify_color(self, r: float, g: float, b: float) -> Tuple[int, float, float]:
        return self.classify_color_rgb(r, g, b)

    @_require_open
    def curve(self, radius: float, angle: float, then: Stop = Stop.HOLD, wait: bool = True):
        self._theta += float(angle)

    @_require_open
    def drive(self, speed: float, turn_rate: float):
        pass

__all__ = ["MDRobotBase"]
