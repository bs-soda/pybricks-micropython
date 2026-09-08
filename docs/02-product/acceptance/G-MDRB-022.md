# Acceptance Contract: G-MDRB-022

**Goal ID:** `G-MDRB-022`  
**Title:** Behavioral Motion Preemption Safety & Non-Disruptive Invalid Command Rejection  
**Epic:** MDRB  
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`  
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)  

---

## 1. Feature Narrative

```gherkin
Feature: Behavioral Motion Preemption Safety & Non-Disruptive Invalid Command Rejection
  As an autonomous robotics control engineer
  I want invalid replacement motion commands to be rejected during parameter parsing before affecting the active motion
  So that when an invalid replacement command raises ValueError, the currently executing motion continues without interruption, braking, or state corruption.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Active Navigation Immunity to Invalid Turn Replacement
```gherkin
Given an active navigation motion A (e.g. go_forward(500, speed=200)) executing in background
When an invalid turn command B is dispatched (e.g. turn_to_angle(90, speed=-100))
Then command B raises ValueError immediately
And motion A remains in progress (robot.done() == False, robot.status() == STATUS_RUNNING)
And no servo stop or reset command is issued to motors
And motion A continues executing to its original target.
```

### Scenario 2: Active Turn Immunity to Invalid Pivot Replacement
```gherkin
Given an active turn motion A executing in background
When an invalid pivot command B is dispatched (e.g. pivot_turn_to_angle(90, speed=0))
Then command B raises ValueError immediately
And turn motion A remains in progress without resetting odometry target
And motors continue tracking turn velocity profile.
```

### Scenario 3: Active Trajectory Immunity to Empty Replacement Trajectory
```gherkin
Given an active multi-waypoint trajectory tracking motion A
When an empty trajectory command B is dispatched (follow_trajectory([]))
Then command B raises ValueError immediately
And trajectory motion A continues executing remaining waypoints to completion.
```

### Scenario 4: Valid Replacement Motion Preemption
```gherkin
Given an active motion A
When a valid replacement motion command B with proper parameters is dispatched
Then motion A is cleanly cancelled
And motion B takes ownership of the actuators without deadlocks or stalled generators.
```

---

## 3. Verification Traceability Matrix

| Acceptance Criteria | Verification Method | Pass Threshold |
|---|---|---|
| AC-MDRB-022-1: Invalid turn raises `ValueError` during active nav | VirtualHub test | `ValueError`, `done == False` |
| AC-MDRB-022-2: Active nav completes to target destination | VirtualHub test | Target error $\le 2.0\text{ mm}$ |
| AC-MDRB-022-3: Invalid pivot raises `ValueError` during active turn | VirtualHub test | `ValueError`, `done == False` |
| AC-MDRB-022-4: Invalid trajectory raises `ValueError` during active motion | VirtualHub test | `ValueError`, `done == False` |
| AC-MDRB-022-5: Valid replacement command preempts cleanly | VirtualHub test | Smooth transition to new target |
