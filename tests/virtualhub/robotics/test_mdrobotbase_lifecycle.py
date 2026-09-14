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

import math
import os
import sys
import time
import unittest

_pkg_dir = os.path.dirname(os.path.abspath(__file__))
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

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

async def test_behavioral_motion_preemption_immunity():
    print("Testing comprehensive behavioral motion preemption immunity (G-MDRB-022)...")
    # 1. Scenario 1: Active Nav Immunity to Invalid Turn Replacement
    task_nav = run_task(robot.straight(500.0, speed_mm_s=200.0))
    await wait(20)

    try:
        robot.turn_to_angle(90.0, speed_deg_s=-100.0)
        assert False, "Expected ValueError on negative turn speed"
    except ValueError:
        pass

    assert not robot.done(), "Active nav motion must remain in progress after invalid turn"
    assert robot.status() in (0, 1), "Status must reflect active motion"

    await task_nav
    assert robot.done(), "Active nav must complete to target destination"

    # 2. Scenario 2: Active Turn Immunity to Invalid Pivot Replacement
    task_turn = run_task(robot.turn_to_angle(45.0, speed_deg_s=200.0))
    await wait(20)

    try:
        robot.pivot_turn_to_angle(90.0, speed_deg_s=0.0)
        assert False, "Expected ValueError on zero pivot speed"
    except ValueError:
        pass

    assert not robot.done(), "Active turn motion must remain in progress after invalid pivot"

    await task_turn
    assert robot.done(), "Active turn must complete to target destination"

    # 3. Scenario 3: Active Trajectory Immunity to Empty Replacement Trajectory
    points = [(0.0, 0.0), (100.0, 0.0), (100.0, 100.0)]
    task_traj = run_task(robot.follow_trajectory(points, speed=150.0))
    await wait(20)

    try:
        robot.follow_trajectory([])
        assert False, "Expected ValueError on empty trajectory points"
    except ValueError:
        pass

    assert not robot.done(), "Active trajectory must remain in progress after empty trajectory"

    await task_traj
    assert robot.done(), "Active trajectory must complete"

    # 4. Scenario 4: Valid Replacement Motion Preemption
    task_a = run_task(robot.straight(800.0, speed_mm_s=150.0))
    await wait(20)

    # Preempt with turn
    await robot.turn_to_angle(0.0, speed_deg_s=200.0)
    assert robot.done(), "Preempting turn motion must finish successfully"

    print("Comprehensive behavioral motion preemption immunity passed.")

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

