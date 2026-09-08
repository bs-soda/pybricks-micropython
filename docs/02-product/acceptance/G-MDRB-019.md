# Acceptance Contract: G-MDRB-019

**Goal ID:** `G-MDRB-019`  
**Title:** Portable Address Validation and Foreign-Pointer Memory Safety in put_robotbase  
**Epic:** MDRB  
**Target Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`  
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)  

---

## 1. Feature Narrative

```gherkin
Feature: Portable Address Validation and Foreign-Pointer Memory Safety in put_robotbase
  As an embedded firmware safety engineer
  I want pbio_mdrobotbase_put_robotbase to validate slot pointer addresses using uintptr_t range and alignment checks
  So that foreign heap, stack, or misaligned pointers are safely rejected without triggering undefined behavior from relational pointer comparisons.
```

---

## 2. BDD Acceptance Scenarios

### Scenario 1: Null Pointer Rejection
```gherkin
Given pbio_mdrobotbase_put_robotbase is called
When the input pointer rb is NULL
Then the function immediately returns PBIO_ERROR_INVALID_ARG
And no hardware motor commands are executed.
```

### Scenario 2: Foreign Stack and Heap Pointer Rejection
```gherkin
Given an arbitrary foreign memory buffer allocated on the stack or heap
When pbio_mdrobotbase_put_robotbase((pbio_mdrobotbase_t *)foreign_buffer) is called
Then the function casts the address to uintptr_t
And detects that the address lies outside [base, base + total_size)
And immediately returns PBIO_ERROR_INVALID_ARG without undefined behavior.
```

### Scenario 3: Misaligned Address Rejection
```gherkin
Given a pointer offset from the pool base by a non-multiple of sizeof(pbio_mdrobotbase_t)
When pbio_mdrobotbase_put_robotbase(misaligned_rb) is called
Then (uintptr_t)addr - (uintptr_t)base % sizeof(pbio_mdrobotbase_t) != 0 is detected
And the function returns PBIO_ERROR_INVALID_ARG without indexing memory.
```

### Scenario 4: Valid Active Slot Reclamation
```gherkin
Given an active slot allocated in mdrobotbases via pbio_mdrobotbase_get_robotbase
When pbio_mdrobotbase_put_robotbase(rb) is called with this pointer
Then the address is verified to match an active slot
And physical motors are stopped with coast mode
And the slot is marked free (in_use = false)
And the function returns PBIO_SUCCESS.
```

---

## 3. Verification Traceability Matrix

| Acceptance Criteria | Verification Method | Pass Threshold |
|---|---|---|
| AC-MDRB-019-1: Null pointer returns `PBIO_ERROR_INVALID_ARG` | Native C TinyTest | Exact enum match |
| AC-MDRB-019-2: Foreign stack pointer returns `PBIO_ERROR_INVALID_ARG` | Native C TinyTest | Zero sanitizer faults |
| AC-MDRB-019-3: Misaligned address returns `PBIO_ERROR_INVALID_ARG` | Native C TinyTest | Exact enum match |
| AC-MDRB-019-4: Valid slot release succeeds | Native C TinyTest | `PBIO_SUCCESS`, slot free |
| AC-MDRB-019-5: Zero relational pointer comparison warnings | Compiler AST inspection | Zero warnings |
