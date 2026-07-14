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

pbio_error_t pbio_mdrobotbase_get_robotbase(pbio_mdrobotbase_t **rb_address, pbio_servo_t *left, pbio_servo_t *right, int32_t wheel_diameter, int32_t axle_track) {
    if (!left || !right) {
        return PBIO_ERROR_INVALID_ARG;
    }
    
    pbio_mdrobotbase_t *rb = &mdrobotbases[0];
    rb->left = left;
    rb->right = right;
    rb->wheel_diameter = wheel_diameter;
    rb->axle_track = axle_track;
    
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
    rb->last_accel_x = 0.0f;
    rb->backlash_filter_enabled = true;
    rb->max_angular_speed = 300.0f;
    rb->pid_min_turn = 0.0f;
    rb->pid_min_turn_threshold = 0.15f;
    
    *rb_address = rb;
    return PBIO_SUCCESS;
}

pbio_error_t pbio_mdrobotbase_set_lqr_gains(pbio_mdrobotbase_t *rb, float k_x, float k_y, float k_theta) {
    if (!rb) {
        return PBIO_ERROR_INVALID_ARG;
    }
    rb->k_x = k_x;
    rb->k_y = k_y;
    rb->k_theta = k_theta;
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
    
    // Read accelerometer to detect actual physical acceleration
    pbio_geometry_xyz_t acceleration;
    pbio_imu_get_acceleration(&acceleration, true);

    // Get angular velocity around Z-axis
    pbio_geometry_xyz_t angular_velocity;
    pbio_imu_get_angular_velocity(&angular_velocity, true);

    float accel_change = acceleration.x - rb->last_accel_x;
    rb->last_accel_x = acceleration.x;

    bool physical_motion = (fabsf(accel_change) > 150.0f) || (fabsf(angular_velocity.z) > 1.5f);

    if (rb->backlash_filter_enabled && !physical_motion && (fabsf(d_left_ticks) > 0.001f || fabsf(d_right_ticks) > 0.001f)) {
        d_left_ticks = 0.0f;
        d_right_ticks = 0.0f;
    }

    float diam_mm = (float)rb->wheel_diameter / 1000.0f;
    float track_mm = (float)rb->axle_track / 1000.0f;
    
    // Convert ticks (degrees) to linear distance (mm)
    float d_left = (d_left_ticks / 360.0f) * 3.14159265f * diam_mm;
    float d_right = (d_right_ticks / 360.0f) * 3.14159265f * diam_mm;
    float d_center = (d_left + d_right) / 2.0f;
    
    float delta_theta_gyro = gyro_heading - rb->last_gyro_heading;
    while (delta_theta_gyro > 180.0f) delta_theta_gyro -= 360.0f;
    while (delta_theta_gyro < -180.0f) delta_theta_gyro += 360.0f;
    
    rb->last_gyro_heading = gyro_heading;
    
    float delta_theta_enc_rad = (d_right - d_left) / track_mm;
    float delta_theta_enc_deg = delta_theta_enc_rad * (180.0f / 3.14159265f);
    
    float delta_theta = rb->fusion_alpha * delta_theta_gyro + (1.0f - rb->fusion_alpha) * delta_theta_enc_deg;
    
    float avg_angle_rad = (rb->theta + delta_theta / 2.0f) * (3.14159265f / 180.0f);
    rb->x += d_center * cosf(avg_angle_rad);
    rb->y += d_center * sinf(avg_angle_rad);
    
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
