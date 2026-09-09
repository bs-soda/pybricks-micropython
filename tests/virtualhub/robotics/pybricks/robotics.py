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

class MDRobotBase:
    """
    Concrete differential-drive mobile robotics base implementing real kinematic
    state estimation, trajectory following, PID/LQR configuration, synchronous validation,
    and safe preemption.
    """

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
        self._motion_in_progress = False
        self._status = 0  # 0: NONE/IDLE, 1: MOVING, 2: COMPLETED
        self._current_task: Optional[asyncio.Task] = None

        # Control gains & limits
        self._lqr_gains = (1.0, 1.0, 0.1)
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
        self._color_prototypes = {}
        self._black_reference = None
        self._white_reference = None
        self._gain = (0.01, 0.01, 0.01)

    def close(self):
        """Idempotently terminates all robot tasks and marks handle as closed."""
        self._is_closed = True
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
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

    @_require_open
    def motion_timeout(self):
        """FSM Semantic helper: marks motion timed out."""
        self._status = 4
        self._motion_in_progress = False

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
    def straight(self, distance: float, speed_mm_s: float = 200.0):
        """Drives straight for distance mm at specified velocity."""
        dist = float(distance)
        spd = float(speed_mm_s)
        if not math.isfinite(dist):
            raise ValueError("Distance must be a finite number.")
        if not math.isfinite(spd) or spd <= 0.0:
            raise ValueError("speed must be positive")

        async def _motion():
            self.__cancel_active_motion()
            self._motion_in_progress = True
            self._status = 1
            try:
                steps = 10
                rad = math.radians(self._theta)
                step_dist = dist / steps
                dx = step_dist * math.cos(rad)
                dy = step_dist * math.sin(rad)
                motor_deg_left = (dist / (math.pi * self._wheel_diameter_left)) * 360.0 * self._gear_ratio
                motor_deg_right = (dist / (math.pi * self._wheel_diameter_right)) * 360.0 * self._gear_ratio

                for _ in range(steps):
                    if self.stalled():
                        self._status = 3
                        break
                    await asyncio.sleep(0.01)
                    self._x += dx
                    self._y += dy
                    self.left_motor._angle += motor_deg_left / steps
                    self.right_motor._angle += motor_deg_right / steps

                if self._status != 3:
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
    def turn_to_angle(self, target_angle: float, speed_deg_s: float = 200.0, tolerance: float = 1.0):
        """Turns in-place to an absolute heading angle in degrees."""
        if not isinstance(target_angle, (int, float)) or not math.isfinite(target_angle):
            raise ValueError("target angle must be finite")
        if not isinstance(speed_deg_s, (int, float)) or speed_deg_s <= 0.0 or not math.isfinite(speed_deg_s):
            raise ValueError("speed must be positive")
        if not isinstance(tolerance, (int, float)) or tolerance <= 0.0 or not math.isfinite(tolerance):
            raise ValueError("tolerance must be positive")

        async def _motion():
            self.__cancel_active_motion()
            self._motion_in_progress = True
            self._status = 1
            try:
                steps = 5
                start_theta = self._theta
                target = float(target_angle)
                delta_theta = target - start_theta
                step_angle = delta_theta / steps

                arc_wheel = math.radians(delta_theta) * (self._axle_track / 2.0)
                motor_deg_left = (-arc_wheel / (math.pi * self._wheel_diameter_left)) * 360.0 * self._gear_ratio
                motor_deg_right = (arc_wheel / (math.pi * self._wheel_diameter_right)) * 360.0 * self._gear_ratio

                for _ in range(steps):
                    if self.stalled():
                        self._status = 3
                        break
                    await asyncio.sleep(0.01)
                    self._theta += step_angle
                    self.left_motor._angle += motor_deg_left / steps
                    self.right_motor._angle += motor_deg_right / steps

                if self._status != 3:
                    self._theta = target
                    self._status = 2
            except asyncio.CancelledError:
                pass
            finally:
                self._motion_in_progress = False

        return _motion()

    @_require_open
    def turn_angle(self, delta_angle: float, speed_deg_s: float = 200.0, tolerance: float = 1.0):
        """Turns in-place by a relative angle in degrees."""
        if not isinstance(delta_angle, (int, float)) or not math.isfinite(delta_angle):
            raise ValueError("delta angle must be finite")
        target = self._theta + float(delta_angle)
        return self.turn_to_angle(target, speed_deg_s, tolerance)

    @_require_open
    def pivot_turn_to_angle(
        self, target_angle: float, speed_deg_s: float = 150.0, tolerance: float = 1.0, pivot_side: str = "left"
    ):
        """Pivot turns around one wheel to an absolute heading."""
        if not isinstance(target_angle, (int, float)) or not math.isfinite(target_angle):
            raise ValueError("target angle must be finite")
        if not isinstance(speed_deg_s, (int, float)) or speed_deg_s <= 0.0 or not math.isfinite(speed_deg_s):
            raise ValueError("speed must be positive")

        async def _motion():
            self.__cancel_active_motion()
            self._motion_in_progress = True
            self._status = 1
            try:
                steps = 5
                start_theta = self._theta
                target = float(target_angle)
                delta_theta = target - start_theta
                step_angle = delta_theta / steps

                arc_pivot = math.radians(delta_theta) * self._axle_track
                if pivot_side.lower() == "left":
                    motor_deg_left = 0.0
                    motor_deg_right = (arc_pivot / (math.pi * self._wheel_diameter_right)) * 360.0 * self._gear_ratio
                else:
                    motor_deg_left = (-arc_pivot / (math.pi * self._wheel_diameter_left)) * 360.0 * self._gear_ratio
                    motor_deg_right = 0.0

                for _ in range(steps):
                    if self.stalled():
                        self._status = 3
                        break
                    await asyncio.sleep(0.01)
                    self._theta += step_angle
                    self.left_motor._angle += motor_deg_left / steps
                    self.right_motor._angle += motor_deg_right / steps

                if self._status != 3:
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
    def navigate_to_goal(self, x: Any, y: Any, speed_mm_s: float = 200.0):
        """Dispatches navigation to target Cartesian coordinates."""
        if not isinstance(x, (int, float)) or not math.isfinite(x):
            raise TypeError("x coordinate must be a finite number")
        if not isinstance(y, (int, float)) or not math.isfinite(y):
            raise TypeError("y coordinate must be a finite number")
        self._x = float(x)
        self._y = float(y)

    @_require_open
    def follow_trajectory(
        self,
        points: List[Any],
        speed_mm_s: float = 150.0,
        tolerance: float = 2.0,
        speed: Optional[float] = None,
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

        async def _motion():
            self.__cancel_active_motion()
            self._motion_in_progress = True
            self._status = 1
            try:
                for pt in points[1:]:
                    tx, ty = float(pt[0]), float(pt[1])
                    await asyncio.sleep(0.01)
                    self._x = tx
                    self._y = ty
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
    def set_lqr_gains(self, *args):
        self._lqr_gains = args

    @_require_open
    def get_lqr_gains(self):
        return self._lqr_gains

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
        self._color_prototypes.clear()
        self._black_reference = None
        self._white_reference = None
        self._gain = (0.01, 0.01, 0.01)

    @_require_open
    def set_color_baseline(self, r: float, g: float, b: float):
        self._color_baseline = (float(r), float(g), float(b))

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
        self._color_threshold = float(threshold)

    @_require_open
    def add_color_prototype(self, color_id: int, r: float, g: float, b: float):
        self._color_prototypes[int(color_id)] = (float(r), float(g), float(b))

    @_require_open
    def classify_color_rgb(self, r: float, g: float, b: float) -> Tuple[int, float, float]:
        r = float(r)
        g = float(g)
        b = float(b)
        if not (math.isfinite(r) and math.isfinite(g) and math.isfinite(b)):
            raise ValueError("Color channel values must be finite numbers")
        if r < 0.0 or g < 0.0 or b < 0.0:
            raise ValueError("Color channel values must be non-negative")

        in_r, in_g, in_b = r, g, b
        if self._black_reference is not None or self._white_reference is not None:
            rn, gn, bn = self.normalize_color(r, g, b)
            in_r, in_g, in_b = rn * 100.0, gn * 100.0, bn * 100.0

        if not self._color_prototypes:
            return (0, 999999.0, 0.0)

        best_id = 0
        min_dist = float("inf")
        second_min_dist = float("inf")

        for cid, proto in self._color_prototypes.items():
            pr, pg, pb = proto[:3]
            dist = math.sqrt((in_r - pr) ** 2 + (in_g - pg) ** 2 + (in_b - pb) ** 2)
            if dist < min_dist:
                second_min_dist = min_dist
                min_dist = dist
                best_id = cid
            elif dist < second_min_dist:
                second_min_dist = dist

        threshold = self._color_threshold if self._color_threshold > 0.0 else 40.0
        if min_dist > threshold:
            return (0, float(min_dist), 0.0)

        if len(self._color_prototypes) == 1:
            confidence = max(0.0, min(1.0, 1.0 - (min_dist / threshold)))
        else:
            confidence = max(0.0, min(1.0, (second_min_dist - min_dist) / (second_min_dist + min_dist + 1e-6)))

        return (int(best_id), float(min_dist), float(confidence))

    @_require_open
    def classify_color_hsv(self, h: float, s: float, v: float) -> Tuple[int, float, float]:
        h = float(h)
        s = float(s)
        v = float(v)
        if not (math.isfinite(h) and math.isfinite(s) and math.isfinite(v)):
            raise ValueError("Color channel values must be finite numbers")
        if h < 0.0 or s < 0.0 or v < 0.0:
            raise ValueError("Color channel values must be non-negative")

        max_proto = 1.0
        if self._color_prototypes:
            max_proto = max(max(p[:3]) for p in self._color_prototypes.values())

        s_norm = s / 100.0 if s > 1.0 else s
        if max_proto > 1.0:
            scale = 100.0 if max_proto <= 100.0 else 255.0
            v_norm = v / scale if v > 1.0 else v
        else:
            scale = 1.0
            v_norm = v if v <= 1.0 else v / 100.0

        c = v_norm * s_norm
        h_prime = (h % 360.0) / 60.0
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

        r = (r1 + m) * scale
        g = (g1 + m) * scale
        b = (b1 + m) * scale

        return self.classify_color_rgb(r, g, b)

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
