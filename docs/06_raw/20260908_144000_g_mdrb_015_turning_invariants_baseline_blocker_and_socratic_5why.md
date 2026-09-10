# Socratic 5-Why Dialectic & Baseline Blocker Report: G-MDRB-015

**Timestamp:** `2026-09-08T14:40:00+07:00`
**Goal:** `G-MDRB-015` (Angle Normalization, Pivot-Turn Invariants, and Distance Conservation)
**Epic:** `MDRB`
**Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Invariant:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Baseline Blocker Identification & Reproduction

### The Blocker
While `pbio_mdrobotbase_update_state` contains branches for `PBIO_MDROBOTBASE_MOTION_TURN` and `PBIO_MDROBOTBASE_MOTION_PIVOT`, the codebase currently lacks:
1. **Missing Canonical Shared Angle Wrapping Helper:** `pbio_mdrobotbase_wrap_degrees` is not exposed in `lib/pbio/include/pbio/mdrobotbase.h` or `lib/pbio/src/mdrobotbase.c`. Angle wrapping logic is duplicated inline in `pb_type_mdrobotbase.c:mdrobotbase_wrap_degrees` and `mdrobotbase.c:388,419`.
2. **Missing Automated Spin Turn & Pivot Invariant Tests:** There are no native C unit tests asserting that $\sqrt{\Delta x^2 + \Delta y^2} \le 0.05\text{ mm}$ for pure spin turns ($s_L = -s_R$) or that $s_{\text{free}} = W \cdot |\Delta \theta| \pm 0.1\text{ mm}$ for single-wheel pivot turns.
3. **Missing Backlash Oscillation Conservation Test:** There is no automated test verifying that 100 cycles of sub-threshold motor oscillation produce zero net drift on pose registers $(x, y, \theta)$.

### Empirical Reproduction
1. Examine `lib/pbio/include/pbio/mdrobotbase.h`: `pbio_mdrobotbase_wrap_degrees` is missing.
2. Examine `lib/pbio/test/src/test_mdrobotbase.c`: `test_mdrobotbase_spin_and_pivot_invariants` and `test_mdrobotbase_backlash_distance_conservation` are missing from `pbio_mdrobotbase_tests[]`.
3. Run test runner: turning odometry and backlash deadbands lack automated numerical conservation proofs.

---

## 2. 5-Why Recursive Dialectic Analysis (5 Branches x Level 5 Depth)

### Branch 1: Pure Spin Turn Center Conservation Invariant
- **Why 1:** Why must pure spin turns preserve the robot's center position?
  Because when both wheels rotate with equal speed in opposite directions ($s_L = -s_R$), the robot rotates around its geometric center without translating.
- **Why 2:** Why does `pbio_mdrobotbase_update_state` set $d_{\text{center}} = 0$ when `motion_type == PBIO_MDROBOTBASE_MOTION_TURN`?
  Because slight sensor quantization or microsecond timing jitter between encoder reads would otherwise introduce spurious linear drift during pure rotation.
- **Why 3:** Why is the center drift tolerance bounded by $\le 0.05\text{ mm}$?
  Because floating-point calculations for $d_{\text{center}} = 0$ must guarantee near-zero position deviation over multiple complete revolutions.
- **Why 4:** Why must the heading change equal $(s_R - s_L) / W$?
  Because by differential kinematics, the rotational rate is $\omega = (v_R - v_L) / W$, which integrates over time to $(s_R - s_L) / W$.
- **Why 5:** Why does center position conservation certify rotational odometry correctness?
  Because it mathematically proves that in-place orientation changes do not corrupt the robot's $(x, y)$ field coordinates.

### Branch 2: Single-Wheel Left and Right Pivot Arc Conservation
- **Why 1:** Why must pivot turns conserve the stationary contact point of the locked wheel?
  Because during a pivot turn, one wheel is braked/held stationary while the opposite wheel drives, forming a circular arc centered on the locked wheel contact patch.
- **Why 2:** Why is the free wheel arc distance $s_{\text{free}} = W \cdot |\Delta \theta_{\text{rad}}|$?
  Because the radius of the circular path traced by the free wheel equals the axle track $W$. By arc geometry, arc length equals radius times angular subtension.
