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

async def main():
    await test_spin_turns()
    await test_pivot_turns()
    print("All native C MDRobotBase turn unit tests completed!")

run_task(main())