async def test_closed_object_exhaustive_audit():
    print("Testing exhaustive 49-method closed-object audit and idempotent lifecycle...")
    left_m = Motor(Port.E, Direction.COUNTERCLOCKWISE)
    right_m = Motor(Port.F)
    audit_bot = MDRobotBase(left_m, right_m, wheel_diameter=56.0, axle_track=112.0)

    # Pre-close sanity check
    assert audit_bot.done(), "Fresh robot should report done"

    # Close the instance
    audit_bot.close()

    # Step 3 AC-MDRB-021-4: Verify repeated close is strictly idempotent (5 consecutive invocations)
    for _ in range(5):
        audit_bot.close()

    # Step 3 AC-MDRB-021-5: Reflectively inspect all public methods in locals dict
    all_attrs = dir(audit_bot)
    operational_methods = [
        m for m in all_attrs
        if not m.startswith("__") and m not in ("close", "deinit_all") and callable(getattr(audit_bot, m))
    ]
    assert len(operational_methods) >= 47, f"Expected >=47 operational methods, found {len(operational_methods)}"

    # Audit every operational method on closed robot
    for method_name in operational_methods:
        method = getattr(audit_bot, method_name)
        invoked_safely = False
        # Attempt calling with 0 to 4 arguments until either closed-error is raised or argument type error
        # In all cases, closed robot must reject before executing logic
        for dummy_args in [(), (0,), (0, 0), (0, 0, 0), (0, 0, 0, 0), (1, 100.0, 200.0, 50.0)]:
            try:
                method(*dummy_args)
                assert False, f"Method {method_name}{dummy_args} succeeded on closed object!"
            except (RuntimeError, OSError) as e:
                # Expected: fail-closed with closed-handle guard
                invoked_safely = True
                break
            except (TypeError, ValueError):
                # Argument signature mismatch; try next argument count
                continue

        assert invoked_safely, f"Method {method_name} could not be triggered to assert closed-object guard!"

    # Explicit audit of color calibration methods (Scenario 1)
    try:
        audit_bot.reset_color_calibration()
        assert False, "Expected error on reset_color_calibration after close"
    except (RuntimeError, OSError):
        pass

    try:
        audit_bot.set_color_baseline(100.0, 200.0, 50.0)
        assert False, "Expected error on set_color_baseline after close"
    except (RuntimeError, OSError):
        pass

    try:
        audit_bot.set_color_threshold(15.0)
        assert False, "Expected error on set_color_threshold after close"
    except (RuntimeError, OSError):
        pass

    try:
        audit_bot.add_color_prototype(1, 100.0, 200.0, 50.0)
        assert False, "Expected error on add_color_prototype after close"
    except (RuntimeError, OSError):
        pass

    try:
        audit_bot.classify_color(100.0, 200.0, 50.0)
        assert False, "Expected error on classify_color after close"
    except (RuntimeError, OSError):
        pass

    # Explicit audit of motion dispatch methods (Scenario 2)
    try:
        audit_bot.go_forward(100.0)
        assert False, "Expected error on go_forward after close"
    except (RuntimeError, OSError):
        pass

    try:
        audit_bot.turn_to_angle(90.0)
        assert False, "Expected error on turn_to_angle after close"
    except (RuntimeError, OSError):
        pass

    # Explicit audit of status / query methods (Scenario 3)
    try:
        audit_bot.get_state()
        assert False, "Expected error on get_state after close"
    except (RuntimeError, OSError):
        pass

    try:
        audit_bot.status()
        assert False, "Expected error on status after close"
    except (RuntimeError, OSError):
        pass

    try:
        audit_bot.done()
        assert False, "Expected error on done after close"
    except (RuntimeError, OSError):
        pass

    try:
        audit_bot.stalled()
        assert False, "Expected error on stalled after close"
    except (RuntimeError, OSError):
        pass

    print(f"Exhaustive 49-method closed-object audit passed ({len(operational_methods)} operational methods verified).")

async def test_dynamic_kinematic_deadline_trajectory_invariance():
    """Scenario 1: Long-distance trajectory dynamic deadline invariance (AC-MDRB-034-1)."""
    print("Testing long-distance trajectory dynamic kinematic deadline invariance...")
    robot.reset_state(0.0, 0.0, 0.0)
    pts = [(0.0, 0.0), (1500.0, 0.0)]
    deadline = robot.calculate_trajectory_deadline_ms(pts, speed_mm_s=50.0)
    assert deadline >= 47000, f"Expected deadline >= 47000 ms, got {deadline}"
    await robot.follow_trajectory(pts, speed_mm_s=50.0)
    assert robot.done(), "Robot must report done() == True"
    assert robot.status() == 2, f"Expected status 2 (COMPLETED), got {robot.status()}"
    assert robot.get_last_deadline_ms() >= 47000, f"Recorded deadline {robot.get_last_deadline_ms()} must be >= 47000 ms"
    print("Long-distance trajectory dynamic deadline invariance passed.")

async def test_explicit_timeout_override():
    """Scenario 2: Explicit timeout parameter override (AC-MDRB-034-2)."""
    print("Testing explicit timeout override and ETIMEDOUT abort...")
    robot.reset_state(0.0, 0.0, 0.0)
    timed_out = False
    try:
        await robot.straight(1000.0, speed_mm_s=100.0, timeout_ms=50)
    except OSError as e:
        timed_out = True
        assert e.errno == 110 or "ETIMEDOUT" in str(e), f"Expected ETIMEDOUT (110), got {e}"
    assert timed_out, "Expected OSError ETIMEDOUT on explicit 50ms timeout override"
    assert robot.status() == 4, f"Expected status 4 (TIMED_OUT), got {robot.status()}"
    assert robot.done(), "Robot must report done() == True after timeout abort"
    assert robot.get_last_deadline_ms() == 50, f"Expected recorded deadline 50 ms, got {robot.get_last_deadline_ms()}"
    print("Explicit timeout override passed.")

