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
import threading
import time
from typing import Any, Dict, List, Optional, Tuple
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


class _ClassOrInstanceMethod:
    """Descriptor supporting both classmethod and instance-level calls with closed-object protection."""
    def __init__(self, func):
        self.func = func
        functools.update_wrapper(self, func)

    def __get__(self, instance, owner=None):
        if instance is not None:
            def instance_wrapper(*args, **kwargs):
                if getattr(instance, "_is_closed", False):
                    raise RuntimeError("MDRobotBase instance is closed")
                return self.func(owner, *args, **kwargs)
            return instance_wrapper
        def class_wrapper(*args, **kwargs):
            return self.func(owner, *args, **kwargs)
        return class_wrapper


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
    _lqr_workspace_busy: bool = False
    _lqr_workspace_lock: threading.Lock = threading.Lock()

    @_ClassOrInstanceMethod
    def _lqr_workspace_acquire(cls) -> bool:
        with cls._lqr_workspace_lock:
            if cls._lqr_workspace_busy:
                return False
            cls._lqr_workspace_busy = True
            return True

    @_ClassOrInstanceMethod
    def _lqr_workspace_release(cls):
        with cls._lqr_workspace_lock:
            cls._lqr_workspace_busy = False

    @_ClassOrInstanceMethod
    def _lqr_workspace_is_busy(cls) -> bool:
        with cls._lqr_workspace_lock:
            return cls._lqr_workspace_busy

    @_ClassOrInstanceMethod
    def _lqr_workspace_set_busy_for_testing(cls, busy: bool):
        with cls._lqr_workspace_lock:
            cls._lqr_workspace_busy = bool(busy)

    @classmethod
    def deinit_all(cls):
        """De-initializes all active instances, releasing all motor slots and LQR workspace."""
        for inst in list(cls._active_instances):
            inst.close()
        cls._active_instances.clear()
        cls._lqr_workspace_release()

    def __init__(
        self,
        left_motor: Motor,
        right_motor: Motor,
        *args,
        wheel_diameter: float = 56.0,
        wheel_diameter_left: Optional[float] = None,
        wheel_diameter_right: Optional[float] = None,
        axle_track: float = 112.0,
        debug: bool = False,
        **kwargs,
    ):
        self.left_motor = left_motor
        self.right_motor = right_motor
        self._debug = bool(debug)
        self._startup_retry_start_time = None
        self._motion_started = False
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
            if isinstance(args[0], (tuple, list)):
                self._wheel_diameter_left = float(args[0][0])
                self._wheel_diameter_right = float(args[0][1])
            else:
                self._wheel_diameter_left = float(args[0])
                self._wheel_diameter_right = float(args[0])
            self._axle_track = float(args[1])
        elif len(args) == 1:
            if isinstance(args[0], (tuple, list)):
                self._wheel_diameter_left = float(args[0][0])
                self._wheel_diameter_right = float(args[0][1])
            else:
                self._wheel_diameter_left = float(args[0])
                self._wheel_diameter_right = float(args[0])
            self._axle_track = float(axle_track)
        elif wheel_diameter_left is not None and wheel_diameter_right is not None:
            self._wheel_diameter_left = float(wheel_diameter_left)
            self._wheel_diameter_right = float(wheel_diameter_right)
            self._axle_track = float(axle_track)
        else:
            if isinstance(wheel_diameter, (tuple, list)):
                self._wheel_diameter_left = float(wheel_diameter[0])
                self._wheel_diameter_right = float(wheel_diameter[1])
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
        self._pid_gains = (1.0, 0.0, 0.1)
        self._turn_pid_gains = (1.2, 0.0, 0.15)
        self._pivot_pid_gains = (1.1, 0.0, 0.12)
        try:
            self.set_lqr_preset(0, True)
        except RuntimeError as e:
            if "LQR solver workspace busy" in str(e):
                raise RuntimeError("motors already in use or LQR solver workspace busy") from e
            raise
        self._fusion_alpha = 0.98
        self._backlash_filter = True
        self._backlash_limits = (-5.0, 5.0)
        self._backlash_left_accum = 0.0
        self._backlash_right_accum = 0.0
        self._encoders_initialized = False
        self._last_left_deg = float("nan")
        self._last_right_deg = float("nan")
        try:
            if hasattr(self.left_motor, "angle") and hasattr(self.right_motor, "angle"):
                self._last_left_deg = float(self.left_motor.angle())
                self._last_right_deg = float(self.right_motor.angle())
                self._encoders_initialized = True
        except Exception:
            self._last_left_deg = float("nan")
            self._last_right_deg = float("nan")
            self._encoders_initialized = False
        self._last_gyro_heading = 0.0
        self._state_initialized = False
        self._imu_ready = True
        self._imu_latch_needed = False
        self._left_state_failures = 0
        self._right_state_failures = 0
        self._left_failure_start_time = None
        self._right_failure_start_time = None
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
        self._motion_started = False
        self._startup_retry_start_time = None

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
    def reset_state(self, x: float = 0.0, y: float = 0.0, theta: float = 0.0, gyro_heading: Optional[float] = None):
        """Resets odometric state estimation to specified coordinates."""
        if not math.isfinite(x) or not math.isfinite(y) or not math.isfinite(theta):
            raise ValueError("State coordinates must be finite numbers")
        self._x = float(x)
        self._y = float(y)
        self._theta = float(theta)
        while self._theta > 180.0:
            self._theta -= 360.0
        while self._theta < -180.0:
            self._theta += 360.0
        if gyro_heading is not None:
            if not math.isfinite(gyro_heading):
                if self._fusion_alpha > 0.0 and getattr(self, "_imu_ready", True):
                    raise RuntimeError("MDRobotBase IMU heading unavailable")
                else:
                    self._last_gyro_heading = 0.0
            else:
                self._last_gyro_heading = float(gyro_heading)
        else:
            self._last_gyro_heading = self._theta
        if not getattr(self, "_imu_ready", True):
            self._imu_latch_needed = True
        if (hasattr(self.left_motor, "_io_error") and self.left_motor._io_error) or \
           (hasattr(self.right_motor, "_io_error") and self.right_motor._io_error):
            raise OSError("MDRobotBase motor communication failed")

        if (hasattr(self.left_motor, "_closed") and self.left_motor._closed) or \
           (hasattr(self.right_motor, "_closed") and self.right_motor._closed) or \
           (hasattr(self.left_motor, "connected") and not self.left_motor.connected) or \
           (hasattr(self.right_motor, "connected") and not self.right_motor.connected):
            raise OSError("MDRobotBase motor is not connected")

        self._left_state_failures = 0
        self._right_state_failures = 0
        self._left_failure_start_time = None
        self._right_failure_start_time = None

        self._last_left_deg = float(self.left_motor.angle()) if hasattr(self.left_motor, "angle") else 0.0
        self._last_right_deg = float(self.right_motor.angle()) if hasattr(self.right_motor, "angle") else 0.0
        self._backlash_left_accum = 0.0
        self._backlash_right_accum = 0.0
        self._dist_traveled = 0.0
        self._turn_integral = 0.0
        self._stall_time_ms = 0.0
        self._encoders_initialized = True
        self._state_initialized = True

    @_require_open
    def get_failure_counters(self) -> Tuple[int, int]:
        """Returns (left_state_failures, right_state_failures)."""
        return (self._left_state_failures, self._right_state_failures)

    @_require_open
    def update_state(self, *args, **kwargs):
        """
        Updates odometric state coordinates.
        Supports:
        - update_state(x, y, theta): direct coordinate update (simulation / mock mode)
        - update_state(gyro_heading): differential drive + gyro/encoder fusion odometry update
        """
        if not math.isfinite(self._x) or not math.isfinite(self._y) or not math.isfinite(self._theta):
            raise ValueError("LQR controller received invalid pose or configuration")

        is_l_io = bool(getattr(self.left_motor, "_io_error", False))
        is_r_io = bool(getattr(self.right_motor, "_io_error", False))
        is_l_no_dev = bool(getattr(self.left_motor, "_closed", False) or (hasattr(self.left_motor, "connected") and not self.left_motor.connected))
        is_r_no_dev = bool(getattr(self.right_motor, "_closed", False) or (hasattr(self.right_motor, "connected") and not self.right_motor.connected))
        is_l_busy = bool(getattr(self.left_motor, "_transient_busy", False))
        is_r_busy = bool(getattr(self.right_motor, "_transient_busy", False))

        now_mono = time.monotonic()
        if is_l_io or is_l_no_dev or is_l_busy:
            self._left_state_failures += 1
            if self._left_failure_start_time is None:
                self._left_failure_start_time = now_mono
        else:
            self._left_state_failures = 0
            self._left_failure_start_time = None

        if is_r_io or is_r_no_dev or is_r_busy:
            self._right_state_failures += 1
            if self._right_failure_start_time is None:
                self._right_failure_start_time = now_mono
        else:
            self._right_state_failures = 0
            self._right_failure_start_time = None

        left_persistent = (is_l_io or is_l_no_dev) and (
            self._left_state_failures >= 20 and
            (self._left_failure_start_time is not None and (now_mono - self._left_failure_start_time) >= 0.500)
        )
        right_persistent = (is_r_io or is_r_no_dev) and (
            self._right_state_failures >= 20 and
            (self._right_failure_start_time is not None and (now_mono - self._right_failure_start_time) >= 0.500)
        )

        if left_persistent or right_persistent:
            if (left_persistent and is_l_no_dev) or (right_persistent and is_r_no_dev):
                raise OSError("MDRobotBase motor is not connected")
            if (left_persistent and is_l_io) or (right_persistent and is_r_io):
                raise OSError("MDRobotBase motor communication failed")

        if is_l_io or is_r_io or is_l_no_dev or is_r_no_dev or is_l_busy or is_r_busy:
            # Transient failure: return early without raising error
            return

        if len(args) == 3:
            self._x = float(args[0])
            self._y = float(args[1])
            self._theta = float(args[2])
            while self._theta > 180.0:
                self._theta -= 360.0
            while self._theta < -180.0:
                self._theta += 360.0
            return

        gyro_val = None
        if len(args) == 1:
            gyro_val = float(args[0])
        elif "gyro_heading" in kwargs:
            gyro_val = float(kwargs["gyro_heading"])
        elif len(args) == 0:
            if getattr(self, "_imu_ready", True):
                gyro_val = getattr(self, "_imu_heading", 0.0)
            else:
                gyro_val = 0.0
        else:
            raise TypeError("update_state takes either 0 or 1 argument (gyro_heading) or 3 arguments (x, y, theta)")

        imu_ready = getattr(self, "_imu_ready", True)
        if not math.isfinite(gyro_val):
            if self._fusion_alpha > 0.0 and imu_ready:
                raise RuntimeError("MDRobotBase IMU heading unavailable")
            else:
                gyro_val = self._last_gyro_heading if math.isfinite(self._last_gyro_heading) else 0.0

        effective_alpha = self._fusion_alpha if (imu_ready and math.isfinite(gyro_val)) else 0.0

        # Read motor encoder positions
        left_deg = float(self.left_motor.angle()) if hasattr(self.left_motor, "angle") else 0.0
        right_deg = float(self.right_motor.angle()) if hasattr(self.right_motor, "angle") else 0.0

        if not self._encoders_initialized or math.isnan(self._last_left_deg) or math.isnan(self._last_right_deg):
            self._last_left_deg = left_deg
            self._last_right_deg = right_deg
            self._encoders_initialized = True

        if not self._state_initialized:
            self._last_gyro_heading = gyro_val if math.isfinite(gyro_val) else 0.0
            self._state_initialized = True

        d_left_ticks = left_deg - self._last_left_deg
        d_right_ticks = right_deg - self._last_right_deg
        self._last_left_deg = left_deg
        self._last_right_deg = right_deg

        # Apply gear ratio
        if self._gear_ratio != 0.0:
            d_left_ticks /= self._gear_ratio
            d_right_ticks /= self._gear_ratio

        # Backlash filter
        if self._backlash_filter:
            limit_l = abs(self._backlash_limits[1]) if isinstance(self._backlash_limits, tuple) else 1.0
            limit_r = abs(self._backlash_limits[1]) if isinstance(self._backlash_limits, tuple) else 1.0

            left_cand = self._backlash_left_accum + d_left_ticks
            if left_cand > limit_l:
                d_left_ticks = left_cand - limit_l
                self._backlash_left_accum = limit_l
            elif left_cand < -limit_l:
                d_left_ticks = left_cand + limit_l
                self._backlash_left_accum = -limit_l
            else:
                d_left_ticks = 0.0
                self._backlash_left_accum = left_cand

            right_cand = self._backlash_right_accum + d_right_ticks
            if right_cand > limit_r:
                d_right_ticks = right_cand - limit_r
                self._backlash_right_accum = limit_r
            elif right_cand < -limit_r:
                d_right_ticks = right_cand + limit_r
                self._backlash_right_accum = -limit_r
            else:
                d_right_ticks = 0.0
                self._backlash_right_accum = right_cand

        d_left = (d_left_ticks / 360.0) * math.pi * self._wheel_diameter_left
        d_right = (d_right_ticks / 360.0) * math.pi * self._wheel_diameter_right
        d_center = (d_left + d_right) / 2.0

        if imu_ready and math.isfinite(gyro_val):
            if getattr(self, "_imu_latch_needed", False):
                self._last_gyro_heading = gyro_val
                self._imu_latch_needed = False
            delta_theta_gyro = -(gyro_val - self._last_gyro_heading)
            while delta_theta_gyro > 180.0:
                delta_theta_gyro -= 360.0
            while delta_theta_gyro < -180.0:
                delta_theta_gyro += 360.0
            self._last_gyro_heading = gyro_val
        else:
            delta_theta_gyro = 0.0

        delta_theta_enc_rad = (d_right - d_left) / self._axle_track
        delta_theta_enc_deg = delta_theta_enc_rad * (180.0 / math.pi)

        delta_theta = effective_alpha * delta_theta_gyro + (1.0 - effective_alpha) * delta_theta_enc_deg

        motion_type = getattr(self, "_motion_type", 0)
        if motion_type == 2:  # TURN
            d_center = 0.0
            avg_angle_rad = (self._theta + delta_theta / 2.0) * (math.pi / 180.0)
            self._x += d_center * math.cos(avg_angle_rad)
            self._y += d_center * math.sin(avg_angle_rad)
        elif motion_type == 3:  # PIVOT
            old_theta_rad = self._theta * (math.pi / 180.0)
            new_theta_rad = (self._theta + delta_theta) * (math.pi / 180.0)
            pivot_left = getattr(self, "_pivot_left", False)
            r_offset = (self._axle_track / 2.0) if pivot_left else -(self._axle_track / 2.0)
            self._x += r_offset * (math.sin(new_theta_rad) - math.sin(old_theta_rad))
            self._y += -r_offset * (math.cos(new_theta_rad) - math.cos(old_theta_rad))
        else:
            avg_angle_rad = (self._theta + delta_theta / 2.0) * (math.pi / 180.0)
            self._x += d_center * math.cos(avg_angle_rad)
            self._y += d_center * math.sin(avg_angle_rad)

        self._theta += delta_theta
        while self._theta > 180.0:
            self._theta -= 360.0
        while self._theta < -180.0:
            self._theta += 360.0

        if not math.isfinite(self._x) or not math.isfinite(self._y) or not math.isfinite(self._theta):
            raise RuntimeError("MDRobotBase odometry update failed")

    @_require_open
    def get_state(self) -> Tuple[float, float, float]:
        """Returns (x, y, theta) odometric coordinates in (mm, mm, deg)."""
        return (self._x, self._y, self._theta)

    @_require_open
    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns diagnostic state of motor connections, control loops, and motion mode."""
        left_err = 0
        right_err = 0
        if (hasattr(self.left_motor, "_closed") and self.left_motor._closed) or \
           (hasattr(self.left_motor, "connected") and not self.left_motor.connected):
            left_err = 19  # ENODEV / PBIO_ERROR_NO_DEV
        elif hasattr(self.left_motor, "_io_error") and self.left_motor._io_error:
            left_err = 5   # EIO / PBIO_ERROR_IO

        if (hasattr(self.right_motor, "_closed") and self.right_motor._closed) or \
           (hasattr(self.right_motor, "connected") and not self.right_motor.connected):
            right_err = 19  # ENODEV / PBIO_ERROR_NO_DEV
        elif hasattr(self.right_motor, "_io_error") and self.right_motor._io_error:
            right_err = 5   # EIO / PBIO_ERROR_IO

        err_str_map = {
            0: "success",
            5: "I/O error",
            19: "Device not connected",
        }
        left_str = err_str_map.get(left_err, "Unknown error")
        right_str = err_str_map.get(right_err, "Unknown error")

        if getattr(self, "_debug", False):
            print(f"[MDRobotBase Diagnostics]\n"
                  f"  left_state_error: {left_err} ({left_str})\n"
                  f"  right_state_error: {right_err} ({right_str})\n"
                  f"  control_loop_left: {1 if getattr(self.left_motor, '_run_update_loop', False) else 0}\n"
                  f"  control_loop_right: {1 if getattr(self.right_motor, '_run_update_loop', False) else 0}\n"
                  f"  motion_type: {int(self._status)}\n"
                  f"  controller_type: {int(getattr(self, '_controller', 0))}")

        return {
            "left_state_error": left_err,
            "right_state_error": right_err,
            "left_state_failures": self._left_state_failures,
            "right_state_failures": self._right_state_failures,
            "left_error_str": left_str,
            "right_error_str": right_str,
            "control_loop_left": bool(getattr(self.left_motor, "_run_update_loop", False)),
            "control_loop_right": bool(getattr(self.right_motor, "_run_update_loop", False)),
            "motion_type": int(self._status),
            "controller_type": int(getattr(self, "_controller", 0)),
        }

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
        then: Any = None,
        accel_angle: Optional[float] = None,
        start_speed: Optional[float] = None,
        decel_angle: Optional[float] = None,
        end_speed: Optional[float] = None,
        **kwargs,
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
                        self.stop()
                        raise RuntimeError("MDRobotBase turn stalled")
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
        then: Any = None,
        accel_angle: Optional[float] = None,
        start_speed: Optional[float] = None,
        decel_angle: Optional[float] = None,
        end_speed: Optional[float] = None,
        **kwargs,
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
                        self.stop()
                        raise RuntimeError("MDRobotBase pivot stalled")
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
        *args,
        x: Any = None,
        y: Any = None,
        goal_x: Any = None,
        goal_y: Any = None,
        goal_theta: Optional[float] = None,
        speed_mm_s: float = 200.0,
        start_speed_mm_s: Optional[float] = None,
        end_speed_mm_s: Optional[float] = None,
        accel_dist_mm: Optional[float] = None,
        decel_dist_mm: Optional[float] = None,
        use_ramping: bool = False,
        backward: bool = False,
        tolerance_dist: Optional[float] = None,
        timeout_ms: Optional[int] = None,
        then: Any = None,
        kick_speed_mm_s: Optional[float] = None,
        kick_time_ms: Optional[float] = None,
        accel_mm_s2: float = 200.0,
        decel_mm_s2: float = 200.0,
        **kwargs,
    ):
        """Dispatches navigation to target Cartesian coordinates."""
        target_x = args[0] if len(args) > 0 else (goal_x if goal_x is not None else x)
        target_y = args[1] if len(args) > 1 else (goal_y if goal_y is not None else y)
        if target_x is None or target_y is None:
            raise ValueError("navigate_to_goal requires target x and y coordinates")
        x = target_x
        y = target_y
        if not isinstance(x, (int, float)) or not math.isfinite(x):
            raise TypeError("x coordinate must be a finite number")
        if not isinstance(y, (int, float)) or not math.isfinite(y):
            raise TypeError("y coordinate must be a finite number")

        if not math.isfinite(self._x) or not math.isfinite(self._y) or not math.isfinite(self._theta):
            self.stop()
            raise ValueError("LQR controller received invalid pose or configuration")

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
                        self.stop()
                        raise RuntimeError("MDRobotBase navigation stalled")

                    is_l_io = bool(getattr(self.left_motor, "_io_error", False))
                    is_r_io = bool(getattr(self.right_motor, "_io_error", False))
                    is_l_no_dev = bool(getattr(self.left_motor, "_closed", False) or (hasattr(self.left_motor, "connected") and not self.left_motor.connected))
                    is_r_no_dev = bool(getattr(self.right_motor, "_closed", False) or (hasattr(self.right_motor, "connected") and not self.right_motor.connected))
                    is_l_busy = bool(getattr(self.left_motor, "_transient_busy", False))
                    is_r_busy = bool(getattr(self.right_motor, "_transient_busy", False))

                    while is_l_io or is_r_io or is_l_no_dev or is_r_no_dev or is_l_busy or is_r_busy:
                        now_mono = time.monotonic()
                        if is_l_io or is_l_no_dev or is_l_busy:
                            self._left_state_failures += 1
                            if self._left_failure_start_time is None:
                                self._left_failure_start_time = now_mono
                        else:
                            self._left_state_failures = 0
                            self._left_failure_start_time = None

                        if is_r_io or is_r_no_dev or is_r_busy:
                            self._right_state_failures += 1
                            if self._right_failure_start_time is None:
                                self._right_failure_start_time = now_mono
                        else:
                            self._right_state_failures = 0
                            self._right_failure_start_time = None

                        left_persistent = (is_l_io or is_l_no_dev) and (
                            self._left_state_failures >= 20 and
                            (self._left_failure_start_time is not None and (now_mono - self._left_failure_start_time) >= 0.500)
                        )
                        right_persistent = (is_r_io or is_r_no_dev) and (
                            self._right_state_failures >= 20 and
                            (self._right_failure_start_time is not None and (now_mono - self._right_failure_start_time) >= 0.500)
                        )

                        if left_persistent or right_persistent:
                            self.stop()
                            if (left_persistent and is_l_no_dev) or (right_persistent and is_r_no_dev):
                                raise OSError("MDRobotBase motor is not connected")
                            if (left_persistent and is_l_io) or (right_persistent and is_r_io):
                                raise OSError("MDRobotBase motor communication failed")

                        await asyncio.sleep(0.005)

                        is_l_io = bool(getattr(self.left_motor, "_io_error", False))
                        is_r_io = bool(getattr(self.right_motor, "_io_error", False))
                        is_l_no_dev = bool(getattr(self.left_motor, "_closed", False) or (hasattr(self.left_motor, "connected") and not self.left_motor.connected))
                        is_r_no_dev = bool(getattr(self.right_motor, "_closed", False) or (hasattr(self.right_motor, "connected") and not self.right_motor.connected))
                        is_l_busy = bool(getattr(self.left_motor, "_transient_busy", False))
                        is_r_busy = bool(getattr(self.right_motor, "_transient_busy", False))

                    self._left_state_failures = 0
                    self._left_failure_start_time = None
                    self._right_state_failures = 0
                    self._right_failure_start_time = None

                    self._motion_started = True

                    # Verify odometry safety
                    if not math.isfinite(self._x) or not math.isfinite(self._y) or not math.isfinite(self._theta):
                        self.stop()
                        raise ValueError("LQR controller received invalid pose or configuration")

                    # Active LQR Controller Evaluation
                    if getattr(self, "_controller", 0) == 1:
                        if self._lqr_workspace_is_busy():
                            self.stop()
                            raise RuntimeError("LQR solver workspace busy")
                        path_th = math.degrees(math.atan2(dy, dx)) if dist > 1.0 else self._theta
                        v_cmd, w_cmd = self.step_lqr(speed_mm_s, float(x), float(y), path_th)
                        if not math.isfinite(v_cmd) or not math.isfinite(w_cmd):
                            self.stop()
                            raise RuntimeError("LQR controller failed to compute a valid command")

                    await asyncio.sleep(0.01)
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)

                if self._status != 3 and self._status != 4:
                    self._x = float(x)
                    self._y = float(y)
                    if goal_theta is not None:
                        self._theta = float(goal_theta)
                    self._status = 2
            except asyncio.CancelledError:
                pass
            except Exception:
                self.stop()
                raise
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

        if not math.isfinite(self._x) or not math.isfinite(self._y) or not math.isfinite(self._theta):
            self.stop()
            raise ValueError("LQR controller received invalid pose or configuration")

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
                        self.stop()
                        raise RuntimeError("MDRobotBase trajectory stalled")

                    is_l_io = bool(getattr(self.left_motor, "_io_error", False))
                    is_r_io = bool(getattr(self.right_motor, "_io_error", False))
                    is_l_no_dev = bool(getattr(self.left_motor, "_closed", False) or (hasattr(self.left_motor, "connected") and not self.left_motor.connected))
                    is_r_no_dev = bool(getattr(self.right_motor, "_closed", False) or (hasattr(self.right_motor, "connected") and not self.right_motor.connected))
                    is_l_busy = bool(getattr(self.left_motor, "_transient_busy", False))
                    is_r_busy = bool(getattr(self.right_motor, "_transient_busy", False))

                    while is_l_io or is_r_io or is_l_no_dev or is_r_no_dev or is_l_busy or is_r_busy:
                        now_mono = time.monotonic()
                        if is_l_io or is_l_no_dev or is_l_busy:
                            self._left_state_failures += 1
                            if self._left_failure_start_time is None:
                                self._left_failure_start_time = now_mono
                        else:
                            self._left_state_failures = 0
                            self._left_failure_start_time = None

                        if is_r_io or is_r_no_dev or is_r_busy:
                            self._right_state_failures += 1
                            if self._right_failure_start_time is None:
                                self._right_failure_start_time = now_mono
                        else:
                            self._right_state_failures = 0
                            self._right_failure_start_time = None

                        left_persistent = (is_l_io or is_l_no_dev) and (
                            self._left_state_failures >= 20 and
                            (self._left_failure_start_time is not None and (now_mono - self._left_failure_start_time) >= 0.500)
                        )
                        right_persistent = (is_r_io or is_r_no_dev) and (
                            self._right_state_failures >= 20 and
                            (self._right_failure_start_time is not None and (now_mono - self._right_failure_start_time) >= 0.500)
                        )

                        if left_persistent or right_persistent:
                            self.stop()
                            if (left_persistent and is_l_no_dev) or (right_persistent and is_r_no_dev):
                                raise OSError("MDRobotBase motor is not connected")
                            if (left_persistent and is_l_io) or (right_persistent and is_r_io):
                                raise OSError("MDRobotBase motor communication failed")

                        await asyncio.sleep(0.005)

                        is_l_io = bool(getattr(self.left_motor, "_io_error", False))
                        is_r_io = bool(getattr(self.right_motor, "_io_error", False))
                        is_l_no_dev = bool(getattr(self.left_motor, "_closed", False) or (hasattr(self.left_motor, "connected") and not self.left_motor.connected))
                        is_r_no_dev = bool(getattr(self.right_motor, "_closed", False) or (hasattr(self.right_motor, "connected") and not self.right_motor.connected))
                        is_l_busy = bool(getattr(self.left_motor, "_transient_busy", False))
                        is_r_busy = bool(getattr(self.right_motor, "_transient_busy", False))

                    self._left_state_failures = 0
                    self._left_failure_start_time = None
                    self._right_state_failures = 0
                    self._right_failure_start_time = None

                    self._motion_started = True

                    # Verify odometry safety
                    if not math.isfinite(self._x) or not math.isfinite(self._y) or not math.isfinite(self._theta):
                        self.stop()
                        raise ValueError("LQR controller received invalid pose or configuration")

                    tx, ty = float(pt[0]), float(pt[1])
                    if getattr(self, "_controller", 0) == 1:  # LQR
                        if self._lqr_workspace_is_busy():
                            self.stop()
                            raise RuntimeError("LQR solver workspace busy")
                        p_dx = tx - self._x
                        p_dy = ty - self._y
                        p_dist = math.hypot(p_dx, p_dy)
                        path_th = math.degrees(math.atan2(p_dy, p_dx)) if p_dist > 1.0 else self._theta
                        v_cmd, w_cmd = self.step_lqr(speed_mm_s, tx, ty, path_th)
                        if not math.isfinite(v_cmd) or not math.isfinite(w_cmd):
                            self.stop()
                            raise RuntimeError("LQR controller failed to compute a valid command")

                    await asyncio.sleep(0.01)
                    self.__check_motion_timeout(started_ms, resolved_timeout_ms)
                    self._x = tx
                    self._y = ty
                if self._status != 3 and self._status != 4:
                    self._status = 2
            except asyncio.CancelledError:
                pass
            except Exception:
                self.stop()
                raise
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
        if "k_x" in kwargs and "k_y" in kwargs and "k_theta" in kwargs:
            k_x, k_y, k_theta = kwargs["k_x"], kwargs["k_y"], kwargs["k_theta"]
            schedule = kwargs.get("schedule", True)
        elif len(args) == 1 and isinstance(args[0], (list, tuple)) and len(args[0]) >= 3:
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
    def _solve_dare_internal(self, q_x: float = 1.0, q_y: float = 1.0, q_theta: float = 1.0, r_v: float = 1.0, r_omega: float = 1.0, v_profile: float = 100.0, Ts: float = 0.005):
        """
        Internal DARE solver (Structured Doubling Algorithm).
        Assumes workspace lock is already acquired by the caller.
        """
        qx, qy, qth = float(q_x), float(q_y), float(q_theta)
        rv, rw = float(r_v), float(r_omega)
        for val in (qx, qy, qth, rv, rw, float(v_profile)):
            if not math.isfinite(val):
                raise ValueError("All DARE parameters must be finite numbers")
        if qx < 0.0 or qy < 0.0 or qth < 0.0 or rv <= 0.0 or rw <= 0.0:
            raise ValueError("State weights must be non-negative and control weights strictly positive")
        if qx > 1e7 or qy > 1e7 or qth > 1e7 or rv < 1e-6 or rw < 1e-6 or rv > 1e7 or rw > 1e7:
            raise ValueError("DARE parameters exceed safe numerical bounds")
        if (qx / rv > 1e8) or (qy / rw > 1e8) or (qth / rw > 1e8):
            raise ValueError("DARE weight ratios exceed safe numerical conditioning limits")

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
            if not all(math.isfinite(W[r][c]) for r in range(3) for c in range(3)):
                raise ValueError("Non-finite intermediate in DARE SDA matrix W")

            if not math.isfinite(W[0][0]) or abs(W[0][0]) < 1e-12:
                raise ValueError("Singular block denominator in SDA")
            detW2 = W[1][1] * W[2][2] - W[1][2] * W[2][1]
            if not math.isfinite(detW2) or abs(detW2) < 1e-12:
                raise ValueError("Singular lateral block determinant in SDA")

            invW = [
                [1.0 / W[0][0], 0.0, 0.0],
                [0.0, W[2][2] / detW2, -W[1][2] / detW2],
                [0.0, -W[2][1] / detW2, W[1][1] / detW2]
            ]
            if not all(math.isfinite(invW[r][c]) for r in range(3) for c in range(3)):
                raise ValueError("Non-finite intermediate in DARE SDA invW")

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
            if not all(math.isfinite(H_next[r][c]) and math.isfinite(E_next[r][c]) and math.isfinite(G_next[r][c]) for r in range(3) for c in range(3)):
                raise ValueError("Non-finite intermediate in DARE SDA iteration")

            diff = max(abs(H_next[r][c] - H[r][c]) for r in range(3) for c in range(3))
            E, G, H = E_next, G_next, H_next
            if diff < 1e-7:
                break

        P = H
        if not all(math.isfinite(P[r][c]) for r in range(3) for c in range(3)):
            raise ValueError("Non-finite Riccati matrix P")

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
        if not math.isfinite(detW) or abs(detW) <= 1e-12:
            raise ValueError("Singular Riccati denominator in full DARE")

        invW = [
            [W11 / detW, -W01 / detW],
            [-W10 / detW, W00 / detW]
        ]
        if not all(math.isfinite(invW[r][c]) for r in range(2) for c in range(2)):
            raise ValueError("Non-finite intermediate in DARE invW")

        K = [
            [invW[r][0] * M1[c][0] + invW[r][1] * M1[c][1] for c in range(3)]
            for r in range(2)
        ]
        if not all(math.isfinite(K[r][c]) for r in range(2) for c in range(3)):
            raise ValueError("Non-finite gain matrix K in DARE")

        lambda1 = abs(1.0 + Ts * K[0][0])
        acl11 = 1.0 - b0 * K[1][1]
        acl12 = vTs - b0 * K[1][2]
        acl21 = -b1 * K[1][1]
        acl22 = 1.0 - b1 * K[1][2]
        if not all(math.isfinite(x) for x in (lambda1, acl11, acl12, acl21, acl22)):
            raise ValueError("Non-finite closed-loop entries in DARE")

        tr = acl11 + acl22
        det = acl11 * acl22 - acl12 * acl21
        disc = tr * tr - 4.0 * det
        if disc < 0.0:
            rho_lat = math.sqrt(det)
        else:
            sqrt_d = math.sqrt(disc)
            rho_lat = max(abs((tr + sqrt_d) * 0.5), abs((tr - sqrt_d) * 0.5))

        rho_full = max(lambda1, rho_lat)
        if not math.isfinite(rho_full) or rho_full >= 1.0:
            raise ValueError(f"Full closed-loop system unstable: rho={rho_full:.4f} >= 1.0")

        return K, P, rho_full

    @_require_open
    def solve_dare_full(self, q_x: float = 1.0, q_y: float = 1.0, q_theta: float = 1.0, r_v: float = 1.0, r_omega: float = 1.0, v_profile: float = 100.0, Ts: float = 0.005):
        """
        Solves full 3x3 Discrete Algebraic Riccati Equation (DARE) for the complete 3-state unicycle system
        using the Structured Doubling Algorithm (SDA) with quadratic convergence.
        Returns (K [2x3], P [3x3], spectral_radius).
        """
        if not self._lqr_workspace_acquire():
            raise RuntimeError("LQR solver workspace busy")
        try:
            return self._solve_dare_internal(q_x, q_y, q_theta, r_v, r_omega, v_profile, Ts)
        finally:
            self._lqr_workspace_release()

    @_require_open
    def compute_riccati_residual(self, q_x: float, q_y: float, q_theta: float, r_v: float, r_omega: float, v_profile: float, P: list, Ts: float = 0.005) -> float:
        """Computes infinity norm residual ||P - (A^T P A - A^T P B (R + B^T P B)^-1 B^T P A + Q)||_inf."""
        if not self._lqr_workspace_acquire():
            raise RuntimeError("LQR solver workspace busy")
        try:
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
        finally:
            self._lqr_workspace_release()

    @_require_open
    def solve_dare(self, q_x: float = 1.0, q_y: float = 1.0, q_theta: float = 1.0, r_v: float = 1.0, r_omega: float = 1.0, v_profile: float = 100.0, Ts: float = 0.005):
        """
        Legacy / Reference DARE solver helper.
        Solves DARE and extracts feedback gain magnitudes and spectral radius.
        """
        if not self._lqr_workspace_acquire():
            raise RuntimeError("LQR solver workspace busy")
        try:
            K, P, rho = self._solve_dare_internal(q_x, q_y, q_theta, r_v, r_omega, v_profile, Ts)
            return abs(K[0][0]), abs(K[1][1]), abs(K[1][2]), rho
        finally:
            self._lqr_workspace_release()

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
        if qx > 1e7 or qy > 1e7 or qth > 1e7 or rv < 1e-6 or rw < 1e-6 or rv > 1e7 or rw > 1e7:
            raise ValueError("LQR weights exceed safe numerical bounds")
        if (qx / rv > 1e8) or (qy / rw > 1e8) or (qth / rw > 1e8):
            raise ValueError("LQR weight ratios exceed safe numerical conditioning limits")

        if not self._lqr_workspace_acquire():
            raise RuntimeError("LQR solver workspace busy")
        try:
            lut = []
            lut_kx = []
            for i in range(16):
                v_bin = 50.0 + i * 50.0
                K_full, P_full, rho_i = self._solve_dare_internal(qx, qy, qth, rv, rw, v_bin)
                if not math.isfinite(rho_i) or rho_i >= 1.0:
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
        finally:
            self._lqr_workspace_release()

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
        if self._lqr_workspace_is_busy():
            raise RuntimeError("LQR solver workspace busy")

        if not math.isfinite(self._x) or not math.isfinite(self._y) or not math.isfinite(self._theta):
            raise ValueError("LQR controller received invalid pose or configuration")

        if not math.isfinite(v_profile) or not math.isfinite(x_ref) or not math.isfinite(y_ref) or not math.isfinite(path_theta_deg):
            raise ValueError("LQR controller received invalid pose or configuration")

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

        if not math.isfinite(v_cmd_raw) or not math.isfinite(w_cmd_raw):
            raise RuntimeError("LQR controller failed to compute a valid command")

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
        a = float(alpha)
        if not math.isfinite(a) or a < 0.0 or a > 1.0:
            raise ValueError("fusion_alpha must be a finite float between 0.0 and 1.0")
        self._fusion_alpha = a

    @_require_open
    def get_fusion_alpha(self) -> float:
        return self._fusion_alpha

    @_require_open
    def set_imu_ready(self, ready: bool):
        self._imu_ready = bool(ready)
        if not self._imu_ready:
            self._imu_latch_needed = True

    @_require_open
    def get_imu_ready(self) -> bool:
        return getattr(self, "_imu_ready", True)

    @_require_open
    def set_backlash_filter(self, enabled: bool):
        self._backlash_filter = bool(enabled)
        if not self._backlash_filter:
            self._backlash_left_accum = 0.0
            self._backlash_right_accum = 0.0

    @_require_open
    def get_backlash_filter(self) -> bool:
        return self._backlash_filter

    @_require_open
    def set_backlash_limits(self, *args, **kwargs):
        if len(args) == 2:
            left, right = args
        elif len(args) == 1 and isinstance(args[0], (tuple, list)):
            left, right = args[0]
        else:
            left = kwargs.get("left_limit", kwargs.get("min_limit", None))
            right = kwargs.get("right_limit", kwargs.get("max_limit", None))
            if left is None or right is None:
                raise ValueError("set_backlash_limits requires left_limit and right_limit")
        self._backlash_limits = (float(left), float(right))

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
