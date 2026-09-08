# SPDX-License-Identifier: MIT
# Copyright (c) 2025 The Pybricks Authors

"""
Regression Test Suite for MDRobotBase Trajectory and Input Validation.
Tests fail-closed boundaries:
- Over-capacity trajectory arrays (> 64 points)
- Under-capacity trajectory arrays (< 2 points)
- Malformed tuple coordinates (len < 2)
- Coordinate finiteness (NaN / Inf)
- Dynamics parameter positivity (speed, tolerance)
- Controller enum validation (PID, LQR)
"""

import os
import sys
import unittest

_pkg_dir = os.path.dirname(os.path.abspath(__file__))
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop
from pybricks.robotics import MDRobotBase
from pybricks.tools import run_task

left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B)
robot = MDRobotBase(left_motor, right_motor, wheel_diameter=56.0, axle_track=112.0)


async def test_trajectory_capacity():
    print("Testing trajectory capacity limits (> 64 points)...")
    points_65 = [(i * 10, i * 10) for i in range(65)]
    try:
        await robot.follow_trajectory(points_65)
        assert False, "Expected ValueError on 65-point trajectory"
    except ValueError as e:
        assert "trajectory exceeds maximum capacity" in str(e), f"Unexpected message: {e}"
    print("Capacity limit verification passed.")

async def test_trajectory_minimum_points():
    print("Testing minimum point requirements (< 2 points)...")
    try:
        await robot.follow_trajectory([(0, 0)])
        assert False, "Expected ValueError on 1-point trajectory"
    except ValueError as e:
        assert "trajectory requires at least 2 points" in str(e), f"Unexpected message: {e}"
    print("Minimum points verification passed.")

async def test_waypoint_tuple_dimensionality():
    print("Testing waypoint tuple dimensionality (< 2 coordinates)...")
    try:
        await robot.follow_trajectory([(0, 0), (100,)])
        assert False, "Expected ValueError on 1-element coordinate tuple"
    except ValueError as e:
        assert "at least (x, y) coordinates" in str(e), f"Unexpected message: {e}"
    print("Tuple dimensionality verification passed.")

async def test_coordinate_finiteness():
    print("Testing coordinate finiteness (NaN / Inf)...")
    try:
        await robot.follow_trajectory([(0, 0), (float('nan'), 100.0)])
        assert False, "Expected ValueError on NaN coordinate"
    except ValueError as e:
        assert "trajectory coordinates must be finite" in str(e), f"Unexpected message: {e}"

    try:
        await robot.follow_trajectory([(0, 0), (float('inf'), 100.0)])
        assert False, "Expected ValueError on Inf coordinate"
    except ValueError as e:
        assert "trajectory coordinates must be finite" in str(e), f"Unexpected message: {e}"
    print("Coordinate finiteness verification passed.")

async def test_dynamics_positivity():
    print("Testing dynamic parameters positivity (speed, tolerance <= 0)...")
    try:
        await robot.follow_trajectory([(0, 0), (100.0, 100.0)], speed_mm_s=-50.0)
        assert False, "Expected ValueError on negative speed"
    except ValueError as e:
        assert "speed must be positive" in str(e), f"Unexpected message: {e}"

    try:
        await robot.follow_trajectory([(0, 0), (100.0, 100.0)], tolerance=0.0)
        assert False, "Expected ValueError on zero tolerance"
    except ValueError as e:
        assert "tolerance must be positive" in str(e), f"Unexpected message: {e}"
    print("Dynamics positivity verification passed.")

async def test_controller_enum_validation():
    print("Testing controller enum validation (PID=0, LQR=1)...")
    try:
        robot.set_controller(99)
        assert False, "Expected ValueError on invalid controller enum"
    except ValueError as e:
        assert "invalid controller type" in str(e), f"Unexpected message: {e}"

    robot.set_controller(0)
    assert robot.get_controller() == 0, "Expected controller PID (0)"

    robot.set_controller(1)
    assert robot.get_controller() == 1, "Expected controller LQR (1)"

    robot.set_controller(0)
    print("Controller enum verification passed.")

