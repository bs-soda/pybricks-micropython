# Deep Technical Root-Cause Analysis: `MDRobotBase.follow_trajectory` Waypoint Defects & Premature Stopping Bug

**Date & Time**: 2026-07-22 15:05:00 UTC+7  
**Workspace**: `/Users/batrarethsudprasert/projects/wro/pybricks-micropython` & `/Users/batrarethsudprasert/projects/wro/pybricks-upy`  
**Module**: `pybricks.robotics.MDRobotBase` (`pybricks/robotics/pb_type_mdrobotbase.c`)  

---

## 1. Executive Summary & Symptoms Identified

During execution of `MDRobotBase.follow_trajectory()`, two distinct underlying bugs caused erratic trajectory performance and premature stopping during movement:

1. **Way-point Loop Defect**: The robot got stuck looping backwards when passing a waypoint outside the exact `transition_tolerance` radius.
2. **Premature Stopping Defect (False Stall Detection)**: The robot moved for approximately $0.45\text{ seconds}$ and then abruptly came to a full stop mid-way through the trajectory, regardless of target speed or distance.

---

## 2. Deep Root-Cause Analysis

### 2.1 Premature Stopping Bug: Shadowed `step` Variable in Stall Detector

In `pb_type_mdrobotbase.c` (around line 2170 in `follow_trajectory`):

```c
// At the top of the main trajectory control loop (lines 1891-1894):
float step = sqrtf((self->rb->x - last_x) * (self->rb->x - last_x) + (self->rb->y - last_y) * (self->rb->y - last_y));
seg_dist_traveled += step;
last_x = self->rb->x; // <--- last_x updated to self->rb->x HERE
last_y = self->rb->y; // <--- last_y updated to self->rb->y HERE

...

// Further down in the same loop iteration (lines 2170-2179):
if (elapsed_ms > 200) {
    // BUG: Recalculating step AFTER last_x was already overwritten above!
    float step = sqrtf((self->rb->x - last_x) * (self->rb->x - last_x) + (self->rb->y - last_y) * (self->rb->y - last_y));
    float v_raw = step / dt_sec;
    if (fabsf(v_cmd) > 30.0f && fabsf(v_raw) < 10.0f) {
        traj_stall_time_ms += dt_sec * 1000.0f;
    } else {
        traj_stall_time_ms = 0.0f;
    }
    if (traj_stall_time_ms > 250.0f) {
        break; // <--- Kills the trajectory!
    }
}
```

#### Why the Robot Stopped After 0.45 Seconds:
1. In the upper half of the loop, `last_x` and `last_y` were updated to `self->rb->x` and `self->rb->y`.
2. In the lower half of the loop (inside the stall monitor), `step` was re-declared and computed using `(self->rb->x - last_x)`.
3. Because `last_x` had already been updated to `self->rb->x` in the same iteration, `(self->rb->x - last_x)` evaluated to **EXACTLY $0.0\text{ mm}$**.
4. Thus `step` inside the stall monitor was **ALWAYS $0.0$**, causing `v_raw` to equal **$0.0\text{ mm/s}$**.
5. As soon as `elapsed_ms > 200\text{ ms}` (0.2s after starting), `fabsf(v_cmd) > 30.0f && fabsf(v_raw) < 10.0f` evaluated to `true` on **every single iteration**.
6. `traj_stall_time_ms` accumulated $10\text{ ms}$ per iteration until it reached $250\text{ ms}$.
7. At total elapsed time $200\text{ ms} + 250\text{ ms} = 450\text{ ms}$ ($0.45\text{ seconds}$), `traj_stall_time_ms > 250.0f` triggered a `break` from the main loop, killing motor commands and stopping the robot mid-way!

---

### 2.2 Way-point Transition Defect: Omission of Target-Plane Crossing Check

Intermediate waypoints ($i < num\_points - 1$) lacked the perpendicular target-plane crossing check ($\vec{P} \cdot \vec{D} \le 0$). If $dist\_remaining$ did not drop strictly below $transition\_tolerance$ due to high speed or cross-track deviation, $current\_point\_idx$ never incremented, forcing the robot to try to turn around backwards to hit the old target waypoint.

---

## 3. Implemented Fixes

### Fix 1: Eliminating Shadowed `step` in Stall Monitor
Removed the redundant `float step` declaration in the stall monitor so it reuses the true displacement `step` calculated prior to updating `last_x`:

```c
// Sensor-fused linear stall monitor
if (elapsed_ms > 200) {
    float v_raw = step / dt_sec; // Reuses valid step from start of loop
    if (fabsf(v_cmd) > 30.0f && fabsf(v_raw) < 10.0f) {
        traj_stall_time_ms += dt_sec * 1000.0f;
    } else {
        traj_stall_time_ms = 0.0f;
    }
    if (traj_stall_time_ms > 250.0f) {
        break;
    }
}
```

### Fix 2: Perpendicular Target-Plane Crossing Check
Added target-plane crossing criterion ($\vec{P} \cdot \vec{D} \le 0$) for intermediate waypoints:

```c
if (current_point_idx < num_points - 1) {
    float path_x = gx - seg_start_x;
    float path_y = gy - seg_start_y;
    float path_len = sqrtf(path_x * path_x + path_y * path_y);
    bool plane_crossed = false;
    if (path_len > 1.0f) {
        float dot = path_x * dx + path_y * dy;
        if (dot <= 0.0f) {
            plane_crossed = true;
        }
    }

    if (dist_remaining < transition_tolerance || plane_crossed) {
        seg_start_x = gx;
        seg_start_y = gy;
        current_point_idx++;
        ...
        continue;
    }
}
```

---

## 4. Parity & Verification

1. **Parity Check**: Ran `diff -u` across `pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c` and `pybricks-upy/pybricks/robotics/pb_type_mdrobotbase.c`, verifying 100% code identity.
2. **Automated Unit Tests**: Ran `npm test` in `mat-metric` workspace (38/38 tests passing).
