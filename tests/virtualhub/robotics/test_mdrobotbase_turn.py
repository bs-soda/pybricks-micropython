from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop
from pybricks.robotics import MDRobotBase
from pybricks.tools import run_task, wait

# Unit test for MDRobotBase turn and pivot turn functions in native C
left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B)
robot = MDRobotBase(left_motor, right_motor, wheel_diameter=56.0, axle_track=112.0)

async def test_spin_turns():
    print("Testing turn_to_angle and turn_angle...")
    # Test absolute turn to angle 90 degrees
    await robot.turn_to_angle(90.0, speed_deg_s=250.0, tolerance=1.0)
    assert abs(robot.heading - 90.0) <= 2.0, f"Heading error: expected ~90, got {robot.heading}"

    # Test relative turn by 180 degrees (target = 270 degrees)
    await robot.turn_angle(180.0, speed_deg_s=200.0)
    assert abs(robot.heading - 270.0) <= 3.0 or abs(robot.heading - (-90.0)) <= 3.0, f"Heading error after relative turn: got {robot.heading}"
    print("Spin turn tests passed successfully.")

async def test_pivot_turns():
    print("Testing pivot_turn_to_angle and pivot_turn_angle...")
    # Test pivot turn to angle 0 degrees
    await robot.pivot_turn_to_angle(0.0, speed_deg_s=150.0, pivot_side="left")
    assert abs(robot.heading - 0.0) <= 2.0, f"Pivot heading error: expected ~0, got {robot.heading}"

    # Test relative pivot turn by 90 degrees
    await robot.pivot_turn_angle(90.0, speed_deg_s=150.0)
    assert abs(robot.heading - 90.0) <= 3.0, f"Relative pivot heading error: expected ~90, got {robot.heading}"
    print("Pivot turn tests passed successfully.")

async def test_invalid_turn_preemption_immunity():
    print("Testing invalid turn and pivot preemption immunity (G-MDRB-022)...")
    # Start valid turn motion in background
    task_turn = run_task(robot.turn_to_angle(180.0, speed_deg_s=150.0))
    await wait(20)

    # 1. Dispatch invalid pivot turn with zero speed (must raise ValueError)
    try:
        robot.pivot_turn_to_angle(180.0, speed_deg_s=0.0)
        assert False, "Expected ValueError on zero pivot speed"
    except ValueError:
        pass

    # Turn motion must still be in progress
    assert not robot.done(), "Turn motion should still be running after invalid pivot dispatch"

    # 2. Dispatch invalid turn with negative speed (must raise ValueError)
    try:
        robot.turn_to_angle(0.0, speed_deg_s=-50.0)
        assert False, "Expected ValueError on negative turn speed"
    except ValueError:
        pass

    assert not robot.done(), "Turn motion should still be running after invalid negative speed turn"

    # 3. Dispatch invalid pivot turn with non-finite angle (must raise ValueError)
    try:
        robot.pivot_turn_to_angle(float('nan'), speed_deg_s=100.0)
        assert False, "Expected ValueError on NaN pivot angle"
    except ValueError:
        pass

    assert not robot.done(), "Turn motion should still be running after NaN pivot angle dispatch"

    # Await original turn completion
    await task_turn
    assert robot.done(), "Original turn motion must finish successfully"
    assert abs(robot.heading - 180.0) <= 3.0, f"Expected heading ~180, got {robot.heading}"
    print("Invalid turn and pivot preemption immunity passed.")

async def main():
    await test_spin_turns()
    await test_pivot_turns()
    await test_invalid_turn_preemption_immunity()
    print("All native C MDRobotBase turn unit tests completed!")

run_task(main())
