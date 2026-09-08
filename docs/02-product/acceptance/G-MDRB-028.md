# Acceptance Contract: G-MDRB-028

**Goal ID:** `G-MDRB-028`  
**Title:** Color Input Contract Unification & Structured Classification Output  
**Epic:** MDRB  
**Kind:** api  

---

## Acceptance Scenarios (BDD Given-When-Then)

### Scenario 1: Native C Dual Input Overload & Structured Output (AC-MDRB-028-1)
- **Given** an initialized `pbio_mdrobotbase_t` instance with calibrated prototypes.
- **When** `pbio_mdrobotbase_color_classify_rgb(rb, r, g, b, &color_id, &distance, &confidence)` is invoked.
- **Then** `color_id` matches the expected prototype ID.
- **And** `distance` contains the non-negative scalar distance.
- **And** `confidence` is a normalized float within $[0.0, 1.0]$.

### Scenario 2: VirtualHub Python Method Parity (AC-MDRB-028-2)
- **Given** an initialized VirtualHub `MDRobotBase` instance in `pybricks.robotics`.
- **When** `classify_color_rgb(r, g, b)` and `classify_color_hsv(h, s, v)` are invoked with equivalent chromatic vectors.
- **Then** both methods return a 3-tuple `(color_id, distance, confidence)`.
- **And** the returned `color_id` values are identical.

### Scenario 3: MicroPython Binding Structured Tuple (AC-MDRB-028-3)
- **Given** a MicroPython script invoking `base.classify_color(r, g, b)`.
- **When** the method returns to the Python runtime.
- **Then** the result is a 3-element tuple `(color_id, distance, confidence)`.
- **And** `tuple[0]` is an `int`, `tuple[1]` is a `float`, and `tuple[2]` is a `float`.

### Scenario 4: Fail-Closed Invalid Input Rejection (AC-MDRB-028-4)
- **Given** non-finite (NaN, $\pm\infty$) or negative channel inputs.
- **When** classification is requested.
- **Then** the C API returns `PBIO_ERROR_INVALID_ARG`.
- **And** VirtualHub raises `ValueError`.

### Scenario 5: Null Pointer Safety (AC-MDRB-028-5)
- **Given** a NULL output pointer (`&color_id == NULL`, `&distance == NULL`, or `&confidence == NULL`).
- **When** the native C classification function is called.
- **Then** it returns `PBIO_ERROR_INVALID_ARG` without dereferencing NULL.
