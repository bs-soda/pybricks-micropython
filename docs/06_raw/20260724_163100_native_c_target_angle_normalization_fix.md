# Native C Target Angle Normalization & Native Firmware Fix

**Date**: 2026-07-24T16:31:00+07:00  
**Target Subsystems**: `pybricks-micropython` (`pb_type_mdrobotbase.c`)  
**Scope**: Target angle wraparound normalization in `turn_angle` and `pivot_turn_angle`

---

## 1. Executive Summary

In `pb_type_mdrobotbase.c`, `turn_angle` and `pivot_turn_angle` computed target angles as `target_angle = self->rb->theta + angle`. However, if `self->rb->theta + angle` exceeded $+180.0^\circ$ or fell below $-180.0^\circ$ (for example, $\theta = 150^\circ$ and $\text{angle} = 60^\circ \implies 210^\circ$), the target angle stored in the robot struct was not normalized to $[-180^\circ, 180^\circ]$.

This caused status reporting and initial heading error evaluations across the $\pm 180^\circ$ boundary to store unnormalized angles ($210^\circ$ instead of $-150^\circ$).

We resolved this in `pb_type_mdrobotbase.c` by adding explicit range normalization:

```c
  float target_angle = self->rb->theta + angle;
  while (target_angle > 180.0f) target_angle -= 360.0f;
  while (target_angle < -180.0f) target_angle += 360.0f;
```

---

## 2. Full Native C Firmware Bug Fix Manifest

1. **`BUG-1` (Pivot Arc Kinematics)**: `lib/pbio/src/mdrobotbase.c` — Closed-form rigid body arc integration ($\Delta x = r_{\text{offset}} (\sin\theta_{\text{new}} - \sin\theta_{\text{old}})$).
2. **`BUG-2` (Gyro Sign Alignment)**: `lib/pbio/src/mdrobotbase.c` — Fixed un-inverted gyro sign in fusion.
3. **`BUG-3` (Spin Position Clamping)**: `lib/pbio/src/mdrobotbase.c` — Enforced $d_{\text{center}} = 0$ in spin turns.
4. **`BUG-4` (Kinematic Profile Timeout Estimator)**: `pb_type_mdrobotbase.c` — $t_{\text{accel}} + t_{\text{cruise}} + t_{\text{decel}} + 1200\text{ms}$.
5. **`BUG-5` (Stall Detector Grace Period)**: `pb_type_mdrobotbase.c` — Grace period $300\text{ms}$, threshold $< 2.0^\circ/\text{s}$.
6. **`BUG-6` (Speed-Scheduled $K_p$ Gain)**: `pb_type_mdrobotbase.c` — Scheduled $K_p = (1 + K_d) \cdot \frac{\text{speed\_deg\_s}}{\text{decel\_angle}}$.
7. **`BUG-7` (Single-Time Pivot Lock Setup)**: `pb_type_mdrobotbase.c` — Removed 10ms `pbio_servo_stop` flooding.
8. **`BUG-8` (Inter-Motion Integral Isolation)**: `pb_type_mdrobotbase.c` — Reset `turn_integral = 0.0f`.
9. **`BUG-9` (Target Angle Normalization)**: `pb_type_mdrobotbase.c` — Added `while (target_angle > 180.0f)` range normalization to `turn_angle` and `pivot_turn_angle`.

---

## 3. Automated Test Verification

All 18 automated tests passing:

```bash
============================= test session starts ==============================
platform darwin -- Python 3.12.4, pytest-7.4.4, pluggy-1.0.0
rootdir: /Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code
collected 18 items

test_turn_and_move.py .                                                  [  5%]
test_sample_pivot_turn_usage.py .                                        [ 11%]
test_sample_color_navigation.py .............                            [ 83%]
test_sample_spike_prime_color_sensor.py ..                               [ 94%]
test_sample_master_mdrobotbase_movements.py .                            [100%]

======================= 18 passed in 0.11s ========================
```
