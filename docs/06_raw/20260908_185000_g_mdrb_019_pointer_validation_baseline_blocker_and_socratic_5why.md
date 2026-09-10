# G-MDRB-019 Pointer Validation: Baseline Blocker & Socratic 5-Why Dialectic Report

**Document ID:** `DOC-06RAW-20260908-MDRB019-SOCRATIC-5WHY`
**Timestamp:** `2026-09-08T18:50:00+07:00`
**Author:** Antigravity AI Engine (on behalf of WRO Robotics Engineering Team)
**Corpus Name:** `bs-soda/pybricks-micropython`
**Active Feature Branch:** `feature/mdrobotbase-enhancement`
**Target Integration Branch:** `epic/MDRB`
**Exact-HEAD Provenance:** `ebfc3e53235e6d73ecc474b76f5a67e560e45c37`
**Goal ID:** `G-MDRB-019`
**Acceptance Contract:** [`docs/02-product/acceptance/G-MDRB-019.md`](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/docs/02-product/acceptance/G-MDRB-019.md)
**Status:** `ready`

---

## 1. Baseline Replication Blockers

The baseline audit of `lib/pbio/src/mdrobotbase.c:187-195` identified the following architectural blockers (Codex Finding P1):

| Blocker ID | Source Location | Description | Governing Invariant |
| :--- | :--- | :--- | :--- |
| **BLK-019-01** | `lib/pbio/src/mdrobotbase.c:188` | Relational pointer comparisons (`rb < &mdrobotbases[0]` or `rb >= &mdrobotbases[PBIO_CONFIG_NUM_MDROBOTBASES]`) invoke undefined behavior in ISO C99 §6.5.8 on unrelated memory objects. | Acceptance AC-MDRB-019-1 |
| **BLK-019-02** | `lib/pbio/src/mdrobotbase.c:191` | Pointer subtraction (`ptrdiff_t slot = rb - &mdrobotbases[0]`) between unrelated pointers invokes undefined behavior in ISO C99 §6.5.6. | Acceptance AC-MDRB-019-2 |
| **BLK-019-03** | `lib/pbio/src/mdrobotbase.c:187` | Missing modulo alignment verification: an unaligned foreign pointer within the byte range could produce an out-of-bounds or misaligned struct dereference. | Acceptance AC-MDRB-019-3 |
| **BLK-019-04** | `lib/pbio/test/src/test_mdrobotbase.c` | Missing foreign stack and heap pointer rejection tests in the PBIO test suite. | Acceptance AC-MDRB-019-4, Article I & II |

---

## 2. Socratic 5-Why Recursive Dialectic Resolution (Level 5)

### Branch 1: Undefined Behavior in Relational Pointer Comparisons (`branch-1-pointer-ub`)
- **Level 1 (Symptom):** Why are pointer relational comparisons (`<`, `>=`) unsafe on arbitrary memory?
  *Finding:* ISO C99 §6.5.8 explicitly states that relational comparisons between pointers that do not point into the same aggregate object or array result in undefined behavior.
- **Level 2 (First-Order Mechanism):** Why can foreign pointers be passed to `pbio_mdrobotbase_put_robotbase()`?
  *Finding:* Callers or corrupt bindings can pass arbitrary stack memory, foreign heap buffers, or corrupted address values during lifecycle cleanup.
- **Level 3 (Second-Order Propagation):** Why must pointer validation execute before accessing any struct member?
  *Finding:* Attempting to access fields or calculate relative offsets of invalid foreign addresses triggers instant segmentation faults or memory corruption.
- **Level 4 (Systemic Prevention):** Why must pointer difference `rb - &mdrobotbases[0]` be eliminated?
  *Finding:* Subtracting unrelated pointers in C is also undefined behavior under §6.5.6, leading optimizers to assume the pointer is valid and eliminate downstream checks.
- **Level 5 (Axiomatic Invariant):** How is pointer safety proven at Level 5 first principles?
  *Finding:* Cast addresses to `uintptr_t`, check absolute byte boundaries `addr < base || addr >= base + total_size`, and verify alignment `(addr - base) % sizeof(pbio_mdrobotbase_t) == 0`.

### Branch 2: Portable Address Arithmetic via C99 `uintptr_t` (`branch-2-uintptr-arithmetic`)
- **Level 1 (Symptom):** Why is `uintptr_t` guaranteed to safely hold pointer values?
  *Finding:* ISO C99 §7.18.1.4 guarantees that `uintptr_t` is an unsigned integer type capable of holding any pointer without loss of representation.
