# G-MDRB-019: Portable Address Validation and Foreign-Pointer Memory Safety in put_robotbase

**Status:** done
**Kind:** feature
**Atomic outcome:** Replace undefined-behavior relational pointer comparisons in pbio_mdrobotbase_put_robotbase with portable uintptr_t address arithmetic, array byte range checks, and struct alignment validation
**Epic:** MDRB
**Depends on:** G-MDRB-018
**Blocks:** G-MDRB-020
**Spec stability:** clarify done · spec check done · analyze done

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Specification & Pointer Safety Analysis | done |
| 2 | Implement Portable uintptr_t Bounds & Alignment Verification | done |
| 3 | Foreign-Pointer Sanitizer & TinyTest Verification Pass | done |

## Context

In [`lib/pbio/src/mdrobotbase.c:188-195`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L188-L195), `pbio_mdrobotbase_put_robotbase()` validates whether a supplied `pbio_mdrobotbase_t *rb` belongs to the static pool `mdrobotbases` using relational pointer comparisons:
```c
if (rb < &mdrobotbases[0] || rb >= &mdrobotbases[PBIO_CONFIG_NUM_MDROBOTBASES]) {
    return PBIO_ERROR_INVALID_ARG;
}
ptrdiff_t diff = rb - &mdrobotbases[0];
```
Under ISO C (C99/C11 §6.5.8), relational comparisons (`<`, `<=`, `>`, `>=`) and pointer subtractions between pointers that do not address elements of the same array object yield undefined behavior. If a foreign pointer (such as an uninitialized heap address, stack pointer, or corrupted reference) is passed to `put_robotbase()`, the comparison itself triggers undefined behavior before rejection can occur.

