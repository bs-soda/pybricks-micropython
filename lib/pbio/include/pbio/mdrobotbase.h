// SPDX-License-Identifier: MIT
// Copyright (c) 2018-2023 The Pybricks Authors

#ifndef _PBIO_MDROBOTBASE_H_
#define _PBIO_MDROBOTBASE_H_

#include <pbio/servo.h>
#include <pbio/error.h>

typedef enum {
    PBIO_MDROBOTBASE_CONTROLLER_PID = 0,
    PBIO_MDROBOTBASE_CONTROLLER_LQR = 1
} pbio_mdrobotbase_controller_t;

typedef struct _pbio_mdrobotbase_t {
    pbio_servo_t *left;
    pbio_servo_t *right;
    int32_t wheel_diameter;
    int32_t axle_track;
    pbio_mdrobotbase_controller_t controller_type;
    float k_x;
    float k_y;
    float k_theta;
    float kp;
    float ki;
    float kd;
    float x;
    float y;
    float theta;
    float last_left_deg;
    float last_right_deg;
    float last_gyro_heading;
    float fusion_alpha;
    float last_accel_x;
    bool backlash_filter_enabled;
    float max_angular_speed;
    float pid_min_turn;
    float pid_min_turn_threshold;
} pbio_mdrobotbase_t;

pbio_error_t pbio_mdrobotbase_get_robotbase(pbio_mdrobotbase_t **rb_address, pbio_servo_t *left, pbio_servo_t *right, int32_t wheel_diameter, int32_t axle_track);
pbio_error_t pbio_mdrobotbase_set_lqr_gains(pbio_mdrobotbase_t *rb, float k_x, float k_y, float k_theta);
pbio_error_t pbio_mdrobotbase_set_controller(pbio_mdrobotbase_t *rb, pbio_mdrobotbase_controller_t type);
pbio_error_t pbio_mdrobotbase_set_pid_gains(pbio_mdrobotbase_t *rb, float kp, float ki, float kd);
pbio_error_t pbio_mdrobotbase_reset_state(pbio_mdrobotbase_t *rb, float x, float y, float theta, float gyro_heading);
pbio_error_t pbio_mdrobotbase_update_state(pbio_mdrobotbase_t *rb, float gyro_heading);
pbio_error_t pbio_mdrobotbase_set_backlash_filter(pbio_mdrobotbase_t *rb, bool enabled);
pbio_error_t pbio_mdrobotbase_get_backlash_filter(pbio_mdrobotbase_t *rb, bool *enabled);
pbio_error_t pbio_mdrobotbase_set_max_angular_speed(pbio_mdrobotbase_t *rb, float speed);
pbio_error_t pbio_mdrobotbase_get_max_angular_speed(pbio_mdrobotbase_t *rb, float *speed);
pbio_error_t pbio_mdrobotbase_set_pid_min_turn(pbio_mdrobotbase_t *rb, float min_turn, float threshold);
pbio_error_t pbio_mdrobotbase_get_pid_min_turn(pbio_mdrobotbase_t *rb, float *min_turn, float *threshold);

#endif // _PBIO_MDROBOTBASE_H_
