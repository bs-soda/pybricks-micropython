# SPDX-License-Identifier: MIT
# Copyright (c) 2025 The Pybricks Authors

"""
Regression Test Suite for MDRobotBase Async Cancellation and Lifecycle Safety.
Tests lifecycle transitions:
- Idle stop idempotence (no-op without crashing)
- Active motion preemption (dispatching motion B cancels motion A cleanly)
- Motion status queries (done, stalled, status)
- Gear ratio parameter bounds and conversion
- Proper release and cleanup
"""

from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop
from pybricks.robotics import MDRobotBase
from pybricks.tools import run_task, wait

left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B)
robot = MDRobotBase(left_motor, right_motor, wheel_diameter=56.0, axle_track=112.0)

async def test_idle_stop_idempotence():
    print("Testing idle stop idempotence...")
    # Calling stop multiple times while idle must succeed safely
    robot.stop()
    robot.stop()
    assert robot.done(), "Robot should report done when idle"
    assert not robot.stalled(), "Robot should not report stalled when idle"
    print("Idle stop idempotence passed.")

async def test_motion_preemption():
    print("Testing motion preemption...")
    # Launch straight motion and preempt it with a turn
    task_straight = run_task(robot.straight(500.0, speed_mm_s=200.0))
    # Small pause to ensure motion begins
    await wait(20)
    
    # Preempt with in-place turn
    await robot.turn_to_angle(90.0, speed_deg_s=200.0)
    assert abs(robot.heading - 90.0) <= 2.0, f"Expected heading ~90, got {robot.heading}"
    print("Motion preemption passed.")

async def test_gear_ratio_boundaries():
    print("Testing gear ratio validation boundaries...")
    # Valid gear ratios
    robot.set_gear_ratio(1.0)
    assert robot.get_gear_ratio() == 1.0, "Expected gear ratio 1.0"

    robot.set_gear_ratio(2.0)
    assert robot.get_gear_ratio() == 2.0, "Expected gear ratio 2.0"

    robot.set_gear_ratio(0.5)
    assert robot.get_gear_ratio() == 0.5, "Expected gear ratio 0.5"

    # Invalid gear ratios fail closed
    try:
        robot.set_gear_ratio(0.0)
        assert False, "Expected ValueError on zero gear ratio"
    except ValueError:
        pass

    try:
        robot.set_gear_ratio(-1.5)
        assert False, "Expected ValueError on negative gear ratio"
    except ValueError:
        pass

    try:
        robot.set_gear_ratio(2000.0)
        assert False, "Expected ValueError on oversized gear ratio"
    except ValueError:
        pass

    # Reset to 1.0
    robot.set_gear_ratio(1.0)
    print("Gear ratio boundaries passed.")

async def test_lifecycle_status_queries():
    status = robot.status()
    assert isinstance(status, int), "Expected integer status code"
    assert robot.done(), "done() must be True when robot is idle"
    assert not robot.stalled(), "stalled() must be False when robot is idle"
    assert status in (0, 2), f"Expected STATUS_NONE (0) or STATUS_COMPLETED (2), got {status}"
    print("Status query accessors passed.")

async def test_invalid_preemption_non_interference():
    print("Testing invalid preemption non-interference...")
    # Start valid background motion
    task_straight = run_task(robot.straight(600.0, speed_mm_s=150.0))
    await wait(20)

    # 1. Dispatch navigate_to_goal with invalid string coordinate (raises TypeError)
    try:
        robot.navigate_to_goal("invalid_x", 0)
        assert False, "Expected TypeError on string coordinate"
    except (TypeError, ValueError):
        pass

    # Active motion must continue running without interruption
    assert not robot.done(), "Active motion should still be running after invalid navigate call"

    # 2. Dispatch turn_to_angle with NaN (raises ValueError)
    try:
        robot.turn_to_angle(float('nan'), speed_deg_s=100.0)
        assert False, "Expected ValueError on NaN target angle"
    except ValueError:
        pass

    assert not robot.done(), "Active motion should still be running after invalid turn call"

    # 3. Dispatch follow_trajectory with empty points (raises ValueError)
    try:
        robot.follow_trajectory([])
        assert False, "Expected ValueError on empty trajectory points"
    except ValueError:
        pass

    # Await original motion completion to verify it ran to completion
    await task_straight
    assert robot.done(), "Original motion must finish successfully"
    print("Invalid preemption non-interference passed.")

async def test_closed_handle_guarding():
    print("Testing closed handle guarding...")
    # First test dedicated auxiliary instance
    left_m = Motor(Port.C, Direction.COUNTERCLOCKWISE)
    right_m = Motor(Port.D)
    aux_bot = MDRobotBase(left_m, right_m, 56.0, 56.0, 112.0)
    assert aux_bot.done(), "Fresh robot should report done"

    aux_bot.close()
    aux_bot.close() # Idempotence

    # Now test lifecycle close and closed-handle guarding on primary robot instance
    # 1. Close primary instance
    robot.close()

    # 2. Repeated close must be idempotent (no exception)
    robot.close()

    # 3. get_state after close must raise RuntimeError
    try:
        robot.get_state()
        assert False, "Expected RuntimeError on robot.get_state() after close"
    except RuntimeError as e:
        assert "closed" in str(e).lower(), f"Unexpected error message: {e}"

    # 4. stalled() after close must raise RuntimeError (not silent fallback)
    try:
        robot.stalled()
        assert False, "Expected RuntimeError on robot.stalled() after close"
    except RuntimeError as e:
        assert "closed" in str(e).lower(), f"Unexpected error message: {e}"

    # 5. done() after close must raise RuntimeError (not silent fallback)
    try:
        robot.done()
        assert False, "Expected RuntimeError on robot.done() after close"
    except RuntimeError as e:
        assert "closed" in str(e).lower(), f"Unexpected error message: {e}"

    # 6. status() after close must raise RuntimeError (not silent fallback)
    try:
        robot.status()
        assert False, "Expected RuntimeError on robot.status() after close"
    except RuntimeError as e:
        assert "closed" in str(e).lower(), f"Unexpected error message: {e}"

    # 7. navigate_to_goal after close must raise RuntimeError
    try:
        robot.navigate_to_goal(0, 0)
        assert False, "Expected RuntimeError on robot.navigate_to_goal() after close"
    except RuntimeError as e:
        assert "closed" in str(e).lower(), f"Unexpected error message: {e}"

    print("Closed handle guarding passed.")

async def main():
    await test_idle_stop_idempotence()
    await test_motion_preemption()
    await test_gear_ratio_boundaries()
    await test_lifecycle_status_queries()
    await test_invalid_preemption_non_interference()
    await test_closed_handle_guarding()
    print("All MDRobotBase async lifecycle regression tests passed!")

run_task(main())

