# G-MDRB-036 DARE/LQR "Unknown Error" Regression Remediation Report

- **Date / Timestamp:** 2026-09-13T08:05:00+07:00
- **Author:** Antigravity (Soda Autonomous Agent)
- **Goal Reference:** [G-MDRB-036](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-036.md)
- **Branch:** `feature/mdrobotbase-enhancement`

---

## 1. WHERE: Exact File and Line Ranges

1. [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L40-L46):
   - In `pbio_mdrobotbase_init()`: validated return code of `pbio_mdrobotbase_set_lqr_preset(rb, PBIO_MDROBOTBASE_LQR_PRESET_BALANCED, true)` ensuring fail-closed initialization semantics.
2. [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L279-L488):
   - In `pbio_mdrobotbase_lqr_solve_dare_full()`:
     - Added strict input domain validation: finiteness via `isfinite()`, non-negativity $q_x, q_y, q_\theta \ge 0$, strict positivity $r_v > 0, r_\omega > 0$.
     - Enforced numerical safety thresholds: $q \le 10^7$, $r \ge 10^{-6}$, $r \le 10^7$, and conditioning ratios $q/r \le 10^8$, returning `PBIO_ERROR_INVALID_ARG`.
     - Instrumented all matrix intermediates ($W$, $\det(W_2)$, $W^{-1}$, $E_{next}$, $G_{next}$, $H_{next}$, $W_k$, $\det(W_k)$, $W_k^{-1}$, $K$, $A_{cl}$, $\rho$) with `isfinite()` checks.
     - Replaced generic `PBIO_ERROR_FAILED` returns on near-singular $W[0][0]$, $\det(W_2)$, and $\det(W_k)$ with `PBIO_ERROR_INVALID_ARG`.
3. [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L583-L600):
   - In `pbio_mdrobotbase_lqr_compute_riccati_residual()`: instrumented $\det(W_k)$ and $W_k^{-1}$ with `isfinite()` validation, replacing `PBIO_ERROR_FAILED` with `PBIO_ERROR_INVALID_ARG`.
4. [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L705-L755):
   - In `pbio_mdrobotbase_set_lqr_weights()`: added upfront numerical bounds and conditioning checks. Maintained atomic updates by solving all 16 velocity bins into stack temporary arrays and returning early without touching `rb->lqr_weights` or LUT on any failure.
5. [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L765-L815):
   - In `pb_type_MDRobotBase_set_lqr_weights()` and `pb_type_MDRobotBase_set_lqr_preset()`: mapped `PBIO_ERROR_INVALID_ARG` directly to `mp_raise_ValueError(...)` and any remaining internal numerical failure (`PBIO_ERROR_FAILED`) to `mp_raise_msg(&mp_type_RuntimeError, MP_ERROR_TEXT(...))`, eliminating empty RuntimeError / "Unknown Error".
6. [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L2205-L2218):
   - In `pb_type_MDRobotBase_make_new()`: checked return of `pbio_mdrobotbase_get_robotbase()`, guarding against empty runtime errors.