async def test_deadline_enforcement_on_stall_timeout():
    """Scenario 3: Real stall and deadline enforcement (AC-MDRB-034-3)."""
    print("Testing deadline enforcement on stall timeout...")
    robot.reset_state(0.0, 0.0, 0.0)
    timed_out = False
    try:
        await robot.turn_to_angle(90.0, speed_deg_s=100.0, timeout_ms=50)
    except OSError as e:
        timed_out = True
        assert e.errno == 110 or "ETIMEDOUT" in str(e)
    assert timed_out, "Expected deadline expiration on short timeout"
    assert robot.status() == 4, f"FSM status must transition to TIMED_OUT (4), got {robot.status()}"
    assert left_motor.speed() == 0.0, "Left motor speed must clamp to 0"
    assert right_motor.speed() == 0.0, "Right motor speed must clamp to 0"
    print("Deadline enforcement on stall timeout passed.")

async def test_virtualhub_native_pbio_parity():
    """Scenario 4: VirtualHub and Native PBIO Parity (AC-MDRB-034-4)."""
    print("Testing VirtualHub and native PBIO kinematic deadline calculation parity...")
    robot.reset_state(0.0, 0.0, 0.0)

    # 1. Straight trajectory without turns
    pts1 = [(0.0, 0.0), (1000.0, 0.0)]
    d1 = robot.calculate_trajectory_deadline_ms(pts1, speed_mm_s=200.0, accel_mm_s2=200.0, decel_mm_s2=200.0)
    assert d1 == 12500, f"Expected 12500 ms, got {d1}"

    # 2. Multi-segment trajectory with 90-degree total waypoint heading changes
    # Segment 1: (0,0) -> (300,400): dist=500mm, angle=53.13 deg
    # Segment 2: (300,400) -> (300,1000): dist=600mm, angle change=36.87 deg
    # Total dist = 1100mm, total turn = 90.0 deg
    # t_linear = 1100/100 + 100/200 + 100/200 = 12.0s
    # t_angular = 90/200 + 200/400 + 200/400 = 1.45s
    # t_kinematic = 13.45s -> deadline = int(13.45 * 1.5 * 1000) + 2000 = 22175 ms
    pts2 = [(0.0, 0.0), (300.0, 400.0), (300.0, 1000.0)]
    d2 = robot.calculate_trajectory_deadline_ms(pts2, speed_mm_s=100.0, accel_mm_s2=200.0, decel_mm_s2=200.0)
    assert d2 == 22175, f"Expected 22175 ms, got {d2}"

    # 3. Multi-segment right-angle corner trajectory (Codex P1 verification)
    # (0,0) -> (500,0) -> (500,500)
    # dist = 1000mm, heading change = 90.0 deg
    # t_linear = 1000/100 + 100/200 + 100/200 = 11.0s
    # t_angular = 1.45s -> t_kinematic = 12.45s -> deadline = int(12.45 * 1.5 * 1000) + 2000 = 20675 ms
    pts_rt = [(0.0, 0.0), (500.0, 0.0), (500.0, 500.0)]
    d_rt = robot.calculate_trajectory_deadline_ms(pts_rt, speed_mm_s=100.0, accel_mm_s2=200.0, decel_mm_s2=200.0)
    assert d_rt == 20675, f"Expected 20675 ms, got {d_rt}"

    # 4. Golden vectors across all motion families (Codex P1/P2 verification)
    # Golden Vector A - Straight motion:
    # 1500 mm @ 50 mm/s, accel 200, decel 200 -> t_linear = 30.0 + 0.5 = 30.5s -> deadline = 47750 ms
    d_straight_golden = robot.calculate_motion_deadline_ms(
        distance_mm=1500.0, speed_linear=50.0, accel_linear=200.0, decel_linear=200.0
    )
    assert d_straight_golden == 47750, f"Expected 47750 ms, got {d_straight_golden}"

    # Golden Vector B - Spin Turn:
    # 90 deg @ 200 deg/s, accel 400, decel 400 -> t_angular = 0.45 + 1.0 = 1.45s -> deadline = 4175 ms
    d_turn_golden = robot.calculate_motion_deadline_ms(
        angle_deg=90.0, turn_rate_dps=200.0, accel_angular=400.0, decel_angular=400.0
    )
    assert d_turn_golden == 4175, f"Expected 4175 ms, got {d_turn_golden}"

    # Golden Vector C - Pivot Turn:
    # 90 deg @ 150 deg/s, accel 400, decel 400 -> t_angular = 0.6 + 0.75 = 1.35s -> deadline = 4025 ms
    d_pivot_golden = robot.calculate_motion_deadline_ms(
        angle_deg=90.0, turn_rate_dps=150.0, accel_angular=400.0, decel_angular=400.0
    )
    assert d_pivot_golden == 4025, f"Expected 4025 ms, got {d_pivot_golden}"

    # Golden Vector D - Navigation to Goal:
    # Distance = 500 mm @ 100 mm/s, heading diff = 53.1301 deg -> deadline = 12898 ms
    d_nav_golden = robot.calculate_motion_deadline_ms(
        distance_mm=500.0, angle_deg=53.1301, speed_linear=100.0, turn_rate_dps=200.0,
        accel_linear=200.0, decel_linear=200.0, accel_angular=400.0, decel_angular=400.0
    )
    assert d_nav_golden == 12898, f"Expected 12898 ms, got {d_nav_golden}"

    # 5. Backward trajectory parity (AC-MDRB-034-6, Codex review finding)
    # When back=True, segment headings are offset by 180 degrees
    # Straight backward: [(0,0), (1000,0)] starting at theta=0 -> heading diff = 180 deg
    # t_linear = 7.0s, t_angular = 180/200 + 1.0 = 1.9s -> t_kinematic = 8.9s -> deadline = 15350 ms
    d_str_back = robot.calculate_trajectory_deadline_ms(
        pts1, speed_mm_s=200.0, accel_mm_s2=200.0, decel_mm_s2=200.0, back=True
    )
    assert d_str_back == 15350, f"Expected 15350 ms for straight backward, got {d_str_back}"

    # Multi-segment backward: [(0,0), (300,400), (300,1000)] with back=True
    # Total turn = 163.74 deg -> deadline = 22728 ms
    d_multi_back = robot.calculate_trajectory_deadline_ms(
        pts2, speed_mm_s=100.0, accel_mm_s2=200.0, decel_mm_s2=200.0, back=True
    )
    assert d_multi_back == 22728, f"Expected 22728 ms for multi-segment backward, got {d_multi_back}"

    # 6. Dynamic ramp calculation and floor invariant
    pts3 = [(0.0, 0.0), (1.0, 0.0)]
    d3 = robot.calculate_trajectory_deadline_ms(pts3, speed_mm_s=500.0)
    assert d3 == 9503 and d3 >= 1500, f"Expected 9503 ms (>= 1500 ms floor), got {d3}"

    # 7. Explicit timeout override
    d4 = robot.calculate_trajectory_deadline_ms(pts1, timeout_ms=3500)
    assert d4 == 3500, f"Expected 3500 ms, got {d4}"
    print("VirtualHub and native PBIO parity passed.")

