# Soda Agent OS — Engineering Constitution

> Technology-independent · project-independent · product-independent.  
> Engineering DNA of Sodality — ships with Agent OS; customize per project at bootstrap if needed.

## Purpose

This document defines the engineering philosophy, software architecture principles, and long-term development standards of Sodality.

Every AI agent, developer, architect, and contributor must understand this document before making engineering decisions.

This document is technology-independent, project-independent, and product-independent.

It is the engineering DNA of Soda.

---

## Our mission

We do not simply build software.

We build reusable digital capabilities.

Every engineering decision should increase the long-term value of the company.

Projects generate revenue.

Platforms generate long-term value.

---

## Core engineering principles

### 1. Platform before project

Before implementing any feature, always ask:

**Can this become a reusable capability?**

If the answer is yes, design it as a platform capability first, then extend it for specific projects.

Never optimize only for one customer.

### 2. Business before technology

Business problems define architecture.

Technology implements architecture.

Never start with frameworks.

Never start with databases.

Never start with APIs.

Start by understanding business capabilities.

### 3. Architecture before code

Code is an implementation.

Architecture is the product.

Every implementation should preserve architectural integrity.

Never sacrifice architecture for short-term convenience.

### 4. Domain driven thinking

Think in domains.

Think in capabilities.

Avoid thinking in pages, controllers, or database tables.

Business language should become software language.

### 5. Composable systems

Systems should be composed from reusable modules.

Avoid tightly coupled implementations.

Every module should have a single responsibility.

Modules should evolve independently whenever possible.

### 6. Explicit design

Hidden behavior creates technical debt.

Business rules should be explicit.

Naming should express intent.

Architecture should be understandable without reading implementation details.

### 7. Event-driven mindset

Business activities should be modeled as meaningful domain events.

Avoid tightly coupled workflows whenever possible.

Design systems around business semantics rather than technical implementation.

### 8. AI native engineering

AI is considered a permanent engineering collaborator.

Systems, documentation, architecture, and naming should be understandable by both humans and AI.

Prefer explicit context over implicit assumptions.

### 9. Vendor independence

Business logic must never depend directly on third-party services.

External providers should be abstracted behind stable interfaces.

Changing infrastructure should not require changing business logic.

### 10. Simplicity first

Prefer the simplest architecture that satisfies current business needs.

Avoid unnecessary complexity.

Avoid premature optimization.

Complexity must always be justified by measurable business value.

### 11. Documentation is architecture

Documentation is part of the system.

Architecture decisions must be recorded.

Important assumptions must be documented.

Future contributors should understand why decisions were made.

### 12. Long-term thinking

Every engineering decision should consider:

- Can this design still be maintained in five years?
- Can another team understand it?
- Can AI reason about it?
- Can another project reuse it?

If the answer is no, reconsider the design.

---

## Engineering mindset

When receiving any task, do not immediately ask *"What code should I write?"*

Instead ask:

- What problem are we solving?
- What capability are we building?
- Can this become reusable?
- Does this align with the platform vision?
- Does this increase long-term engineering value?

---

## Decision order

Every engineering decision should follow this order:

```text
Business
    ↓
Domain
    ↓
Architecture
    ↓
Modules
    ↓
Interfaces
    ↓
Implementation
    ↓
Infrastructure
```

Never reverse this order.

---

## Design values

Always prefer:

- Clarity over cleverness
- Simplicity over complexity
- Composition over duplication
- Explicitness over magic
- Reusability over shortcuts
- Maintainability over speed
- Business semantics over technical convenience

---

## AI collaboration

AI should not simply generate code.

AI should first understand the business, the architecture, the domain, and the engineering principles.

Implementation is the final step, not the first.

---

## Constitution rule

Whenever this document conflicts with project-level implementation, this document takes precedence unless an Architecture Decision Record (ADR) explicitly states otherwise.

Record exceptions in [docs/05-decisions/](../05-decisions/).

---

## Final principle

Soda does not measure engineering success by the amount of code written.

Engineering success is measured by how much reusable value is created for the future.
