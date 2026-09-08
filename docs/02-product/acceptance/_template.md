# G-xxx — Acceptance contract

> Copy to `G-xxx.md` when goal is `ready`. Agent must verify every scenario before `review`.

## Goal reference

- **Goal:** G-xxx — {title}
- **Status:** ready

---

## Scenario 1: {happy path name}

**Expected behavior:** {what the user/system should experience}

| Field | Value |
|-------|-------|
| **Input** | {request, UI action, or trigger} |
| **Output** | {response, UI state, side effect} |
| **Preconditions** | {auth, data setup} |

### Edge cases

| Case | Input | Expected |
|------|-------|----------|
| {edge 1} | {…} | {…} |

### Failure cases

| Case | Input | Expected |
|------|-------|----------|
| {invalid input} | {…} | {4xx / validation message / no side effect} |

---

## Scenario 2: {optional}

{Repeat structure}

---

## Verification

- [ ] Automated: {test file or command}
- [ ] Manual: {steps if needed}

## Sign-off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Human reviewer | | | approve / changes |