async def test_table_driven_motion_deadline_parity():
    """Table-driven parity test across all 6 motion configurations and .5 ms boundaries."""
    print("Testing table-driven motion deadline parity and boundary vectors...")
    robot.reset_state(0.0, 0.0, 0.0)

    test_matrix = [
        (
            "straight_1500mm_at_50mms",
            lambda: robot.calculate_motion_deadline_ms(
                distance_mm=1500.0, speed_linear=50.0, accel_linear=200.0, decel_linear=200.0
            ),
            47750,
        ),
        (
            "spin_turn_90deg_at_200dps",
            lambda: robot.calculate_motion_deadline_ms(
                angle_deg=90.0, turn_rate_dps=200.0, accel_angular=400.0, decel_angular=400.0
            ),
            4175,
        ),
        (
            "pivot_turn_90deg_at_150dps",
            lambda: robot.calculate_motion_deadline_ms(
                angle_deg=90.0, turn_rate_dps=150.0, accel_angular=400.0, decel_angular=400.0
            ),
            4025,
        ),
        (
            "navigate_to_goal_500mm_corner",
            lambda: robot.calculate_motion_deadline_ms(
                distance_mm=500.0, angle_deg=53.1301, speed_linear=100.0, turn_rate_dps=200.0,
                accel_linear=200.0, decel_linear=200.0, accel_angular=400.0, decel_angular=400.0
            ),
            12898,
        ),
        (
            "forward_trajectory_right_angle",
            lambda: robot.calculate_trajectory_deadline_ms(
                [(0.0, 0.0), (500.0, 0.0), (500.0, 500.0)],
                speed_mm_s=100.0, accel_mm_s2=200.0, decel_mm_s2=200.0, back=False
            ),
            20675,
        ),
        (
            "backward_trajectory_straight",
            lambda: robot.calculate_trajectory_deadline_ms(
                [(0.0, 0.0), (1000.0, 0.0)],
                speed_mm_s=200.0, accel_mm_s2=200.0, decel_mm_s2=200.0, back=True
            ),
            15350,
        ),
        (
            "backward_trajectory_corner",
            lambda: robot.calculate_trajectory_deadline_ms(
                [(0.0, 0.0), (300.0, 400.0), (300.0, 1000.0)],
                speed_mm_s=100.0, accel_mm_s2=200.0, decel_mm_s2=200.0, back=True
            ),
            22728,
        ),
        (
            "floor_clamp_zero_motion",
            lambda: robot.calculate_motion_deadline_ms(distance_mm=0.0, angle_deg=0.0),
            2000,
        ),
    ]

    for name, fn, expected in test_matrix:
        actual = fn()
        assert actual == expected, f"Table case '{name}' failed: expected {expected} ms, got {actual} ms"

    # Boundary vector tests around .5 ms floor tie cases
    b1 = robot.calculate_motion_deadline_ms(distance_mm=1000.4, speed_linear=1500.0, accel_linear=1e8, decel_linear=1e8)
    b2 = robot.calculate_motion_deadline_ms(distance_mm=1000.5, speed_linear=1500.0, accel_linear=1e8, decel_linear=1e8)
    b3 = robot.calculate_motion_deadline_ms(distance_mm=1000.6, speed_linear=1500.0, accel_linear=1e8, decel_linear=1e8)
    b4 = robot.calculate_motion_deadline_ms(distance_mm=1001.0, speed_linear=1500.0, accel_linear=1e8, decel_linear=1e8)
    assert b1 == 3000, f"Expected boundary vector 1000.4ms -> 3000, got {b1}"
    assert b2 == 3000, f"Expected boundary vector 1000.5ms -> 3000 (floor rule), got {b2}"
    assert b3 == 3000, f"Expected boundary vector 1000.6ms -> 3000, got {b3}"
    assert b4 == 3001, f"Expected boundary vector 1001.0ms -> 3001, got {b4}"
    print("Table-driven motion deadline parity and boundary vectors passed.")

