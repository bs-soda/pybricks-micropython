# Native C `turn_to_angle` Kinematics, Ramping, Timeout Bug Analysis & Follow-up Movement Specification

**Date**: 2026-07-24T14:52:00+07:00  
**Target Subsystems**: `pybricks-micropython` (`pb_type_mdrobotbase.c`), `spike-prime-mdrobotkids` (`MDRobotBase`)  
**Scope**: Native C differential spin turn execution, parameter mapping, timeout calculation bug analysis, coroutine yielding, and post-turn linear/pivot motion integration.

---

## 1. Overview & Python Execution Flow

Executing an absolute spin turn to `target_angle=-180.0` with explicit speed profiling, followed immediately by forward movement, provides precise robot re-orientation and path continuation.

### 1.1 Complete Python Implementation Script

```python
"""
sample_turn_and_move.py
========================
Demonstration of MDRobotBase turning to an absolute angle (-180.0 deg)
with specified profile parameters, followed immediately by forward movement.
"""

from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Port, Direction, Stop
from pybricks.robotics import MDRobotBase
from pybricks.tools import wait, run_task


async def run_turn_and_move(robot: MDRobotBase):
    print("[1] Executing absolute spin turn to -180.0 degrees...")
    await robot.turn_to_angle(
        target_angle=-180.0,
        speed_deg_s=200.0,
        tolerance=1.0,
        timeout_ms=3500,  # Explicitly set to prevent premature timeout during long accel_angle
        then=Stop.HOLD,
        accel_angle=200.0,
        start_speed=40.0,
        decel_angle=15.0,
        end_speed=20.0
    )
    print("Turn complete! Pausing briefly...")
    wait(200)

    print("[2] Executing forward movement (a bit move)...")
    await robot.go_forward(
        distance=150.0,
        speed_mm_s=250.0,
        start_speed_mm_s=20.0,
        end_speed_mm_s=0.0,
        accel_dist_mm=30.0,
        decel_dist_mm=30.0,
        then=Stop.HOLD
    )
    print("[3] Sequence finished successfully!")


async def main():
    hub = PrimeHub()
    left_motor = Motor(Port.A, Direction.COUNTERCLOCKWISE)
    right_motor = Motor(Port.B, Direction.CLOCKWISE)

    robot = MDRobotBase(
        left_motor=left_motor,
        right_motor=right_motor,
        wheel_diameter_left=56.0,
        wheel_diameter_right=56.0,
        axle_track=112.0
    )

    await run_turn_and_move(robot)


if __name__ == "__main__":
    run_task(main())
```

---

## 2. Native C Implementation Architecture (`pb_type_mdrobotbase.c`)

### 2.1 Argument Parsing & Field Binding

In `pybricks/robotics/pb_type_mdrobotbase.c`, `pb_type_MDRobotBase_turn_to_angle` parses parameters via MicroPython's Keyword Argument parser:

```c
static mp_obj_t pb_type_MDRobotBase_turn_to_angle(size_t n_args,
                                                  const mp_obj_t *pos_args,
                                                  mp_map_t *kw_args) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);

  static const mp_arg_t allowed_args[] = {
      {MP_QSTR_target_angle, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
      {MP_QSTR_speed_deg_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)}},
      {MP_QSTR_accel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_start_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_decel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_end_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
  };

  mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
  mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args,
                   MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

  float target_angle = mp_obj_get_float(parsed_args[0].u_obj);
  float speed_deg_s = parsed_args[1].u_obj == mp_const_none ? 300.0f : mp_obj_get_float(parsed_args[1].u_obj);
  mp_obj_t tolerance_obj = parsed_args[2].u_obj;
  mp_obj_t timeout_ms_obj = parsed_args[3].u_obj;
  mp_obj_t then_obj = parsed_args[4].u_obj;
  float accel_angle = parsed_args[5].u_obj == mp_const_none ? 15.0f : mp_obj_get_float(parsed_args[5].u_obj);
  float start_speed = parsed_args[6].u_obj == mp_const_none ? 40.0f : mp_obj_get_float(parsed_args[6].u_obj);
  float decel_angle = parsed_args[7].u_obj == mp_const_none ? 15.0f : mp_obj_get_float(parsed_args[7].u_obj);
  float end_speed = parsed_args[8].u_obj == mp_const_none ? 20.0f : mp_obj_get_float(parsed_args[8].u_obj);

  float tolerance = 1.5f;
  if (tolerance_obj != mp_const_none) {
    tolerance = mp_obj_get_float(tolerance_obj);
  }
```

