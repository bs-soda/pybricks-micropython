# G-MDRB-035 Acceptance Contract: Resilient Multi-Tier Instance Reclamation & RAII Lifecycle Management

## Overview
This acceptance specification governs the multi-tier lifecycle reclamation, soft-reset de-initialization hook, re-entrant motor re-binding, and Python RAII context manager for `MDRobotBase` to permanently eliminate orphaned `EBUSY: Device or resource busy` lockouts.

---

### Scenario 1: Exact-Pair Re-entrant Allocation (AC-MDRB-035-1)
**Given** an active `MDRobotBase` instance allocated on motors $(L_1, R_1) = (\text{Port.A}, \text{Port.B})$ that has not been explicitly closed,
**When** a new `MDRobotBase` constructor is invoked requesting the exact same motor pair $(L_2, R_2) = (\text{Port.A}, \text{Port.B})$,
Then the allocator must detect $\text{ExactMatch}(L_1, R_1, L_2, R_2) = \text{true}$,
And must cancel active motions, reset kinematic state, and successfully re-bind the instance without returning `PBIO_ERROR_BUSY` or raising `OSError(EBUSY)`.

---

### Scenario 2: Partial Overlap Fail-Closed Protection (AC-MDRB-035-2)
**Given** an active `MDRobotBase` instance allocated on motors $(L_1, R_1) = (\text{Port.A}, \text{Port.B})$,
**When** a second `MDRobotBase` constructor is invoked requesting a conflicting overlapping motor pair $(L_2, R_2) = (\text{Port.A}, \text{Port.C})$,
Then the allocator must detect $\text{Overlap} \land \neg\text{ExactMatch}$,
And must fail closed, return `PBIO_ERROR_BUSY`, raise `OSError: [Errno 16] EBUSY: Device or resource busy`, and leave the active instance intact.

---

### Scenario 3: Application Lifecycle Soft-Reset Clean Sweep (AC-MDRB-035-3)
**Given** one or more active `MDRobotBase` instances allocated across physical ports,
**When** a program termination or soft reset occurs invoking `pbio_mdrobotbase_deinit()` via `pbio_main_stop_application_resources()`,
Then all active motors must be decelerated to a stop,
And all slot ownership flags `mdrobotbase_in_use[i]` must be reset to `false`, freeing 100% of hardware slots for subsequent execution.

---

### Scenario 4: Python RAII Context Manager Protocol (AC-MDRB-035-4)
**Given** Python code executing within a `with MDRobotBase(left_motor, right_motor) as robot:` block,
**When** the execution block completes normally or is interrupted by an unhandled exception,
**Then** the `__exit__` method must automatically invoke `robot.close()`,
**And** verify that the motor ownership slot is immediately released and ready for re-allocation.
