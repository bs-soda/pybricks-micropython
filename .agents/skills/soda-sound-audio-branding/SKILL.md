---
name: soda-sound-audio-branding
version: "1.0.0"
description: >-
  Sound design, audio branding, UI earcons, and real-time interaction sonification.
  Craft audio identity bibles, Web Audio API synthesis, haptic-audio sync, sound effects
  for button clicks, stage-gate chimes, error cues, and mute accessibility controls.
  Use on goals adding sound effects, audio branding, or sensory feedback. Triggers:
  sound design, audio branding, earcon, sound effects, sonification, audio chime, web audio.
  Collaboration phases PLAN → EXECUTE → REVIEW. Audio specs are human-approved before implementation.
---

# Sound design & audio branding

**Model:** Audio Identity Discovery → **Sonic Metaphors → Earcon Synthesis & Assets → Web Audio / Native Engine → Volume & Accessibility Gating**

This skill gives a Soda OS application a **distinct acoustic identity and sensory depth** through harmonic earcons, state sonification, and spatial audio feedback across Web and Mobile.

Post-ship evolution: [soda-learning-loop](../soda-learning-loop/SKILL.md). Pairs with [soda-motion-microinteractions](../soda-motion-microinteractions/SKILL.md) and [soda-creative-direction](../soda-creative-direction/SKILL.md).

## First principles (do not skip)

| Principle | Meaning |
|-----------|---------|
| **Subtle & non-fatiguing** | UI sounds must be brief ($50-250\text{ms}$), harmonious, and pleasant even when triggered hundreds of times per day. |
| **Acoustic feedback parity** | Sound confirms state transitions (approval chime, deletion thud) without requiring the user to look at the screen. |
| **Mute & accessibility first** | All audio MUST default to respecting system mute, user sound toggles, and screen reader announcements. Sound is an enhancement, never an exclusive affordance. |
| **Low-latency synthesis** | Web Audio API / Native Audio Buffers must trigger with $< 15\text{ms}$ latency to maintain synchronization with visual micro-animations. |
| **Human approves audio palette** | All sound frequencies, timbre choices, and audio clips must be approved in the sound design guide. |

## Where sound artifacts live

| Artifact | Path | Owner |
|----------|------|-------|
| **Audio branding guide** | `docs/03-architecture/audio-branding.md` | product |
| **Sound assets & earcons** | `code/**/assets/audio/*` | product |
| **Web Audio / Native sound player** | `code/**/services/audio-engine.*` | product |

These are **product-owned** — `soda-os upgrade` never overwrites them.

## When this skill runs

| Rule | Agent must |
|------|-----------|
| Goal introduces sound effects, earcons, or audio sonification | **Auto-run this skill during PLAN & EXECUTE.** Define frequency ranges, earcon audio specs, and player engines |
| User says **"sound design G-xxx"** / **"audio G-xxx"** | Produce or refine the audio branding specification for that goal |
| User says **"earcon"** / **"chime"** | Stage 2 & 3 — design interaction earcons and synthesize audio waveforms |
| User says **"web audio"** / **"sound engine"** | Stage 4 — implement lightweight, zero-latency Web Audio API or Flutter audio player |
| User says **"audio review"** / **"sound check"** | Stage 5 — verify frequency masking, volume normalization, and mute controls |

---

## The sound engineering lifecycle (5 stages)

Run in order. Each stage has an **input**, a **deliverable**, and a **gate** before the next stage.

### Stage 1 — Audio brand personality & frequency palette (PLAN)

Define the acoustic profile in `docs/03-architecture/audio-branding.md`:
- **Acoustic Archetype:** *Organic Warm* (Marimba, soft clicks, Rhodes chords) vs *Technical Cyber* (Pure sine blips, laser chirps, low-frequency hums).
- **Fundamental Key / Root Note:** e.g., Key of F# Major (Warm, modern) or C Major (Clear, authoritative).
- **Frequency Capping:** Low pass filter at $8\text{kHz}$ to avoid harsh high-frequency ear fatigue.

**Deliverable:** Audio identity matrix in `docs/03-architecture/audio-branding.md`.  
**Gate:** Frequency spectrum and acoustic archetype agreed.

### Stage 2 — Interaction earcon catalog & sonic metaphors (PLAN → EXECUTE)

Define standard earcons:

| Earcon | Trigger | Pitch / Waveform | Duration |
| :--- | :--- | :--- | :--- |
| `click_soft` | Primary button hover/press | 800Hz Sine blip, fast decay | 40ms |
| `approval_chime` | Stage-gate review approve | Major triad chord (F# - A# - C#) | 220ms |
| `warning_thud` | Validation error / rejected gate | 140Hz Triangle tone with low damping | 120ms |
| `telemetry_tick` | Live streaming token pulse | 1.2kHz Soft transient, low volume (-18dB) | 20ms |
| `ship_fanfare` | Goal shipped & released | Ascending harmonic arpeggio | 400ms |

**Deliverable:** Earcon specification table and synthesized `.mp3` / `.wav` / Web Audio buffer specs.  
**Gate:** Durations strictly bounded $\le 400\text{ms}$.

### Stage 3 — Zero-latency audio synthesis & asset bundling (EXECUTE)

1. Use Web Audio API `AudioContext` with pre-loaded `AudioBuffer` pools for zero network lag.
2. Lightweight audio sprites or procedural oscillator synthesis (zero external asset payload).

**Deliverable:** `audio-engine` utility service.  
**Gate:** Playback latency measured $\le 15\text{ms}$ on button click.

### Stage 4 — Multi-sensory sync & volume normalization (EXECUTE)

1. Synchronize audio chimes with native mobile haptics (`HapticFeedback`) and visual confetti animations.
2. Standardize peak volume normalization at $-12\text{dBFS}$ to prevent jarring loudness.

**Deliverable:** Integrated audio-haptic trigger bindings.  
**Gate:** Audio triggers perfectly in sync with visual frame ($< 1$ frame delta).

### Stage 5 — Audio accessibility & mute governance (REVIEW)

- [ ] Global sound toggle persists in local storage / user profile (`sound_enabled: false` option).
- [ ] Automatically mute if user device is in silent/vibrate mode.
- [ ] Screen readers (NVDA, VoiceOver) not masked or interrupted by UI sound playback.

---

## Governance (mandatory)

| Agent may | Agent must not |
|-----------|----------------|
| Synthesize subtle, harmonious earcons for state transitions | Play looping background music or un-muted auto-play audio |
| Provide global and granular sound mute controls | Output harsh high-frequency square waves ($> 4\text{kHz}$) |
| Sync sound chimes with visual and haptic feedback | Make audio mandatory for understanding any system state |

---

## Related

- [soda-motion-microinteractions](../soda-motion-microinteractions/SKILL.md) — Motion & haptics
- [soda-creative-direction](../soda-creative-direction/SKILL.md) — Brand visual identity
- [soda-design](../soda-design/SKILL.md) — UI/UX specification
