---
name: soda-gamification-retention
version: "1.0.0"
description: >-
  Behavioral UX, Hooked model habit loops, streaks, milestone badges, progression bars,
  celebratory micro-rewards, and engagement economics. Use on goals designing onboarding,
  daily engagement mechanisms, goal completion celebration, and retention loops.
  Triggers: gamification, retention, streak, badge, achievement, progress bar,
  hooked model, reward. Collaboration phases PLAN → EXECUTE → REVIEW. Gamification
  specs are human-approved before implementation.
---

# Behavioral UX & gamification retention

**Model:** Trigger → **Low-Friction Action → Variable Reward → Value Investment** ➔ Re-engagement Loop

This skill implements **ethical, high-engagement behavioral psychology** to motivate operators, developers, and users to consistently complete goals, maintain workflows, and experience continuous progress.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-design](../soda-design/SKILL.md) and [soda-motion-microinteractions](../soda-motion-microinteractions/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Intrinsic over superficial** | Rewards must celebrate genuine engineering achievements (zero stubs, 100% tests passing, clean reviews), not superficial clicking. |
| **Frictionless actions** | The action step in the habit loop must take $< 3$ seconds (e.g., 1-click stage-gate review approval). |
| **Anti-dark pattern invariant** | Never employ manipulative FOMO countdown timers, artificial scarcity, or predatory loss-aversion messaging. |
| **Compound investment** | User investment (e.g. adding knowledge docs, test scenarios) directly enriches the system for subsequent cycles. |
| **Human approves gamification mechanics** | Point economies and achievement definitions must be approved by the product owner. |

## Where gamification artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Retention & gamification spec** | `docs/02-product/gamification.md` | product |
| **Achievement registry** | `docs/03-architecture/achievements.json` + `code/**/gamification/*` | product |
| **Badge assets & tokens** | `docs/03-architecture/design-tokens.md` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal introduces badges, streaks, progression, or celebration | **Auto-run this skill during PLAN & EXECUTE.** Define reward loops, state triggers, and achievement schemas |
| User says **"gamification G-xxx"** / **"retention G-xxx"** | Produce or refine the behavioral retention specification for that goal |
| User says **"progress bar"** / **"velocity meter"** | Stage 2 — design multi-segment progression indicators |
| User says **"streak"** / **"daily cadence"** | Stage 3 — configure streak tracking and grace period recovery |
| User says **"badges"** / **"achievements"** | Stage 4 — formulate achievement trigger conditions and badge visual tokens |
| User says **"celebration"** / **"reward loop"** | Stage 5 — implement celebratory micro-confetti and milestone modals |

---

## The gamification engineering lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Hooked loop mapping (PLAN)

Map the 4 components of the user journey:
1. **Trigger:** External notification or internal desire to govern goals.
2. **Action:** Lowest-friction interaction (1-click approval button).
3. **Variable reward:** Dynamic metric increment, milestone badge unlock, velocity score boost.
4. **Investment:** Codebase health improved, LLM wiki updated, tests added.

**Deliverable:** Hooked cycle diagram in `docs/02-product/gamification.md`.  
**Gate:** Action step requires $\le 2$ clicks and zero unnecessary form fields.

### Stage 2 — Progression indicators & velocity meters (PLAN → EXECUTE)

1. Segmented progress bars with glowing active segments (`DEFINE 20% → SHIP 100%`).
2. Real-time velocity score based on review turnaround time and automated test pass rate.

**Deliverable:** Progression bar components in Storybook / Widgetbook.  
**Gate:** Progress status reflects verified goal states without optimistic false completions.

### Stage 3 — Streak tracking & daily cadence (EXECUTE)

1. Track consecutive days of active goal progression.
2. Implement weekend/holiday streak protection so users are not demotivated by scheduled time off.

**Deliverable:** Streak counter badge with status tooltip.  
**Gate:** Streak calculations deterministic with timezone awareness.

### Stage 4 — Achievement registry & milestone badges (EXECUTE)

Define structured badges in `docs/03-architecture/achievements.json`:

```json
{
  "achievements": [
    {
      "id": "zero_stub_champion",
      "name": "Zero-Stub Champion",
      "description": "Shipped 10 consecutive goals with 100% operational logic and zero mocks.",
      "tier": "gold",
      "icon": "shield-check"
    },
    {
      "id": "lightning_reviewer",
      "name": "Lightning Reviewer",
      "description": "Reviewed and approved stage-gates in under 5 minutes.",
      "tier": "silver",
      "icon": "zap"
    }
  ]
}
```

**Deliverable:** Achievement verification logic and metallic gradient badge UI.  
**Gate:** Unlocks triggered exclusively by real verified operational events.

### Stage 5 — Celebratory moments of delight (EXECUTE → REVIEW)

1. Canvas particle micro-confetti burst on stage-gate approvals.
2. Harmonic audio chime / native haptic pulse.
3. Level-up summary modal showing cumulative engineering time saved.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Design rewarding feedback for genuine engineering achievements | Add deceptive dark patterns, fake notifications, or forced FOMO |
| Implement streak tracking with holiday/weekend grace protection | Reset user progress arbitrarily without clear transparent rules |
| Add celebratory visual polish to high-value milestones | Overwhelm the interface with intrusive full-screen blocking modals |

---

## Related

- [soda-design](../soda-design/SKILL.md) — UI/UX specification & component build
- [soda-motion-microinteractions](../soda-motion-microinteractions/SKILL.md) — Micro-animations & haptics
- [soda-code-review](../soda-code-review/SKILL.md)
