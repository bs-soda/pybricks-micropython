#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>
#include <pbio/error.h>
#include <pbio/mdrobotbase.h>
#include <pbio/imu.h>
#include <pbio/control_settings.h>

#ifndef PBIO_CONFIG_NUM_MDROBOTBASES
#define PBIO_CONFIG_NUM_MDROBOTBASES 2
#endif

#if PBIO_CONFIG_NUM_MDROBOTBASES < 1
#undef PBIO_CONFIG_NUM_MDROBOTBASES
#define PBIO_CONFIG_NUM_MDROBOTBASES 1
#endif

static pbio_mdrobotbase_t mdrobotbases[PBIO_CONFIG_NUM_MDROBOTBASES];
static bool mdrobotbase_in_use[PBIO_CONFIG_NUM_MDROBOTBASES];

pbio_error_t pbio_mdrobotbase_init(pbio_mdrobotbase_t *rb, pbio_servo_t *left, pbio_servo_t *right, int32_t wheel_diameter_left, int32_t wheel_diameter_right, int32_t axle_track) {
    if (!rb || !left || !right || left == right ||
        wheel_diameter_left <= 0 || wheel_diameter_right <= 0 || axle_track <= 0 ||
        wheel_diameter_left > 1000000 || wheel_diameter_right > 1000000 || axle_track > 5000000) {
        return PBIO_ERROR_INVALID_ARG;
    }

    // Zero entire struct memory ensuring no uninitialized bytes or dirty accumulators
    memset(rb, 0, sizeof(pbio_mdrobotbase_t));

    rb->left = left;
    rb->right = right;
    rb->axle_track = axle_track;
    rb->wheel_diameter_left = wheel_diameter_left;
    rb->wheel_diameter_right = wheel_diameter_right;

    // Set default controller type
    rb->controller_type = PBIO_MDROBOTBASE_CONTROLLER_PID;

    // Set default LQR gains & weights via BALANCED preset
    pbio_mdrobotbase_set_lqr_preset(rb, PBIO_MDROBOTBASE_LQR_PRESET_BALANCED, true);

    // Set default PID gains
    rb->kp = 1.0f;
    rb->ki = 0.0f;
    rb->kd = 0.0f;

    // Set default turn PID gains
    rb->kp_turn = 1.0f;
    rb->ki_turn = 0.0f;
    rb->kd_turn = 0.0f;

    // Set default pivot PID gains
    rb->kp_pivot = 1.0f;
    rb->ki_pivot = 0.0f;
    rb->kd_pivot = 0.0f;

    // Initialize state variables
    rb->x = 0.0f;
    rb->y = 0.0f;
    rb->theta = 0.0f;
    rb->last_left_deg = 0.0f;
    rb->last_right_deg = 0.0f;
    rb->last_gyro_heading = 0.0f;
    rb->fusion_alpha = 0.95f;
    rb->gear_ratio = 1.0f;
    rb->last_accel_x = 0.0f;

    // Backlash filter defaults
    rb->backlash_filter_enabled = true;
    rb->backlash_left_limit = 1.0f;
    rb->backlash_right_limit = 1.0f;
    rb->backlash_left_accum = 0.0f;
    rb->backlash_right_accum = 0.0f;

    // Maximum speed limits
    rb->max_angular_speed = 1000.0f;
    rb->max_turn_speed = 1000.0f;
    rb->max_pivot_speed = 1000.0f;

    // PID min turn settings
    rb->pid_min_turn = 0.0f;
    rb->pid_min_turn_threshold = 0.15f;

    // Transient motion state explicitly zeroed
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
    rb->motion_in_progress = false;
    rb->stall_time_ms = 0.0f;
    rb->turn_integral = 0.0f;
    rb->dist_traveled = 0.0f;
    rb->motion_status = PBIO_MDROBOTBASE_STATUS_NONE;

    // Trajectory tracking state explicitly zeroed
    rb->trajectory_num_points = 0;
    rb->trajectory_current_point_idx = 0;
    rb->trajectory_transition_tolerance = 0.0f;
    rb->trajectory_final_segment_started = false;

    // Color calibration state explicitly zeroed
    rb->color_cal.num_prototypes = 0;
    rb->color_cal.is_calibrated = false;
    rb->color_cal.black_ref[0] = 0.0f;
    rb->color_cal.black_ref[1] = 0.0f;
    rb->color_cal.black_ref[2] = 0.0f;
    rb->color_cal.white_ref[0] = 100.0f;
    rb->color_cal.white_ref[1] = 100.0f;
    rb->color_cal.white_ref[2] = 100.0f;
    rb->color_cal.gain[0] = 0.01f;
    rb->color_cal.gain[1] = 0.01f;
    rb->color_cal.gain[2] = 0.01f;
    rb->color_cal.has_black_ref = false;
    rb->color_cal.has_white_ref = false;

    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_motion_reset(pbio_mdrobotbase_t *rb) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }

    rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
    rb->motion_in_progress = false;
    rb->stall_time_ms = 0.0f;
    rb->turn_integral = 0.0f;
    rb->dist_traveled = 0.0f;
    rb->target_speed_for_ramping = 0.0f;
    rb->trajectory_num_points = 0;
    rb->trajectory_current_point_idx = 0;
    rb->trajectory_final_segment_started = false;
    rb->motion_status = PBIO_MDROBOTBASE_STATUS_NONE;

    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_robotbase(pbio_mdrobotbase_t **rb_address, pbio_servo_t *left, pbio_servo_t *right, int32_t wheel_diameter_left, int32_t wheel_diameter_right, int32_t axle_track) {
    if (!rb_address) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *rb_address = NULL;

    if (!left || !right || left == right ||
        wheel_diameter_left <= 0 || wheel_diameter_right <= 0 || axle_track <= 0 ||
        wheel_diameter_left > 1000000 || wheel_diameter_right > 1000000 || axle_track > 5000000) {
        return PBIO_ERROR_INVALID_ARG;
    }

    // Check for exact-match re-binding or partial/conflicting overlap
    int exact_slot = -1;
    for (int i = 0; i < PBIO_CONFIG_NUM_MDROBOTBASES; i++) {
        pbio_mdrobotbase_t *rb = &mdrobotbases[i];
        if (mdrobotbase_in_use[i]) {
            if (rb->left == left && rb->right == right) {
                // Exact identical motor pair: re-bind cleanly
                exact_slot = i;
            } else if (rb->left == left || rb->left == right ||
                       rb->right == left || rb->right == right) {
                // Conflicting partial or reversed overlap: strictly fail closed
                return PBIO_ERROR_BUSY;
            }
        }
    }

    int slot = -1;
    if (exact_slot >= 0) {
        slot = exact_slot;
        // Cancel any pending motion on the re-bound slot
        if (mdrobotbases[slot].left) {
            pbio_servo_stop(mdrobotbases[slot].left, PBIO_CONTROL_ON_COMPLETION_COAST);
        }
        if (mdrobotbases[slot].right) {
            pbio_servo_stop(mdrobotbases[slot].right, PBIO_CONTROL_ON_COMPLETION_COAST);
        }
    } else {
        // Scan for the first free pool slot
        for (int i = 0; i < PBIO_CONFIG_NUM_MDROBOTBASES; i++) {
            if (!mdrobotbase_in_use[i]) {
                slot = i;
                break;
            }
        }
    }

    if (slot < 0) {
        return PBIO_ERROR_BUSY;
    }

    pbio_mdrobotbase_t *rb = &mdrobotbases[slot];
    mdrobotbase_in_use[slot] = true;

    pbio_error_t err = pbio_mdrobotbase_init(rb, left, right, wheel_diameter_left, wheel_diameter_right, axle_track);
    if (err != PBIO_SUCCESS) {
        mdrobotbase_in_use[slot] = false;
        return err;
    }

    *rb_address = rb;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_put_robotbase(pbio_mdrobotbase_t *rb) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }

    // Verify pointer address belongs to static pool array and is properly aligned via portable uintptr_t
    uintptr_t addr = (uintptr_t)rb;
    uintptr_t base = (uintptr_t)&mdrobotbases[0];
    uintptr_t element_size = sizeof(pbio_mdrobotbase_t);
    uintptr_t total_size = sizeof(mdrobotbases);

    if (addr < base || addr >= base + total_size) {
        return PBIO_ERROR_INVALID_ARG;
    }

    if ((addr - base) % element_size != 0) {
        return PBIO_ERROR_INVALID_ARG;
    }

    int slot = (int)((addr - base) / element_size);
    if (slot < 0 || slot >= PBIO_CONFIG_NUM_MDROBOTBASES || !mdrobotbase_in_use[slot]) {
        return PBIO_ERROR_INVALID_ARG;
    }

    // Stop physical motors safely
    if (rb->left) {
        pbio_servo_stop(rb->left, PBIO_CONTROL_ON_COMPLETION_COAST);
    }
    if (rb->right) {
        pbio_servo_stop(rb->right, PBIO_CONTROL_ON_COMPLETION_COAST);
    }

    rb->left = NULL;
    rb->right = NULL;
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
    rb->motion_in_progress = false;

    mdrobotbase_in_use[slot] = false;
    return PBIO_SUCCESS;
}

void pbio_mdrobotbase_deinit(void) {
    for (int i = 0; i < PBIO_CONFIG_NUM_MDROBOTBASES; i++) {
        if (mdrobotbase_in_use[i]) {
            pbio_mdrobotbase_t *rb = &mdrobotbases[i];
            if (rb->left) {
                pbio_servo_stop(rb->left, PBIO_CONTROL_ON_COMPLETION_COAST);
            }
            if (rb->right) {
                pbio_servo_stop(rb->right, PBIO_CONTROL_ON_COMPLETION_COAST);
            }
            rb->left = NULL;
            rb->right = NULL;
            rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
            rb->motion_in_progress = false;
            rb->motion_status = PBIO_MDROBOTBASE_STATUS_NONE;
            mdrobotbase_in_use[i] = false;
        }
    }
}

