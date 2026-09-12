# Socratic Architectural Investigation: `ETIMEDOUT: time out` Defect Analysis

**Document ID:** `docs/06_raw/20260912_134000_etimedout_timeout_bug_socratic_analysis.md`
**Timestamp:** `2026-09-12T13:40:00+07:00`
**Target Repository:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`
**Active Branch:** `feature/mdrobotbase-enhancement`
**Session ID:** `302d2e56-9574-46cf-ad58-6c4733d0b9f4`
**Invariant State:** `[STATE: AWAITING_HUMAN_ROUND_1]`
**Applicable Standards:** Global Agentic Engineering Constitution (Articles I–III), Soda OS Agent Governance

---

## 1. Executive Summary & Problem Formulation

The user reported:
> `Found bug ETIMEDOUT: time out`

In embedded robotics, MicroPython runtimes, and distributed web interfaces, `ETIMEDOUT` represents an unfulfilled temporal contract where an asynchronous or synchronous operation failed to arrive at its terminal predicate prior to an elapsed deadline.

In this multi-project robotics ecosystem, `ETIMEDOUT` surfaces across four potential architectural boundaries:
1. **Pybricks MicroPython Robotics Firmware Layer:** `PBIO_ERROR_TIMEDOUT` propagated as `OSError: [Errno 110] ETIMEDOUT` via [`pybricks/util_pb/pb_error.c:55`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/util_pb/pb_error.c#L55) when motor motion, trajectory tracking, or sensor reading exceeds its deadline.
2. **Bluetooth Low Energy (BLE) / Nordic UART Service (NUS) Transport Layer:** GATT connection supervision timeouts (2000ms–5000ms) or unacknowledged characteristic writes during script download/telemetry streaming between the host and LEGO Hub.
3. **Frontend Application Layer (`wro-matmetric`):** Monaco Editor Python execution bridge, Web Bluetooth connection handshakes, or simulated robot runtime timeouts.
4. **Host Developer Environment & Tooling Layer:** Network socket timeouts during `git push`/`git pull`, Sentry local Docker daemon (`http://localhost:9000`), or IDE telemetry synchronization.

In accordance with the **Strict Zero-Code Lock on Broad Prompts**, this document deconstructs the underlying mechanics across each locus, formalizes the fact vs. assumption audit, establishes the multi-domain clarification matrix, and defines the verification requirements.

---

## 2. Structured Code Explanation & Architectural Mechanics (WHERE, WHY, FOR WHOM, HOW)