7. [`tests/virtualhub/robotics/pybricks/robotics.py`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py#L125-L135):
   - In `MDRobotBase.__init__`: initialized default BALANCED LQR preset `self.set_lqr_preset(0, True)`, ensuring VirtualHub and native C lifecycle parity.
8. [`tests/virtualhub/robotics/pybricks/robotics.py`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/pybricks/robotics.py#L850-L975):
   - In `solve_dare_full()` and `set_lqr_weights()`: aligned numerical validation bounds, intermediate `math.isfinite()` checks, and `ValueError` propagation.
9. [`lib/pbio/test/src/test_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/test/src/test_mdrobotbase.c#L2985-L3020):
   - Added unit tests for non-finite (`NAN`, `INFINITY`), negative, zero $R$, near-singular $R$ ($10^{-12}$), extreme weights ($10^9$), extreme ratio ($10^7 / 10^{-3}$), and atomic rollback.
10. [`tests/virtualhub/robotics/test_mdrobotbase_lqr.py`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/tests/virtualhub/robotics/test_mdrobotbase_lqr.py#L765-L845):
    - Added unit tests for invalid, singular, extreme, and non-finite $Q/R$ inputs, atomic preservation of previous weights/LUT/gains, and default initialization.

---

## 2. WHY: Architectural Rationale & Root Cause Analysis

### Root Cause 1: Generic Error Mapping in `pb_assert()`
In [`pybricks/util_pb/pb_error.c:27-29`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/util_pb/pb_error.c#L27-L29), under `PYBRICKS_OPT_TERSE_ERR` (standard on embedded targets), `pb_assert()` maps `PBIO_ERROR_FAILED` to `mp_raise_msg(&mp_type_RuntimeError, NULL);`. This produces a completely empty `RuntimeError: ` which surfaces in MicroPython repls as an uninformative "Unknown Error".

### Root Cause 2: Inappropriate Error Classification for Singular Matrix Inversions
When caller-provided weights $Q/R$ are ill-conditioned, near-zero, or extreme, the SDA transition matrix $W$ or Riccati inverse denominator $W_k$ can become near-singular. Previously, lines 337, 341, and 436 in `pbio_mdrobotbase_lqr_solve_dare_full()` returned `PBIO_ERROR_FAILED` for these conditions. Because the fault lies in caller configuration rather than unrecoverable platform hardware faults, returning `PBIO_ERROR_INVALID_ARG` allows `pb_assert()` and MicroPython handlers to raise a standard, informative `ValueError`.

### Root Cause 3: Missing Intermediary Finiteness Guards
If non-finite floating point numbers (`NaN`, `Inf`) propagate through matrix multiplication or subtraction in the SDA doubling iterations, they produce non-finite accumulators that could escape detection until later steps. Validating every matrix entry with `isfinite()` ensures fail-fast rejection before any corrupted state can be assigned.

### Root Cause 4: VirtualHub Initializer Parity Drift
In native C, `pbio_mdrobotbase_init()` invokes `pbio_mdrobotbase_set_lqr_preset(rb, PBIO_MDROBOTBASE_LQR_PRESET_BALANCED, true)`, fully populating the 16-bin active LUT on creation. In VirtualHub, `__init__` previously initialized `_lqr_lut = []` and `_lqr_lut_kx = []` as empty lists until an explicit preset call was made. Calling `self.set_lqr_preset(0, True)` inside `MDRobotBase.__init__` establishes exact 1-to-1 parity between simulation and native firmware.

---

## 3. FOR WHOM: Target Consumers & System Boundaries

- **User Developers:** Users configuring custom LQR state and control cost weights receive immediate, clear `ValueError` feedback when weights are outside stable physical bounds, rather than obscure "Unknown Error" aborts.
- **Embedded Firmware Runtime:** Bare-metal STM32F413 firmware execution preserves memory and numerical integrity; ill-conditioned matrix computations fail closed without corrupting the active velocity LUT or altering robot trajectory execution.
- **VirtualHub Test & Simulation Harness:** Headless testing mirrors native firmware behavior identically, catching numerical edge cases in CI before deployment to hardware.

---

## 4. HOW: Implementation Mechanics & Empirical Verification Results

### Empirical Verification Pass

1. **Bare-Metal Firmware Build:**
   ```bash
   $ make primehub_f4
   LINK build/firmware.elf
   BIN creating firmware base file (350896 bytes)
   ZIP creating firmware package
   # Result: Exit Code 0, 0 compiler warnings under -Werror
   ```

2. **VirtualHub LQR Test Suite:**
   ```bash
   $ python3 -m unittest tests.virtualhub.robotics.test_mdrobotbase_lqr
   ........................
   Ran 24 tests in 0.708s
   OK
   ```

3. **VirtualHub Robotics Discovery Suite:**
   ```bash
   $ python3 -m unittest discover tests/virtualhub/robotics/
   Ran 95 tests in 8.295s
   OK
   ```

4. **Native C PBIO Test Suite:**
   ```bash
   $ make -C lib/pbio/test && ./lib/pbio/test/build/test-pbio src/mdrobotbase/..
   31 tests ok. (0 skipped)
   ```

5. **Diff & Formatting Integrity:**
   ```bash
   $ git diff --check
   # Result: Exit Code 0, clean whitespace and formatting
   ```

6. **Governance Check:**
   ```bash
   $ bash scripts/ci/governance-check.sh
   Secret path scan: OK
   Commit message format: OK (49 commit(s))
   Submodule Integrity: All submodules verified and clean
   All governance checks passed.
   ```
