# G-MDRB-036 Bare-Metal Build Regression Remediation Report

- **Date / Timestamp:** 2026-09-12T23:20:00+07:00
- **Author:** Antigravity (Soda Autonomous Agent)
- **Goal Reference:** [G-MDRB-036](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/07-backlog/goals/G-MDRB-036.md)
- **Branch:** `feature/mdrobotbase-enhancement`

---

## 1. WHERE: Exact File and Line Ranges

1. [`pybricks/robotics/pb_type_mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L1240-L1310):
   - Removed obsolete `t_expected` variable declaration and its unreferenced ramp/timeout calculation block (former lines 1240–1287).
   - Scoped remaining ramping and acceleration bounds variables (`total_dist_actual`, `abs_start_speed`, `abs_end_speed`) locally within the ramping adjustment block (lines 1285–1310).
2. [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L264-L575):
   - Added explicit `(double)` casting to floating-point constants in `pbio_mdrobotbase_lqr_solve_dare_full` and `pbio_mdrobotbase_lqr_compute_riccati_residual` to prevent implicit double promotion under `-fsingle-precision-constant -Wdouble-promotion`.
   - Replaced freestanding unsupported 64-bit `sqrt` with `(double)sqrtf((float)...)` on lines 467 and 469.
3. [`Makefile`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/Makefile#L65-L70):
   - Added top-level `primehub_f4: mpy-cross` rule delegating to `@$(MAKE) -C bricks/primehub primehub_f4`.

---

## 2. WHY: Architectural Rationale & Root Cause Analysis

### Root Cause 1: Obsolete `t_expected` Dead Code
During G-MDRB-034 / G-MDRB-036, dynamic motion deadline calculations were centralized into `mdrobotbase_calculate_motion_deadline_ms(...)`. The older multi-branch `t_expected` calculation in `pb_type_MDRobotBase_navigate_to_goal()` was made completely obsolete. Because GCC on bare-metal firmware enforces `-Werror=unused-but-set-variable`, the remaining `t_expected = ...` assignments triggered a fatal build regression during `make primehub_f4`.

### Root Cause 2: `-Wdouble-promotion` Under `-fsingle-precision-constant`
The Cortex-M4 STM32F413 hardware FPU (`fpv4-sp-d16`) is single-precision. Pybricks builds use `-fsingle-precision-constant`, causing unadorned numeric literals (such as `1000.0` or `1.0`) to be treated as `float`. When combined in binary operations with `double` matrices in the Structured Doubling Algorithm (SDA), the single-precision operands were implicitly promoted to `double`, tripping `-Werror=double-promotion`. Adding explicit `(double)` casts resolved the promotion warning while preserving the 64-bit mathematical precision of the Riccati solution.

### Root Cause 3: Undefined Reference to 64-Bit `sqrt`
Embedded freestanding `libm` on Cortex-M4 includes hardware VFP single-precision `sqrtf` via `thumb_vfp_sqrtf.c`, but omits double-precision software emulation `sqrt`. Casting the discriminant and determinant to `float` for `sqrtf` allowed the linker to resolve the symbol cleanly without pulling in unsupported software emulation libraries.

---

## 3. FOR WHOM: Target Consumers & System Boundaries

- **Bare-Metal Firmware Toolchain:** `arm-none-eabi-gcc` target `primehub_f4` generating `firmware.elf`, `firmware-base.bin`, and `firmware.zip`.
- **Runtime Navigation Layer:** MicroPython bindings in `pb_type_mdrobotbase.c` interfacing user scripts to native PBIO.
- **Continuous Integration:** Automated governance, native test harness, and Bare-Metal compilation pipelines.

---

## 4. HOW: Implementation Mechanics & Empirical Verification Results

### Clean Compilation Verification
```text
$ make -C bricks/primehub_f4 clean && make primehub_f4
LINK build/firmware.elf
build/firmware.elf  :
section                  size        addr
.text                  348496   134283264
.magic                      0   536870912
.data                     736   536870912
.bss                    42828   536871648
.noinit                264196   536914476
.bootloader_selector        4   537178672
.stack                  12288   537178676
.name                      16   134632496
.user                       4   134632512
.checksum                   4   134632516
Total                  669389

BIN creating firmware base file: 349248 bytes
ZIP creating firmware package: firmware.zip generated successfully
Exit code: 0
```

### Whitespace & Format Verification
```text
$ git diff --check
Exit code: 0 (No whitespace errors)
```

### Test Suite Execution
- **VirtualHub LQR Test Suite:**
  `python3 -m unittest tests.virtualhub.robotics.test_mdrobotbase_lqr`
  **Result:** 23 tests passed in 0.539s.
- **VirtualHub Comprehensive Robotics Suite:**
  `python3 -m unittest discover tests/virtualhub/robotics/`
  **Result:** 94 tests passed in 7.255s.
- **PBIO Native Test Suite:**
  `./lib/pbio/test/build/test-pbio src/mdrobotbase/..`
  **Result:** 31 tests ok (0 skipped).

### Governance Verification
```text
$ bash scripts/ci/governance-check.sh
Soda governance check (event=local, base=master)
Secret path scan: OK
Commit message format: OK (49 commit(s))
All submodules verified and clean
All governance checks passed.
Exit code: 0
```
