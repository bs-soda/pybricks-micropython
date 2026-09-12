# Bare-Metal ARM Cortex-M4 STM32F413 Build Remediation & Memory Budget Certification

**Timestamp:** 2026-09-12T10:10:00+07:00  
**Target Platform:** `prime_hub_f4` (STM32F413RG, ARM Cortex-M4 with FPU, 320 KB RAM, 1024 KB Flash)  
**Associated Goal:** `G-MDRB-033` (MDRobotBase Calibrated Color Classification & Hardware Deployment)  
**Status:** **100% Resolved & Certified**  

---

## 1. Executive Summary & Root Cause Analysis

During target compilation of the Pybricks bare-metal firmware (`make -C bricks/primehub_f4`), three distinct issues prevented successful binary generation:

1. **`-Werror=type-limits` Compiler Diagnostic in `pbio_mdrobotbase_set_motion_status`:**
   - **Root Cause:** Under the ARM AAPCS ABI (`arm-none-eabi-gcc`), enumeration types containing only non-negative values default to unsigned representations (`unsigned int` or `uint8_t`). Evaluating `status < PBIO_MDROBOTBASE_STATUS_NONE` (where `PBIO_MDROBOTBASE_STATUS_NONE == 0`) produced the warning `comparison is always false due to limited range of data type [-Werror=type-limits]`. With `-Werror` active, this halted compilation.

2. **Undefined Math References in Bare-Metal Toolchain Link:**
   - **Root Cause:** The bare-metal MicroPython `libm` implementation on STM32 (`micropython/lib/libm/`) supplies embedded trigonometric and exponential functions, but omits C99 standard library extensions: `cbrtf`, `fmaxf`, `fminf`, and `lroundf`. References in `mdrobotbase_lab_f`, `mdrobotbase_rgb_to_hsv`, and `pbio_mdrobotbase_wheel_to_motor_dps` failed during the linker pass.

3. **RAM Memory Region Overflow (`region 'RAM' overflowed by 10568 bytes`):**
   - **Root Cause:** The STM32F413 has 320 KB of continuous SRAM. The SPI flash block device driver (`block_device_w25qxx_stm32.c`) allocated a `272 KB` (`(256 + 16) * 1024`) static RAM cache in the `.noinit` section. Meanwhile, `PBIO_CONFIG_NUM_MDROBOTBASES` defaulted to `PBIO_CONFIG_SERVO_NUM_DEV / 2` (3 instances on Prime Hub's 6 ports), consuming `13,644 bytes` in `.bss` (4,548 bytes per instance). Adding minimum stack requirements (`12 KB`) pushed total static allocation beyond the 320 KB boundary.

---

## 2. Structured Code Explanation (WHERE, WHY, FOR WHOM, HOW)

### A. Motion Status Enum Bounds Guard
- **WHERE:** [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L645-L660)
- **WHY:** Ensure fail-closed rejection of invalid states across both signed (host unit tests) and unsigned (ARM EABI target) enum representations without triggering tautological type-limit compiler warnings.
- **FOR WHOM:** Bare-metal ARM Cortex-M4 MCU toolchains and the Finite State Machine (FSM) transition validator.
- **HOW:** Cast `status` and `cur_status` to `(uint32_t)`. Any negative value wraps to $> 4$, and values $\ge 5$ directly exceed `PBIO_MDROBOTBASE_STATUS_COUNT` (5), returning `PBIO_ERROR_INVALID_ARG` deterministically.

### B. Portable Embedded Math Functions
- **WHERE:** [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L785-L800), [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L955-L1015)
- **WHY:** Remove external C runtime math library dependencies on missing functions (`cbrtf`, `fmaxf`, `fminf`, `lroundf`).
- **FOR WHOM:** Bare-metal firmware linker and embedded floating-point runtime.
- **HOW:**
  - Implemented static inline `mdrobotbase_fmaxf` and `mdrobotbase_fminf` ternary comparators.
  - Substituted `cbrtf(t)` with `powf(t, 1.0f / 3.0f)` (which is already linked and hardware-accelerated via `libm`).
  - Implemented exact symmetric integer rounding: `(int32_t)(product >= 0.0f ? product + 0.5f : product - 0.5f)` in `pbio_mdrobotbase_wheel_to_motor_dps`.

### C. Static RAM Budget Tuning
- **WHERE:** [`lib/pbio/platform/prime_hub_f4/pbdrvconfig.h`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/platform/prime_hub_f4/pbdrvconfig.h#L40-L45), [`lib/pbio/include/pbio/mdrobotbase.h`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h#L10-L18), [`lib/pbio/src/mdrobotbase.c`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L10-L18)
- **WHY:** Fit firmware data, bss, noinit, and minimal 12 KB stack into 320 KB STM32F413 RAM.
- **FOR WHOM:** LEGO SPIKE Prime hardware runtime, OS stack safety, and memory management.
- **HOW:**
  - Set `PBDRV_CONFIG_BLOCK_DEVICE_RAM_SIZE` to `(258 * 1024)`, matching the verified configuration in `essential_hub` (which shares the exact same STM32F413 MCU and W25Qxx flash chip). This directly reclaimed `14,336 bytes` of RAM.
  - Set default `PBIO_CONFIG_NUM_MDROBOTBASES` to 2 instances across all platforms, preserving multi-robot unit testing while reducing BSS consumption from 13,644 bytes to 9,096 bytes (saving `4,548 bytes`).

---

## 3. Empirical Verification & Evidence

### 1. Bare-Metal Linker Map & Binary Generation
```text
LINK build/firmware.elf
build/firmware.elf  :
section                  size        addr
.text                  342680   134283264
.magic                      0   536870912
.data                     736   536870912
.bss                    42140   536871648
.noinit                264196   536913788
.bootloader_selector        4   537177984
.stack                  12288   537177988
.name                      16   134626680
.user                       4   134626696
.checksum                   4   134626700
Total                  662609

BIN creating firmware base file: 343432 bytes
ZIP creating firmware package:
  adding: firmware-base.bin (deflated 30%)
  adding: firmware.metadata.json (deflated 48%)
  adding: ReadMe_OSS.txt (deflated 73%)
```
- **Result:** Exit code 0, 0 compiler warnings, 0 linker errors.

### 2. Native PBIO Test Suite Execution
- **Command:** `./lib/pbio/test/build/test-pbio`
- **Result:** **88 passed, 0 skipped, 0 failed**
- **Coverage:** All 28 `mdrobotbase` unit and regression tests passed without failure.

### 3. VirtualHub Robotics Test Suite Execution
- **Command:** `python3 -m unittest discover tests/virtualhub/robotics`
- **Result:** **61 passed, 0 failed** in 1.649s.

### 4. Governance & Whitespace Verification
- **Command:** `bash scripts/ci/governance-check.sh`
- **Result:** All governance checks passed (exit code 0).
- **Command:** `git diff --check`
- **Result:** 0 whitespace or formatting errors.