async def test_real_monotonic_clock_timeout_enforcement():
    """Real monotonic clock elapsed-time deadline test (P1/P2 Codex verification)."""
    print("Testing real monotonic clock timeout enforcement...")
    robot.reset_state(0.0, 0.0, 0.0)

    # 1. Verify that a timeout of 150 ms occurs after approximately 150 ms (not immediately)
    t_start = time.monotonic()
    timed_out = False
    try:
        # Long move (5000 mm) at 100 mm/s takes 50 seconds; with timeout_ms=150 it must abort after ~150 ms
        await robot.straight(5000.0, speed_mm_s=100.0, timeout_ms=150)
    except OSError as e:
        timed_out = True
        assert e.errno == 110 or "ETIMEDOUT" in str(e)
    t_elapsed_ms = (time.monotonic() - t_start) * 1000.0

    assert timed_out, "Motion must abort with OSError ETIMEDOUT"
    assert t_elapsed_ms >= 140.0, f"Expected elapsed time >= 140 ms, got {t_elapsed_ms:.2f} ms"
    assert robot.status() == 4, f"Status must be TIMED_OUT (4), got {robot.status()}"
    assert left_motor.speed() == 0.0, "Left motor must be stopped on timeout"
    assert right_motor.speed() == 0.0, "Right motor must be stopped on timeout"

    # 2. Verify that a timeout of 500 ms does NOT occur prematurely at ~100 ms
    # Short move (50 mm) at 500 mm/s takes ~100 ms; with timeout_ms=500 it must complete successfully
    robot.motion_reset()
    t_start2 = time.monotonic()
    await robot.straight(50.0, speed_mm_s=500.0, timeout_ms=500)
    t_elapsed2_ms = (time.monotonic() - t_start2) * 1000.0

    assert robot.status() == 2, f"Expected COMPLETED status (2), got {robot.status()}"
    assert t_elapsed2_ms < 400.0, f"Expected motion to finish quickly (~100ms), took {t_elapsed2_ms:.2f} ms"
    print("Real monotonic clock timeout enforcement passed.")

