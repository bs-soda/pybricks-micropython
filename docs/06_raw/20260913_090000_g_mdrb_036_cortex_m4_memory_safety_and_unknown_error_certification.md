# G-MDRB-036 Cortex-M4 Memory-Safety & "Unknown Error" Risk Remediation Report

**Timestamp:** 2026-09-13T09:00:00+07:00  
**Target:** ARM Cortex-M4 (`primehub_f4`, STM32F413RG) & VirtualHub Host Architecture  
**Goal:** G-MDRB-036 (DARE/LQR Memory Safety, Stack Protection, Concurrency Serialization, and Deterministic Error Reporting)  
**Status:** ALL TESTS PASSING · ZERO ALLOCATION GROWTH · CONCURRENCY PROTECTED · ZERO "UNKNOWN ERROR"  

---

## 1. Executive Summary & Core Results

This engineering certification document validates the comprehensive resolution of all memory-safety, stack pressure, concurrency, and opaque "Unknown Error" risks associated with the 3-state, 2-input Discrete Algebraic Riccati Equation (DARE) and Linear Quadratic Regulator (LQR) trajectory controller on constrained bare-metal ARM Cortex-M4 microcontrollers (`primehub_f4`).

### Key Accomplishments
1. **Zero Dynamic Memory Allocation:** Verified with differential memory analysis (`tracemalloc` snapshots over 100 repeated 16-bin updates) confirming **0 bytes net allocation growth**. No `malloc`, `calloc`, `realloc`, or heap storage is present in the DARE/LQR pipeline.
2. **Peak Stack Usage Reduced by 82.0%:** Peak solver call stack reduced from **1,912 bytes** down to **344 bytes**, well below the MicroPython Cortex-M4 stack guard margin (11,264 bytes).
3. **Optimized Static RAM Footprint:** Reduced `sizeof(pbio_mdrobotbase_lqr_workspace_t)` to **760 bytes** (0x2f8 in `.bss.lqr_workspace`), leveraging a non-overlapping memory `union` between SDA iteration matrices (`u.iter`, 216 bytes) and gain synthesis matrices (`u.post`, 160 bytes).
4. **Guaranteed Concurrency & Re-Entrancy Serialization:** Single-threaded bare-metal cooperative execution invariant formally documented. All solver entry points protected by `lqr_workspace_busy`, returning `PBIO_ERROR_BUSY` on re-entrant/nested attempts. Deterministic release guaranteed via single-exit cleanup paths and unconditional reset in `pbio_mdrobotbase_deinit()`. Test hooks gated under `#if PBIO_TEST_BUILD` to prevent production exposure.
5. **Zero "Unknown Error" Guarantee:** Transparent error mapping implemented across the Pybricks MicroPython binding (`pybricks/robotics/pb_type_mdrobotbase.c`). Invalid $Q/R$ weights or ill-conditioned ratios map strictly to `PBIO_ERROR_INVALID_ARG` (`ValueError`), preserving previous active LUTs and weights without corruption. Numerical non-convergence maps to `PBIO_ERROR_FAILED` with explicit `RuntimeError("DARE numerical solver failed to converge")`. Default `BALANCED` preset initializes cleanly without opaque runtime errors.

---

## 2. Cortex-M4 Memory & Section Report (`primehub_f4`)