- **Why 3:** Why does `pbio_mdrobotbase_update_state` calculate rigid-body arc offset $r_{\text{offset}} = \pm W / 2$?
  Because the robotbase pose $(x, y)$ is defined at the axle midpoint. Pivoting around a wheel at distance $W/2$ rotates the midpoint along a circle of radius $W/2$.
- **Why 4:** Why does the unit test assert arc distance matching within $\pm 0.1\text{ mm}$?
  Because discrete numerical integration steps across small time slices accumulate minor chordal truncation error bounded by $0.1\text{ mm}$.
- **Why 5:** Why does pivot arc conservation prevent coordinate distortion during cornering?
  Because it guarantees that single-wheel cornering maneuvers maintain exact physical tracking on the competition field.

### Branch 3: Continuous Angle Wrapping in $[-180.0^\circ, +180.0^\circ]$
- **Why 1:** Why must robot heading be strictly normalized to $[-180.0^\circ, +180.0^\circ]$?
  Because unbounded heading accumulation causes trigonometric precision loss and complicates shortest-path turning controllers.
- **Why 2:** Why must both positive and negative multiples of $360^\circ$ wrap cleanly?
  Because robots frequently spin multiple continuous revolutions during search routines or compound turns.
- **Why 3:** Why should `pbio_mdrobotbase_wrap_degrees` be a canonical shared helper?
  Because having duplicate, slightly different wrapping implementations in driver and MicroPython layers risks inconsistent boundary behavior.
- **Why 4:** Why does wrapping at boundary $\pm 180.0^\circ$ require symmetric treatment?
  Because $+180.0^\circ$ and $-180.0^\circ$ represent the exact same heading (facing directly backwards); inconsistent handling causes 1-frame orientation jitter.
- **Why 5:** Why does deterministic angle wrapping prevent heading divergence?
  Because it guarantees that error calculations $(e_\theta = \theta_{\text{target}} - \theta_{\text{current}})$ always take the shortest angular path.

### Branch 4: Backlash Filtering Distance Conservation under Oscillation
- **Why 1:** Why must backlash filtering act as a pure deadband without adding artificial cumulative bias?
  Because gear backlash creates physical deadband slack: small motor movements oscillate within gear tooth clearances without moving the chassis.
- **Why 2:** Why does the backlash accumulator clamp to $[-\text{limit}, +\text{limit}]$?
  Because once the gear teeth engage on either side, motion transfers directly to the wheel, and the deadband is fully traversed.
- **Why 3:** Why must sub-threshold vibration produce zero position change?
  Because motor dithering or tremor within the gear lash must not be interpreted as vehicle translation.
- **Why 4:** Why does the test verify 100 cycles of sub-threshold oscillation?
  Because repeating the oscillation 100 times proves there is no ratchet effect, asymmetric accumulation, or numerical leakage.
- **Why 5:** Why does backlash conservation protect odometry integrity on vibrating surfaces?
  Because stationary robots subject to mechanical vibration or PID tremor remain completely stationary in odometry space.

### Branch 5: Zero-Mock Native C Testing & Release Certification
- **Why 1:** Why must the unit test be implemented in native C without mocks?
  Because Article I of the Global Engineering Constitution strictly prohibits test doubles, requiring direct execution against real PBIO structures.
- **Why 2:** Why must the tests be registered in `pbio_mdrobotbase_tests[]`?
  Because the native C runner `test-pbio` must execute the tests in CI and local verification passes.
- **Why 3:** Why must the tests verify multi-revolution spin and 100-cycle backlash loops?
  Because long-duration iteration proves mathematical stability and absence of cumulative drift.
- **Why 4:** Why must `test-pbio` pass with 0 skipped tests?
  Because zero skipped tests guarantees that every assertion is actively validated on target architecture.
- **Why 5:** Why does complete dialectic proof certify readiness for release?
  Because all turning, pivot, angle wrapping, and backlash invariants are validated against concrete mathematical ground truth.