pbio_error_t pbio_mdrobotbase_lqr_solve_dare(
    float q_x, float q_y, float q_theta, float r_v, float r_omega,
    float v_profile, float *k_x, float *k_y, float *k_theta, float *spectral_radius) {

    if (!isfinite(q_x) || !isfinite(q_y) || !isfinite(q_theta) || !isfinite(r_v) || !isfinite(r_omega) || !isfinite(v_profile)) {
        return PBIO_ERROR_INVALID_ARG;
    }
    // State penalties must be non-negative, control penalties strictly positive
    if (q_x < 0.0f || q_y < 0.0f || q_theta < 0.0f || r_v <= 0.0f || r_omega <= 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }

    const float Ts = 0.005f; // 5 ms control period

    // 1. Scalar along-track DARE solution
    // Analytical solution to Riccati equation: p11^2 - qx*p11 - (qx*rv)/(Ts^2) = 0
    float disc_x = q_x * q_x + 4.0f * q_x * r_v / (Ts * Ts);
    float p11 = (q_x + sqrtf(disc_x)) * 0.5f;
    float k11 = (Ts * p11) / (r_v + Ts * Ts * p11);
    if (k_x) {
        *k_x = k11;
    }

    // 2. Lateral & Heading 2x2 discrete unicycle DARE solution
    float v_abs = fabsf(v_profile);
    if (v_abs < 10.0f) {
        v_abs = 10.0f; // Clamp to v_min = 10 mm/s (0.01 m/s) to prevent matrix singularity
    }
    float vr = v_abs / 1000.0f; // mm/s to m/s
    float vTs = vr * Ts;

    // Discrete input vector B = [-0.5 * vr * Ts^2; -Ts]
    float b0 = -0.5f * vr * Ts * Ts;
    float b1 = -Ts;

    // Fixed-point iteration initialized at P_0 = Q
    float p00 = q_y;
    float p01 = 0.0f;
    float p11_lat = q_theta;

    for (int iter = 0; iter < 100; iter++) {
        float pb0 = p00 * b0 + p01 * b1;
        float pb1 = p01 * b0 + p11_lat * b1;

        float d = r_omega + b0 * pb0 + b1 * pb1;
        if (d <= 0.0f) {
            return PBIO_ERROR_INVALID_ARG;
        }

        float m0 = pb0;
        float m1 = vTs * pb0 + pb1;

        float pa01 = p00 * vTs + p01;
        float pa11 = p01 * vTs + p11_lat;

        float atpa00 = p00;
        float atpa01 = pa01;
        float atpa11 = vTs * pa01 + pa11;

        float p00_next = atpa00 - (m0 * m0) / d + q_y;
        float p01_next = atpa01 - (m0 * m1) / d;
        float p11_next = atpa11 - (m1 * m1) / d + q_theta;

        float diff = fabsf(p00_next - p00) + fabsf(p01_next - p01) + fabsf(p11_next - p11_lat);
        p00 = p00_next;
        p01 = p01_next;
        p11_lat = p11_next;
        if (diff < 1e-4f) {
            break;
        }
    }

    // Optimal gain calculation: K = (R + B^T P B)^-1 B^T P A
    // Compute positive gain magnitudes for feedback: u_w = -(ky * e_y + kth * e_theta)
    float pa01 = p00 * vTs + p01;
    float pa11 = p01 * vTs + p11_lat;
    float pb0 = p00 * b0 + p01 * b1;
    float pb1 = p01 * b0 + p11_lat * b1;
    float d = r_omega + b0 * pb0 + b1 * pb1;

    float ky = -(b0 * p00 + b1 * p01) / d;
    float kth = -(b0 * pa01 + b1 * pa11) / d;

    // 3. Discrete closed-loop spectral radius verification: rho(A - B K) < 1.0
    float acl00 = 1.0f + b0 * ky;
    float acl01 = vTs + b0 * kth;
    float acl10 = b1 * ky;
    float acl11 = 1.0f + b1 * kth;

    float tr = acl00 + acl11;
    float det = acl00 * acl11 - acl01 * acl10;
    float disc = tr * tr - 4.0f * det;
    float rho = 0.0f;
    if (disc < 0.0f) {
        rho = sqrtf(det);
    } else {
        float sqrt_d = sqrtf(disc);
        float r1 = fabsf((tr + sqrt_d) * 0.5f);
        float r2 = fabsf((tr - sqrt_d) * 0.5f);
        rho = (r1 > r2) ? r1 : r2;
    }

    float lambda1 = fabsf(1.0f - Ts * k11);
    if (lambda1 > rho) {
        rho = lambda1;
    }

    if (spectral_radius) {
        *spectral_radius = rho;
    }
    if (k_y) {
        *k_y = ky;
    }
    if (k_theta) {
        *k_theta = kth;
    }

    // Fail-closed unit-circle stability certificate: spectral radius must be strictly < 1.0
    if (rho >= 1.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }

    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_lqr_solve_dare_full(
    float q_x, float q_y, float q_theta,
    float r_v, float r_omega,
    float v_profile,
    float K[2][3], float P[3][3],
    float *spectral_radius) {

    if (!isfinite(q_x) || !isfinite(q_y) || !isfinite(q_theta) ||
        !isfinite(r_v) || !isfinite(r_omega) || !isfinite(v_profile)) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (q_x < 0.0f || q_y < 0.0f || q_theta < 0.0f || r_v <= 0.0f || r_omega <= 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }

    const float Ts = 0.005f;
    float v_abs = fabsf(v_profile);
    if (v_abs < 10.0f) {
        v_abs = 10.0f; // Clamp to v_min = 10 mm/s to prevent singularity
    }
    float vr = v_abs / 1000.0f; // mm/s to m/s
    float vTs = vr * Ts;
    float b0 = -0.5f * vr * Ts * Ts;
    float b1 = -Ts;

    // Initialize P = Q (symmetric 3x3)
    float p[3][3] = {0};
    p[0][0] = q_x;
    p[1][1] = q_y;
    p[2][2] = q_theta;

    float p_next[3][3] = {0};

    // Riccati fixed-point iteration for full 3x3 system
    for (int iter = 0; iter < 100; iter++) {
        // S = Ad^T * P * Ad
        float S[3][3];
        S[0][0] = p[0][0];
        S[0][1] = p[0][1];
        S[0][2] = vTs * p[0][1] + p[0][2];
        S[1][0] = p[1][0];
        S[1][1] = p[1][1];
        S[1][2] = vTs * p[1][1] + p[1][2];
        S[2][0] = vTs * p[1][0] + p[2][0];
        S[2][1] = vTs * p[1][1] + p[2][1];
        S[2][2] = vTs * (vTs * p[1][1] + p[1][2]) + (vTs * p[2][1] + p[2][2]);

        // M1 = Ad^T * P * Bd (3x2 matrix)
        float M1[3][2];
        M1[0][0] = -Ts * p[0][0];
        M1[0][1] = b0 * p[0][1] + b1 * p[0][2];
        M1[1][0] = -Ts * p[1][0];
        M1[1][1] = b0 * p[1][1] + b1 * p[1][2];
        M1[2][0] = -Ts * (vTs * p[1][0] + p[2][0]);
        M1[2][1] = vTs * (b0 * p[1][1] + b1 * p[1][2]) + (b0 * p[2][1] + b1 * p[2][2]);

        // W = R + Bd^T * P * Bd (2x2 symmetric matrix)
        float W[2][2];
        W[0][0] = r_v + Ts * Ts * p[0][0];
        W[0][1] = -Ts * (b0 * p[0][1] + b1 * p[0][2]);
        W[1][0] = W[0][1];
        W[1][1] = r_omega + b0 * (b0 * p[1][1] + b1 * p[1][2]) + b1 * (b0 * p[2][1] + b1 * p[2][2]);

        // Invert W (2x2 matrix)
        float detW = W[0][0] * W[1][1] - W[0][1] * W[1][0];
        if (detW <= 1e-12f) {
            return PBIO_ERROR_FAILED;
        }
        float invW[2][2];
        invW[0][0] = W[1][1] / detW;
        invW[0][1] = -W[0][1] / detW;
        invW[1][0] = -W[1][0] / detW;
        invW[1][1] = W[0][0] / detW;

        // G = M1 * invW (3x2 matrix)
        float G[3][2];
        for (int r = 0; r < 3; r++) {
            G[r][0] = M1[r][0] * invW[0][0] + M1[r][1] * invW[1][0];
            G[r][1] = M1[r][0] * invW[0][1] + M1[r][1] * invW[1][1];
        }

        // P_next = S - G * M1^T + Q
        float diff = 0.0f;
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                float q_val = (r == c) ? ((r == 0) ? q_x : (r == 1) ? q_y : q_theta) : 0.0f;
                p_next[r][c] = S[r][c] - (G[r][0] * M1[c][0] + G[r][1] * M1[c][1]) + q_val;
                diff += fabsf(p_next[r][c] - p[r][c]);
            }
        }

        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                p[r][c] = p_next[r][c];
            }
        }

        if (diff < 1e-4f) {
            break;
        }
    }

    // Final M1 and invW for K derivation
    float M1[3][2];
    M1[0][0] = -Ts * p[0][0];
    M1[0][1] = b0 * p[0][1] + b1 * p[0][2];
    M1[1][0] = -Ts * p[1][0];
    M1[1][1] = b0 * p[1][1] + b1 * p[1][2];
    M1[2][0] = -Ts * (vTs * p[1][0] + p[2][0]);
    M1[2][1] = vTs * (b0 * p[1][1] + b1 * p[1][2]) + (b0 * p[2][1] + b1 * p[2][2]);

    float W[2][2];
    W[0][0] = r_v + Ts * Ts * p[0][0];
    W[0][1] = -Ts * (b0 * p[0][1] + b1 * p[0][2]);
    W[1][0] = W[0][1];
    W[1][1] = r_omega + b0 * (b0 * p[1][1] + b1 * p[1][2]) + b1 * (b0 * p[2][1] + b1 * p[2][2]);

    float detW = W[0][0] * W[1][1] - W[0][1] * W[1][0];
    float invW[2][2];
    invW[0][0] = W[1][1] / detW;
    invW[0][1] = -W[0][1] / detW;
    invW[1][0] = -W[1][0] / detW;
    invW[1][1] = W[0][0] / detW;

    // K = invW * Bd^T * P * Ad = invW * M1^T (2x3 matrix)
    float k_matrix[2][3];
    for (int r = 0; r < 2; r++) {
        for (int c = 0; c < 3; c++) {
            k_matrix[r][c] = invW[r][0] * M1[c][0] + invW[r][1] * M1[c][1];
            if (K) {
                K[r][c] = k_matrix[r][c];
            }
        }
    }

    if (P) {
        for (int r = 0; r < 3; r++) {
            for (int c = 0; c < 3; c++) {
                P[r][c] = p[r][c];
            }
        }
    }

    // Closed-loop spectral radius computation: Acl = Ad - Bd * K
    // Since longitudinal and lateral-heading are block-decoupled:
    // lambda1 = 1 - (-Ts) * k_matrix[0][0] = 1 + Ts * k_matrix[0][0]
    float lambda1 = fabsf(1.0f + Ts * k_matrix[0][0]);

    // 2x2 lateral/heading subsystem eigenvalues
    float acl11 = 1.0f - b0 * k_matrix[1][1];
    float acl12 = vTs - b0 * k_matrix[1][2];
    float acl21 = -b1 * k_matrix[1][1];
    float acl22 = 1.0f - b1 * k_matrix[1][2];

    float tr = acl11 + acl22;
    float det = acl11 * acl22 - acl12 * acl21;
    float disc = tr * tr - 4.0f * det;
    float rho_lat = 0.0f;
    if (disc < 0.0f) {
        rho_lat = sqrtf(det);
    } else {
        float sqrt_d = sqrtf(disc);
        float r1 = fabsf((tr + sqrt_d) * 0.5f);
        float r2 = fabsf((tr - sqrt_d) * 0.5f);
        rho_lat = (r1 > r2) ? r1 : r2;
    }

    float rho_full = (lambda1 > rho_lat) ? lambda1 : rho_lat;
    if (spectral_radius) {
        *spectral_radius = rho_full;
    }

    if (rho_full >= 1.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }

    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_lqr_verify_discrete_stability(float k_y, float k_theta, float v_nominal, float *spectral_radius) {
    if (!isfinite(k_y) || !isfinite(k_theta) || !isfinite(v_nominal)) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (k_y <= 0.0f || k_theta <= 0.0f || fabsf(v_nominal) < 1e-4f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    const float Ts = 0.005f;
    float vr = v_nominal;
    if (fabsf(vr) > 5.0f) {
        vr = vr / 1000.0f; // convert mm/s to m/s if passed in mm/s
    }
    float vTs = vr * Ts;
    float b0 = -0.5f * vr * Ts * Ts;
    float b1 = -Ts;

    // In reverse motion (vr < 0), cross-track error kinematics invert sign,
    // so optimal DARE gain K = [-sgn(vr)*ky, -ktheta].
    float dir_sign = (vr >= 0.0f) ? 1.0f : -1.0f;
    float acl00 = 1.0f + b0 * dir_sign * k_y;
    float acl01 = vTs + b0 * k_theta;
    float acl10 = b1 * dir_sign * k_y;
    float acl11 = 1.0f + b1 * k_theta;

    float tr = acl00 + acl11;
    float det = acl00 * acl11 - acl01 * acl10;
    float disc = tr * tr - 4.0f * det;
    float rho = 0.0f;
    if (disc < 0.0f) {
        rho = sqrtf(det);
    } else {
        float sqrt_d = sqrtf(disc);
        float r1 = fabsf((tr + sqrt_d) * 0.5f);
        float r2 = fabsf((tr - sqrt_d) * 0.5f);
        rho = (r1 > r2) ? r1 : r2;
    }
    if (spectral_radius) {
        *spectral_radius = rho;
    }
    if (rho >= 1.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_lqr_weights(pbio_mdrobotbase_t *rb, float q_x, float q_y, float q_theta, float r_v, float r_omega) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    // Solve DARE across 16 velocity bins: 50, 100, ..., 800 mm/s
    float k11 = 0.0f;
    float lut_ky[16];
    float lut_kth[16];
    float lut_rho[16];

    for (int i = 0; i < 16; i++) {
        float v_bin = 50.0f + (float)i * 50.0f; // mm/s
        float dummy_kx, ky, kth, rho;
        pbio_error_t err = pbio_mdrobotbase_lqr_solve_dare(
            q_x, q_y, q_theta, r_v, r_omega, v_bin, &dummy_kx, &ky, &kth, &rho);
        if (err != PBIO_SUCCESS || rho >= 1.0f) {
            return PBIO_ERROR_INVALID_ARG;
        }
        if (i == 0) {
            k11 = dummy_kx;
        }
        lut_ky[i] = ky;
        lut_kth[i] = kth;
        lut_rho[i] = rho;
    }

    // Atomic update of weights and lookup tables
    rb->lqr_weights.q_x = q_x;
    rb->lqr_weights.q_y = q_y;
    rb->lqr_weights.q_theta = q_theta;
    rb->lqr_weights.r_v = r_v;
    rb->lqr_weights.r_omega = r_omega;

    rb->lqr_k11 = k11;
    rb->k_x = k11;
    for (int i = 0; i < 16; i++) {
        rb->lqr_lut_v[i] = 50.0f + (float)i * 50.0f;
        rb->lqr_lut_ky[i] = lut_ky[i];
        rb->lqr_lut_kth[i] = lut_kth[i];
        rb->lqr_lut_rho[i] = lut_rho[i];
    }
    // Set nominal k_y and k_theta to 300 mm/s bin (index 5)
    rb->k_y = rb->lqr_lut_ky[5];
    rb->k_theta = rb->lqr_lut_kth[5];
    rb->lqr_schedule_enabled = true;

    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_lqr_weights(const pbio_mdrobotbase_t *rb, float *q_x, float *q_y, float *q_theta, float *r_v, float *r_omega) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (q_x) *q_x = rb->lqr_weights.q_x;
    if (q_y) *q_y = rb->lqr_weights.q_y;
    if (q_theta) *q_theta = rb->lqr_weights.q_theta;
    if (r_v) *r_v = rb->lqr_weights.r_v;
    if (r_omega) *r_omega = rb->lqr_weights.r_omega;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_lqr_gains(pbio_mdrobotbase_t *rb, float k_x, float k_y, float k_theta, bool schedule) {
    if (!rb || !isfinite(k_x) || !isfinite(k_y) || !isfinite(k_theta)) {
        return PBIO_ERROR_INVALID_ARG;
    }
    // Asymptotic stability certificate requires strictly positive feedback gains (k > 0)
    if (k_x <= 0.0f || k_y <= 0.0f || k_theta <= 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    // Practical actuator saturation upper bounds (50 s^-1)
    if (k_x > 50.0f || k_y > 50.0f || k_theta > 50.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->k_x = k_x;
    rb->k_y = k_y;
    rb->k_theta = k_theta;
    rb->lqr_schedule_enabled = schedule;
    rb->lqr_k11 = k_x;
    for (int i = 0; i < 16; i++) {
        rb->lqr_lut_v[i] = 50.0f + (float)i * 50.0f;
        rb->lqr_lut_ky[i] = k_y;
        rb->lqr_lut_kth[i] = k_theta;
        rb->lqr_lut_rho[i] = 0.98f;
    }
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_lqr_gains(const pbio_mdrobotbase_t *rb, float *k_x, float *k_y, float *k_theta, bool *schedule) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (k_x) *k_x = rb->k_x;
    if (k_y) *k_y = rb->k_y;
    if (k_theta) *k_theta = rb->k_theta;
    if (schedule) *schedule = rb->lqr_schedule_enabled;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_lqr_preset(pbio_mdrobotbase_t *rb, pbio_mdrobotbase_lqr_preset_t preset, bool schedule) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    pbio_error_t err;
    switch (preset) {
        case PBIO_MDROBOTBASE_LQR_PRESET_BALANCED:
            err = pbio_mdrobotbase_set_lqr_weights(rb, 2500.0f, 5000.0f, 20.0f, 25.0f, 0.1f);
            break;
        case PBIO_MDROBOTBASE_LQR_PRESET_AGGRESSIVE:
            err = pbio_mdrobotbase_set_lqr_weights(rb, 5000.0f, 15000.0f, 30.0f, 15.0f, 0.05f);
            break;
        case PBIO_MDROBOTBASE_LQR_PRESET_SMOOTH:
            err = pbio_mdrobotbase_set_lqr_weights(rb, 1000.0f, 2000.0f, 15.0f, 50.0f, 0.25f);
            break;
        default:
            return PBIO_ERROR_INVALID_ARG;
    }
    if (err == PBIO_SUCCESS) {
        rb->lqr_schedule_enabled = schedule;
    }
    return err;
}

pbio_error_t pbio_mdrobotbase_lqr_verify_stability(float k_x, float k_y, float k_theta, float v_nominal, float *damping_ratio, float *natural_freq) {
    if (!isfinite(k_x) || !isfinite(k_y) || !isfinite(k_theta) || !isfinite(v_nominal)) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (k_x <= 0.0f || k_y <= 0.0f || k_theta <= 0.0f || v_nominal <= 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (k_x > 50.0f || k_y > 50.0f || k_theta > 50.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    float omega_n = sqrtf(v_nominal * k_y);
    float zeta = k_theta / (2.0f * omega_n);
    if (damping_ratio) {
        *damping_ratio = zeta;
    }
    if (natural_freq) {
        *natural_freq = omega_n;
    }
    if (zeta < 0.05f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_lqr_step(
    const pbio_mdrobotbase_t *rb,
    float v_profile,
    float x_ref,
    float y_ref,
    float path_theta_deg,
    float *v_cmd,
    float *w_cmd) {

    if (!rb || !v_cmd || !w_cmd || !isfinite(v_profile) || !isfinite(x_ref) || !isfinite(y_ref) || !isfinite(path_theta_deg)) {
        return PBIO_ERROR_INVALID_ARG;
    }

    float dx_ref = x_ref - rb->x;
    float dy_ref = y_ref - rb->y;

    float theta_rad = rb->theta * (3.141592653589793f / 180.0f);
    float cos_theta = cosf(theta_rad);
    float sin_theta = sinf(theta_rad);

    float e_x_local = cos_theta * dx_ref + sin_theta * dy_ref;
    float e_y_local = -sin_theta * dx_ref + cos_theta * dy_ref;

    // In reverse motion, vehicle orientation aligns opposite to forward path direction
    bool reverse = (v_profile < 0.0f || rb->is_backward);
    float target_path_theta = path_theta_deg + (reverse ? 180.0f : 0.0f);
    float e_theta_deg = pbio_mdrobotbase_wrap_degrees(target_path_theta - rb->theta);

    float e_x = e_x_local / 1000.0f;                              // mm to meters [m]
    float e_y = e_y_local / 1000.0f;                              // mm to meters [m]
    float e_theta = e_theta_deg * (3.141592653589793f / 180.0f); // deg to radians [rad]

    // Interpolate gains from precomputed 16-bin DARE lookup table
    float v_abs = fabsf(v_profile);
    if (v_abs < 10.0f) {
        v_abs = 10.0f; // Clamp to v_min = 10 mm/s to prevent singularity
    }
    if (v_abs > 800.0f) {
        v_abs = 800.0f;
    }

    float kx = (rb->lqr_k11 > 0.0f) ? rb->lqr_k11 : rb->k_x;
    float ky = rb->k_y;
    float kth = rb->k_theta;

    if (rb->lqr_schedule_enabled && rb->lqr_lut_v[15] > 0.0f) {
        float bin_f = (v_abs - 50.0f) / 50.0f;
        int idx = (int)bin_f;
        if (idx < 0) {
            idx = 0;
            bin_f = 0.0f;
        } else if (idx >= 15) {
            idx = 14;
            bin_f = 15.0f;
        }
        float frac = bin_f - (float)idx;
        if (frac < 0.0f) frac = 0.0f;
        if (frac > 1.0f) frac = 1.0f;

        ky = rb->lqr_lut_ky[idx] + frac * (rb->lqr_lut_ky[idx + 1] - rb->lqr_lut_ky[idx]);
        kth = rb->lqr_lut_kth[idx] + frac * (rb->lqr_lut_kth[idx + 1] - rb->lqr_lut_kth[idx]);
    }

    // Reverse motion kinematic sign inversion: e_dot_y = v_r * e_theta inverts when v_r < 0
    float dir_sign = reverse ? -1.0f : 1.0f;

    // Optimal unicycle control laws:
    // Along-track: u_v = -kx * e_x  ==> v_cmd = v_profile + kx * e_x * 1000.0
    // Cross-track & heading: u_w = -(ky * e_y * dir_sign + kth * e_theta)
    float u_v = -(kx * e_x);
    float u_w = -(ky * e_y * dir_sign + kth * e_theta);

    float v_cmd_raw = v_profile - u_v * 1000.0f;                          // m/s to mm/s
    float w_cmd_raw = 0.0f - u_w * (180.0f / 3.141592653589793f);         // rad/s to deg/s

    // Symmetrical actuator velocity saturation and anti-windup:
    // Preserves trajectory curvature kappa = w / v without differential yaw distortion
    float axle_b = (rb->axle_track > 0) ? (float)rb->axle_track / 1000.0f : 112.0f; // mm
    float w_rad_s = w_cmd_raw * (3.141592653589793f / 180.0f);
    float v_left = v_cmd_raw - (w_rad_s * axle_b * 0.5f);
    float v_right = v_cmd_raw + (w_rad_s * axle_b * 0.5f);

    float v_wheel_max = 800.0f; // mm/s physical ceiling
    float peak_v = fabsf(v_left);
    if (fabsf(v_right) > peak_v) {
        peak_v = fabsf(v_right);
    }

    if (peak_v > v_wheel_max && peak_v > 1e-4f) {
        float scale = v_wheel_max / peak_v;
        v_cmd_raw *= scale;
        w_cmd_raw *= scale;
    }

    *v_cmd = v_cmd_raw;
    *w_cmd = w_cmd_raw;

    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_controller(pbio_mdrobotbase_t *rb, pbio_mdrobotbase_controller_t type) {
    if (!rb || (type != PBIO_MDROBOTBASE_CONTROLLER_PID && type != PBIO_MDROBOTBASE_CONTROLLER_LQR)) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->controller_type = type;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_pid_gains(pbio_mdrobotbase_t *rb, float kp, float ki, float kd) {
    if (!rb || !isfinite(kp) || !isfinite(ki) || !isfinite(kd) || kp < 0.0f || ki < 0.0f || kd < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->kp = kp;
    rb->ki = ki;
    rb->kd = kd;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_turn_pid_gains(pbio_mdrobotbase_t *rb, float kp, float ki, float kd) {
    if (!rb || !isfinite(kp) || !isfinite(ki) || !isfinite(kd) || kp < 0.0f || ki < 0.0f || kd < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->kp_turn = kp;
    rb->ki_turn = ki;
    rb->kd_turn = kd;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_turn_pid_gains(pbio_mdrobotbase_t *rb, float *kp, float *ki, float *kd) {
    if (!rb || !kp || !ki || !kd) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *kp = rb->kp_turn;
    *ki = rb->ki_turn;
    *kd = rb->kd_turn;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_pivot_pid_gains(pbio_mdrobotbase_t *rb, float kp, float ki, float kd) {
    if (!rb || !isfinite(kp) || !isfinite(ki) || !isfinite(kd) || kp < 0.0f || ki < 0.0f || kd < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->kp_pivot = kp;
    rb->ki_pivot = ki;
    rb->kd_pivot = kd;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_pivot_pid_gains(pbio_mdrobotbase_t *rb, float *kp, float *ki, float *kd) {
    if (!rb || !kp || !ki || !kd) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *kp = rb->kp_pivot;
    *ki = rb->ki_pivot;
    *kd = rb->kd_pivot;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_reset_state(pbio_mdrobotbase_t *rb, float x, float y, float theta, float gyro_heading) {
    if (!rb || !isfinite(x) || !isfinite(y) || !isfinite(theta) || !isfinite(gyro_heading)) {
        return PBIO_ERROR_INVALID_ARG;
    }

    pbio_control_state_t state_l, state_r;
    pbio_error_t err = pbio_servo_get_state_control(rb->left, &state_l);
    if (err != PBIO_SUCCESS) {
        return err;
    }
    err = pbio_servo_get_state_control(rb->right, &state_r);
    if (err != PBIO_SUCCESS) {
        return err;
    }

    float left_deg = pbio_control_settings_ctl_to_app_long_float(&rb->left->control.settings, &state_l.position);
    float right_deg = pbio_control_settings_ctl_to_app_long_float(&rb->right->control.settings, &state_r.position);

    rb->x = x;
    rb->y = y;
    rb->theta = theta;

    rb->last_left_deg = left_deg;
    rb->last_right_deg = right_deg;
    rb->last_gyro_heading = gyro_heading;
    rb->last_accel_x = 0.0f;

    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_update_state(pbio_mdrobotbase_t *rb, float gyro_heading) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }

    pbio_control_state_t state_l, state_r;
    pbio_error_t err = pbio_servo_get_state_control(rb->left, &state_l);
    if (err != PBIO_SUCCESS) {
        return err;
    }
    err = pbio_servo_get_state_control(rb->right, &state_r);
    if (err != PBIO_SUCCESS) {
        return err;
    }

    float left_deg = pbio_control_settings_ctl_to_app_long_float(&rb->left->control.settings, &state_l.position);
    float right_deg = pbio_control_settings_ctl_to_app_long_float(&rb->right->control.settings, &state_r.position);

    float d_left_ticks = left_deg - rb->last_left_deg;
    float d_right_ticks = right_deg - rb->last_right_deg;

    rb->last_left_deg = left_deg;
    rb->last_right_deg = right_deg;

    // Scale motor degree deltas to output wheel degrees using gear ratio
    d_left_ticks = pbio_mdrobotbase_motor_to_wheel_deg(rb, d_left_ticks);
    d_right_ticks = pbio_mdrobotbase_motor_to_wheel_deg(rb, d_right_ticks);

    if (rb->backlash_filter_enabled) {
        // Evaluate left wheel backlash hysteresis
        float left_cand = rb->backlash_left_accum + d_left_ticks;
        float left_excess = 0.0f;
        if (left_cand > rb->backlash_left_limit) {
            left_excess = left_cand - rb->backlash_left_limit;
            rb->backlash_left_accum = rb->backlash_left_limit;
        } else if (left_cand < -rb->backlash_left_limit) {
            left_excess = left_cand + rb->backlash_left_limit;
            rb->backlash_left_accum = -rb->backlash_left_limit;
        } else {
            left_excess = 0.0f;
            rb->backlash_left_accum = left_cand;
        }

        // Evaluate right wheel backlash hysteresis
        float right_cand = rb->backlash_right_accum + d_right_ticks;
        float right_excess = 0.0f;
        if (right_cand > rb->backlash_right_limit) {
            right_excess = right_cand - rb->backlash_right_limit;
            rb->backlash_right_accum = rb->backlash_right_limit;
        } else if (right_cand < -rb->backlash_right_limit) {
            right_excess = right_cand + rb->backlash_right_limit;
            rb->backlash_right_accum = -rb->backlash_right_limit;
        } else {
            right_excess = 0.0f;
            rb->backlash_right_accum = right_cand;
        }

        d_left_ticks = left_excess;
        d_right_ticks = right_excess;
    }

    float diam_left_mm = (float)rb->wheel_diameter_left / 1000.0f;
    float diam_right_mm = (float)rb->wheel_diameter_right / 1000.0f;
    float track_mm = (float)rb->axle_track / 1000.0f;

    // Convert ticks (degrees) to linear distance (mm)
    float d_left = (d_left_ticks / 360.0f) * 3.14159265f * diam_left_mm;
    float d_right = (d_right_ticks / 360.0f) * 3.14159265f * diam_right_mm;
    float d_center = (d_left + d_right) / 2.0f;

    float delta_theta_gyro = -(gyro_heading - rb->last_gyro_heading);
    while (delta_theta_gyro > 180.0f) delta_theta_gyro -= 360.0f;
    while (delta_theta_gyro < -180.0f) delta_theta_gyro += 360.0f;

    rb->last_gyro_heading = gyro_heading;

    float delta_theta_enc_rad = (d_right - d_left) / track_mm;
    float delta_theta_enc_deg = delta_theta_enc_rad * (180.0f / 3.14159265f);

    float delta_theta = rb->fusion_alpha * delta_theta_gyro + (1.0f - rb->fusion_alpha) * delta_theta_enc_deg;

    if (rb->motion_type == PBIO_MDROBOTBASE_MOTION_TURN) {
        // Pure spin turn: center point does not translate linearly
        d_center = 0.0f;
        float avg_angle_rad = (rb->theta + delta_theta / 2.0f) * (3.14159265f / 180.0f);
        rb->x += d_center * cosf(avg_angle_rad);
        rb->y += d_center * sinf(avg_angle_rad);
    } else if (rb->motion_type == PBIO_MDROBOTBASE_MOTION_PIVOT) {
        // Exact rigid-body arc rotation around locked wheel contact point
        float old_theta_rad = rb->theta * (3.14159265f / 180.0f);
        float new_theta_rad = (rb->theta + delta_theta) * (3.14159265f / 180.0f);
        float r_offset = rb->pivot_left ? (track_mm / 2.0f) : -(track_mm / 2.0f);

        rb->x += r_offset * (sinf(new_theta_rad) - sinf(old_theta_rad));
        rb->y += -r_offset * (cosf(new_theta_rad) - cosf(old_theta_rad));
    } else {
        float avg_angle_rad = (rb->theta + delta_theta / 2.0f) * (3.14159265f / 180.0f);
        rb->x += d_center * cosf(avg_angle_rad);
        rb->y += d_center * sinf(avg_angle_rad);
    }

    rb->theta = pbio_mdrobotbase_wrap_degrees(rb->theta + delta_theta);

    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_backlash_filter(pbio_mdrobotbase_t *rb, bool enabled) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->backlash_filter_enabled = enabled;
    if (!enabled) {
        rb->backlash_left_accum = 0.0f;
        rb->backlash_right_accum = 0.0f;
    }
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_backlash_filter(pbio_mdrobotbase_t *rb, bool *enabled) {
    if (!rb || !enabled) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *enabled = rb->backlash_filter_enabled;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_max_angular_speed(pbio_mdrobotbase_t *rb, float speed) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->max_angular_speed = speed;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_max_angular_speed(pbio_mdrobotbase_t *rb, float *speed) {
    if (!rb || !speed) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *speed = rb->max_angular_speed;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_max_turn_speed(pbio_mdrobotbase_t *rb, float speed) {
    if (!rb || !isfinite(speed) || speed <= 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->max_turn_speed = speed;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_max_turn_speed(pbio_mdrobotbase_t *rb, float *speed) {
    if (!rb || !speed) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *speed = rb->max_turn_speed;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_max_pivot_speed(pbio_mdrobotbase_t *rb, float speed) {
    if (!rb || !isfinite(speed) || speed <= 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->max_pivot_speed = speed;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_max_pivot_speed(pbio_mdrobotbase_t *rb, float *speed) {
    if (!rb || !speed) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *speed = rb->max_pivot_speed;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_pid_min_turn(pbio_mdrobotbase_t *rb, float min_turn, float threshold) {
    if (!rb || !isfinite(min_turn) || !isfinite(threshold) || min_turn < 0.0f || threshold < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->pid_min_turn = min_turn;
    rb->pid_min_turn_threshold = threshold;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_pid_min_turn(pbio_mdrobotbase_t *rb, float *min_turn, float *threshold) {
    if (!rb || !min_turn || !threshold) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *min_turn = rb->pid_min_turn;
    *threshold = rb->pid_min_turn_threshold;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_backlash_limits(pbio_mdrobotbase_t *rb, float left_limit, float right_limit) {
    if (!rb || !isfinite(left_limit) || !isfinite(right_limit) || left_limit < 0.0f || right_limit < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->backlash_left_limit = left_limit;
    rb->backlash_right_limit = right_limit;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_backlash_limits(pbio_mdrobotbase_t *rb, float *left_limit, float *right_limit) {
    if (!rb || !left_limit || !right_limit) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *left_limit = rb->backlash_left_limit;
    *right_limit = rb->backlash_right_limit;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_wheel_diameters(pbio_mdrobotbase_t *rb, int32_t left, int32_t right) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (left <= 0 || right <= 0 || left > 1000000 || right > 1000000) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->wheel_diameter_left = left;
    rb->wheel_diameter_right = right;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_wheel_diameters(pbio_mdrobotbase_t *rb, int32_t *left, int32_t *right) {
    if (!rb || !left || !right) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *left = rb->wheel_diameter_left;
    *right = rb->wheel_diameter_right;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_fusion_alpha(pbio_mdrobotbase_t *rb, float alpha) {
    if (!rb || !isfinite(alpha) || alpha < 0.0f || alpha > 1.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->fusion_alpha = alpha;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_fusion_alpha(pbio_mdrobotbase_t *rb, float *alpha) {
    if (!rb || !alpha) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *alpha = rb->fusion_alpha;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_gear_ratio(pbio_mdrobotbase_t *rb, float ratio) {
    if (!rb || !isfinite(ratio) || ratio < 0.001f || ratio > 1000.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->gear_ratio = ratio;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_gear_ratio(pbio_mdrobotbase_t *rb, float *ratio) {
    if (!rb || !ratio) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *ratio = rb->gear_ratio;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_motion_status(const pbio_mdrobotbase_t *rb, pbio_mdrobotbase_motion_status_t *status) {
    if (!rb || !status) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *status = rb->motion_status;
    return PBIO_SUCCESS;
}

#define PBIO_MDROBOTBASE_STATUS_COUNT 5

static const bool mdrobotbase_fsm_transition_table[PBIO_MDROBOTBASE_STATUS_COUNT][PBIO_MDROBOTBASE_STATUS_COUNT] = {
    // Current: NONE (0)
    [PBIO_MDROBOTBASE_STATUS_NONE] = {
        [PBIO_MDROBOTBASE_STATUS_NONE] = true,       // Idempotent reset
        [PBIO_MDROBOTBASE_STATUS_RUNNING] = true,    // Start motion
        [PBIO_MDROBOTBASE_STATUS_COMPLETED] = false, // Prohibited without running
        [PBIO_MDROBOTBASE_STATUS_STALLED] = false,   // Prohibited without running
        [PBIO_MDROBOTBASE_STATUS_TIMED_OUT] = false, // Prohibited without running
    },
    // Current: RUNNING (1)
    [PBIO_MDROBOTBASE_STATUS_RUNNING] = {
        [PBIO_MDROBOTBASE_STATUS_NONE] = true,       // Cancelled / reset
        [PBIO_MDROBOTBASE_STATUS_RUNNING] = true,    // Idempotent keep running
        [PBIO_MDROBOTBASE_STATUS_COMPLETED] = true,  // Trajectory target reached
        [PBIO_MDROBOTBASE_STATUS_STALLED] = true,    // Motor stall detected
        [PBIO_MDROBOTBASE_STATUS_TIMED_OUT] = true,  // Duration limit expired
    },
    // Current: COMPLETED (2)
    [PBIO_MDROBOTBASE_STATUS_COMPLETED] = {
        [PBIO_MDROBOTBASE_STATUS_NONE] = true,       // Reset to idle
        [PBIO_MDROBOTBASE_STATUS_RUNNING] = true,    // Start new motion
        [PBIO_MDROBOTBASE_STATUS_COMPLETED] = true,  // Idempotent
        [PBIO_MDROBOTBASE_STATUS_STALLED] = false,   // Prohibited cross-terminal
        [PBIO_MDROBOTBASE_STATUS_TIMED_OUT] = false, // Prohibited cross-terminal
    },
    // Current: STALLED (3)
    [PBIO_MDROBOTBASE_STATUS_STALLED] = {
        [PBIO_MDROBOTBASE_STATUS_NONE] = true,       // Reset to idle
        [PBIO_MDROBOTBASE_STATUS_RUNNING] = true,    // Start new motion
        [PBIO_MDROBOTBASE_STATUS_COMPLETED] = false, // Prohibited cross-terminal
        [PBIO_MDROBOTBASE_STATUS_STALLED] = true,    // Idempotent
        [PBIO_MDROBOTBASE_STATUS_TIMED_OUT] = false, // Prohibited cross-terminal
    },
    // Current: TIMED_OUT (4)
    [PBIO_MDROBOTBASE_STATUS_TIMED_OUT] = {
        [PBIO_MDROBOTBASE_STATUS_NONE] = true,       // Reset to idle
        [PBIO_MDROBOTBASE_STATUS_RUNNING] = true,    // Start new motion
        [PBIO_MDROBOTBASE_STATUS_COMPLETED] = false, // Prohibited cross-terminal
        [PBIO_MDROBOTBASE_STATUS_STALLED] = false,   // Prohibited cross-terminal
        [PBIO_MDROBOTBASE_STATUS_TIMED_OUT] = true,  // Idempotent
    },
};

pbio_error_t pbio_mdrobotbase_set_motion_status(pbio_mdrobotbase_t *rb, pbio_mdrobotbase_motion_status_t status) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    // Reject any enum values outside 0..PBIO_MDROBOTBASE_STATUS_COUNT - 1
    if ((uint32_t)status >= PBIO_MDROBOTBASE_STATUS_COUNT) {
        return PBIO_ERROR_INVALID_ARG;
    }

    // Fail-closed guard for current status corruption
    pbio_mdrobotbase_motion_status_t cur_status = rb->motion_status;
    if ((uint32_t)cur_status >= PBIO_MDROBOTBASE_STATUS_COUNT) {
        cur_status = PBIO_MDROBOTBASE_STATUS_NONE;
    }

    // Evaluate against deterministic finite state machine transition table
    if (!mdrobotbase_fsm_transition_table[cur_status][status]) {
        return PBIO_ERROR_INVALID_OP;
    }

    // Atomically couple motion_status and motion_in_progress
    rb->motion_status = status;
    rb->motion_in_progress = (status == PBIO_MDROBOTBASE_STATUS_RUNNING);
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_motion_start(pbio_mdrobotbase_t *rb) {
    return pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING);
}

pbio_error_t pbio_mdrobotbase_motion_complete(pbio_mdrobotbase_t *rb) {
    return pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED);
}

pbio_error_t pbio_mdrobotbase_motion_stall(pbio_mdrobotbase_t *rb) {
    return pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_STALLED);
}

pbio_error_t pbio_mdrobotbase_motion_timeout(pbio_mdrobotbase_t *rb) {
    return pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_TIMED_OUT);
}

pbio_error_t pbio_mdrobotbase_mark_running(pbio_mdrobotbase_t *rb) {
    return pbio_mdrobotbase_motion_start(rb);
}

pbio_error_t pbio_mdrobotbase_mark_completed(pbio_mdrobotbase_t *rb) {
    return pbio_mdrobotbase_motion_complete(rb);
}

pbio_error_t pbio_mdrobotbase_mark_stalled(pbio_mdrobotbase_t *rb) {
    return pbio_mdrobotbase_motion_stall(rb);
}

pbio_error_t pbio_mdrobotbase_mark_timed_out(pbio_mdrobotbase_t *rb) {
    return pbio_mdrobotbase_motion_timeout(rb);
}

pbio_error_t pbio_mdrobotbase_get_pose(const pbio_mdrobotbase_t *rb, float *x, float *y, float *theta) {
    if (!rb || !x || !y || !theta) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *x = rb->x;
    *y = rb->y;
    *theta = rb->theta;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_is_busy(const pbio_mdrobotbase_t *rb, bool *busy) {
    if (!rb || !busy) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *busy = rb->motion_in_progress;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_is_done(const pbio_mdrobotbase_t *rb, bool *done) {
    if (!rb || !done) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *done = !rb->motion_in_progress;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_is_stalled(const pbio_mdrobotbase_t *rb, bool *stalled) {
    if (!rb || !stalled) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *stalled = (rb->motion_status == PBIO_MDROBOTBASE_STATUS_STALLED);
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_get_motion_type(const pbio_mdrobotbase_t *rb, pbio_mdrobotbase_motion_type_t *motion_type) {
    if (!rb || !motion_type) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *motion_type = rb->motion_type;
    return PBIO_SUCCESS;
}

float pbio_mdrobotbase_motor_to_wheel_deg(const pbio_mdrobotbase_t *rb, float motor_deg) {
    if (!rb || !isfinite(motor_deg)) {
        return 0.0f;
    }
    if (rb->gear_ratio <= 0.0001f) {
        return motor_deg;
    }
    return motor_deg / rb->gear_ratio;
}

float pbio_mdrobotbase_wheel_to_motor_deg(const pbio_mdrobotbase_t *rb, float wheel_deg) {
    if (!rb || !isfinite(wheel_deg)) {
        return 0.0f;
    }
    if (rb->gear_ratio <= 0.0001f) {
        return wheel_deg;
    }
    return wheel_deg * rb->gear_ratio;
}

float pbio_mdrobotbase_motor_to_wheel_dps(const pbio_mdrobotbase_t *rb, float motor_dps) {
    if (!rb || !isfinite(motor_dps)) {
        return 0.0f;
    }
    if (rb->gear_ratio <= 0.0001f) {
        return motor_dps;
    }
    return motor_dps / rb->gear_ratio;
}

int32_t pbio_mdrobotbase_wheel_to_motor_dps(const pbio_mdrobotbase_t *rb, float wheel_dps) {
    if (!rb || isnan(wheel_dps)) {
        return 0;
    }
    if (isinf(wheel_dps)) {
        return (wheel_dps > 0.0f) ? INT32_MAX : INT32_MIN;
    }
    float r = (rb->gear_ratio > 0.0001f) ? rb->gear_ratio : 1.0f;
    float product = wheel_dps * r;
    if (product > (float)INT32_MAX) {
        return INT32_MAX;
    }
    if (product < (float)INT32_MIN) {
        return INT32_MIN;
    }
    return (int32_t)(product >= 0.0f ? product + 0.5f : product - 0.5f);
}

float pbio_mdrobotbase_wrap_degrees(float angle) {
    if (!isfinite(angle)) {
        return 0.0f;
    }
    while (angle > 180.0f) {
        angle -= 360.0f;
    }
    while (angle < -180.0f) {
        angle += 360.0f;
    }
    return angle;
}

// Native C Color Calibration Implementation
pbio_error_t pbio_mdrobotbase_color_cal_reset(pbio_mdrobotbase_t *rb) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->color_cal.num_prototypes = 0;
    rb->color_cal.base_h = 0.0f;
    rb->color_cal.base_s = 20.0f;
    rb->color_cal.base_v = 60.0f;
    rb->color_cal.v_scale = 3.0f;
    rb->color_cal.max_distance_threshold = 40.0f; // Default distance cutoff threshold
    rb->color_cal.is_calibrated = false;
    rb->color_cal.black_ref[0] = 0.0f;
    rb->color_cal.black_ref[1] = 0.0f;
    rb->color_cal.black_ref[2] = 0.0f;
    rb->color_cal.white_ref[0] = 100.0f;
    rb->color_cal.white_ref[1] = 100.0f;
    rb->color_cal.white_ref[2] = 100.0f;
    rb->color_cal.gain[0] = 0.01f;
    rb->color_cal.gain[1] = 0.01f;
    rb->color_cal.gain[2] = 0.01f;
    rb->color_cal.has_black_ref = false;
    rb->color_cal.has_white_ref = false;
    rb->color_cal.num_classes = 0;
    rb->color_cal.sample_acc.count = 0;
    rb->color_cal.sample_acc.color_id = 0;
    rb->color_cal.ambiguity_threshold = 6.0f;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_set_baseline(pbio_mdrobotbase_t *rb, float base_h, float base_s, float base_v) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(base_h) || !isfinite(base_s) || !isfinite(base_v)) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (base_s < 0.0f || base_s > 100.0f || base_v < 0.0f || base_v > 100.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    float norm_h = fmodf(base_h, 360.0f);
    if (norm_h < 0.0f) {
        norm_h += 360.0f;
    }
    rb->color_cal.base_h = norm_h;
    rb->color_cal.base_s = base_s;
    rb->color_cal.base_v = base_v;
    rb->color_cal.v_scale = (base_v > 5.0f) ? 3.0f : 35.0f;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_set_threshold(pbio_mdrobotbase_t *rb, float max_distance_threshold) {
    if (!rb || !isfinite(max_distance_threshold) || max_distance_threshold <= 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->color_cal.max_distance_threshold = max_distance_threshold;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_set_ambiguity_threshold(pbio_mdrobotbase_t *rb, float threshold) {
    if (!rb || !isfinite(threshold) || threshold < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->color_cal.ambiguity_threshold = threshold;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_add_prototype(pbio_mdrobotbase_t *rb, uint8_t color_id, float h, float s, float v) {
    if (!rb || color_id == 0 || rb->color_cal.num_prototypes >= 32) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(h) || !isfinite(s) || !isfinite(v)) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (h < 0.0f || h >= 360.0f || s < 0.0f || s > 100.0f || v < 0.0f || v > 100.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    float norm_h = h;
    size_t idx = rb->color_cal.num_prototypes;
    float h_rad = norm_h * 3.141592653589793f / 180.0f;
    float v_scale = (rb->color_cal.base_v > 5.0f) ? 3.0f : 35.0f;

    rb->color_cal.prototypes[idx].h = norm_h;
    rb->color_cal.prototypes[idx].s = s;
    rb->color_cal.prototypes[idx].v = v;
    rb->color_cal.prototypes[idx].x = s * cosf(h_rad);
    rb->color_cal.prototypes[idx].y = s * sinf(h_rad);
    rb->color_cal.prototypes[idx].z = v * v_scale;
    rb->color_cal.prototypes[idx].color_id = color_id;

    rb->color_cal.num_prototypes++;
    rb->color_cal.is_calibrated = true;
    return PBIO_SUCCESS;
}

static void mdrobotbase_hsv_to_rgb(float h, float s, float v, float *r, float *g, float *b) {
    if (s < 0.0f) s = 0.0f;
    if (s > 100.0f) s = 100.0f;
    if (v < 0.0f) v = 0.0f;
    if (v > 100.0f) v = 100.0f;
    if (s <= 1e-6f) {
        *r = v;
        *g = v;
        *b = v;
        return;
    }
    h = fmodf(h, 360.0f);
    if (h < 0.0f) {
        h += 360.0f;
    }
    float h_sector = h / 60.0f;
    int i = (int)floorf(h_sector);
    float f = h_sector - (float)i;
    float s_norm = s / 100.0f;
    float p = v * (1.0f - s_norm);
    float q = v * (1.0f - s_norm * f);
    float t = v * (1.0f - s_norm * (1.0f - f));
    switch (i % 6) {
        case 0: *r = v; *g = t; *b = p; break;
        case 1: *r = q; *g = v; *b = p; break;
        case 2: *r = p; *g = v; *b = t; break;
        case 3: *r = p; *g = q; *b = v; break;
        case 4: *r = t; *g = p; *b = v; break;
        case 5: *r = v; *g = p; *b = q; break;
        default: *r = v; *g = v; *b = v; break;
    }
}

float pbio_mdrobotbase_circular_hue_distance(float h1, float h2) {
    if (!isfinite(h1) || !isfinite(h2)) {
        return 180.0f;
    }
    h1 = fmodf(h1, 360.0f);
    if (h1 < 0.0f) {
        h1 += 360.0f;
    }
    h2 = fmodf(h2, 360.0f);
    if (h2 < 0.0f) {
        h2 += 360.0f;
    }
    float diff = fabsf(h1 - h2);
    return (diff <= 180.0f) ? diff : (360.0f - diff);
}

static inline float mdrobotbase_srgb_to_linear(float c) {
    if (c <= 0.04045f) {
        return c / 12.92f;
    }
    return powf((c + 0.055f) / 1.055f, 2.4f);
}

static inline float mdrobotbase_lab_f(float t) {
    if (t > 0.00885645f) {
        return powf(t, 1.0f / 3.0f);
    }
    return 7.787037f * t + 0.137931034f;
}

pbio_error_t pbio_mdrobotbase_rgb_to_lab(float r, float g, float b, float *l, float *a, float *b_val) {
    if (!l || !a || !b_val) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(r) || !isfinite(g) || !isfinite(b) ||
        r < 0.0f || r > 100.0f ||
        g < 0.0f || g > 100.0f ||
        b < 0.0f || b > 100.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    // Single unambiguous contract: [0.0, 100.0] percentage scale mapped to [0.0, 1.0] for D65
    float r_norm = r / 100.0f;
    float g_norm = g / 100.0f;
    float b_norm = b / 100.0f;

    float r_lin = mdrobotbase_srgb_to_linear(r_norm);
    float g_lin = mdrobotbase_srgb_to_linear(g_norm);
    float b_lin = mdrobotbase_srgb_to_linear(b_norm);

    // Standard D65 Matrix
    float x = 0.4124564f * r_lin + 0.3575761f * g_lin + 0.1804375f * b_lin;
    float y = 0.2126729f * r_lin + 0.7151522f * g_lin + 0.0721750f * b_lin;
    float z = 0.0193339f * r_lin + 0.1191920f * g_lin + 0.9503041f * b_lin;

    float xr = x / 0.95047f;
    float yr = y / 1.00000f;
    float zr = z / 1.08883f;

    float fx = mdrobotbase_lab_f(xr);
    float fy = mdrobotbase_lab_f(yr);
    float fz = mdrobotbase_lab_f(zr);

    *l = 116.0f * fy - 16.0f;
    *a = 500.0f * (fx - fy);
    *b_val = 200.0f * (fy - fz);
    return PBIO_SUCCESS;
}

static inline float mdrobotbase_fmaxf(float a, float b) {
    return (a > b) ? a : b;
}

static inline float mdrobotbase_fminf(float a, float b) {
    return (a < b) ? a : b;
}

static void mdrobotbase_rgb_to_hsv(float r, float g, float b, float *h, float *s, float *v) {
    float max_c = mdrobotbase_fmaxf(r, mdrobotbase_fmaxf(g, b));
    float min_c = mdrobotbase_fminf(r, mdrobotbase_fminf(g, b));
    float delta = max_c - min_c;
    *v = max_c;
    if (max_c <= 1e-6f || delta <= 1e-6f) {
        *h = 0.0f;
        *s = 0.0f;
        return;
    }
    *s = (delta / max_c) * 100.0f;
    float hue = 0.0f;
    if (max_c == r) {
        hue = 60.0f * fmodf((g - b) / delta, 6.0f);
    } else if (max_c == g) {
        hue = 60.0f * (((b - r) / delta) + 2.0f);
    } else {
        hue = 60.0f * (((r - g) / delta) + 4.0f);
    }
    if (hue < 0.0f) {
        hue += 360.0f;
    }
    *h = hue;
}

pbio_error_t pbio_mdrobotbase_color_classify_hsv(pbio_mdrobotbase_t *rb, float h, float s, float v, uint8_t *color_id, float *distance, float *confidence) {
    if (!rb || !color_id || !distance || !confidence) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(h) || !isfinite(s) || !isfinite(v) || h < 0.0f || h >= 360.0f || s < 0.0f || s > 100.0f || v < 0.0f || v > 100.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }

    if (rb->color_cal.num_prototypes == 0) {
        *color_id = 0; // Color.NONE
        *distance = 999999.0f;
        *confidence = 0.0f;
        return PBIO_SUCCESS;
    }

    float s_r = 0.0f, s_g = 0.0f, s_b = 0.0f;
    mdrobotbase_hsv_to_rgb(h, s, v, &s_r, &s_g, &s_b);
    float s_l = 0.0f, s_a = 0.0f, s_b_val = 0.0f;
    pbio_mdrobotbase_rgb_to_lab(s_r, s_g, s_b, &s_l, &s_a, &s_b_val);

    const float wh = 0.40f;
    const float ws = 0.20f;
    const float wv = 0.10f;
    const float wlab = 0.30f;

    float min_d = 999999.0f;
    float second_min_d = 999999.0f;
    uint8_t best_id = 0;

    for (size_t i = 0; i < rb->color_cal.num_prototypes; i++) {
        float dh = pbio_mdrobotbase_circular_hue_distance(h, rb->color_cal.prototypes[i].h);
        float dh_norm = dh / 180.0f;
        float ds_norm = fabsf(s - rb->color_cal.prototypes[i].s) / 100.0f;
        float dv_norm = fabsf(v - rb->color_cal.prototypes[i].v) / 100.0f;

        float p_r = 0.0f, p_g = 0.0f, p_b = 0.0f;
        mdrobotbase_hsv_to_rgb(rb->color_cal.prototypes[i].h, rb->color_cal.prototypes[i].s, rb->color_cal.prototypes[i].v, &p_r, &p_g, &p_b);
        float p_l = 0.0f, p_a = 0.0f, p_b_val = 0.0f;
        pbio_mdrobotbase_rgb_to_lab(p_r, p_g, p_b, &p_l, &p_a, &p_b_val);

        float dl = s_l - p_l;
        float da = s_a - p_a;
        float db = s_b_val - p_b_val;
        float dE = sqrtf(dl * dl + da * da + db * db);
        float dE_norm = dE / 100.0f;
        if (dE_norm > 1.0f) {
            dE_norm = 1.0f;
        }

        float d_norm = sqrtf(wh * dh_norm * dh_norm +
                             ws * ds_norm * ds_norm +
                             wv * dv_norm * dv_norm +
                             wlab * dE_norm * dE_norm);
        float dist = d_norm * 100.0f;

        if (dist < min_d) {
            second_min_d = min_d;
            min_d = dist;
            best_id = rb->color_cal.prototypes[i].color_id;
        } else if (dist < second_min_d) {
            second_min_d = dist;
        }
    }

    float max_thresh = (rb->color_cal.max_distance_threshold > 0.0f) ? rb->color_cal.max_distance_threshold : 40.0f;
    float ambig_thresh = (rb->color_cal.ambiguity_threshold >= 0.0f) ? rb->color_cal.ambiguity_threshold : (0.15f * max_thresh);

    if (min_d > max_thresh) {
        *color_id = 0; // Color.NONE
        *distance = min_d;
        *confidence = 0.0f;
        return PBIO_SUCCESS;
    }

    float conf = 0.0f;
    if (rb->color_cal.num_prototypes == 1) {
        conf = 1.0f;
    } else {
        float margin = second_min_d - min_d;
        conf = margin / (second_min_d + min_d + 1e-6f);
    }
    if (conf < 0.0f) {
        conf = 0.0f;
    } else if (conf > 1.0f) {
        conf = 1.0f;
    }

    if (rb->color_cal.num_prototypes > 1 && (second_min_d - min_d) < ambig_thresh) {
        *color_id = 0; // Color.NONE
        *distance = min_d;
        *confidence = conf;
        return PBIO_SUCCESS;
    }

    *color_id = best_id;
    *distance = min_d;
    *confidence = conf;

    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_set_black_reference(pbio_mdrobotbase_t *rb, float r, float g, float b) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(r) || !isfinite(g) || !isfinite(b) || r < 0.0f || g < 0.0f || b < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (rb->color_cal.has_white_ref) {
        if (rb->color_cal.white_ref[0] <= r + 5.0f ||
            rb->color_cal.white_ref[1] <= g + 5.0f ||
            rb->color_cal.white_ref[2] <= b + 5.0f) {
            return PBIO_ERROR_INVALID_ARG;
        }
        rb->color_cal.gain[0] = 1.0f / (rb->color_cal.white_ref[0] - r);
        rb->color_cal.gain[1] = 1.0f / (rb->color_cal.white_ref[1] - g);
        rb->color_cal.gain[2] = 1.0f / (rb->color_cal.white_ref[2] - b);
    }
    rb->color_cal.black_ref[0] = r;
    rb->color_cal.black_ref[1] = g;
    rb->color_cal.black_ref[2] = b;
    rb->color_cal.has_black_ref = true;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_set_white_reference(pbio_mdrobotbase_t *rb, float r, float g, float b) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(r) || !isfinite(g) || !isfinite(b) || r < 0.0f || g < 0.0f || b < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    float r0 = rb->color_cal.has_black_ref ? rb->color_cal.black_ref[0] : 0.0f;
    float g0 = rb->color_cal.has_black_ref ? rb->color_cal.black_ref[1] : 0.0f;
    float b0 = rb->color_cal.has_black_ref ? rb->color_cal.black_ref[2] : 0.0f;

    if (r <= r0 + 5.0f || g <= g0 + 5.0f || b <= b0 + 5.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }

    rb->color_cal.gain[0] = 1.0f / (r - r0);
    rb->color_cal.gain[1] = 1.0f / (g - g0);
    rb->color_cal.gain[2] = 1.0f / (b - b0);

    rb->color_cal.white_ref[0] = r;
    rb->color_cal.white_ref[1] = g;
    rb->color_cal.white_ref[2] = b;
    rb->color_cal.has_white_ref = true;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_normalize(pbio_mdrobotbase_t *rb, float r, float g, float b, float *r_norm, float *g_norm, float *b_norm) {
    if (!rb || !r_norm || !g_norm || !b_norm) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(r) || !isfinite(g) || !isfinite(b) || r < 0.0f || g < 0.0f || b < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    float r0 = rb->color_cal.has_black_ref ? rb->color_cal.black_ref[0] : 0.0f;
    float g0 = rb->color_cal.has_black_ref ? rb->color_cal.black_ref[1] : 0.0f;
    float b0 = rb->color_cal.has_black_ref ? rb->color_cal.black_ref[2] : 0.0f;

    float kr = rb->color_cal.gain[0];
    float kg = rb->color_cal.gain[1];
    float kb = rb->color_cal.gain[2];

    float rn = (r - r0) * kr;
    float gn = (g - g0) * kg;
    float bn = (b - b0) * kb;

    if (rn < 0.0f) rn = 0.0f; else if (rn > 1.0f) rn = 1.0f;
    if (gn < 0.0f) gn = 0.0f; else if (gn > 1.0f) gn = 1.0f;
    if (bn < 0.0f) bn = 0.0f; else if (bn > 1.0f) bn = 1.0f;

    *r_norm = rn;
    *g_norm = gn;
    *b_norm = bn;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_classify_rgb(pbio_mdrobotbase_t *rb, float r, float g, float b, uint8_t *color_id, float *distance, float *confidence) {
    if (!rb || !color_id || !distance || !confidence) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(r) || !isfinite(g) || !isfinite(b) ||
        r < 0.0f || r > 100.0f ||
        g < 0.0f || g > 100.0f ||
        b < 0.0f || b > 100.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }

    float in_r = r;
    float in_g = g;
    float in_b = b;

    if (rb->color_cal.has_black_ref || rb->color_cal.has_white_ref) {
        float rn = 0.0f, gn = 0.0f, bn = 0.0f;
        pbio_error_t err = pbio_mdrobotbase_color_normalize(rb, r, g, b, &rn, &gn, &bn);
        if (err != PBIO_SUCCESS) {
            return err;
        }
        in_r = rn * 100.0f;
        in_g = gn * 100.0f;
        in_b = bn * 100.0f;
    }

    float h = 0.0f, s = 0.0f, v = 0.0f;
    mdrobotbase_rgb_to_hsv(in_r, in_g, in_b, &h, &s, &v);
    return pbio_mdrobotbase_color_classify_hsv(rb, h, s, v, color_id, distance, confidence);
}

pbio_error_t pbio_mdrobotbase_color_cal_classify(pbio_mdrobotbase_t *rb, float h, float s, float v, uint8_t *matched_color_id, float *min_distance) {
    if (!matched_color_id) {
        return PBIO_ERROR_INVALID_ARG;
    }
    *matched_color_id = 0;
    float confidence = 0.0f;
    return pbio_mdrobotbase_color_classify_hsv(rb, h, s, v, matched_color_id, min_distance, &confidence);
}

// Multi-Sample Statistical Prototype Calibration Implementation (G-MDRB-031)
pbio_error_t pbio_mdrobotbase_color_cal_add_sample(pbio_mdrobotbase_t *rb, uint8_t color_id, float r, float g, float b) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(r) || !isfinite(g) || !isfinite(b) ||
        r < 0.0f || r > 100.0f ||
        g < 0.0f || g > 100.0f ||
        b < 0.0f || b > 100.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (color_id == 0) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (rb->color_cal.sample_acc.color_id != color_id) {
        rb->color_cal.sample_acc.color_id = color_id;
        rb->color_cal.sample_acc.count = 0;
    }
    if (rb->color_cal.sample_acc.count >= 32) {
        return PBIO_ERROR_INVALID_OP;
    }

    float in_r = r, in_g = g, in_b = b;
    if (rb->color_cal.has_black_ref || rb->color_cal.has_white_ref) {
        float rn = 0.0f, gn = 0.0f, bn = 0.0f;
        pbio_error_t err = pbio_mdrobotbase_color_normalize(rb, r, g, b, &rn, &gn, &bn);
        if (err != PBIO_SUCCESS) {
            return err;
        }
        in_r = rn * 100.0f;
        in_g = gn * 100.0f;
        in_b = bn * 100.0f;
    }

    uint16_t idx = rb->color_cal.sample_acc.count;
    rb->color_cal.sample_acc.r[idx] = in_r;
    rb->color_cal.sample_acc.g[idx] = in_g;
    rb->color_cal.sample_acc.b[idx] = in_b;

    float h = 0.0f, s = 0.0f, v = 0.0f;
    mdrobotbase_rgb_to_hsv(in_r, in_g, in_b, &h, &s, &v);
    rb->color_cal.sample_acc.h[idx] = h;
    rb->color_cal.sample_acc.s[idx] = s;
    rb->color_cal.sample_acc.v[idx] = v;

    float l = 0.0f, a = 0.0f, b_lab = 0.0f;
    pbio_mdrobotbase_rgb_to_lab(in_r, in_g, in_b, &l, &a, &b_lab);
    rb->color_cal.sample_acc.l[idx] = l;
    rb->color_cal.sample_acc.a[idx] = a;
    rb->color_cal.sample_acc.b_lab[idx] = b_lab;

    rb->color_cal.sample_acc.count++;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_add_sample_hsv(pbio_mdrobotbase_t *rb, uint8_t color_id, float h, float s, float v) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(h) || !isfinite(s) || !isfinite(v) ||
        h < 0.0f || h >= 360.0f ||
        s < 0.0f || s > 100.0f ||
        v < 0.0f || v > 100.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (color_id == 0) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (rb->color_cal.sample_acc.color_id != color_id) {
        rb->color_cal.sample_acc.color_id = color_id;
        rb->color_cal.sample_acc.count = 0;
    }
    if (rb->color_cal.sample_acc.count >= 32) {
        return PBIO_ERROR_INVALID_OP;
    }

    uint16_t idx = rb->color_cal.sample_acc.count;
    float norm_h = fmodf(h, 360.0f);
    if (norm_h < 0.0f) {
        norm_h += 360.0f;
    }
    rb->color_cal.sample_acc.h[idx] = norm_h;
    rb->color_cal.sample_acc.s[idx] = s;
    rb->color_cal.sample_acc.v[idx] = v;

    float r = 0.0f, g = 0.0f, b = 0.0f;
    mdrobotbase_hsv_to_rgb(norm_h, s, v, &r, &g, &b);
    rb->color_cal.sample_acc.r[idx] = r;
    rb->color_cal.sample_acc.g[idx] = g;
    rb->color_cal.sample_acc.b[idx] = b;

    float l = 0.0f, a = 0.0f, b_lab = 0.0f;
    pbio_mdrobotbase_rgb_to_lab(r, g, b, &l, &a, &b_lab);
    rb->color_cal.sample_acc.l[idx] = l;
    rb->color_cal.sample_acc.a[idx] = a;
    rb->color_cal.sample_acc.b_lab[idx] = b_lab;

    rb->color_cal.sample_acc.count++;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_finalize_class(pbio_mdrobotbase_t *rb, uint8_t color_id) {
    if (!rb || color_id == 0) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (rb->color_cal.sample_acc.color_id != color_id || rb->color_cal.sample_acc.count < 5) {
        return PBIO_ERROR_INVALID_OP;
    }

    uint16_t n = rb->color_cal.sample_acc.count;
    const float deg_to_rad = 3.14159265358979323846f / 180.0f;
    const float rad_to_deg = 180.0f / 3.14159265358979323846f;

    // Pass 1: Compute initial circular mean hue and initial standard deviations
    float sum_sin = 0.0f;
    float sum_cos = 0.0f;
    float sum_s = 0.0f, sum_v = 0.0f;
    float sum_l = 0.0f, sum_a = 0.0f, sum_b = 0.0f;

    for (uint16_t i = 0; i < n; i++) {
        float rad = rb->color_cal.sample_acc.h[i] * deg_to_rad;
        sum_sin += sinf(rad);
        sum_cos += cosf(rad);
        sum_s += rb->color_cal.sample_acc.s[i];
        sum_v += rb->color_cal.sample_acc.v[i];
        sum_l += rb->color_cal.sample_acc.l[i];
        sum_a += rb->color_cal.sample_acc.a[i];
        sum_b += rb->color_cal.sample_acc.b_lab[i];
    }

    float init_mean_h = atan2f(sum_sin, sum_cos) * rad_to_deg;
    if (init_mean_h < 0.0f) init_mean_h += 360.0f;
    if (init_mean_h >= 360.0f) init_mean_h = 0.0f;

    float init_mean_s = sum_s / (float)n;
    float init_mean_v = sum_v / (float)n;
    float init_mean_l = sum_l / (float)n;
    float init_mean_a = sum_a / (float)n;
    float init_mean_b = sum_b / (float)n;

    float sum_sq_dh = 0.0f;
    float sum_sq_ds = 0.0f;
    float sum_sq_dv = 0.0f;
    float sum_sq_lab = 0.0f;

    for (uint16_t i = 0; i < n; i++) {
        float dh = pbio_mdrobotbase_circular_hue_distance(rb->color_cal.sample_acc.h[i], init_mean_h);
        sum_sq_dh += dh * dh;
        float ds = rb->color_cal.sample_acc.s[i] - init_mean_s;
        sum_sq_ds += ds * ds;
        float dv = rb->color_cal.sample_acc.v[i] - init_mean_v;
        sum_sq_dv += dv * dv;
        float dl = rb->color_cal.sample_acc.l[i] - init_mean_l;
        float da = rb->color_cal.sample_acc.a[i] - init_mean_a;
        float db = rb->color_cal.sample_acc.b_lab[i] - init_mean_b;
        sum_sq_lab += dl * dl + da * da + db * db;
    }

    float sigma_h = sqrtf(sum_sq_dh / (float)(n - 1));
    float sigma_s = sqrtf(sum_sq_ds / (float)(n - 1));
    float sigma_v = sqrtf(sum_sq_dv / (float)(n - 1));
    float sigma_lab = sqrtf(sum_sq_lab / (float)(n - 1));

    // Pass 2: Outlier rejection if n >= 10
    bool keep[32];
    uint16_t kept_count = 0;
    if (n >= 10) {
        for (uint16_t i = 0; i < n; i++) {
            float dh = pbio_mdrobotbase_circular_hue_distance(rb->color_cal.sample_acc.h[i], init_mean_h);
            float ds = fabsf(rb->color_cal.sample_acc.s[i] - init_mean_s);
            float dv = fabsf(rb->color_cal.sample_acc.v[i] - init_mean_v);
            float dl = rb->color_cal.sample_acc.l[i] - init_mean_l;
            float da = rb->color_cal.sample_acc.a[i] - init_mean_a;
            float db = rb->color_cal.sample_acc.b_lab[i] - init_mean_b;
            float d_lab = sqrtf(dl * dl + da * da + db * db);

            bool is_outlier = false;
            if (sigma_h > 0.1f && dh > 2.5f * sigma_h) is_outlier = true;
            if (sigma_s > 0.1f && ds > 2.5f * sigma_s) is_outlier = true;
            if (sigma_v > 0.1f && dv > 2.5f * sigma_v) is_outlier = true;
            if (sigma_lab > 0.1f && d_lab > 2.5f * sigma_lab) is_outlier = true;

            keep[i] = !is_outlier;
            if (keep[i]) kept_count++;
        }
    } else {
        for (uint16_t i = 0; i < n; i++) {
            keep[i] = true;
        }
        kept_count = n;
    }

    // Guard: ensure at least 3 samples remain after filtering
    if (kept_count < 3) {
        for (uint16_t i = 0; i < n; i++) {
            keep[i] = true;
        }
        kept_count = n;
    }

    // Pass 3: Recompute final centroid and sample variances over kept samples
    sum_sin = 0.0f; sum_cos = 0.0f;
    sum_s = 0.0f; sum_v = 0.0f;
    sum_l = 0.0f; sum_a = 0.0f; sum_b = 0.0f;

    for (uint16_t i = 0; i < n; i++) {
        if (!keep[i]) continue;
        float rad = rb->color_cal.sample_acc.h[i] * deg_to_rad;
        sum_sin += sinf(rad);
        sum_cos += cosf(rad);
        sum_s += rb->color_cal.sample_acc.s[i];
        sum_v += rb->color_cal.sample_acc.v[i];
        sum_l += rb->color_cal.sample_acc.l[i];
        sum_a += rb->color_cal.sample_acc.a[i];
        sum_b += rb->color_cal.sample_acc.b_lab[i];
    }

    float final_mean_h = atan2f(sum_sin, sum_cos) * rad_to_deg;
    if (final_mean_h < 0.0f) final_mean_h += 360.0f;
    if (final_mean_h >= 360.0f) final_mean_h = 0.0f;

    float final_mean_s = sum_s / (float)kept_count;
    float final_mean_v = sum_v / (float)kept_count;
    float final_mean_l = sum_l / (float)kept_count;
    float final_mean_a = sum_a / (float)kept_count;
    float final_mean_b = sum_b / (float)kept_count;

    sum_sq_dh = 0.0f;
    sum_sq_ds = 0.0f;
    sum_sq_dv = 0.0f;
    sum_sq_lab = 0.0f;

    for (uint16_t i = 0; i < n; i++) {
        if (!keep[i]) continue;
        float dh = pbio_mdrobotbase_circular_hue_distance(rb->color_cal.sample_acc.h[i], final_mean_h);
        sum_sq_dh += dh * dh;
        float ds = rb->color_cal.sample_acc.s[i] - final_mean_s;
        sum_sq_ds += ds * ds;
        float dv = rb->color_cal.sample_acc.v[i] - final_mean_v;
        sum_sq_dv += dv * dv;
        float dl = rb->color_cal.sample_acc.l[i] - final_mean_l;
        float da = rb->color_cal.sample_acc.a[i] - final_mean_a;
        float db = rb->color_cal.sample_acc.b_lab[i] - final_mean_b;
        sum_sq_lab += dl * dl + da * da + db * db;
    }

    float divisor = (kept_count > 1) ? (float)(kept_count - 1) : 1.0f;
    float final_var_h = sum_sq_dh / divisor;
    float final_var_s = sum_sq_ds / divisor;
    float final_var_v = sum_sq_dv / divisor;
    float final_var_lab = sum_sq_lab / divisor;

    // Save into classes table
    size_t target_idx = rb->color_cal.num_classes;
    for (size_t i = 0; i < rb->color_cal.num_classes; i++) {
        if (rb->color_cal.classes[i].color_id == color_id) {
            target_idx = i;
            break;
        }
    }
    if (target_idx == rb->color_cal.num_classes && rb->color_cal.num_classes < 32) {
        rb->color_cal.num_classes++;
    }

    if (target_idx < 32) {
        rb->color_cal.classes[target_idx].color_id = color_id;
        rb->color_cal.classes[target_idx].mean_h = final_mean_h;
        rb->color_cal.classes[target_idx].mean_s = final_mean_s;
        rb->color_cal.classes[target_idx].mean_v = final_mean_v;
        rb->color_cal.classes[target_idx].mean_l = final_mean_l;
        rb->color_cal.classes[target_idx].mean_a = final_mean_a;
        rb->color_cal.classes[target_idx].mean_b = final_mean_b;
        rb->color_cal.classes[target_idx].var_h = final_var_h;
        rb->color_cal.classes[target_idx].var_s = final_var_s;
        rb->color_cal.classes[target_idx].var_v = final_var_v;
        rb->color_cal.classes[target_idx].var_lab = final_var_lab;
        rb->color_cal.classes[target_idx].sample_count = kept_count;
    }

    // Also update prototypes table with clean centroid
    size_t proto_idx = rb->color_cal.num_prototypes;
    for (size_t i = 0; i < rb->color_cal.num_prototypes; i++) {
        if (rb->color_cal.prototypes[i].color_id == color_id) {
            proto_idx = i;
            break;
        }
    }
    if (proto_idx == rb->color_cal.num_prototypes && rb->color_cal.num_prototypes < 32) {
        rb->color_cal.num_prototypes++;
    }
    if (proto_idx < 32) {
        rb->color_cal.prototypes[proto_idx].color_id = color_id;
        rb->color_cal.prototypes[proto_idx].h = final_mean_h;
        rb->color_cal.prototypes[proto_idx].s = final_mean_s;
        rb->color_cal.prototypes[proto_idx].v = final_mean_v;
    }

    // Reset sample accumulator
    rb->color_cal.sample_acc.count = 0;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_get_class(pbio_mdrobotbase_t *rb, uint8_t color_id, pbio_mdrobotbase_color_class_t *out_class) {
    if (!rb || !out_class || color_id == 0) {
        return PBIO_ERROR_INVALID_ARG;
    }
    for (size_t i = 0; i < rb->color_cal.num_classes; i++) {
        if (rb->color_cal.classes[i].color_id == color_id) {
            *out_class = rb->color_cal.classes[i];
            return PBIO_SUCCESS;
        }
    }
    return PBIO_ERROR_INVALID_OP;
}

pbio_error_t pbio_mdrobotbase_color_cal_export_profile(const pbio_mdrobotbase_t *rb, pbio_mdrobotbase_color_profile_t *profile) {
    if (!rb || !profile) {
        return PBIO_ERROR_INVALID_ARG;
    }
    memset(profile, 0, sizeof(*profile));
    profile->version = 1;
    profile->has_black_ref = rb->color_cal.has_black_ref;
    profile->has_white_ref = rb->color_cal.has_white_ref;
    profile->black_ref[0] = rb->color_cal.black_ref[0];
    profile->black_ref[1] = rb->color_cal.black_ref[1];
    profile->black_ref[2] = rb->color_cal.black_ref[2];
    profile->white_ref[0] = rb->color_cal.white_ref[0];
    profile->white_ref[1] = rb->color_cal.white_ref[1];
    profile->white_ref[2] = rb->color_cal.white_ref[2];
    profile->threshold = rb->color_cal.max_distance_threshold;
    profile->ambiguity_threshold = rb->color_cal.ambiguity_threshold;

    profile->num_prototypes = (uint8_t)rb->color_cal.num_prototypes;
    for (size_t i = 0; i < rb->color_cal.num_prototypes && i < 32; i++) {
        profile->prototypes[i].color_id = rb->color_cal.prototypes[i].color_id;
        profile->prototypes[i].h = rb->color_cal.prototypes[i].h;
        profile->prototypes[i].s = rb->color_cal.prototypes[i].s;
        profile->prototypes[i].v = rb->color_cal.prototypes[i].v;
    }

    profile->num_classes = (uint8_t)rb->color_cal.num_classes;
    for (size_t i = 0; i < rb->color_cal.num_classes && i < 32; i++) {
        profile->classes[i] = rb->color_cal.classes[i];
    }
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_load_profile(pbio_mdrobotbase_t *rb, const pbio_mdrobotbase_color_profile_t *profile) {
    if (!rb || !profile) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (profile->version != 1) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (profile->num_prototypes > 32 || profile->num_classes > 32) {
        return PBIO_ERROR_INVALID_ARG;
    }

    // Step 1: Copy robot base context into temporary structure to guarantee transactional atomicity
    pbio_mdrobotbase_t temp_rb = *rb;

    // Step 2: Validate and load the entire profile into the temporary state
    pbio_error_t err = pbio_mdrobotbase_color_cal_reset(&temp_rb);
    if (err != PBIO_SUCCESS) {
        return err;
    }

    if (profile->has_black_ref) {
        err = pbio_mdrobotbase_color_cal_set_black_reference(&temp_rb, profile->black_ref[0], profile->black_ref[1], profile->black_ref[2]);
        if (err != PBIO_SUCCESS) {
            return err;
        }
    }
    if (profile->has_white_ref) {
        err = pbio_mdrobotbase_color_cal_set_white_reference(&temp_rb, profile->white_ref[0], profile->white_ref[1], profile->white_ref[2]);
        if (err != PBIO_SUCCESS) {
            return err;
        }
    }

    if (profile->threshold > 0.0f) {
        err = pbio_mdrobotbase_color_cal_set_threshold(&temp_rb, profile->threshold);
        if (err != PBIO_SUCCESS) {
            return err;
        }
    } else if (profile->threshold < 0.0f || !isfinite(profile->threshold)) {
        return PBIO_ERROR_INVALID_ARG;
    }

    err = pbio_mdrobotbase_color_cal_set_ambiguity_threshold(&temp_rb, profile->ambiguity_threshold);
    if (err != PBIO_SUCCESS) {
        return err;
    }

    for (uint8_t i = 0; i < profile->num_prototypes; i++) {
        err = pbio_mdrobotbase_color_cal_add_prototype(&temp_rb, profile->prototypes[i].color_id, profile->prototypes[i].h, profile->prototypes[i].s, profile->prototypes[i].v);
        if (err != PBIO_SUCCESS) {
            return err;
        }
    }

    temp_rb.color_cal.num_classes = profile->num_classes;
    for (size_t i = 0; i < temp_rb.color_cal.num_classes; i++) {
        temp_rb.color_cal.classes[i] = profile->classes[i];
    }

    // Step 3: All operations succeeded: atomically commit temporary state to live robotbase
    rb->color_cal = temp_rb.color_cal;
    return PBIO_SUCCESS;
}
