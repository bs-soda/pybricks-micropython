# Socratic Architectural Investigation: `EBUSY: Device or resource busy` Defect Analysis

**Document ID:** `docs/06_raw/20260912_150000_ebusy_device_or_resource_busy_socratic_analysis.md`  
**Timestamp:** `2026-09-12T15:00:00+07:00`  
**Target Repository:** `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Active Branch:** `feature/mdrobotbase-enhancement`  
**Session ID:** `302d2e56-9574-46cf-ad58-6c4733d0b9f4`  
**Invariant State:** `[STATE: AWAITING_HUMAN_ROUND_1]`  
**Applicable Standards:** Global Agentic Engineering Constitution (Articles I–III), Soda OS Agent Governance  

---

## 1. Executive Summary & Problem Formulation

Immediately following the investigation into `ETIMEDOUT: time out`, the user reported:
> `found bug EBUSY: Device or resource busy`

In embedded MicroPython robotics, `EBUSY` (POSIX error 16, `MP_EBUSY`) indicates that an allocation or hardware claim was rejected because the underlying physical actuator, port, or pool slot is currently held by an active handle.

Through architectural analysis of `lib/pbio/src/mdrobotbase.c` and `pybricks/robotics/pb_type_mdrobotbase.c`, this defect is revealed to be **directly causally chained** to the preceding `ETIMEDOUT` defect:
1. When a motion deadline expires, the MicroPython awaitable raises `OSError: [Errno 110] ETIMEDOUT`.
2. This unhandled exception abruptly terminates the user's mission script before an explicit `robot.close()` can be invoked.
3. The native C layer retains the previous instance in `mdrobotbase_in_use[slot] = true` with exclusive claims on the physical motor pointers (`rb->left` and `rb->right`).
4. When the user re-executes their script or instantiates `MDRobotBase(left_motor, right_motor)`, `pbio_mdrobotbase_get_robotbase()` scans active slots, detects that the physical motors are still registered as owned, and returns `PBIO_ERROR_BUSY`.
5. `pybricks/util_pb/pb_error.c` converts `PBIO_ERROR_BUSY` to `MP_EBUSY`, raising `OSError: [Errno 16] EBUSY: Device or resource busy`.

---

## 2. Structured Code Explanation & Underlying Mechanics (WHERE, WHY, FOR WHOM, HOW)

### A. The Native Instance Ownership Pool & Collision Detector
- **WHERE:**
  - Allocation & Collision Engine: [`lib/pbio/src/mdrobotbase.c#L141-L180`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L141-L180)
  - Reclamation Function: [`lib/pbio/src/mdrobotbase.c#L195-L228`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L195-L228)
  - C Error Translation Bridge: [`pybricks/util_pb/pb_error.c#L40-L41`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/util_pb/pb_error.c#L40-L41)
- **WHY:**
  Physical robot motors must never be commanded by two competing control loops simultaneously. If two independent `MDRobotBase` or `DriveBase` instances commanded opposing voltages to the same H-bridge drivers, severe gear train damage, current spikes, and non-deterministic odometry would occur. To prevent this, `G-MDRB-010` established strict fail-closed rejection returning `PBIO_ERROR_BUSY`.
- **FOR WHOM:**
  Pybricks embedded runtime safety and hardware protection for LEGO Technic / Spike motors.
- **HOW (The Collision Mechanics):**
  1. The static pool `mdrobotbases[PBIO_CONFIG_NUM_MDROBOTBASES]` tracks active allocations via `mdrobotbase_in_use[i]`.
  2. When `pbio_mdrobotbase_get_robotbase(rb_address, left, right, ...)` is called:
     ```c
     for (int i = 0; i < PBIO_CONFIG_NUM_MDROBOTBASES; i++) {
         pbio_mdrobotbase_t *rb = &mdrobotbases[i];
         if (mdrobotbase_in_use[i] &&
             (rb->left == left || rb->left == right ||
              rb->right == left || rb->right == right)) {
             return PBIO_ERROR_BUSY;
         }
     }
     ```
  3. If an unclosed previous instance remains in `mdrobotbases[i]`, any subsequent attempt to construct an `MDRobotBase` with those same motors fails closed with `PBIO_ERROR_BUSY`.
  4. In `pybricks/util_pb/pb_error.c`:
     ```c
     case PBIO_ERROR_BUSY:
         os_err = MP_EBUSY;
         break;
     ```
     which triggers `mp_raise_OSError(MP_EBUSY)`.
