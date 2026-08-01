# C Engine Bugfix & Architectural Report: Revising `use_ramping` Default to `False` Across All Movement Methods

**Timestamp**: 2026-07-22T23:20:00+07:00  
**Target Repositories**: `pybricks-micropython`, `pybricks-upy`, `mat-metric`, `spike-prime-mdrobotkids`  
**Modified Source Files**:
- [`pybricks-micropython: pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L857-L990)
- [`pybricks-upy: pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-upy/pybricks/robotics/pb_type_mdrobotbase.c#L857-L990)
- [`mat-metric: src/utils/mdRobotBaseAutocompletes.ts`](file:///Users/batrarethsudprasert/projects/wro/mat-metric/src/utils/mdRobotBaseAutocompletes.ts#L94-L110)
- [`spike-prime-mdrobotkids: code/sample.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/sample.py#L50-L128)
- [`spike-prime-mdrobotkids: code/autotune_suite.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/autotune_suite.py#L51-L110)
- [`spike-prime-mdrobotkids: code/sample_lqr_tuning.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/sample_lqr_tuning.py#L56-L76)
- [`spike-prime-mdrobotkids: code/test_navigate_to_goal_backward.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/test_navigate_to_goal_backward.py#L20-L54)
- [`spike-prime-mdrobotkids: code/test_ramping_controller_compatibility.py`](file:///Users/batrarethsudprasert/projects/wro/spike-prime-mdrobotkids/code/test_ramping_controller_compatibility.py#L24-L54)

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 Incompatibility between Distance S-Curve Ramping and PID/LQR Controllers
In `MDRobotBase`, movement execution relies on high-frequency (1kHz / 100Hz) state updates and feedback control using either PID (Controller Mode 0) or LQR State-Space Feedback (Controller Mode 1):

$$\vec{u}(t) = -K \left(\vec{x}(t) - \vec{x}_{\text{ref}}(t)\right)$$

When `use_ramping=True` was active as the default:
1. **Reference Lag**: Distance ramping generated an artificial S-curve velocity attenuation envelope $v_{\text{profile}}(d) = v_{\text{target}} \cdot \frac{1 - \cos(\pi \cdot \tau)}{2}$ that artificially suppressed the reference velocity $\vec{v}_{\text{ref}}$.
2. **Controller Conflict**: The PID/LQR linear tracking controller attempted to aggressively correct positioning errors, while the distance ramping filter simultaneously throttled linear speed. This created phase lag, oscillation, and overshoot near target coordinates.

Setting **`use_ramping=False` by default** resolves this bug by allowing PID and LQR state feedback controllers to operate directly on unattenuated target trajectory states.

---

## 2. Updated Movement Method Matrix (`MDRobotBase`)

All `MDRobotBase` movement functions now default to `use_ramping=False`:

| Method Name | Parameter Name | Previous Default | **Revised Default** | C Source Location |
|---|---|---|---|---|
| `navigate_to_goal` | `use_ramping` | `True` | **`False`** | [`pb_type_mdrobotbase.c:L857`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L857) |
| `go_forward` | `use_ramping` | `True` | **`False`** | [`pb_type_mdrobotbase.c:L922`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L922) |
| `go_backward` | `use_ramping` | `True` | **`False`** | [`pb_type_mdrobotbase.c:L990`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L990) |
| `follow_trajectory` | `use_ramping` | `False` | **`False`** | [`pb_type_mdrobotbase.c:L1587`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1587) |

---

## 3. Verification & Validation Results

### A. Vitest Suite (`mat-metric`)
```bash
npm --prefix /Users/batrarethsudprasert/projects/wro/mat-metric test
```
```text
 ✓ src/tests/trajectory.test.ts (13 tests)
 ✓ src/tests/autocompletes.test.ts (25 tests)

 Test Files  2 passed (2)
      Tests  38 passed (38)
```

### B. Pytest Suite (`spike-prime-mdrobotkids`)
```bash
PYTHONPATH=code python3 -m pytest code/test_sample_color_navigation.py code/test_color_sensor_rgb.py code/test_sample_spike_prime_color_sensor.py code/test_navigate_to_goal_backward.py code/test_ramping_controller_compatibility.py
```
```text
code/test_sample_color_navigation.py ........                            [ 53%]
code/test_color_sensor_rgb.py .                                          [ 60%]
code/test_sample_spike_prime_color_sensor.py ..                          [ 73%]
code/test_navigate_to_goal_backward.py ..                                [ 86%]
code/test_ramping_controller_compatibility.py ..                         [100%]

============================== 15 passed in 0.02s ==============================
```
