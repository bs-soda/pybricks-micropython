# Epics

> An epic is a **namespace** for goal IDs (`G-PAY-001`). It is not a goal and has no status machine.  
> Contract: [goal-id.md](../06-workflows/goal-id.md)

Register a slug here **before** `soda-os goal next <EPIC>`. Slug = 2–8 letters `A-Z`. Do not use `E-` (Evidence).

## Registered epics

| Epic | Name | Notes |
|------|------|-------|
| CORE | Core / unscoped | Implicit home of legacy `G-001`. New unscoped work: `soda-os goal next CORE` |
| MDRB | [MDRobotBase Kinematics & Motion Engine](epics/MDRB.md) | Hardening instance allocation, state reset, gear ratio odometry, error handling, lifecycle, and test coverage (`G-MDRB-001` through `G-MDRB-009`) |


## Create an epic

Do this on **`main`** so the epic branch never has to patch shared index files.

1. Pick a unique slug (`PAY`, `AUTH`, `ONBOARD`)
2. Add a row to the table above
3. Copy [`queues/_template.md`](queues/_template.md) → `queues/PAY.md`
4. Add one Dashboard link in [`goals.md`](goals.md)
5. Optional: copy [`epics/_template.md`](epics/_template.md) → `epics/PAY.md`
6. Cut branch **`epic/PAY`**. On that branch, **"สร้าง goal"** / `soda-os goal next` allocates PAY automatically. No need to reserve a count first.

## Related

- [goals.md](goals.md) — process + Dashboard links (no per-goal rows)
- [queues/CORE.md](queues/CORE.md) — per-epic queues
- [goal-id-registry.yaml](goal-id-registry.yaml) — sequence reservation
- [goal-id.md](../06-workflows/goal-id.md) — merge protocol