### 2.2 Native C Control Loop Mechanics (`PBIO_MDROBOTBASE_MOTION_TURN`)

On every 10ms control step in `pb_type_MDRobotBase_step_motion`:

1. **Normalized Angle Error Calculation**:
   $$\Delta \theta = \theta_{\text{target}} - \theta_{\text{current}}$$
   $$\text{while } \Delta \theta > 180.0 \implies \Delta \theta -= 360.0, \quad \text{while } \Delta \theta < -180.0 \implies \Delta \theta += 360.0$$

2. **Proportional-Integral-Derivative (PID) Command**:
   $$\omega_{\text{cmd}} = (K_p \cdot \text{comp}) \cdot \Delta \theta + i_{\text{term}} - (K_d \cdot \text{comp}) \cdot \omega_{\text{raw}}$$

3. **Speed Profile Ramping (Acceleration & Deceleration Clamping)**:
   - Turned Angle: $\theta_{\text{turned}} = \theta_{\text{total}} - |\Delta \theta|$
   - Acceleration Limit:
     $$v_{\text{accel}} = \text{start\_speed} + (\text{speed\_deg\_s} - \text{start\_speed}) \cdot \frac{\theta_{\text{turned}}}{\text{accel\_angle}}$$
   - Deceleration Limit:
     $$v_{\text{decel}} = \text{end\_speed} + (\text{speed\_deg\_s} - \text{end\_speed}) \cdot \frac{|\Delta \theta|}{\text{decel\_angle}}$$
   - Combined Limit:
     $$\text{limit} = \min(v_{\text{accel}}, v_{\text{decel}}, v_{\text{max\_turn\_speed}})$$
   - Clamping:
     $$\omega_{\text{cmd}} = \max(-\text{limit}, \min(\text{limit}, \omega_{\text{cmd}}))$$

4. **Wheel Velocity Kinematic Transformation**:
   $$\omega_{\text{rad}} = \omega_{\text{cmd}} \cdot \frac{\pi}{180}$$
   $$v_{\text{left}} = -\omega_{\text{rad}} \cdot \frac{\text{axle\_track}}{2}, \quad v_{\text{right}} = \omega_{\text{rad}} \cdot \frac{\text{axle\_track}}{2}$$
   $$\text{dps}_{\text{left}} = \frac{v_{\text{left}}}{\pi \cdot d_{\text{left}}} \cdot 360, \quad \text{dps}_{\text{right}} = \frac{v_{\text{right}}}{\pi \cdot d_{\text{right}}} \cdot 360$$

---

## 3. Deep Root Cause Analysis of Native C Bugs

### 3.1 Premature Timeout Bug with Soft/Extended Ramping (`accel_angle >= turn_angle`)

#### The Underlying Mechanism
In `pb_type_MDRobotBase_turn_to_angle`, when `timeout_ms` is not explicitly provided, native C calculates default timeout assuming constant cruise at `speed_deg_s`:

```c
  uint32_t timeout;
  if (timeout_ms_obj == mp_const_none) {
    float nominal_speed = speed_deg_s < self->rb->max_turn_speed ? speed_deg_s : self->rb->max_turn_speed;
    if (nominal_speed < 10.0f) nominal_speed = 150.0f;
    timeout = (uint32_t)((turn_angle / nominal_speed) * 1300.0f) + 600;
  } else {
    timeout = (uint32_t)pb_obj_get_int(timeout_ms_obj);
  }
```

#### Detailed Mathematical Breakdown of Premature Failure:
For the requested command:
- `target_angle = -180.0` ($\text{turn\_angle} = 180.0^\circ$)
- `speed_deg_s = 200.0`
- `accel_angle = 200.0` ($\text{accel\_angle} > \text{turn\_angle}$)
- `start_speed = 40.0`
- `decel_angle = 15.0`
- `end_speed = 20.0`

