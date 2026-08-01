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

typedef enum {
    PBIO_MDROBOTBASE_MOTION_NONE = 0,
    PBIO_MDROBOTBASE_MOTION_NAVIGATE,
    PBIO_MDROBOTBASE_MOTION_TURN,
    PBIO_MDROBOTBASE_MOTION_PIVOT,
    PBIO_MDROBOTBASE_MOTION_TRAJECTORY
} pbio_mdrobotbase_motion_type_t;

typedef struct _pbio_mdrobotbase_t {
    pbio_servo_t *left;
    pbio_servo_t *right;
    int32_t axle_track;
    int32_t wheel_diameter_left;
    int32_t wheel_diameter_right;
    pbio_mdrobotbase_controller_t controller_type;
    float k_x;
    float k_y;
    float k_theta;
    bool lqr_schedule_enabled;
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
    float gear_ratio;
    float last_accel_x;
    bool backlash_filter_enabled;
    float max_angular_speed;
    float max_turn_speed;
    float max_pivot_speed;
    float pid_min_turn;
    float pid_min_turn_threshold;
    float backlash_left_limit;
    float backlash_right_limit;
    float backlash_left_accum;
    float backlash_right_accum;
    float kp_turn;
    float ki_turn;
    float kd_turn;
    float kp_pivot;
    float ki_pivot;
    float kd_pivot;

    // Async motion tracking state fields
    pbio_mdrobotbase_motion_type_t motion_type;
    float goal_x;
    float goal_y;
    float goal_theta;
    bool has_goal_theta;
    float target_speed;
    float start_speed;
    float end_speed;
    float accel_d;
    float decel_d;
    bool use_ramping;
    bool is_backward;
    float tolerance_dist;
    uint32_t timeout_ms;
    uint32_t start_time_ms;
    uint32_t last_step_time_ms;
    float last_step_theta;
    float turn_integral;
    float stall_time_ms;
    pbio_control_on_completion_t stop_behavior;
    bool motion_in_progress;

    // Navigation internal tracking state
    float start_x;
    float start_y;
    float path_len;
    float path_x;
    float path_y;
    float path_theta;
    float dist_ref;
    float target_speed_for_ramping;
    float current_start_speed;
    float current_end_speed;
    float max_accel;
    float last_v_profile;
    float last_v_cmd;
    float last_w_cmd;
    float last_x;
    float last_y;
    float dist_traveled;
    float gt;
    float kick_speed;
    float kick_time;
    bool align_final_heading;

    // Turn / Pivot internal tracking state
    float target_angle;
    float speed_deg_s;
    float accel_angle;
    float decel_angle;
    float tolerance_angle;
    bool pivot_left;
    float turn_angle_total;

    // Trajectory tracking state
    size_t trajectory_num_points;
    size_t trajectory_current_point_idx;
    float trajectory_transition_tolerance;
    float trajectory_points_x[64];
    float trajectory_points_y[64];
    float trajectory_seg_start_x;
    float trajectory_seg_start_y;
    bool trajectory_final_segment_started;
    float trajectory_final_segment_start_x;
    float trajectory_final_segment_start_y;

    // Native C Color Calibration state
    struct {
        struct {
            float h;
            float s;
            float v;
            float x;
            float y;
            float z;
            uint8_t color_id;
        } prototypes[32];
        size_t num_prototypes;
        float base_h;
        float base_s;
        float base_v;
        float v_scale;
        float max_distance_threshold;
        bool is_calibrated;
    } color_cal;
} pbio_mdrobotbase_t;


