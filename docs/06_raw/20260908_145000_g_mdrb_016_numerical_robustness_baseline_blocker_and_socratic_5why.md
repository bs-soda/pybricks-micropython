# Socratic Agentic 5-Why Recursive Dialectic & Baseline Blocker Report: G-MDRB-016

**Timestamp:** `2026-09-08T14:50:00+07:00`
**Goal:** `G-MDRB-016` (Numerical Robustness, Geometry Bounds, and Quantization Hardening)
**Epic:** `MDRB`
**Branch:** `feature/mdrobotbase-enhancement` -> `epic/MDRB`
**Phase:** `EXECUTE` (Dialectic Investigation & Baseline Blocker Attestation)
**Invariants:** Article I (Zero Mocks, Zero Stubs, Zero Fallbacks), Article II (Mandatory Verification Pass)

---

## 1. Baseline Blocker Identification

Before implementing `G-MDRB-016`, the current implementation in `lib/pbio/src/mdrobotbase.c` exhibits several critical numerical vulnerabilities:
1. **Unchecked Non-Finite Floats:** Float setters (`pbio_mdrobotbase_reset_state`, `pbio_mdrobotbase_set_fusion_alpha`, `pbio_mdrobotbase_set_pid_gains`, `pbio_mdrobotbase_set_lqr_gains`, `pbio_mdrobotbase_set_backlash_limits`) do not check `!isfinite()`. Passing `NaN` or `+/-Infinity` silently contaminates robot coordinates and gains, causing all downstream trigonometric odometry calculations to evaluate to `NaN`.
2. **Missing Lower and Upper Physical Gear Ratio Bounds:** `pbio_mdrobotbase_set_gear_ratio` only checks `ratio <= 0.0f`. It accepts near-zero ratios (e.g. $10^{-12}$), causing division by near-zero resulting in floating-point infinity, and accepts arbitrarily huge ratios (e.g. $10^{15}$) causing immediate integer overflow.
3. **Speed Quantization Overflow:** `pbio_mdrobotbase_wheel_to_motor_dps` executes `(int32_t)lroundf(wheel_dps * rb->gear_ratio)` without checking saturation. When `wheel_dps * rb->gear_ratio > INT32_MAX`, undefined behavior / two's complement integer overflow occurs, wrapping large positive speeds into negative speeds.
4. **Missing Dedicated Native C Test:** `lib/pbio/test/src/test_mdrobotbase.c` does not contain `test_mdrobotbase_numerical_robustness` to verify edge boundaries, NaN rejection, speed saturation, and timer wraparounds.

---

## 2. Socratic 5-Why Recursive Dialectic Analysis

### Branch 1: Non-Finite Floating-Point Rejection Invariant (`NaN`, `+inf`, `-inf`)
- **Level 1:** Why must floating-point setter and state-reset methods reject non-finite inputs?
  - *Because non-finite values (`NaN`, `+Infinity`, `-Infinity`) corrupt state variables and propagate uncontrollably through downstream mathematical calculations.*
- **Level 2:** Why does standard comparison `<` or `>` fail to catch `NaN` values?
  - *Because by IEEE 754 floating-point specification, all relational comparisons against `NaN` (such as `x < min` or `x > max`) evaluate to false, allowing `NaN` to bypass standard range checks.*
- **Level 3:** Why must `isfinite()` from `<math.h>` be explicitly evaluated on all coordinates, angles, and gains?
  - *Because `isfinite()` directly inspects the exponent and mantissa bit patterns, returning false for both NaN and infinite representations.*
- **Level 4:** Why does the unit test verify that passing `NAN`, `INFINITY`, and `-INFINITY` returns `PBIO_ERROR_INVALID_ARG`?
  - *Because unit tests must prove fail-closed rejection at the public C boundary before state modification occurs.*
- **Level 5:** Why does preventing `NaN` ingestion preserve odometry integrity and prevent system lockups?
  - *Because keeping robot state strictly within finite real numbers guarantees that trigonometric integrals ($x += d \cos\theta, y += d \sin\theta$) remain bounded, deterministic, and physically realizable.*

### Branch 2: Physical Gear Ratio Bounded Domain Invariant ($R \in [0.001, 1000.0]$)
- **Level 1:** Why must gear ratio inputs be strictly bounded within $[0.001, 1000.0]$?
  - *Because real mechanical drivetrains operate within finite mechanical reduction/overdrive limits, and unbounded ratios cause mathematical singularities.*
- **Level 2:** Why do negative or near-zero gear ratios ($R \le 0.0$ or $R < 0.001$) cause catastrophic math failures?
  - *Because kinematic motor-to-wheel transformations divide by $R$; dividing by numbers close to zero produces extreme floating-point magnitudes that overflow 32-bit integers during motor commands.*
- **Level 3:** Why does `pbio_mdrobotbase_set_gear_ratio` reject $R < 0.001$ and $R > 1000.0$ with `PBIO_ERROR_INVALID_ARG`?
  - *Because enforcing a strict physical domain $[0.001, 1000.0]$ guarantees well-conditioned numerical properties for both forward and inverse kinematics.*
