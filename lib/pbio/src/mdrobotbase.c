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
#ifdef PBIO_CONFIG_SERVO_NUM_DEV
#define PBIO_CONFIG_NUM_MDROBOTBASES (PBIO_CONFIG_SERVO_NUM_DEV / 2)
#else
#define PBIO_CONFIG_NUM_MDROBOTBASES 2
#endif
#endif

#if PBIO_CONFIG_NUM_MDROBOTBASES < 2
#undef PBIO_CONFIG_NUM_MDROBOTBASES
#define PBIO_CONFIG_NUM_MDROBOTBASES 2
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

    // Set default LQR gains
    rb->k_x = 1.0f;
    rb->k_y = 1.0f;
    rb->k_theta = 1.0f;
    rb->lqr_schedule_enabled = true;

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

    // Reject duplicate or overlapping motor allocations
    for (int i = 0; i < PBIO_CONFIG_NUM_MDROBOTBASES; i++) {
        pbio_mdrobotbase_t *rb = &mdrobotbases[i];
        if (mdrobotbase_in_use[i] &&
            (rb->left == left || rb->left == right ||
             rb->right == left || rb->right == right)) {
            return PBIO_ERROR_BUSY;
        }
    }

    // Scan for the first free pool slot
    int slot = -1;
    for (int i = 0; i < PBIO_CONFIG_NUM_MDROBOTBASES; i++) {
        if (!mdrobotbase_in_use[i]) {
            slot = i;
            break;
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

pbio_error_t pbio_mdrobotbase_set_lqr_gains(pbio_mdrobotbase_t *rb, float k_x, float k_y, float k_theta, bool schedule) {
    if (!rb || !isfinite(k_x) || !isfinite(k_y) || !isfinite(k_theta) || k_x < 0.0f || k_y < 0.0f || k_theta < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->k_x = k_x;
    rb->k_y = k_y;
    rb->k_theta = k_theta;
    rb->lqr_schedule_enabled = schedule;
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
    if (status < PBIO_MDROBOTBASE_STATUS_NONE || status > PBIO_MDROBOTBASE_STATUS_TIMED_OUT) {
        return PBIO_ERROR_INVALID_ARG;
    }

    // Fail-closed guard for current status corruption
    pbio_mdrobotbase_motion_status_t cur_status = rb->motion_status;
    if (cur_status < PBIO_MDROBOTBASE_STATUS_NONE || cur_status > PBIO_MDROBOTBASE_STATUS_TIMED_OUT) {
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
    return (int32_t)lroundf(product);
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
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_set_baseline(pbio_mdrobotbase_t *rb, float base_h, float base_s, float base_v) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->color_cal.base_h = base_h;
    rb->color_cal.base_s = base_s;
    rb->color_cal.base_v = base_v;
    rb->color_cal.v_scale = (base_v > 5.0f) ? 3.0f : 35.0f;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_set_threshold(pbio_mdrobotbase_t *rb, float max_distance_threshold) {
    if (!rb || max_distance_threshold <= 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->color_cal.max_distance_threshold = max_distance_threshold;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_cal_add_prototype(pbio_mdrobotbase_t *rb, uint8_t color_id, float h, float s, float v) {
    if (!rb || rb->color_cal.num_prototypes >= 32) {
        return PBIO_ERROR_INVALID_ARG;
    }
    size_t idx = rb->color_cal.num_prototypes;
    float h_rad = h * 3.141592653589793f / 180.0f;
    float v_scale = (rb->color_cal.base_v > 5.0f) ? 3.0f : 35.0f;
    
    rb->color_cal.prototypes[idx].h = h;
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

static void mdrobotbase_rgb_to_hsv(float r, float g, float b, float *h, float *s, float *v) {
    float max_c = fmaxf(r, fmaxf(g, b));
    float min_c = fminf(r, fminf(g, b));
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
    if (!isfinite(h) || !isfinite(s) || !isfinite(v) || h < 0.0f || s < 0.0f || v < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    
    if (rb->color_cal.num_prototypes == 0) {
        *color_id = 0; // Color.NONE
        *distance = 999999.0f;
        *confidence = 0.0f;
        return PBIO_SUCCESS;
    }
    
    float h_rad = h * 3.141592653589793f / 180.0f;
    float v_scale = (rb->color_cal.base_v > 5.0f) ? 3.0f : 35.0f;
    float x = s * cosf(h_rad);
    float y = s * sinf(h_rad);
    float z = v * v_scale;
    
    float min_d = 999999.0f;
    float second_min_d = 999999.0f;
    uint8_t best_id = 0;
    
    for (size_t i = 0; i < rb->color_cal.num_prototypes; i++) {
        float dx = x - rb->color_cal.prototypes[i].x;
        float dy = y - rb->color_cal.prototypes[i].y;
        float dz = z - rb->color_cal.prototypes[i].z;
        float dist = sqrtf(dx * dx + dy * dy + dz * dz);
        
        if (dist < min_d) {
            second_min_d = min_d;
            min_d = dist;
            best_id = rb->color_cal.prototypes[i].color_id;
        } else if (dist < second_min_d) {
            second_min_d = dist;
        }
    }
    
    float max_thresh = (rb->color_cal.max_distance_threshold > 0.0f) ? rb->color_cal.max_distance_threshold : 40.0f;
    if (min_d > max_thresh) {
        *color_id = 0; // Color.NONE
        *distance = min_d;
        *confidence = 0.0f;
        return PBIO_SUCCESS;
    }
    
    *color_id = best_id;
    *distance = min_d;
    
    float conf = 0.0f;
    if (rb->color_cal.num_prototypes == 1) {
        conf = 1.0f - (min_d / max_thresh);
    } else {
        float margin = second_min_d - min_d;
        conf = margin / (second_min_d + min_d + 1e-4f);
    }
    if (conf < 0.0f) {
        conf = 0.0f;
    } else if (conf > 1.0f) {
        conf = 1.0f;
    }
    *confidence = conf;
    
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_color_classify_rgb(pbio_mdrobotbase_t *rb, float r, float g, float b, uint8_t *color_id, float *distance, float *confidence) {
    if (!rb || !color_id || !distance || !confidence) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (!isfinite(r) || !isfinite(g) || !isfinite(b) || r < 0.0f || g < 0.0f || b < 0.0f) {
        return PBIO_ERROR_INVALID_ARG;
    }
    
    float h = 0.0f, s = 0.0f, v = 0.0f;
    mdrobotbase_rgb_to_hsv(r, g, b, &h, &s, &v);
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


