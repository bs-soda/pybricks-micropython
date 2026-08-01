#include <math.h>
#include <stdlib.h>
#include <pbio/error.h>
#include <pbio/mdrobotbase.h>
#include <pbio/imu.h>
#include <pbio/control_settings.h>

#ifndef PBIO_CONFIG_NUM_MDROBOTBASES
#define PBIO_CONFIG_NUM_MDROBOTBASES 1
#endif

static pbio_mdrobotbase_t mdrobotbases[PBIO_CONFIG_NUM_MDROBOTBASES];

pbio_error_t pbio_mdrobotbase_get_robotbase(pbio_mdrobotbase_t **rb_address, pbio_servo_t *left, pbio_servo_t *right, int32_t wheel_diameter_left, int32_t wheel_diameter_right, int32_t axle_track) {
    if (!left || !right) {
        return PBIO_ERROR_INVALID_ARG;
    }
    
    pbio_mdrobotbase_t *rb = &mdrobotbases[0];
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
    
    // Set default PID gains
    rb->kp = 1.0f;
    rb->ki = 0.0f;
    rb->kd = 0.0f;
    
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
    rb->backlash_filter_enabled = true;
    rb->backlash_left_limit = 1.0f;
    rb->backlash_right_limit = 1.0f;
    rb->backlash_left_accum = 0.0f;
    rb->backlash_right_accum = 0.0f;
    rb->max_angular_speed = 1000.0f;
    rb->max_turn_speed = 1000.0f;
    rb->max_pivot_speed = 1000.0f;
    rb->lqr_schedule_enabled = true;
    rb->pid_min_turn = 0.0f;
    rb->pid_min_turn_threshold = 0.15f;
    rb->kp_turn = 1.0f;
    rb->ki_turn = 0.0f;
    rb->kd_turn = 0.0f;
    
    *rb_address = rb;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_lqr_gains(pbio_mdrobotbase_t *rb, float k_x, float k_y, float k_theta, bool schedule) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->k_x = k_x;
    rb->k_y = k_y;
    rb->k_theta = k_theta;
    rb->lqr_schedule_enabled = schedule;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_controller(pbio_mdrobotbase_t *rb, pbio_mdrobotbase_controller_t type) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->controller_type = type;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_pid_gains(pbio_mdrobotbase_t *rb, float kp, float ki, float kd) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->kp = kp;
    rb->ki = ki;
    rb->kd = kd;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_turn_pid_gains(pbio_mdrobotbase_t *rb, float kp, float ki, float kd) {
    if (!rb) {
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
    if (!rb) {
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
    
    rb->theta += delta_theta;
    while (rb->theta > 180.0f) rb->theta -= 360.0f;
    while (rb->theta < -180.0f) rb->theta += 360.0f;
    
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
    if (!rb) {
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
    if (!rb) {
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
    if (!rb) {
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
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    if (left_limit < 0.0f || right_limit < 0.0f) {
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
    if (left <= 0 || right <= 0) {
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
    if (!rb || alpha < 0.0f || alpha > 1.0f) {
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
    if (!rb || ratio <= 0.0f) {
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

pbio_error_t pbio_mdrobotbase_color_cal_classify(pbio_mdrobotbase_t *rb, float h, float s, float v, uint8_t *matched_color_id, float *min_distance) {
    if (!rb || !matched_color_id || !min_distance) {
        return PBIO_ERROR_INVALID_ARG;
    }
    
    if (rb->color_cal.num_prototypes == 0) {
        *matched_color_id = 0; // Color.NONE
        *min_distance = 999999.0f;
        return PBIO_SUCCESS;
    }
    
    float h_rad = h * 3.141592653589793f / 180.0f;
    float v_scale = (rb->color_cal.base_v > 5.0f) ? 3.0f : 35.0f;
    float x = s * cosf(h_rad);
    float y = s * sinf(h_rad);
    float z = v * v_scale;
    
    float min_d = 999999.0f;
    uint8_t best_id = 0; // Defaults to 0 (Color.NONE)
    
    for (size_t i = 0; i < rb->color_cal.num_prototypes; i++) {
        float dx = x - rb->color_cal.prototypes[i].x;
        float dy = y - rb->color_cal.prototypes[i].y;
        float dz = z - rb->color_cal.prototypes[i].z;
        float dist = sqrtf(dx * dx + dy * dy + dz * dz);
        
        if (dist < min_d) {
            min_d = dist;
            best_id = rb->color_cal.prototypes[i].color_id;
        }
    }
    
    // Threshold Guard: If min distance exceeds max_distance_threshold, classify as Color.NONE (0)
    float max_thresh = (rb->color_cal.max_distance_threshold > 0.0f) ? rb->color_cal.max_distance_threshold : 40.0f;
    if (min_d > max_thresh) {
        *matched_color_id = 0; // Color.NONE
    } else {
        *matched_color_id = best_id;
    }
    
    *min_distance = min_d;
    return PBIO_SUCCESS;
}