async def test_trajectory_waypoint_execution():
    print("Testing multi-waypoint trajectory execution with arrival tolerances...")
    # Route: Start (0, 0) -> (100, 0) -> (100, 100)
    waypoints = [(0.0, 0.0), (100.0, 0.0), (100.0, 100.0)]
    robot.reset_state(0.0, 0.0, 0.0)
    
    # Execute trajectory
    await robot.follow_trajectory(waypoints, speed_mm_s=150.0, tolerance=2.0)
    
    state = robot.get_state()
    x, y, theta = state[0], state[1], state[2]
    
    # Assert Cartesian arrival within <= 2.0 mm
    err_x = abs(x - 100.0)
    err_y = abs(y - 100.0)
    assert err_x <= 2.0, f"Target X error {err_x:.2f} mm exceeds tolerance 2.0 mm"
    assert err_y <= 2.0, f"Target Y error {err_y:.2f} mm exceeds tolerance 2.0 mm"
    
    # Assert robot completed and not stalled
    assert robot.done(), "Robot must report done upon trajectory arrival"
    assert not robot.stalled(), "Robot must not report stalled upon successful trajectory arrival"
    print("Multi-waypoint trajectory execution and tolerance verification passed.")

async def test_multiscale_kinematic_configuration():
    print("Testing multi-scale kinematic configuration & parameter setters...")
    # Test setting wheel diameters to scaled values (e.g. 81.6 mm)
    robot.set_wheel_diameters(81.6, 81.6)
    wd_left, wd_right = robot.get_wheel_diameters()
    assert abs(wd_left - 81.6) < 0.01, f"Expected left wheel diameter 81.6 mm, got {wd_left}"
    assert abs(wd_right - 81.6) < 0.01, f"Expected right wheel diameter 81.6 mm, got {wd_right}"

    # Test setting gear ratio to reduction gearing (2.5:1)
    robot.set_gear_ratio(2.5)
    assert abs(robot.get_gear_ratio() - 2.5) < 0.001, f"Expected gear ratio 2.5, got {robot.get_gear_ratio()}"

    # Restore standard configuration
    robot.set_wheel_diameters(56.0, 56.0)
    robot.set_gear_ratio(1.0)
    assert abs(robot.get_gear_ratio() - 1.0) < 0.001, "Failed to restore gear ratio 1.0"
    print("Multi-scale kinematic configuration verification passed.")

async def main():
    await test_trajectory_capacity()
    await test_trajectory_minimum_points()
    await test_waypoint_tuple_dimensionality()
    await test_coordinate_finiteness()
    await test_dynamics_positivity()
    await test_controller_enum_validation()
    await test_trajectory_waypoint_execution()
    await test_multiscale_kinematic_configuration()
    print("All MDRobotBase trajectory and input validation regression tests passed!")

class TestMDRobotBaseTrajectory(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        global robot, left_motor, right_motor
        left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
        right_motor = Motor(Port.B)
        robot = MDRobotBase(left_motor, right_motor, wheel_diameter=56.0, axle_track=112.0)

    async def test_trajectory_capacity(self):
        await test_trajectory_capacity()

    async def test_trajectory_minimum_points(self):
        await test_trajectory_minimum_points()

    async def test_waypoint_tuple_dimensionality(self):
        await test_waypoint_tuple_dimensionality()

    async def test_coordinate_finiteness(self):
        await test_coordinate_finiteness()

    async def test_dynamics_positivity(self):
        await test_dynamics_positivity()

    async def test_controller_enum_validation(self):
        await test_controller_enum_validation()

    async def test_trajectory_waypoint_execution(self):
        await test_trajectory_waypoint_execution()

    async def test_multiscale_kinematic_configuration(self):
        await test_multiscale_kinematic_configuration()

if __name__ == "__main__":
    unittest.main()

