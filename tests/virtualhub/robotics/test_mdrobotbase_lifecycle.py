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
        if not m.startswith("__") and m != "close" and callable(getattr(audit_bot, m))
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

async def main():
    await test_idle_stop_idempotence()
    await test_motion_preemption()
    await test_gear_ratio_boundaries()
    await test_lifecycle_status_queries()
    await test_invalid_preemption_non_interference()
    await test_behavioral_motion_preemption_immunity()
    await test_closed_handle_guarding()
    await test_closed_object_exhaustive_audit()
    print("All MDRobotBase async lifecycle regression tests passed!")

run_task(main())