### Scorecard & Baseline Evidence
- **Current score:** 8/10 (Instance ownership / memory safety) · **Expected score:** 10/10
- **Exact evidence:** [`lib/pbio/src/mdrobotbase.c:188-195`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/lib/pbio/src/mdrobotbase.c#L188-L195)
- **Root cause:** Direct pointer relational operators across potentially foreign memory objects in violation of portable C standards.
- **Reproduction steps:**
  1. Allocate an arbitrary stack or heap buffer `uint8_t foreign[sizeof(pbio_mdrobotbase_t)]`.
  2. Invoke `pbio_mdrobotbase_put_robotbase((pbio_mdrobotbase_t *)foreign)`.
  3. Under strict memory sanitizers (UBSan / ASan) or architectures with segmented memory, relational pointer comparisons trigger undefined behavior faults.

## Intent *(WHAT / WHY only — no stack, APIs, folders, or libraries)*

**Why:** Autonomous competition robotics firmware must never trigger undefined behavior when handling invalid or foreign references; pointer validation must remain strictly portable, deterministic, and safe on all embedded targets.
**Done when:** All pointer address validations in slot reclamation use portable unsigned integer address checks, byte-range boundaries, and struct size alignment checks, verified with unit tests passing arbitrary foreign stack, heap, and misaligned addresses without undefined behavior.
**Unblocks:** G-MDRB-020

## Atomicity & Zero-Mock Contract

- **One outcome:** Replace relational pointer checks in `pbio_mdrobotbase_put_robotbase` with portable integer address and alignment checks.
- **No decomposition leakage:** State machine coupling belongs to G-MDRB-020.
- **Concrete execution:** 100% concrete C pointer math and native TinyTest assertions. Zero mocks, zero stubs, zero dummy fallbacks.
- **Real boundary verification:** Verified via native C unit tests allocating genuine foreign memory structs and asserting `PBIO_ERROR_INVALID_ARG`.
- **Failure behavior:** Misaligned address, out-of-pool address, or null pointer immediately returns `PBIO_ERROR_INVALID_ARG` without dereferencing or illegal pointer comparison.

## How *(PLAN only — leave empty while `draft`)*

**Stack / approach:** C99 `uintptr_t` address arithmetic in PBIO:
1. Cast `rb` and static array boundaries to `uintptr_t`:
   - `uintptr_t addr = (uintptr_t)rb;`
   - `uintptr_t base = (uintptr_t)&mdrobotbases[0];`
   - `uintptr_t element_size = sizeof(pbio_mdrobotbase_t);`
   - `uintptr_t total_size = sizeof(mdrobotbases);`
2. Validate byte boundaries: reject if `addr < base || addr >= base + total_size`.
3. Validate struct alignment: reject if `(addr - base) % element_size != 0`.
4. Derive slot index: `int slot = (int)((addr - base) / element_size);`.
5. Add unit test `test_mdrobotbase_portable_pointer_validation` in `lib/pbio/test/src/test_mdrobotbase.c`:
   - Test `NULL` pointer.
   - Test foreign stack struct.
   - Test foreign heap buffer.
   - Test misaligned address (`(uint8_t *)&mdrobotbases[0] + 1`).
   - Test legitimate slot release.

## Open questions *(block `ready` while any `[NEEDS CLARIFICATION]` remain)*

- [x] (Resolved) Does `uintptr_t` require additional headers in PBIO? No, `stdint.h` is already included via `pbio/config.h` and standard PBIO headers.

## Knowledge links

| Type | IDs |
|------|-----|
| **Pains addressed** | P-MDRB-PORTABLE-POINTER-UB |
| **Decisions** | PDR-MDRB-UINTPTR-VALIDATION |
| **Assumptions required** | A-LINEAR-ADDRESS-SPACE |
| **Evidence** | Codex Architectural Review finding P1 on `put_robotbase()` |

## Context manifest

| Kind | IDs / paths |
|------|-------------|
| **ADR** | — |
| **PDR** | — |
| **Patterns** | Defensive Memory Validation, Portable Address Range Checking |
| **Acceptance** | `docs/02-product/acceptance/G-MDRB-019.md` |
| **Skills** | `soda-system-architecture` · `soda-testing` |
| **Profile** | developer |
| **Task type** | feature |
| **Playbook** | `docs/06-workflows/dev-loop.md` |
| **Default role** | developer |
| **Files** | `lib/pbio/src/mdrobotbase.c` · `lib/pbio/test/src/test_mdrobotbase.c` |
| **Constraints** | Zero undefined behavior, 100% C99 compliance, zero mocks |

## Work steps

### Step 1 — Specification & Pointer Safety Analysis

**Allowed files:** `docs/07-backlog/goals/G-MDRB-019.md` · `docs/02-product/acceptance/G-MDRB-019.md`
**Actions:**
1. Document the exact ISO C undefined behavior semantics of pointer relational comparisons across disjoint memory allocations.
2. Formalize mathematical address range and alignment invariants for static pool validation.
3. Formulate Given-When-Then BDD scenarios in acceptance contract.
**Completion gate:** Acceptance contract exists with quantitative foreign pointer validation scenarios.
**Stop condition:** Spec drift or unresolved alignment ambiguity.

### Step 2 — Implement Portable uintptr_t Bounds & Alignment Verification

**Allowed files:** `lib/pbio/src/mdrobotbase.c`
**Actions:**
1. Refactor `pbio_mdrobotbase_put_robotbase()` to perform address validation via `uintptr_t`.
2. Compute `base = (uintptr_t)&mdrobotbases[0]` and `total_size = sizeof(mdrobotbases)`.
3. Check `addr < base || addr >= base + total_size`.
4. Check `(addr - base) % sizeof(pbio_mdrobotbase_t) != 0`.
5. Compute `slot = (int)((addr - base) / sizeof(pbio_mdrobotbase_t))` and verify `mdrobotbase_in_use[slot]`.
**Completion gate:** Clean compilation with zero compiler warnings.
**Stop condition:** Build error or compiler warning on `uintptr_t` conversions.

### Step 3 — Foreign-Pointer Sanitizer & TinyTest Verification Pass

**Allowed files:** `lib/pbio/test/src/test_mdrobotbase.c`
**Actions:**
1. Implement `test_mdrobotbase_portable_pointer_validation()` in `lib/pbio/test/src/test_mdrobotbase.c`.
2. Test rejection of stack-allocated foreign pointer.
3. Test rejection of misaligned pointer into pool.
4. Test rejection of unallocated slot within pool.
5. Register test in `pbio_mdrobotbase_tests[]` and verify full suite passes.
**Completion gate:** `make -C lib/pbio/test test` passes 19/19 tests ok.
**Stop condition:** Any test failure or sanitizer fault.

## In

- Portable address range checking using `uintptr_t` in `pbio_mdrobotbase_put_robotbase()`.
- Struct byte alignment verification before computing slot indices.
- Concrete native C unit tests exercising foreign and misaligned pointers.

## Out

- Dynamic heap allocation of robot bases (static pool is an embedded firmware constraint).
- Modifications to MicroPython finalizer semantics.

## Change delta

| Area | Action | Path / behaviour |
|------|--------|------------------|
| C Driver | Update | `lib/pbio/src/mdrobotbase.c:182-205` — Replace relational pointer checks with `uintptr_t` bounds and alignment checks |
| PBIO Tests | Add | `lib/pbio/test/src/test_mdrobotbase.c` — Add `test_mdrobotbase_portable_pointer_validation` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Memory Portability** | Strict adherence to ISO C99 §6.5.8; zero relational comparisons on pointers to disjoint objects. |
| **Address Alignment** | $(addr - base) \pmod{sizeof(\text{pbio\_mdrobotbase\_t})} = 0$. |
| **Fail-Closed Gate** | Any foreign, out-of-range, or misaligned pointer returns `PBIO_ERROR_INVALID_ARG` with zero side effects. |

## Spec checklist

- [x] Software & Architecture Design specified
- [x] Intent is WHAT/WHY only
- [x] Touch map contains all paths
- [x] No `[NEEDS CLARIFICATION]` markers remaining
- [x] In and Out scope clearly bounded
- [x] Zero Mocks, Zero Stubs contract enforced

## Acceptance criteria

- [x] `pbio_mdrobotbase_put_robotbase(NULL)` returns `PBIO_ERROR_INVALID_ARG`.
- [x] Passing a foreign stack-allocated `pbio_mdrobotbase_t` returns `PBIO_ERROR_INVALID_ARG`.
- [x] Passing a misaligned address `(uint8_t *)&mdrobotbases[0] + 1` returns `PBIO_ERROR_INVALID_ARG`.
- [x] Passing an address strictly before `&mdrobotbases[0]` or at/beyond `&mdrobotbases[PBIO_CONFIG_NUM_MDROBOTBASES]` returns `PBIO_ERROR_INVALID_ARG`.
- [x] Passing a valid, currently allocated pool slot successfully releases motors, marks slot free, and returns `PBIO_SUCCESS`.

## Test plan

- Command: `./lib/pbio/test/build/test-pbio src/mdrobotbase/..`
- Expected: 19/19 tests ok, 0 skipped.

## Touch map

- `lib/pbio/src/mdrobotbase.c`
- `lib/pbio/test/src/test_mdrobotbase.c`

## Notes for AI

- Zero mocks, zero stubs.
- Do not use relational operators on raw pointers. Always cast to `uintptr_t` before comparison.

---

## 🏛️ Comprehensive Spec Design Appendix

### 1. Finite State Machine (FSM) Matrix & Saga Compensations

| State | Inbound Trigger / Event | Invariants & Guards | Outbound Side Effect | Dispute / Failure Compensation |
|---|---|---|---|---|
| `Slot::Allocated` | Explicit release request | Address $\in [\text{base}, \text{base} + \text{size})$ and aligned | Motors stopped; slot marked free | Safe rejection with `PBIO_ERROR_INVALID_ARG` |
| `Slot::Foreign` | Foreign pointer passed | Address outside pool range or misaligned | None | Immediate fail-closed error |
| `Slot::Free` | Re-release request | Slot already marked free | None | Return `PBIO_ERROR_INVALID_ARG` |

### 2. Mathematical & Data Invariants Spec

| Dimension | Standard / Specification |
|---|---|
| **Address Domain** | $\forall p, \text{valid}(p) \iff \text{base} \le (uintptr\_t)p < \text{base} + N \cdot S \land ((uintptr\_t)p - \text{base}) \equiv 0 \pmod S$. |
| **Integer Arithmetic** | Exact integer arithmetic for alignment and slot calculation. |

### 3. Hexagonal Inbound & Outbound Ports Topology

- **Inbound Driving Port:** MicroPython deallocator / explicit `close()` caller.
- **Outbound Driven Port:** Hardware Servo Coast Primitive (`pbio_servo_stop`).