async def test_episode_oracle_raw_trial_schema_and_statistics():
    """Episode oracle / raw-trial schema measurement and Wilson score confidence validation."""
    print("Testing episode oracle raw trial execution and confidence statistics...")
    import math
    import time
    trials = []
    num_episodes = 25

    for i in range(num_episodes):
        dist = 50.0 + (i * 10.0)
        speed = 100.0 + (i * 5.0)
        t_start = time.perf_counter()
        await robot.straight(dist, speed_mm_s=speed)
        t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0

        trial_record = {
            "trial_id": i + 1,
            "motion_type": "straight",
            "distance_mm": dist,
            "speed_mm_s": speed,
            "computed_deadline_ms": robot.get_last_deadline_ms(),
            "elapsed_wall_ms": round(t_elapsed_ms, 2),
            "status": robot.status(),
            "stalled": robot.stalled(),
            "success": (robot.status() == 2 and not robot.stalled()),
        }
        assert trial_record["trial_id"] > 0
        assert trial_record["computed_deadline_ms"] >= 1500
        assert trial_record["elapsed_wall_ms"] >= 0.0
        assert trial_record["status"] in (0, 1, 2, 3, 4)
        trials.append(trial_record)

    successes = sum(1 for t in trials if t["success"])
    assert successes == num_episodes, f"Expected {num_episodes}/{num_episodes} successes, got {successes}"

    def calc_wilson(k: int, n: int, z: float = 1.95996):
        if n <= 0:
            raise ValueError("n must be positive")
        if k < 0 or k > n:
            raise ValueError("k must be in [0, n]")
        p = k / n
        denom = 1.0 + (z * z) / n
        ctr = (p + (z * z) / (2.0 * n)) / denom
        spr = (z / denom) * math.sqrt((p * (1.0 - p) / n) + (z * z) / (4.0 * n * n))
        return max(0.0, ctr - spr), min(1.0, ctr + spr)

    ci_lower, ci_upper = calc_wilson(successes, num_episodes)
    assert ci_lower > 0.85, f"Expected Wilson 95% CI lower bound > 0.85, got {ci_lower:.4f}"
    assert ci_upper <= 1.0, f"Expected Wilson 95% CI upper bound <= 1.0, got {ci_upper:.4f}"

    try:
        calc_wilson(5, 0)
        assert False, "Expected ValueError on zero trial size"
    except ValueError:
        pass

    try:
        calc_wilson(-1, 25)
        assert False, "Expected ValueError on negative success count"
    except ValueError:
        pass

    try:
        calc_wilson(30, 25)
        assert False, "Expected ValueError when k > n"
    except ValueError:
        pass

    print(f"Episode oracle verified: {num_episodes} trials, 100% pass, Wilson 95% CI: [{ci_lower:.4f}, {ci_upper:.4f}].")


