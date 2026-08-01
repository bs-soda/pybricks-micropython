"""
pybricks.robotics Autocomplete Stubs (.pyi)
===========================================
Type hints and IDE autocomplete stubs for Pybricks MDRobotBase Native C extension.
"""

from typing import Tuple, List, Optional, Union
from pybricks.pupdevices import Motor
from pybricks.parameters import Stop

class MDRobotBase:
    """Native C high-performance dual-motor drivebase controller with LQR & PID feedback,
    IMU sensor fusion, and asynchronous trajectory execution.
    """

    def __init__(
        self,
        left_motor: Motor,
        right_motor: Motor,
        wheel_diameter_left: float,
        wheel_diameter_right: float,
        axle_track: float
    ) -> None: ...

    def set_fusion_alpha(self, alpha: float) -> None:
        """Sets the complementary sensor fusion alpha weight (0.0 to 1.0).
        - 1.0: 100% Pure IMU Gyro Odometry (bypasses wheel slip & track discrepancies).
        - 0.0: 100% Wheel Encoder Odometry.
        """
        ...

    def get_fusion_alpha(self) -> float:
        """Returns the current sensor fusion alpha weight."""
        ...

    def set_gear_ratio(self, ratio: float) -> None:
        """Sets the drivetrain gear reduction ratio (Driver Teeth / Driven Teeth).
        Example: 12t motor gear to 36t wheel gear = 0.3625 (or 12/36).
        """
        ...

    def get_gear_ratio(self) -> float:
        """Returns the current drivetrain gear ratio."""
        ...

    def set_lqr_gains(
        self,
        k_x: float,
        k_y: float,
        k_theta: float,
        schedule: bool = True
    ) -> None: ...

    def get_lqr_gains(self) -> Tuple[float, float, float]: ...

    def set_controller(self, controller_type: int) -> None: ...

    def get_controller(self) -> int: ...

    def set_pid_gains(self, kp: float, ki: float, kd: float) -> None: ...

    def get_pid_gains(self) -> Tuple[float, float, float]: ...

    def set_turn_pid_gains(self, kp: float, ki: float, kd: float) -> None: ...

    def get_turn_pid_gains(self) -> Tuple[float, float, float]: ...

    def set_pivot_pid_gains(self, kp: float, ki: float, kd: float) -> None: ...

    def get_pivot_pid_gains(self) -> Tuple[float, float, float]: ...

    def reset_state(
        self,
        x: float,
        y: float,
        theta: float,
        gyro_heading: float
    ) -> None: ...

    def update_state(self, gyro_heading: float) -> None: ...

    def get_state(self) -> Tuple[float, float, float]: ...

    async def turn_to_angle(
        self,
        target_angle: float,
        speed_deg_s: Optional[float] = ...,
        start_speed: Optional[float] = ...,
        end_speed: Optional[float] = ...,
        accel_angle: Optional[float] = ...,
        decel_angle: Optional[float] = ...,
        tolerance: Optional[float] = ...,
        timeout_ms: Optional[int] = ...,
        then: Stop = Stop.HOLD
    ) -> None:
        """Executes an in-place spin turn to an absolute target heading in degrees."""
        ...

    async def turn_angle(
        self,
        angle: float,
        speed_deg_s: Optional[float] = ...,
        start_speed: Optional[float] = ...,
        end_speed: Optional[float] = ...,
        accel_angle: Optional[float] = ...,
        decel_angle: Optional[float] = ...,
        tolerance: Optional[float] = ...,
        timeout_ms: Optional[int] = ...,
        then: Stop = Stop.HOLD
    ) -> None:
        """Executes an in-place spin turn by a relative angular delta in degrees."""
        ...

    async def pivot_turn_to_angle(
        self,
        target_angle: float,
        speed_deg_s: Optional[float] = ...,
        pivot_side: str = "left",
        tolerance: Optional[float] = ...,
        timeout_ms: Optional[int] = ...,
        then: Stop = Stop.HOLD
    ) -> None:
        """Executes a single-wheel pivot turn to an absolute target heading in degrees."""
        ...

    async def pivot_turn_angle(
        self,
        angle: float,
        speed_deg_s: Optional[float] = ...,
        pivot_side: str = "left",
        tolerance: Optional[float] = ...,
        timeout_ms: Optional[int] = ...,
        then: Stop = Stop.HOLD
    ) -> None:
        """Executes a single-wheel pivot turn by a relative angular delta in degrees."""
        ...

    async def navigate_to_goal(
        self,
        goal_x: float,
        goal_y: float,
        goal_theta: Optional[float] = None,
        speed_mm_s: Optional[float] = None,
        start_speed_mm_s: Optional[float] = None,
        end_speed_mm_s: Optional[float] = None,
        accel_dist_mm: Optional[float] = None,
        decel_dist_mm: Optional[float] = None,
        use_ramping: bool = False,
        backward: bool = False,
        tolerance_dist: Optional[float] = None,
        timeout_ms: Optional[int] = None,
        then: Stop = Stop.HOLD,
        kick_speed_mm_s: Optional[float] = None,
        kick_time_ms: Optional[int] = None
    ) -> None:
        """Navigates to a 2D spatial coordinate (goal_x, goal_y) using LQR state feedback."""
        ...

    async def go_forward(
        self,
        distance: float,
        speed_mm_s: Optional[float] = None,
        start_speed_mm_s: Optional[float] = None,
        end_speed_mm_s: Optional[float] = None,
        accel_dist_mm: Optional[float] = None,
        decel_dist_mm: Optional[float] = None,
        use_ramping: bool = False,
        tolerance_dist: Optional[float] = None,
        timeout_ms: Optional[int] = None,
        then: Stop = Stop.HOLD,
        kick_speed_mm_s: Optional[float] = None,
        kick_time_ms: Optional[int] = None
    ) -> None: ...

    async def go_backward(
        self,
        distance: float,
        speed_mm_s: Optional[float] = None,
        start_speed_mm_s: Optional[float] = None,
        end_speed_mm_s: Optional[float] = None,
        accel_dist_mm: Optional[float] = None,
        decel_dist_mm: Optional[float] = None,
        use_ramping: bool = False,
        tolerance_dist: Optional[float] = None,
        timeout_ms: Optional[int] = None,
        then: Stop = Stop.HOLD,
        kick_speed_mm_s: Optional[float] = None,
        kick_time_ms: Optional[int] = None
    ) -> None: ...

    async def follow_trajectory(
        self,
        trajectory_points: List[Tuple[float, float]],
        speed_mm_s: Optional[float] = None,
        start_speed_mm_s: Optional[float] = None,
        end_speed_mm_s: Optional[float] = None,
        accel_dist_mm: Optional[float] = None,
        decel_dist_mm: Optional[float] = None,
        use_ramping: bool = False,
        tolerance_dist: Optional[float] = None,
        timeout_ms: Optional[int] = None,
        then: Stop = Stop.HOLD
    ) -> None: ...

    def set_backlash_filter(self, enabled: bool) -> None: ...
    def get_backlash_filter(self) -> bool: ...