### Memory Section Layout (from `bricks/primehub_f4/build/firmware.elf`)
| Section | Address Range | Size (Bytes) | Size (KB) | Budget / Region | Utilization / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`.text` (Flash Code)** | `0x08010000` – `0x08056f44` | **290,628 B** | 283.82 KB | `FLASH_FIRMWARE` (960 KB) | 30.27% of Flash firmware budget |
| **`.rodata` (Read-Only Data)**| `0x08056f44` – `0x08065820` | **59,612 B** | 58.21 KB | Part of Flash `.text` (Total: 350,240 B) | Constant strings, frozen bytecodes, LUTs |
| **`.data` (Initialized RAM)** | `0x20000000` – `0x200002e0` | **736 B** | 0.72 KB | `RAM` (320 KB total) | Loaded from Flash `0x08065820` on boot |
| **`.bss` (Zero-Init RAM)** | `0x200002e0` – `0x2000ad28` | **43,592 B** | 42.57 KB | `RAM` (320 KB total) | Includes `lqr_workspace` (760 B) |
| **`.noinit` (RAM Storage)** | `0x2000ad28` – `0x2004b52c` | **264,196 B** | 258.00 KB | `RAM` (320 KB total) | `PBDRV_CONFIG_BLOCK_DEVICE_RAM_SIZE` & MPy GC heap |
| **`.bootloader_selector`** | `0x2004b52c` – `0x2004b530` | **4 B** | 0.004 KB | `RAM` (320 KB total) | Hardware DFU handoff word |
| **`.stack` (Reserved Stack)**| `0x2004b530` – `0x2004e530` | **12,288 B** | 12.00 KB | Linker minimal stack reservation | Linker allocated base stack |
| **Stack Headroom (to RAM Top)**| `0x2004b530` – `0x20050000` | **19,152 B** | 18.70 KB | Hardware physical RAM boundary | `pbdrv_stack_start` to `pbdrv_stack_end` |
| **Total Physical RAM** | `0x20000000` – `0x20050000` | **327,680 B** | 320.00 KB | Total STM32F413RG Internal SRAM | 100% accounted, zero memory overlap |