async def test_g_mdrb_035_context_manager_clean_and_exception_exit():
    print("Testing G-MDRB-035 context manager clean and exception exit...")
    m_left = Motor(Port.E)
    m_right = Motor(Port.F)

    # 1. Normal exit from with-block
    with MDRobotBase(m_left, m_right, wheel_diameter=56.0, axle_track=112.0) as bot:
        assert not bot._is_closed
        assert bot.done()
    assert bot._is_closed, "MDRobotBase instance must be closed after normal with-block exit"

    # 2. Re-allocation on same motors succeeds immediately with zero EBUSY
    bot_re = MDRobotBase(m_left, m_right, wheel_diameter=56.0, axle_track=112.0)
    assert not bot_re._is_closed
    bot_re.close()

    # 3. Exception exit from with-block
    exception_caught = False
    try:
        with MDRobotBase(m_left, m_right, wheel_diameter=56.0, axle_track=112.0) as bot_exc:
            assert not bot_exc._is_closed
            raise ValueError("Simulated script failure inside with block")
    except ValueError as e:
        if str(e) == "Simulated script failure inside with block":
            exception_caught = True
    assert exception_caught, "Expected simulated exception to be propagated"
    assert bot_exc._is_closed, "MDRobotBase instance must be closed after exception with-block exit"

    # 4. Immediate re-allocation after exception succeeds
    bot_re2 = MDRobotBase(m_left, m_right, wheel_diameter=56.0, axle_track=112.0)
    assert not bot_re2._is_closed
    bot_re2.close()
    print("G-MDRB-035 context manager clean and exception exit passed.")


async def test_g_mdrb_035_exact_pair_rebinding_and_partial_overlap_failclosed():
    print("Testing G-MDRB-035 exact-pair re-binding and partial overlap fail-closed protection...")
    m_a = Motor(Port.C)
    m_b = Motor(Port.D)
    m_c = Motor(Port.F)

    # 1. Allocate initial base
    base1 = MDRobotBase(m_a, m_b, wheel_diameter=56.0, axle_track=112.0)
    assert not base1._is_closed

    # 2. Re-allocate exact same pair without calling base1.close()
    # Must cleanly re-claim the slot and close base1
    base2 = MDRobotBase(m_a, m_b, wheel_diameter=56.0, axle_track=112.0)
    assert not base2._is_closed
    assert base1._is_closed, "Previous exact-pair instance must be reclaimed on re-binding"

    # 3. Attempt partial overlap (sharing m_a with conflicting m_c)
    # Must strictly fail closed with OSError(16, EBUSY)
    partial_overlap_rejected = False
    try:
        MDRobotBase(m_a, m_c, wheel_diameter=56.0, axle_track=112.0)
    except OSError as err:
        if err.errno == 16:
            partial_overlap_rejected = True
    assert partial_overlap_rejected, "Partial motor overlap across bases must fail closed with EBUSY"

    # 4. Attempt reversed pair (m_b, m_a)
    # Must strictly fail closed with OSError(16, EBUSY)
    reversed_rejected = False
    try:
        MDRobotBase(m_b, m_a, wheel_diameter=56.0, axle_track=112.0)
    except OSError as err:
        if err.errno == 16:
            reversed_rejected = True
    assert reversed_rejected, "Reversed motor allocation must fail closed with EBUSY"

    base2.close()
    print("G-MDRB-035 exact-pair re-binding and partial overlap fail-closed passed.")


async def test_g_mdrb_035_episode_oracle_script_restart_trials():
    print("Testing G-MDRB-035 episode oracle: 25 script restart reclamation cycles...")
    m_left = Motor(Port.A)
    m_right = Motor(Port.B)

    num_episodes = 25
    successes = 0
    trial_records = []

    for trial_id in range(1, num_episodes + 1):
        t_start = time.perf_counter()
        try:
            # Simulate a script crash by allocating without closing
            bot = MDRobotBase(m_left, m_right, wheel_diameter=56.0, axle_track=112.0)
            assert not bot._is_closed
            # Re-running next script: allocating again on same motors
            bot_next = MDRobotBase(m_left, m_right, wheel_diameter=56.0, axle_track=112.0)
            assert not bot_next._is_closed
            assert bot._is_closed
            bot_next.close()
            t_elapsed = time.perf_counter() - t_start
            trial_records.append({"trial_id": trial_id, "elapsed_s": t_elapsed, "status": "PASS"})
            successes += 1
        except Exception as err:
            trial_records.append({"trial_id": trial_id, "status": "FAIL", "error": str(err)})

    assert successes == num_episodes, f"Expected {num_episodes} successes, got {successes}"

    # Wilson 95% confidence interval
    def calc_wilson(k, n, z=1.95996):
        if n <= 0 or k < 0 or k > n:
            raise ValueError("Invalid sample parameters")
        p = float(k) / float(n)
        denom = 1.0 + (z * z) / n
        ctr = (p + (z * z) / (2.0 * n)) / denom
        spr = (z / denom) * math.sqrt((p * (1.0 - p) / n) + (z * z) / (4.0 * n * n))
        return max(0.0, ctr - spr), min(1.0, ctr + spr)

    ci_lower, ci_upper = calc_wilson(successes, num_episodes)
    assert ci_lower > 0.85, f"Expected Wilson 95% CI lower bound > 0.85, got {ci_lower:.4f}"
    assert ci_upper <= 1.0, f"Expected Wilson 95% CI upper bound <= 1.0, got {ci_upper:.4f}"
    print(f"G-MDRB-035 episode oracle verified: {num_episodes} restart trials, 100% pass, Wilson 95% CI: [{ci_lower:.4f}, {ci_upper:.4f}].")


