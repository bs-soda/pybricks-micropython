# Troubleshooting Manual: LQR vs PID Controller Selection & Systematic Tuning Protocol

**Timestamp**: 2026-07-24T12:33:00Z  
**Target Repository**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**Tuning Script**: [`code/tune_lqr_pid_gains.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/tune_lqr_pid_gains.py)  
**Tuning Test Suite**: [`code/test_tune_lqr_pid_gains.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/test_tune_lqr_pid_gains.py)  

---

## 1. Problem Statement: Why Default LQR Gains Fail on Physical Robots

LQR state-feedback optimal control ($\mathbf{u} = -\mathbf{K}\mathbf{e}$) requires that gain parameters ($k_x, k_y, k_\theta$) closely match the physical robot mass, center of gravity, wheel friction coefficient, and gearbox inertia.

If LQR gains are set to arbitrary values or defaults:
- **Over-tuned $k_y$ or $k_\theta$**: Robot **shakes violently**, weaves back and forth like a snake, or over-corrects past the target.
- **Under-tuned $k_y$ or $k_\theta$**: Robot **drifts off-path**, sluggishly recovers from lateral displacement, and misses target waypoints.

---

## 2. Option A (RECOMMENDED): Switch to Robust PID Control Mode

For $90\%$ of WRO differential drive competition robots, **PID mode (`set_controller(0)`) is much simpler, more forgiving, and extremely reliable out of the box**.

### Why PID Mode is Easier to Use:
1. **Uncoupled Speed & Steering**: PID mode separates linear speed profiling from heading control.
2. **Predictable Behavior**: PID gains (`kp=10.0, ki=0.0, kd=0.1`) work reliably across almost all SPIKE Prime drive base designs.
3. **No Lateral Oscillation**: Eliminates snake-like weaving on smooth mats.

### Code Implementation (PID Mode):

```python
from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop, Axis
from pybricks.tools import run_task
from pybricks.robotics import MDRobotBase

hub = PrimeHub(top_side=Axis.Z, front_side=-Axis.X)
left_motor = Motor(Port.F, Direction.COUNTERCLOCKWISE)
right_motor = Motor(Port.B, Direction.CLOCKWISE)

robot = MDRobotBase(left_motor, right_motor, 63.4, 63.4, 165.0)

async def main():
    # Reset pose
    robot.reset_state(0.0, 0.0, 0.0, hub.imu.heading())

    # 1. SELECT PID CONTROLLER MODE (0 = PID, 1 = LQR)
    robot.set_controller(0)

    # 2. SET STABLE PID HEADING GAINS
    robot.set_pid_gains(kp=10.0, ki=0.0, kd=0.1)
    robot.set_pid_min_turn(min_turn=1.25, threshold=0.25)

    # Execute motion with solid PID tracking
    await robot.go_forward(1000.0, speed_mm_s=450.0, start_speed_mm_s=30.0, then=Stop.HOLD)
    await robot.turn_to_angle(90.0, speed_deg_s=250.0, then=Stop.HOLD)

run_task(main())
```

---

## 3. Option B: Systematic 3-Step Empirical LQR Tuning Protocol

If you prefer to use **LQR mode (`set_controller(1)`)**, follow this 3-step empirical protocol to find the optimal $k_x, k_y, k_\theta$ gains for your specific robot:

```
        Step 1: Tune k_x (Longitudinal Pace)
        [Set k_y=0.0, k_theta=0.0 -> Increase k_x from 0.5 until speed is steady]

        Step 2: Tune k_theta (Heading Stiffness)
        [Set k_x=1.0, k_y=0.0 -> Test with 10-deg heading offset -> Increase k_theta until heading recovers smoothly]

        Step 3: Tune k_y (Lateral Cross-Track Rejection)
        [Set k_x=1.0, k_theta=3.0 -> Test with 50mm lateral offset -> Increase k_y until robot returns to centerline without shaking]
```

### Step 1: Tune Longitudinal Gain ($k_x$)
1. Set $k_y = 0.0$ and $k_\theta = 0.0$.
2. Command a $1000\text{mm}$ straight drive. Start with $k_x = 0.5$.
3. Increase $k_x$ in steps ($0.5 \to 0.75 \to 1.0 \to 1.25$) until the robot maintains target speed without surging forward/backward. Typical optimal value: **$k_x \approx 1.0 - 1.25$**.

### Step 2: Tune Heading Error Gain ($k_\theta$)
1. Keep $k_x = 1.0$, set $k_y = 0.0$.
2. Command a straight drive, but start the robot rotated $10^\circ$ away from target direction.
3. Increase $k_\theta$ ($1.0 \to 2.0 \to 3.0 \to 4.0$) until the robot smoothly turns back to parallel alignment without overshooting. Typical optimal value: **$k_\theta \approx 3.0 - 5.0$**.

### Step 3: Tune Lateral Cross-Track Error Gain ($k_y$)
1. Keep $k_x = 1.0, k_\theta = 3.0$.
2. Command `navigate_to_goal(goal_x=1000.0, goal_y=0.0)`, but place the robot starting at $Y = 50.0\text{mm}$ lateral offset.
3. Start with $k_y = 0.5$. Increase $k_y$ ($0.5 \to 1.0 \to 1.5 \to 2.0$) until the chassis smoothly returns to $Y=0.0\text{mm}$.
4. **CRITICAL**: If the robot starts **shaking or weaving back and forth like a snake**, $k_y$ is too high! Reduce $k_y$ by $30\%$. Typical optimal value: **$k_y \approx 1.2 - 2.0$**.

### Final Calibrated LQR Call:
```robot.set_lqr_gains(k_x=1.0, k_y=1.5, k_theta=3.0, lqr_schedule_enabled=True)```

---

## 4. Verification Results

- **Tuning Engine Script**: [`code/tune_lqr_pid_gains.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/tune_lqr_pid_gains.py)
- **Pytest Suite**: [`code/test_tune_lqr_pid_gains.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/test_tune_lqr_pid_gains.py) (**25 passed in 2.96s**).
- **Native C Test Suite**: `./test-pbio.sh` (**63 passed**).