### A. MicroPython / PBIO Motion Trajectory Timeout Subsystem
- **WHERE:**
  - C Error Translation Bridge: [`pybricks/util_pb/pb_error.c#L50-L60`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/util_pb/pb_error.c#L50-L60), [`pybricks/util_pb/pb_error.c#L130-L135`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/util_pb/pb_error.c#L130-L135)
  - MDRobotBase FSM State Transitions: [`lib/pbio/src/mdrobotbase.c#L645-L665`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L645-L665)
  - Acceptance Specification: [`docs/02-product/acceptance/G-MDRB-005.md`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/02-product/acceptance/G-MDRB-005.md)
- **WHY:**
  When an autonomous robot executes a kinematic maneuver (e.g. traveling $500\text{ mm}$ via `robot.straight(500)`), the motion controller establishes a trajectory profile with an expected arrival time $T_{arrival}$. If the drive wheels slip, encounter physical resistance, or the robot becomes mechanically trapped against a barrier without exceeding the current-stall threshold, the controller will wait indefinitely unless a temporal deadline is enforced.
- **FOR WHOM:**
  Competition robotics teams (WRO, FIRST LEGO League), autonomous path planners, and Pybricks Python developers who require predictable, fail-safe termination of motion commands.
- **HOW:**
  1. The trajectory planner computes total duration:
     $$T_{expected} = \frac{|v_{target}|}{a_{accel}} + \frac{d_{remaining}}{|v_{target}|} + \frac{|v_{target}|}{a_{decel}}$$
  2. The awaitable dispatcher registers a deadline:
     $$T_{deadline} = t_{start} + T_{expected} + T_{margin}$$
  3. At each periodic tick (typically $5\text{ ms}$ or $10\text{ ms}$ in PBIO), the control loop evaluates position error $\epsilon = |\theta_{target} - \theta_{actual}|$ against the target tolerance window.
  4. If $t_{current} \ge T_{deadline}$ while $\epsilon > \epsilon_{tolerance}$:
     - `pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_TIMED_OUT)` is executed.
     - The actuator PWM is clamped to zero (or configured stop mode: brake/coast/hold).
     - `pbio_error_t` returns `PBIO_ERROR_TIMEDOUT`.
     - In `pb_error.c`, `os_err = MP_ETIMEDOUT` (POSIX error code 110) is returned, causing MicroPython to raise `OSError: [Errno 110] ETIMEDOUT`.

### B. BLE GATT Nordic UART Service (NUS) Transport Subsystem
- **WHERE:**
  - PBIO Bluetooth Stack: [`lib/pbio/drv/bluetooth/`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/drv/bluetooth/)
  - BTStack L2CAP / ATT / GATT Engine: [`lib/btstack/`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/btstack/)
- **WHY:**
  Wireless communication between the host workstation and the embedded STM32F413 microcontroller relies on BLE 4.2 / 5.0 GATT connections.
- **FOR WHOM:**
  Developers downloading compiled bytecode or streaming telemetry over BLE.
- **HOW:**
  1. BLE connection parameters specify a Connection Interval ($CI \in [15\text{ ms}, 30\text{ ms}]$) and a Supervision Timeout ($T_{supervision} \in [2000\text{ ms}, 5000\text{ ms}]$).
  2. If the hub is subjected to blocking computation (e.g. dense matrix operations or non-yielding loops in Python) or RF packet loss occurs, the host GATT client fails to receive a link-layer acknowledgement before $T_{supervision}$ elapses.
  3. The operating system (macOS CoreBluetooth or Web Bluetooth) drops the socket and emits `ETIMEDOUT: Connection timed out`.

---

## 3. Fact vs. Assumption Audit

| Item | Status | Verification Detail |
|---|---|---|
| Native `PBIO_ERROR_TIMEDOUT` Translation | `[OBSERVED_FACT]` | Verified in [`pybricks/util_pb/pb_error.c:55`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/util_pb/pb_error.c#L55): mapped directly to `MP_ETIMEDOUT`. |
| MDRobotBase Motion Status Enum | `[OBSERVED_FACT]` | `PBIO_MDROBOTBASE_STATUS_TIMED_OUT` is defined and protected by bounds checking in `mdrobotbase.c`. |
| VirtualHub Regression Test Suite | `[OBSERVED_FACT]` | 65/65 tests passed cleanly with 0 errors in 1.734s. |
| Specific Error Origin | `[UNDETERMINED_DYNAMICS]` | Undetermined whether the error was triggered during robot motion, BLE connection, MatMetric IDE, or host network tooling. |
| Reproduction Script & Parameters | `[UNDETERMINED_DYNAMICS]` | Caller script, motion parameters ($v, d, a$), or network endpoint not yet provided. |

---

## 4. 6-Domain Architectural Deconstruction & Clarification Blueprint

In accordance with Section III of the Global Engineering Constitution, the defect investigation is deconstructed across 6 domains:

1. **Target Persona & Scope:**
   - Autonomous competition robot executing real-time obstacle avoidance vs. developer running local simulations vs. frontend web developer testing telemetry streams.
2. **Core Fault Topology & Metrics:**
   - Actuator state at timeout (coasting, holding, braking), unreached distance remaining, motor current at expiration, and CPU tick delta.
3. **Data Contracts & Error Propagation:**
   - Strict POSIX `OSError(ETIMEDOUT)` translation vs. structured custom Python exception `MotionTimeoutError(command, target, elapsed_ms)` vs. non-throwing queryable status `robot.status == TIMED_OUT`.
4. **Interactive Actions & Sagas:**
   - Immediate actuator disarm vs. automatic retry with scaled speed/torque vs. fault escalation to operator console.
5. **Edge Boundaries & Timeout Budgets:**
   - Fixed static deadline vs. dynamic kinematic calculation ($T_{deadline} = T_{kinematic} \times 1.3 + 500\text{ ms}$) vs. infinite timeout with manual cancellation.
6. **Codebase Grounding & Memory SLA:**
   - Cortex-M4 bare-metal constraints (STM32F413 with 320 KB RAM), zero allocations inside ISR/timer tick callbacks, and zero mocks in unit test verification.

---

## 5. Verification & Testing Requirements (Post-Clarification)

Upon resolution of the clarification state machine in [`CLARIFICATION.md`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/CLARIFICATION.md):
1. **Red-Green-Refactor TDD:** Unit tests reproducing the timeout scenario must be written and observed failing prior to implementation.
2. **Zero Mocks:** Tests must use concrete VirtualHub devices and physical kinematic calculations.
3. **Regression Pass:**
   - `python3 -m unittest discover tests/virtualhub/robotics`
   - `./lib/pbio/test/build/test-pbio`
   - `bash scripts/ci/governance-check.sh`
   - `git diff --check`