- **Level 4:** Why does the unit test verify rejection of boundary values ($0.0, -1.0, 0.0009, 1000.1$)?
  - *Because testing values immediately outside the allowable boundary certifies that the guard conditions are closed and tight.*
- **Level 5:** Why does physical gear ratio bounding protect both forward and inverse kinematic transformations?
  - *Because bounding $R$ preserves condition numbers, ensuring that round-trip algebraic invertibility errors remain strictly below $10^{-4}$.*

### Branch 3: Integer Speed Quantization & Overflow Saturation Protection
- **Level 1:** Why must angular wheel velocity conversion to motor dps protect against 32-bit integer overflow?
  - *Because low-level motor drivers accept signed 32-bit integer targets (`int32_t`), and exceeding integer bounds causes undefined behavior and bit wraparound.*
- **Level 2:** Why does multiplying large wheel velocities by high gear ratios risk two's complement integer wraparound?
  - *Because $\omega_{\text{motor}} = \omega_{\text{wheel}} \cdot R$; if $\omega_{\text{wheel}} = 100000$ and $R = 100$, the product $10^7$ or higher can exceed `INT32_MAX` ($2147483647$), flipping the sign bit and driving the motor in reverse.*
- **Level 3:** Why does `pbio_mdrobotbase_wheel_to_motor_dps` clamp products exceeding `INT32_MAX` to `INT32_MAX` and `< INT32_MIN` to `INT32_MIN`?
  - *Because saturating arithmetic prevents catastrophic sign reversals, commanding the maximum achievable actuator effort instead of uncontrolled reversals.*
- **Level 4:** Why does the unit test verify that extreme velocity conversions saturate cleanly without sign inversion?
  - *Because verifying saturation under extreme velocity inputs proves that the conversion helper never overflows.*
- **Level 5:** Why does speed saturation guarantee motor command safety under extreme commanded trajectories?
  - *Because actuators maintain monotonic directional response even when user programs request speeds beyond hardware capability.*

### Branch 4: Millisecond Clock Timer Wraparound Safety
- **Level 1:** Why must motion timeout evaluation handle unsigned 32-bit clock wraparound?
  - *Because the embedded millisecond timer runs continuously and wraps around to 0 every $\approx 49.7$ days ($2^{32}-1 \text{ ms}$).*
- **Level 2:** Why does naive unsigned comparison `now >= start + timeout` fail when timer wraps around $2^{32}-1 \to 0$?
  - *Because if `start + timeout` overflows past $2^{32}$, an unsigned comparison triggers prematurely or locks permanently.*
- **Level 3:** Why does circular arithmetic `(uint32_t)(now - start) >= timeout_ms` remain invariant across wraparound?
  - *Because by modular arithmetic properties of unsigned integers in C, `(uint32_t)(now - start)` evaluates to the exact elapsed duration even when `now < start` across the wraparound point (for durations $< 2^{31}$ ms).*
- **Level 4:** Why does the unit test simulate time traversal across the 32-bit integer boundary ($0xFFFFFFF0 \to 0x00000010$)?
  - *Because testing the simulated clock rollover validates that elapsed duration calculations evaluate to the true positive difference.*
- **Level 5:** Why does timer wraparound protection prevent indefinite motor motion lockups on long-running systems?
  - *Because robotic systems operating in continuous automated production or long competitions will never experience frozen motion timeouts.*

### Branch 5: Zero-Mock Native C Testing & Release Certification
- **Level 1:** Why must numerical robustness be tested using concrete native C structures without mocks?
  - *Because Article I strictly mandates zero mocks, zero stubs, and 100% concrete compilable implementations running on native test binaries.*
- **Level 2:** Why must `test_mdrobotbase_numerical_robustness` be registered in `pbio_mdrobotbase_tests[]`?
  - *Because tests must be executed by the official PBIO test runner (`test-pbio`) as part of the unified test suite.*
- **Level 3:** Why must native PBIO tests pass with 0 skips and 0 failures?
  - *Because 0 skips and 0 failures certify that no test was bypassed or conditionally disabled.*
- **Level 4:** Why must measured kernel episode latency satisfy $< 10.0$s SLA?
  - *Because execution efficiency ensures that numerical safety checks introduce zero performance overhead.*
- **Level 5:** Why does complete 5-branch dialectic proof certify readiness for human review and sign-off?
  - *Because resolving all dialectic levels eliminates ambiguity, ensuring deterministic, crash-proof numerical behavior.*

---

## 3. Required Implementation Touch Map
1. `lib/pbio/src/mdrobotbase.c`: Add `!isfinite()` checks, gear ratio bounds $[0.001, 1000.0]$, speed saturation logic, and circular timer arithmetic.
2. `lib/pbio/test/src/test_mdrobotbase.c`: Add `test_mdrobotbase_numerical_robustness` and register in `pbio_mdrobotbase_tests[]`.
3. `scripts/harness/socratic-agentic-loop-g-mdrb-016-harness.mjs`: Socratic dialectic runner.
4. `scripts/harness/master-replication-g-mdrb-016.mjs`: Master replication runner.