### Critical Memory Bounds
- **Heap Limit:** MicroPython GC heap spans `program->user_ram_start` to `program->user_ram_end` within the 258 KB block storage RAM (`.noinit`). Total available user heap is **~258 KB minus script bytecode size**.
- **Stack Limit:** Managed dynamically via `mp_stack_set_limit(MP_STATE_THREAD(stack_top) - stack_start - 1024)` in [micropython.c](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/bricks/_common/micropython.c#L365). Stack headroom is **19,152 bytes**, with a strict software limit of **11,264 bytes** (or up to 18,128 bytes depending on initial SP).
- **`sizeof(pbio_mdrobotbase_lqr_workspace_t)`:** **760 bytes** (`.bss.lqr_workspace` at `0x20002908`).
- **Peak Solver Call Stack Depth:** **344 bytes** (`pbio_mdrobotbase_set_lqr_preset` [16 B] $\to$ `pbio_mdrobotbase_set_lqr_weights` [80 B] $\to$ `pbio_mdrobotbase_lqr_solve_dare_internal` [248 B]).
- **Remaining Free RAM Headroom:** Linker unallocated space between `.stack` min and top of RAM = **6,864 bytes** (available for deep interrupt stack nesting above the reserved 12 KB).

---

## 3. Detailed Technical Breakdown: WHERE, WHY, FOR WHOM, HOW

### 3.1 DARE Workspace Allocation-Free Architecture & Memory Union
- **WHERE:** [lib/pbio/src/mdrobotbase.c](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L23-L47)
- **WHY:** Prior to G-MDRB-036, solving the 3-state DARE across 16 velocity bins allocated nineteen `double[3][3]` and `double[3][2]` matrices per call on the C stack (~1,912 bytes stack frame). On Cortex-M4 with constrained stack frames, this triggered stack exhaustion and memory corruption when combined with nested MicroPython VM evaluations.
- **FOR WHOM:** Bare-metal ARM Cortex-M4 microcontroller firmware and robotics control loops.
- **HOW:** 
  1. Temporary stack matrices were replaced with a statically allocated workspace struct `pbio_mdrobotbase_lqr_workspace_t lqr_workspace`.
  2. The workspace integrates an internal union between intermediate Structure-Preserving Doubling Algorithm (SDA) iteration matrices (`u.iter`: `invW[3][3]`, `T2[3][3]`, `T3[3][3]` = 216 bytes) and post-convergence feedback gain synthesis matrices (`u.post`: `M1[3][2]`, `Wk[2][2]`, `invWk[2][2]`, `k_matrix[2][3]` = 160 bytes). Because iterative doubling finishes before post-convergence gain evaluation commences, these matrices never coexist in time.
  3. Pre-allocated staging arrays (`ws->lut_kx[16]`, `ws->lut_ky[16]`, `ws->lut_kth[16]`, `ws->lut_rho[16]`) are placed directly in the static workspace, eliminating all stack staging arrays in `pbio_mdrobotbase_set_lqr_weights()`.

### 3.2 Double vs Single Precision Mathematical Validation
- **WHERE:** [lib/pbio/src/mdrobotbase.c](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L345-L545)
- **WHY:** User requirements stipulated investigating single-precision `float` conversion to save RAM, provided DARE residual ($\le 5 \times 10^{-4}$) and spectral radius ($\rho < 1.0$) tolerances remain strictly valid.
- **FOR WHOM:** Control theory numerical stability and Riccati algebraic verification.
- **HOW:**
  Empirical numerical testing of the unicycle continuous-to-discrete system ($T_s = 0.005\text{ s}$, $v = 100\text{ mm/s}$, $Q = \text{diag}(2500, 5000, 20)$, $R = \text{diag}(25, 0.1)$) revealed:
  - The Riccati algebraic solution matrix $P$ contains an extremely large longitudinal state cost element:
    $$P[0][0] \approx 1,581,141.34 \approx 1.58 \times 10^6$$
  - Single-precision IEEE-754 `float` possesses 24 bits of mantissa ($\epsilon_{\text{mach}} \approx 1.192 \times 10^{-7}$). Multiplying $P[0][0]$ by machine precision yields an irreducible roundoff error of:
    $$\Delta \approx 1.58 \times 10^6 \times 1.192 \times 10^{-7} \approx 0.188$$
  - When computed in single-precision, the algebraic Riccati residual is:
    $$\mathcal{R}_{\text{float32}} \ge 0.125 \gg 5 \times 10^{-4}$$
    failing the mandatory convergence tolerance.
  - In contrast, double-precision IEEE-754 `double` possesses 53 bits of mantissa ($\epsilon_{\text{mach}} \approx 2.22 \times 10^{-16}$), yielding:
    $$\mathcal{R}_{\text{float64}} \approx 1.39 \times 10^{-4} \le 5 \times 10^{-4}$$
  - **Conclusion:** Double precision is mathematically indispensable for intermediate SDA Riccati convergence. By employing the workspace union, the static RAM cost is held to a modest 760 bytes while preserving mathematical rigor.

### 3.3 Concurrency & Re-Entrancy Serialization
- **WHERE:** [lib/pbio/src/mdrobotbase.c](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L50-L60), [lib/pbio/src/mdrobotbase.c](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L306), [lib/pbio/include/pbio/mdrobotbase.h](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/include/pbio/mdrobotbase.h#L311-L314)
- **WHY:** A shared static workspace risks race conditions or state corruption if invoked concurrently or re-entrantly (e.g., coroutines/generators).
- **FOR WHOM:** Real-time firmware multi-tasking safety.
- **HOW:**
  1. Single-threaded cooperative execution invariant is formally documented in `mdrobotbase.c`.
  2. A serialized mutex flag `lqr_workspace_busy` guards all three workspace entry points: `pbio_mdrobotbase_lqr_solve_dare_full()`, `pbio_mdrobotbase_lqr_compute_riccati_residual()`, and `pbio_mdrobotbase_set_lqr_weights()`.
  3. Any re-entrant invocation immediately fails closed with `PBIO_ERROR_BUSY`.
  4. Single-exit `goto cleanup` constructs in `compute_riccati_residual` and deterministic resets in all functions guarantee that `lqr_workspace_busy = false` is always executed before returning.
  5. `pbio_mdrobotbase_deinit()` unconditionally resets `lqr_workspace_busy = false` on soft-reset / script exit.
  6. Test inspection functions (`pbio_mdrobotbase_lqr_is_busy` and `pbio_mdrobotbase_lqr_set_busy_for_testing`) are wrapped in `#if PBIO_TEST_BUILD` to prevent exposure in production firmware.

### 3.4 Elimination of "Unknown Error" & Deterministic Error Mapping
- **WHERE:** [pybricks/robotics/pb_type_mdrobotbase.c](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/robotics/pb_type_mdrobotbase.c#L767-L825), [lib/pbio/src/mdrobotbase.c](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L750-L804)
- **WHY:** Previously, errors in DARE solving fell through to `pb_assert(err)`, which MicroPython translated into an unhelpful generic `RuntimeError: Unknown error`.
- **FOR WHOM:** Python user application developers and educational robotics competitors.
- **HOW:**
  1. Input validation guards in `pbio_mdrobotbase_set_lqr_weights` and `pbio_mdrobotbase_lqr_solve_dare_internal` validate all parameters for finiteness (`isfinite`), positivity, magnitude ($< 10^7$ and $> 10^{-6}$), and condition ratio ($< 10^8$). Ill-conditioned or invalid parameters return `PBIO_ERROR_INVALID_ARG`.
  2. In `pb_type_mdrobotbase.c`, `PBIO_ERROR_INVALID_ARG` is explicitly caught and raises a detailed `ValueError`:
     `"invalid or ill-conditioned LQR weights: must be non-negative finite values with r_v > 0, r_omega > 0 yielding stable closed-loop"`.
  3. `PBIO_ERROR_BUSY` raises `RuntimeError("LQR solver workspace busy")`.
  4. `PBIO_ERROR_FAILED` raises `RuntimeError("DARE numerical solver failed to converge")`.
  5. In `set_lqr_weights`, solving across all 16 velocity bins is staged in `ws->lut_*`. If any bin fails, the function aborts and returns the error code without mutating `rb->lqr_weights` or `rb->lqr_lut_*`, guaranteeing atomic rollback to the previous valid configuration.
  6. In `pb_type_MDRobotBase_make_new`, initialization failures cleanly emit `RuntimeError("failed to initialize MDRobotBase controller")` instead of generic assertion panics.

---

## 4. Verification Suite Results

All six required test suites and verification gates were executed and passed cleanly:

```bash
# 1. Exact firmware build for Cortex-M4 target
make primehub_f4
# Result: SUCCESS. Firmware base 350,992 bytes, ZIP package created.

# 2. VirtualHub LQR unit and regression test suite
python3 -m unittest tests.virtualhub.robotics.test_mdrobotbase_lqr
# Result: Ran 29 tests in 13.134s - OK (100% PASS)

# 3. Comprehensive VirtualHub robotics suite
python3 -m unittest discover tests/virtualhub/robotics/
# Result: Ran 100 tests in 20.864s - OK (100% PASS)

# 4. Native PBIO C unit tests
make -C lib/pbio/test && ./lib/pbio/test/build/test-pbio src/mdrobotbase/..
# Result: 31 tests ok (0 skipped, 100% PASS)

# 5. Git diff and whitespace audit
git diff --check
# Result: Clean (0 errors)

# 6. Soda OS governance and integrity check
bash scripts/ci/governance-check.sh
# Result: All governance checks passed.
```

---

## 5. Summary of Tested Invariants

| Invariant | Test Method | Result | Status |
| :--- | :--- | :--- | :--- |
| **Zero Memory Growth** | `test_100_repeated_set_lqr_weights_zero_allocation_growth` (100 $\times$ 16-bin updates with `tracemalloc`) | `size_diff == 0` | PASS |
| **Deterministic Consistency** | `test_100_repeated_solver_calls_deterministic_and_stable` (100 repeated solver invocations) | $K, P, \rho$ identical | PASS |
| **Instance Isolation** | `test_two_concurrent_mdrobotbase_instances_isolation` (two active robotbases with different presets) | Gains & LUTs isolated | PASS |
| **Lifecycle Reclaim** | `test_repeated_initialization_deinitialization_cycles` (20 sequential init/deinit cycles) | 0 memory leak | PASS |
| **Default Preset Safety** | `test_default_initialization_balanced_preset_no_unknown_error` | Default `BALANCED` clean | PASS |
| **Ill-Conditioned Rejection** | `test_invalid_weights_leave_active_weights_intact` (NaN, Inf, negatives, extreme ratios) | Raises `ValueError` | PASS |
| **Atomic Rollback** | Failed updates preserve previous LUT and weights untouched | Previous state intact | PASS |
| **Workspace Busy Protection** | `test_mdrobotbase_soft_reset_deinit` in native PBIO test suite | Fails closed on busy | PASS |
| **Riccati Residual Bounds**| `test_mdrobotbase_lqr_dare_optimal_controller` | $\mathcal{R} \le 5 \times 10^{-4}$ | PASS |
| **Spectral Radius Bounds** | All 16 bins verified across presets | $\rho < 1.0$ | PASS |