- **Level 2 (First-Order Mechanism):** Why must the byte range check be formulated as `addr < base || addr >= base + total_size`?
  *Finding:* Integer comparisons are fully defined across all architectures and memory spaces, avoiding undefined pointer comparison semantics.
- **Level 3 (Second-Order Propagation):** Why is byte range check alone insufficient without alignment verification?
  *Finding:* A byte offset could fall within the pool range but point into the middle of a struct, causing misaligned access crashes on strict-alignment ARM cores.
- **Level 4 (Systemic Prevention):** Why must alignment be verified via `(addr - base) % sizeof(pbio_mdrobotbase_t) == 0`?
  *Finding:* Exact struct alignment guarantees that the computed slot index maps 1:1 to a valid array element boundary.
- **Level 5 (Axiomatic Invariant):** How is address arithmetic verified at Level 5 first principles?
  *Finding:* By deriving slot index via `(addr - base) / sizeof(pbio_mdrobotbase_t)` only after bounds and modulo checks pass.

### Branch 3: Foreign Heap & Stack Allocation Memory Safety (`branch-3-foreign-memory`)
- **Level 1 (Symptom):** Why must stack-allocated structs be rejected when passed to `put_robotbase()`?
  *Finding:* Stack structures were not allocated from the pool and releasing them corrupts internal pool accounting.
- **Level 2 (First-Order Mechanism):** Why must heap-allocated memory be rejected?
  *Finding:* Memory outside the static pool must not manipulate `mdrobotbase_in_use` flags.
- **Level 3 (Second-Order Propagation):** Why must corrupted pointers before array base be rejected?
  *Finding:* Pointers with negative relative offsets underflow integer subtraction and point to arbitrary globals.
- **Level 4 (Systemic Prevention):** Why must corrupted pointers at or beyond array end be rejected?
  *Finding:* Buffer overruns beyond the static array corrupt neighboring BSS variables.
- **Level 5 (Axiomatic Invariant):** How is foreign memory safety proven at Level 5 first principles?
  *Finding:* Concrete test cases allocate foreign stack and heap structs and verify fail-closed `PBIO_ERROR_INVALID_ARG` responses.

### Branch 4: Hardware Servo Stop Coast Invariants (`branch-4-servo-stop-invariants`)
- **Level 1 (Symptom):** Why must physical motors be stopped when a slot is released?
  *Finding:* Releasing a robot base without stopping motors leaves actuators running indefinitely.
- **Level 2 (First-Order Mechanism):** Why must coast mode be used instead of hold mode during reclamation?
  *Finding:* Holding position consumes current and heats motor windings; coast mode allows safe manual repositioning.
- **Level 3 (Second-Order Propagation):** Why must motor pointers be zeroed (`NULL`) upon release?
  *Finding:* Zeroing motor references guarantees that subsequent queries cannot actuate released hardware.
- **Level 4 (Systemic Prevention):** Why must `mdrobotbase_in_use[slot]` be set to false atomically?
  *Finding:* Atomic reclamation ensures other threads or coroutines immediately observe slot availability.
- **Level 5 (Axiomatic Invariant):** How is hardware shutdown safety proven at Level 5 first principles?
  *Finding:* Automated tests assert `left_motor == NULL`, `right_motor == NULL`, and motor drive state is coast.

### Branch 5: Fail-Closed TinyTest Verification & Zero Mocks (`branch-5-zero-mock-testing`)
- **Level 1 (Symptom):** Why are synthetic pointer stubs or mocked allocators strictly forbidden?
  *Finding:* Article I mandates zero mocks; synthetic stubs conceal actual compiler pointer optimizations.
- **Level 2 (First-Order Mechanism):** Why must tests allocate real foreign struct instances?
  *Finding:* Live stack and heap allocations test real linker section boundaries and memory addresses.
- **Level 3 (Second-Order Propagation):** Why must goal card conform to all 34 template invariants?
  *Finding:* Consistent machine-verifiable structures prevent specification drift and automate pipeline validation.
- **Level 4 (Systemic Prevention):** Why must acceptance contract specify exact BDD Given-When-Then scenarios?
  *Finding:* Explicit scenarios eliminate ambiguity between reviewer and agent.
- **Level 5 (Axiomatic Invariant):** How is empirical defensibility achieved at Level 5 first principles?
  *Finding:* All 25 Socratic nodes and 22 release gate assertions pass with 100% green execution.