pbio_error_t pbio_mdrobotbase_get_robotbase(pbio_mdrobotbase_t **rb_address, pbio_servo_t *left, pbio_servo_t *right, int32_t wheel_diameter_left, int32_t wheel_diameter_right, int32_t axle_track);
pbio_error_t pbio_mdrobotbase_set_lqr_gains(pbio_mdrobotbase_t *rb, float k_x, float k_y, float k_theta, bool schedule);
pbio_error_t pbio_mdrobotbase_set_controller(pbio_mdrobotbase_t *rb, pbio_mdrobotbase_controller_t type);
pbio_error_t pbio_mdrobotbase_set_pid_gains(pbio_mdrobotbase_t *rb, float kp, float ki, float kd);
pbio_error_t pbio_mdrobotbase_set_turn_pid_gains(pbio_mdrobotbase_t *rb, float kp, float ki, float kd);
pbio_error_t pbio_mdrobotbase_get_turn_pid_gains(pbio_mdrobotbase_t *rb, float *kp, float *ki, float *kd);
pbio_error_t pbio_mdrobotbase_set_pivot_pid_gains(pbio_mdrobotbase_t *rb, float kp, float ki, float kd);
pbio_error_t pbio_mdrobotbase_get_pivot_pid_gains(pbio_mdrobotbase_t *rb, float *kp, float *ki, float *kd);
pbio_error_t pbio_mdrobotbase_reset_state(pbio_mdrobotbase_t *rb, float x, float y, float theta, float gyro_heading);
pbio_error_t pbio_mdrobotbase_update_state(pbio_mdrobotbase_t *rb, float gyro_heading);
pbio_error_t pbio_mdrobotbase_set_backlash_filter(pbio_mdrobotbase_t *rb, bool enabled);
pbio_error_t pbio_mdrobotbase_get_backlash_filter(pbio_mdrobotbase_t *rb, bool *enabled);
pbio_error_t pbio_mdrobotbase_set_max_angular_speed(pbio_mdrobotbase_t *rb, float speed);
pbio_error_t pbio_mdrobotbase_get_max_angular_speed(pbio_mdrobotbase_t *rb, float *speed);
pbio_error_t pbio_mdrobotbase_set_max_turn_speed(pbio_mdrobotbase_t *rb, float speed);
pbio_error_t pbio_mdrobotbase_get_max_turn_speed(pbio_mdrobotbase_t *rb, float *speed);
pbio_error_t pbio_mdrobotbase_set_max_pivot_speed(pbio_mdrobotbase_t *rb, float speed);
pbio_error_t pbio_mdrobotbase_get_max_pivot_speed(pbio_mdrobotbase_t *rb, float *speed);
pbio_error_t pbio_mdrobotbase_set_pid_min_turn(pbio_mdrobotbase_t *rb, float min_turn, float threshold);
pbio_error_t pbio_mdrobotbase_get_pid_min_turn(pbio_mdrobotbase_t *rb, float *min_turn, float *threshold);
pbio_error_t pbio_mdrobotbase_set_backlash_limits(pbio_mdrobotbase_t *rb, float left_limit, float right_limit);
pbio_error_t pbio_mdrobotbase_get_backlash_limits(pbio_mdrobotbase_t *rb, float *left_limit, float *right_limit);
pbio_error_t pbio_mdrobotbase_set_wheel_diameters(pbio_mdrobotbase_t *rb, int32_t left, int32_t right);
pbio_error_t pbio_mdrobotbase_get_wheel_diameters(pbio_mdrobotbase_t *rb, int32_t *left, int32_t *right);
pbio_error_t pbio_mdrobotbase_set_fusion_alpha(pbio_mdrobotbase_t *rb, float alpha);
pbio_error_t pbio_mdrobotbase_get_fusion_alpha(pbio_mdrobotbase_t *rb, float *alpha);
pbio_error_t pbio_mdrobotbase_set_gear_ratio(pbio_mdrobotbase_t *rb, float ratio);
pbio_error_t pbio_mdrobotbase_get_gear_ratio(pbio_mdrobotbase_t *rb, float *ratio);

// Native C Color Calibration API
pbio_error_t pbio_mdrobotbase_color_cal_reset(pbio_mdrobotbase_t *rb);
pbio_error_t pbio_mdrobotbase_color_cal_set_baseline(pbio_mdrobotbase_t *rb, float base_h, float base_s, float base_v);
pbio_error_t pbio_mdrobotbase_color_cal_add_prototype(pbio_mdrobotbase_t *rb, uint8_t color_id, float h, float s, float v);
pbio_error_t pbio_mdrobotbase_color_cal_set_threshold(pbio_mdrobotbase_t *rb, float max_distance_threshold);
pbio_error_t pbio_mdrobotbase_color_cal_classify(pbio_mdrobotbase_t *rb, float h, float s, float v, uint8_t *matched_color_id, float *min_distance);

#endif // _PBIO_MDROBOTBASE_H_
