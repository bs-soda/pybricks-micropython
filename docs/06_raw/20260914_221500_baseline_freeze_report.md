# Baseline Freeze & Hardware Configuration Report: G-MDRB-036

**Date & Time:** 2026-09-14T22:15:00+07:00  
**Repository:** `bs-soda/pybricks-micropython`  
**Active Branch:** `fix/lqr-odometry`  
**Baseline Commit:** `0582aefe38928ed3fe7456775dc5784a901bd28b` (`master`)

---

## 1. Executive Summary & Objective

In accordance with the Codex Architectural Directive, this document establishes the baseline freeze and hardware configuration for **G-MDRB-036**. The goal is to deliver high-precision odometry and an isolated DARE LQR controller on top of the verified stable `master` branch while guaranteeing zero disruption to motor lifecycle, Port A–F ownership, or servo setup.

---

## 2. Hardware Inspection: `m.py` Configuration

Inspection of the primary robot program [`m.py`](file:///Users/batrarethsudprasert/.gemini/antigravity-ide/brain/302d2e56-9574-46cf-ad58-6c4733d0b9f4/scratch/m.py):

| Subsystem / Parameter | Exact Value in `m.py` | Implementation Invariant |
| :--- | :--- | :--- |
| **Hub Orientation** | `PrimeHub(top_side=Axis.Z, front_side=-Axis.X)` | Unchanged |
| **Left Drive Motor** | `Motor(Port.F, Direction.COUNTERCLOCKWISE)` | Port F must never be reported as false disconnect |
| **Right Drive Motor** | `Motor(Port.B, Direction.CLOCKWISE)` | Port B must never be reported as false disconnect |
| **Front Arm Motor** | `Motor(Port.E)` | Independent lifecycle |
| **Back Arm Motor** | `Motor(Port.A)` | Independent lifecycle |
| **Line Sensor** | `ColorSensor(Port.C)` | Port C auto-detected / dedicated |
| **Color Sensor** | Auto-detected (Port D preferred) | Dynamic discovery loop |
| **Wheel Diameter Left** | `63.4 mm` (`wheel_diameter_left=63.4`) | High-precision scaling in mm |
| **Wheel Diameter Right**| `63.4 mm` (`wheel_diameter_right=63.4`) | High-precision scaling in mm |
| **Axle Track** | `160.0 mm` (`axle_track=160.0`) | High-precision scaling in mm |
| **Drivetrain Gear Ratio**| `0.53` (`robot.set_gear_ratio(0.53)`) | Scale encoder ticks by `gear_ratio` |
| **Sensor Fusion Alpha** | Default `0.95` (`robot.set_fusion_alpha`) | [0.0, 1.0] bounds, gyro fallback |
| **State Reset** | `robot.reset_state(2150.0, 555.0, 0.0, hub.imu.heading())` | Atomic baseline sync; zero jump |
| **Max Angular Speed** | `1000.0 deg/s` (`robot.set_max_angular_speed(1000.0)`) | Respected in trajectory generator |
| **Controller Selection** | `robot.set_controller(1)` (LQR) | 0 = PID, 1 = LQR |
| **Configured Gains** | `robot.set_pid_gains(10.0, 0, 0.1)`, `robot.set_lqr_gains(k_x=1.5, k_y=2.5, k_theta=8.0)` | Validated finite, stable |
| **Backlash Filter** | Enabled (`left_limit=1.2`, `right_limit=1.2`) | Preserved hysteresis |
| **Async Tasks** | `run_task(main())` using `multitask` | Coroutine generator compatibility |

---

## 3. Baseline Verification Status (Pre-Modification)

The baseline has been verified across all testing layers:
1. **PBIO C Native Unit Tests (`test-pbio`):**
   - **Result:** 63/63 tests passed (100% OK).
   - Command: `make -C lib/pbio/test && ./lib/pbio/test/build/test-pbio`
2. **VirtualHub Python Simulation Tests:**
   - **Result:** 159/159 tests passed (100% OK).
   - Command: `PYTHONPATH=tests/virtualhub/robotics python3 -m unittest discover -s tests/virtualhub/robotics -p "test_*.py"`
3. **LQR Test Suite:**
   - **Result:** 88/88 tests passed (100% OK).
   - Command: `PYTHONPATH=tests/virtualhub/robotics python3 -m unittest tests.virtualhub.robotics.test_mdrobotbase_lqr`
4. **Target Hardware Compilation (`primehub_f4`):**
   - **Result:** Build passed cleanly, generating `firmware.zip` (337,292 bytes base).
   - Command: `make -C bricks/primehub_f4`

---

## 4. Protected Boundaries (Strict Zero-Touch Policy)

The following components and behaviors remain strictly locked to `master`:
- `pb_type_motor_get_servo()`: No modifications.
- Motor port discovery and enum conversion: No modifications.
- Servo ownership and lifecycle: Servos are not stopped or re-initialized on robot base instantiation.
- `pbio_mdrobotbase_get_robotbase()`: No side effects on existing motors.
- Port A–F validation behavior: Exactly matches master.
- Error semantics: Transient readiness (`PBIO_ERROR_AGAIN`) does NOT throw false `OSError: MDRobotBase motor is not connected`.
