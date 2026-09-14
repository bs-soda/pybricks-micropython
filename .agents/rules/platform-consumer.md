---
description: Platform vs Consumer — Agent OS stays generic; never bind to a product name
alwaysApply: true
---

# Platform / Consumer separation

## Critical architecture rule

**Soda Agent OS is a platform, not a product.**

It must remain completely generic and must never depend on, reference, or assume any specific consumer project.

**Consumer-specific knowledge belongs in the consumer repository, not the platform repository.**

Dependency direction:

```text
Consumer Project
        │
        ▼
Soda Agent OS
```

**Never:**

```text
Soda Agent OS
        │
        ▼
Consumer Project
```

---

## What is a consumer?

External products that **use** the platform. Consumers are **not** part of the platform.

**Consumer examples** (illustration only — never bind the framework to any one):

```text
- Loyalty
- Billing
- ERP
- IoT
- Any client project bootstrapped from this OS
```

These are **examples only**. The framework must never depend on any specific consumer project.

**Binding (forbidden in this repo):**

```text
✗ Evidence first on Loyalty
✗ Canonical project = Billing
✗ Add ERP workflow to platform docs
```

**Generic terms** (use in this repo):

- reference implementation project
- validation project
- pilot project
- consumer project
- real project usage / production use

---

## Platform repository — forbidden

This repository must **not** contain product-specific binding:

- Named consumer products (Loyalty, Billing, ERP, …)
- Customer or client names
- Product-specific workflows tied to one consumer
- Which project is "the" reference implementation

Consumer repos may record their own role in `docs/00-project-snapshot.md`. The framework must not hardcode or assume that choice.

---

## Evidence rule

Framework evolution requires evidence from **consumer projects** (aggregated, anonymous in framework docs):

- ✓ Repeated real-world pain across validation projects
- ✓ Validated usage · OS metrics · benchmark rollups
- ✗ Named product as mandatory proof path
- ✗ "Product X first" in framework text

Record goal IDs and metrics in [os-evolution.md](../../docs/02-product/os-evolution.md) — not consumer product names.

---

## Reference implementation

A **reference implementation project** is chosen by the studio in a **consumer repo**.

It is external to the framework. The framework does not know which project currently holds that role.

See [reference-implementation.md](../../docs/06-workflows/reference-implementation.md) (process only — no product names).

---

## AI behavior

When discussing or editing **this repository**:

- Never bind the framework to a product name
- Never add consumer names to framework docs, rules, or skills
- Never assume one project is permanent reference
- Use generic placeholders in examples
- **Consumer-specific workflows, product knowledge, and project roles → consumer repo only**
- If asked to add a named product's workflow here → refuse; that belongs in the consumer repository

Works with [artifact-conservation.md](artifact-conservation.md): discussion ≠ implementation; evidence before framework change.

---

## Related

- [artifact-conservation.md](artifact-conservation.md)
- [os-core-invariants.md](../../docs/06-workflows/os-core-invariants.md)