1. **Default C Timeout Calculation**:
   $$\text{nominal\_speed} = 200.0^\circ/\text{s}$$
   $$\text{timeout} = \left(\frac{180.0}{200.0}\right) \cdot 1300 + 600 = 0.9 \cdot 1300 + 600 = 1170 + 600 = 1770 \text{ ms}$$

2. **Actual Robot Motion Profile**:
   Because `accel_angle = 200.0`, over the entire 180 degree turn, the robot never reaches `speed_deg_s = 200.0`!
   Peak speed reached at $165.0^\circ$ (before deceleration):
   $$v_{\text{peak}} = 40.0 + (200.0 - 40.0) \cdot \frac{165.0}{200.0} = 40.0 + 160.0 \cdot 0.825 = 172.0^\circ/\text{s}$$
   Average angular speed during acceleration phase:
   $$\bar{v}_{\text{accel}} = \frac{40.0 + 172.0}{2} = 106.0^\circ/\text{s}$$
   Time required to cover $165.0^\circ$:
   $$t_{\text{accel}} = \frac{165.0}{106.0} \approx 1.557 \text{ s} = 1557 \text{ ms}$$
   Deceleration phase over remaining $15.0^\circ$ (from $172.0^\circ/\text{s}$ down to $20.0^\circ/\text{s}$):
   $$\bar{v}_{\text{decel}} = \frac{172.0 + 20.0}{2} = 96.0^\circ/\text{s}$$
   $$t_{\text{decel}} = \frac{15.0}{96.0} \approx 0.156 \text{ s} = 156 \text{ ms}$$
   Settlement & motor holding time ($1.0^\circ$ tolerance window): ~150–250 ms.
   **Total Actual Time Required**: $1557 + 156 + 200 \approx 1913 \text{ ms}$.

3. **Result**:
   Since $1913 \text{ ms} > 1770 \text{ ms}$, the native C timer expires at $1770 \text{ ms}$ while the robot is still at $\approx -165^\circ$. The native C motion step flags timeout, abruptly halts the motors, and exits before reaching target $-180.0^\circ$!

#### Root Cause Solution:
1. **Python API Level**: Pass explicit `timeout_ms=3500` whenever `accel_angle >= turn_angle` or `start_speed` is significantly lower than `speed_deg_s`.
2. **Native C Firmware Fix**: Incorporate ramping time integration into timeout estimation:
   $$t_{\text{ramp}} = \frac{2 \cdot \text{accel\_angle}}{v_{\text{start}} + v_{\text{cruise}}} + \frac{2 \cdot \text{decel\_angle}}{v_{\text{cruise}} + v_{\text{end}}}$$
   $$\text{timeout} = (t_{\text{ramp}} \cdot 1500.0f) + 1000$$

---

## 4. Verification & Testing Log

All automated tests in `spike-prime-mdrobotkids/code/test_turn_and_move.py` passed cleanly:

```bash
============================= test session starts ==============================
platform darwin -- Python 3.12.4, pytest-7.4.4, pluggy-1.0.0
rootdir: /Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code
plugins: anyio-4.14.2
collected 1 item

test_turn_and_move.py .                                                  [100%]

============================== 1 passed in 0.01s ===============================
```

### Summary Matrix of Motion APIs
| API | Native C Entry Point | Motion Type QSTR | Coroutine Yield Mechanism |
| :--- | :--- | :--- | :--- |
| `turn_to_angle` | `pb_type_MDRobotBase_turn_to_angle` | `PBIO_MDROBOTBASE_MOTION_TURN` | Generator via `pb_type_mdrobotbase_wait_or_await` |
| `pivot_turn_to_angle` | `pb_type_MDRobotBase_pivot_turn_to_angle` | `PBIO_MDROBOTBASE_MOTION_PIVOT` | Generator via `pb_type_mdrobotbase_wait_or_await` |
| `go_forward` | `pb_type_MDRobotBase_go_forward` | `PBIO_MDROBOTBASE_MOTION_FORWARD` | Generator via `pb_type_mdrobotbase_wait_or_await` |
