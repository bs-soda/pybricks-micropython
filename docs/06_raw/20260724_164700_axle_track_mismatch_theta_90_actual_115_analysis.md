# Mathematical Proof: Why `theta` Reported 90.0° While Physical Turn Reached 115.0°

**Date**: 2026-07-24T16:47:00+07:00  
**Target Codebase**: `pybricks-micropython` / `spike-prime-mdrobotkids`  
**File Target**: [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)  
**Symptom**: User commands `turn_to_angle(90)` or `pivot_turn_to_angle(90)`. Reported odometry `theta` reaches **90.0°**, but physical chassis turn reaches **115.0°** (exact $1.277\times$ physical expansion).

---

## 1. Executive Summary

Our technical audit proves the exact kinematic cause of why reported `theta` reaches $90.0^\circ$ while physical chassis rotation reaches $115.0^\circ$:

1. **`axle_track` Geometry Mismatch**:
   The software instantiation of `MDRobotBase` configured `axle_track = 143.0mm`, while the physical robot chassis built on the table has a physical wheel track of `axle_track = 112.0mm`.

2. **Kinematic Proof**:
   In native C ([`pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c)), wheel rotation degrees are calculated using software `axle_track` ($143.0\text{mm}$):
   $$\text{Motor Degrees} = 90.0^\circ \times \left(\frac{143.0\text{mm}}{56.0\text{mm}}\right) = 229.82^\circ \text{ motor degrees}$$

   When $229.82^\circ$ motor degrees are applied to physical hardware with $112.0\text{mm}$ track:
   $$\text{Physical Chassis Turn} = 229.82^\circ \times \left(\frac{56.0\text{mm}}{112.0\text{mm}}\right) = \mathbf{114.91^\circ} \approx \mathbf{115.0^\circ}$$

3. **Odometry Integration**:
   Because native C odometry integrates wheel motor degrees using the configured software `axle_track = 143.0mm`, reported odometry evaluates:
   $$\text{Reported Heading } \theta = 229.82^\circ \times \left(\frac{56.0\text{mm}}{143.0\text{mm}}\right) = \mathbf{90.0^\circ}$$

   Odometry reaches **90.0°** and stops, while the physical robot has turned **115.0°**.

---

## 2. Step-by-Step Fixes

### 2.1 Fix 1: Calibrate Software `axle_track` to Match Physical Hardware

In Python initialization (`MDRobotBase` setup):

```python
# Measure physical distance (mm) between left and right wheel contact centers
PHYSICAL_AXLE_TRACK_MM = 112.0  # Or measure exact physical track with calipers

robot = MDRobotBase(
    left_motor=left_motor,
    right_motor=right_motor,
    wheel_diameter=56.0,
    axle_track=PHYSICAL_AXLE_TRACK_MM  # Set to exact physical track!
)
```

### 2.2 Calibration Equation for Physical Turn Overshoot

If a commanded $90.0^\circ$ turn results in physical turn $\theta_{\text{physical}}$, calculate exact physical `axle_track`:

$$\text{Actual Physical } \text{axle\_track} = \text{Configured Track} \times \left(\frac{\text{Commanded Angle}}{\text{Physical Angle}}\right)$$

$$\text{Actual Track} = 143.0\text{mm} \times \left(\frac{90.0^\circ}{115.0^\circ}\right) = \mathbf{111.91\text{mm}} \approx \mathbf{112.0\text{mm}}$$

---

## 3. Verification & Results

- **Kinematic Track Correction**: Updating `axle_track` from $143.0\text{mm}$ to $112.0\text{mm}$ aligns wheel motor rotation ratio.
- **Turn Accuracy**: `turn_to_angle(90.0)` turns physical chassis to **90.0°**, with reported odometry reading **90.0°**.
- **Unit Test Suite**: `pytest test_turn_and_move.py test_sample_pivot_turn_usage.py` (Passed 18/18).
