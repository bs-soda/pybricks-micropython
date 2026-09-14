---
name: soda-motion-microinteractions
version: "1.0.0"
description: >-
  Motion design, physics-based springs, interactive micro-animations, gesture choreography,
  skeleton shimmer sweeps, page transitions, and native mobile haptics (iOS Taptic,
  Android Haptics, Huawei Vibration). Use on goals that implement or refine UI animation,
  feedback, or transitions. Triggers: motion, animation, micro-interaction, haptics,
  spring physics, skeleton shimmer, transition. Collaboration phases PLAN → EXECUTE → REVIEW.
  Motion specs are human-approved before implementation.
---

# Motion design & interactive micro-interactions

**Model:** Interaction Trigger → **Physics Spring Curve → Choreographed Stagger → Visual Micro-Animation → Mobile Haptic Feedback → Accessibility Fallback**

This skill engineers **alive, responsive, and delightful user interfaces** through fluid motion physics, dynamic micro-interactions, and multi-sensory feedback across Web and Mobile.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-design](../soda-design/SKILL.md) and [soda-testing](../soda-testing/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Physics over linear** | Real physical motion has inertia, mass, and tension. Never use raw linear transitions (`transition: all 0.3s linear`). |
| **Perceived performance** | Micro-animations and skeleton sweeps mask latency during async fetches, creating the perception of instantaneous response. |
| **Multi-sensory coherence** | Visual animation and mobile haptic feedback fire synchronously to ground user interaction in physical reality. |
| **Accessibility by default** | Respect `@media (prefers-reduced-motion: reduce)` and Flutter `disableAnimations` unconditionally. Motion is an enhancement, never a blocker. |
| **Human approves motion specs** | Spring curves and transition choreography are documented and approved in the UI spec before build. |

## Where motion artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Motion tokens & curves** | `docs/03-architecture/motion-spec.md` + `code/**/motion.*` | product |
| **Design tokens (canonical)** | `docs/03-architecture/design-tokens.md` | product |
| **Component motion specs** | `docs/02-product/design/G-xxx.md` | product |
| **Haptics configuration** | `code/**/services/haptics.*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal includes animation, transitions, or haptics | **Auto-run this skill during PLAN & EXECUTE.** Specify spring curves, duration tokens, and haptic bindings |
| User says **"motion G-xxx"** / **"animation G-xxx"** | Produce or refine the motion specification for that goal |
| User says **"micro-interactions"** | Stage 2 — design hover, active, focus, and drag feedback |
| User says **"skeleton shimmer"** | Stage 3 — engineer zero-CLS skeleton placeholder animations |
| User says **"haptics"** | Stage 4 — configure iOS Taptic, Android Haptics, and Huawei Vibration mappings |
| User says **"motion review"** / **"reduced-motion check"** | Stage 5 — verify 60fps performance and accessibility fallbacks |

---

## The motion engineering lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Spring physics & motion tokens (PLAN)

Define project motion tokens in `docs/03-architecture/motion-spec.md`:

| Motion token | Duration | Cubic Bezier / Spring parameters | Primary usage |
| :--- | :--- | :--- | :--- |
| `--motion-instant` | 100ms | `cubic-bezier(0.2, 0, 0, 1)` | Checkbox toggle, tab switch, hover color |
| `--motion-fast` | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Dropdown open, tooltip fade, card press |
| `--motion-normal` | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Modal dialog entrance, drawer slide, layout reflow |
| `--motion-slow` | 500ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Page route transition, skeleton sweep loop |

**Deliverable:** Motion token table mapped to CSS vars / Flutter `AnimationController` constants.  
**Gate:** No arbitrary hardcoded millisecond durations allowed in components.

### Stage 2 — Interactive micro-interactions & gestures (PLAN → EXECUTE)

Implement interactive feedback loops:
1. **Button press:** Scale down to `0.98` with fast spring recovery on release.
2. **Magnetic hover:** Subtle cursor pull ($4-8$ px translation towards pointer).
3. **Interactive number counters:** Rolling odometer animation for live telemetry (Tokens, Revenue, Latency).
4. **Staggered lists:** Children items stagger entry by $30\text{ms}$ interval up to max $300\text{ms}$.

**Deliverable:** Component stories / widgets implementing micro-interactions.  
**Gate:** Animations execute cleanly without layout thrashing or dropped frames.

### Stage 3 — Zero-CLS skeleton shimmer sweeps (EXECUTE)

1. Match skeleton geometry identically to loaded content to eliminate Cumulative Layout Shift (CLS).
2. Gradient sweep angle: $135^\circ$ moving from left to right at $1.5\text{s}$ infinite cycle.

**Deliverable:** Skeleton component variants in Storybook / Widgetbook.  
**Gate:** CLS score remains $< 0.05$ during async transitions.

### Stage 4 — Multi-platform mobile haptics integration (EXECUTE)

Bind visual state triggers to native tactile hardware:
- **Selection / Tab:** `HapticFeedback.selectionClick()` / `UISelectionFeedbackGenerator`.
- **Medium Impact:** Button confirmations, card drag snaps (`HapticFeedback.mediumImpact()`).
- **Success Notification:** Stage-Gate approval, goal completion (`UINotificationFeedbackGenerator.success`).
- **Error Buzz:** Form validation error, network timeout (`UINotificationFeedbackGenerator.error`).

**Deliverable:** Unified haptic router service handling iOS, Android, and Huawei devices.  
**Gate:** Haptics disabled gracefully on unsupported hardware without throwing errors.

### Stage 5 — Performance & accessibility review (REVIEW)

Review checklist before closing goal:
- [ ] `@media (prefers-reduced-motion: reduce)` disables all non-essential transform/opacity animations.
- [ ] Hardware acceleration enabled (`will-change: transform`, `transform: translateZ(0)`).
- [ ] Verified smooth 60 FPS / 120 FPS refresh rate on target devices.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Define physics-based spring curves and motion tokens | Use linear or jarring un-damped animations |
| Implement haptic feedback across iOS, Android, and Huawei | Trigger continuous heavy haptic loops that drain battery |
| Add micro-animations that clarify state transitions | Introduce animations that block user interaction or add delay |

---

## Related

- [soda-design](../soda-design/SKILL.md) — Component spec & design tokens
- [soda-spatial-canvas-3d](../soda-spatial-canvas-3d/SKILL.md) — 3D & canvas rendering
- [soda-testing](../soda-testing/SKILL.md) — E2E & visual regression tests
