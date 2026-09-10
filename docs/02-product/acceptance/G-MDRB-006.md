# Acceptance Contract: G-MDRB-006

**Goal ID:** `G-MDRB-006`
**Title:** Async Cancellation and Repeated-Motion Lifecycle Safety
**Epic:** MDRB
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Feature Narrative

```gherkin
Feature: Async Cancellation and Repeated-Motion Lifecycle Safety
  As a robot motion runtime scheduler
  I want deterministic motion preemption, safe stop calls, and no dangling awaitables
  So that interrupting motions or calling stop on an idle robot executes safely without race conditions, motor setpoint collisions, or unpolled generator leakage.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Safe Stop on Idle Robot
```gherkin
Given an initialized MDRobotBase with no active motion and last_awaitable == NULL
When robot.stop() is invoked
Then the function checks that last_awaitable is NULL before attempting to schedule stop iteration
And servos are commanded to stop using the configured stop_behavior
And no NULL pointer dereference or runtime exception occurs
And last_awaitable remains NULL.
```

### Scenario 2: Deterministic Preemption of Active Motion A by Motion B
```gherkin
Given an MDRobotBase executing an active motion command A with last_awaitable set and motion_in_progress == true
When a new motion command B (e.g., turn_angle or pivot_turn) is invoked
Then pb_type_mdrobotbase_cancel_active_motion() is called at the entrypoint of motion B
And motion A is signaled to stop iteration via pb_type_async_schedule_stop_iteration(self->last_awaitable)
And motion A's servos are stopped cleanly according to stop_behavior
And motion A's active motion flags are cleared (motion_in_progress = false, motion_type = NONE)
And motion B initializes cleanly and sets its new awaitable without command interleaving.
```

### Scenario 3: Immediate Iteration Cessation on Inactive Motion
```gherkin
Given an awaitable generator context previously associated with a motion that completed, timed out, stalled, or was canceled
When the MicroPython cooperative task poller next invokes pb_type_mdrobotbase_motion_iterate_once()
Then the function checks if (!self->rb->motion_in_progress)
And returns PBIO_SUCCESS immediately without commanding the servo motors or updating odometry
And the generator terminates with StopIteration without sending spurious pulses.
```

### Scenario 4: Motor Stop Behavior Honored Across All Termination Paths
```gherkin
Given an MDRobotBase configured with stop_behavior in {HOLD, BRAKE, COAST}
When an active motion terminates via normal completion, cancel preemption, stop() call, timeout, or stall
Then pbio_servo_stop() is called on both left and right servos with the configured stop_behavior
And if stop_behavior != COAST, motor angles are reset to prevent integrator windup.
```

### Scenario 5: Generator Cleanup and No Stale Awaitable Leakage
```gherkin
Given an MDRobotBase that has finished executing a motion sequence or suffered preemption
When the motion cycle concludes
Then self->last_awaitable is cleared to NULL
And no dangling generator references remain in the robot base struct
And subsequent motion commands allocate fresh, isolated awaitables.
```

---

## 3. Quantitative Verification Criteria

| Metric | Required Specification | Validation Method |
|---|---|---|
| Idle `stop()` Safety | Zero NULL dereferences, exit code 0 | Native C Assertion & MicroPython Test |
| Preemption Latency | $< 1\text{ms}$ (synchronous preemption) | AST Analysis & Subprocess Episode Timing |
| Active Awaitable Count | $\le 1$ active generator at any timestamp | Structural Invariant in C Binding |
| Post-Cancel Iteration | Zero motor commands dispatched after abort | Flag check `!motion_in_progress` in iterator |
| Actuator Stop Action | `pbio_servo_stop(srv, stop_behavior)` | C AST & Functional Execution Trace |
| Memory Cleanliness | `self->last_awaitable == NULL` on idle | Struct Pointer Verification |

---

## 4. Acceptance Criteria Traceability Matrix

- **AC-MDRB-006-1:** Calling `stop()` when no motion is active does not crash or raise exceptions.
- **AC-MDRB-006-2:** Launching motion B while motion A is active terminates motion A and executes motion B cleanly.
- **AC-MDRB-006-3:** An awaitable stopped by completion, cancellation, timeout, or stall stops iterating immediately.
- **AC-MDRB-006-4:** Motor stop behavior (`HOLD`/`BRAKE`/`COAST`) is strictly honored across all termination paths.
- **AC-MDRB-006-5:** No stale awaitable continues to execute in background task poller.