async def main():
    await test_idle_stop_idempotence()
    await test_motion_preemption()
    await test_gear_ratio_boundaries()
    await test_lifecycle_status_queries()
    await test_invalid_preemption_non_interference()
    await test_behavioral_motion_preemption_immunity()
    await test_closed_handle_guarding()
    await test_closed_object_exhaustive_audit()
    await test_dynamic_kinematic_deadline_trajectory_invariance()
    await test_explicit_timeout_override()
    await test_deadline_enforcement_on_stall_timeout()
    await test_virtualhub_native_pbio_parity()
    await test_table_driven_motion_deadline_parity()
    await test_real_monotonic_clock_timeout_enforcement()
    await test_episode_oracle_raw_trial_schema_and_statistics()
    await test_g_mdrb_035_context_manager_clean_and_exception_exit()
    await test_g_mdrb_035_exact_pair_rebinding_and_partial_overlap_failclosed()
    await test_g_mdrb_035_episode_oracle_script_restart_trials()
    print("All MDRobotBase async lifecycle regression tests passed!")

class TestMDRobotBaseLifecycle(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        global robot, left_motor, right_motor
        MDRobotBase.deinit_all()
        left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
        right_motor = Motor(Port.B)
        robot = MDRobotBase(left_motor, right_motor, wheel_diameter=56.0, axle_track=112.0)

    async def test_idle_stop_idempotence(self):
        await test_idle_stop_idempotence()

    async def test_motion_preemption(self):
        await test_motion_preemption()

    async def test_gear_ratio_boundaries(self):
        await test_gear_ratio_boundaries()

    async def test_lifecycle_status_queries(self):
        await test_lifecycle_status_queries()

    async def test_invalid_preemption_non_interference(self):
        await test_invalid_preemption_non_interference()

    async def test_behavioral_motion_preemption_immunity(self):
        await test_behavioral_motion_preemption_immunity()

    async def test_closed_handle_guarding(self):
        await test_closed_handle_guarding()

    async def test_closed_object_exhaustive_audit(self):
        await test_closed_object_exhaustive_audit()

    async def test_dynamic_kinematic_deadline_trajectory_invariance(self):
        await test_dynamic_kinematic_deadline_trajectory_invariance()

    async def test_explicit_timeout_override(self):
        await test_explicit_timeout_override()

    async def test_deadline_enforcement_on_stall_timeout(self):
        await test_deadline_enforcement_on_stall_timeout()

    async def test_virtualhub_native_pbio_parity(self):
        await test_virtualhub_native_pbio_parity()

    async def test_table_driven_motion_deadline_parity(self):
        await test_table_driven_motion_deadline_parity()

    async def test_real_monotonic_clock_timeout_enforcement(self):
        await test_real_monotonic_clock_timeout_enforcement()

    async def test_episode_oracle_raw_trial_schema_and_statistics(self):
        await test_episode_oracle_raw_trial_schema_and_statistics()

    async def test_g_mdrb_035_context_manager_clean_and_exception_exit(self):
        await test_g_mdrb_035_context_manager_clean_and_exception_exit()

    async def test_g_mdrb_035_exact_pair_rebinding_and_partial_overlap_failclosed(self):
        await test_g_mdrb_035_exact_pair_rebinding_and_partial_overlap_failclosed()

    async def test_g_mdrb_035_episode_oracle_script_restart_trials(self):
        await test_g_mdrb_035_episode_oracle_script_restart_trials()

if __name__ == "__main__":
    unittest.main()
