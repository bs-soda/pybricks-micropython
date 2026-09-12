// SPDX-License-Identifier: MIT
// Copyright (c) 2018-2023 The Pybricks Authors

#ifndef _PBIO_MDROBOTBASE_H_
#define _PBIO_MDROBOTBASE_H_

#include <pbio/servo.h>
#include <pbio/error.h>

#ifndef PBIO_CONFIG_NUM_MDROBOTBASES
#define PBIO_CONFIG_NUM_MDROBOTBASES 2
#endif

#if PBIO_CONFIG_NUM_MDROBOTBASES < 1
#undef PBIO_CONFIG_NUM_MDROBOTBASES
#define PBIO_CONFIG_NUM_MDROBOTBASES 1
#endif

typedef enum {
    PBIO_MDROBOTBASE_CONTROLLER_PID = 0,
    PBIO_MDROBOTBASE_CONTROLLER_LQR = 1
} pbio_mdrobotbase_controller_t;

/**
 * Linear Quadratic Regulator (LQR) Kinematic Tracking Controller Gains & Presets:
 *
 * Coordinates & Units:
 * - Along-track error (e_x): meters [m]
 * - Cross-track error (e_y): meters [m]
 * - Heading error (e_theta): radians [rad]
 *
 * Control Corrections:
 * - Forward linear velocity correction (u_v): meters/second [m/s]
 * - Angular yaw velocity correction (u_w): radians/second [rad/s]
 *
 * Gain Dimensionality & Physical Units:
 * - k_x:      [s^-1]            (1/s)     Along-track convergence rate (m -> m/s)
 * - k_y:      [rad / (m * s)]   (1/(m*s)) Cross-track restoring stiffness (m -> rad/s)
 * - k_theta:  [s^-1]            (1/s)     Heading damping rate (rad -> rad/s)
 *
 * Stability Invariants:
 * Linearized unicycle error dynamics around reference forward speed v_r > 0:
 *   det(sI - A_cl) = (s + k_x) * (s^2 + k_theta * s + v_r * k_y) = 0
 * Asymptotic stability requires:
 *   1. k_x > 0.0f      (strictly positive along-track convergence rate)
 *   2. k_y > 0.0f      (strictly positive lateral restoring stiffness)
 *   3. k_theta > 0.0f  (strictly positive heading damping rate)
 * Natural frequency: omega_n = sqrt(v_r * k_y) [rad/s]
 * Damping ratio:     zeta = k_theta / (2 * sqrt(v_r * k_y)) [dimensionless]
 */
typedef enum {
    /** Balanced critically-damped tuning for standard driving surfaces (zeta ~ 0.9-1.0 at 0.3 m/s) */
    PBIO_MDROBOTBASE_LQR_PRESET_BALANCED = 0,
    /** High-gain fast-settling tuning for competitive/high-speed tasks */
    PBIO_MDROBOTBASE_LQR_PRESET_AGGRESSIVE = 1,
    /** Low-gain smooth low-jerk tuning for low-traction/carpet surfaces */
    PBIO_MDROBOTBASE_LQR_PRESET_SMOOTH = 2,
} pbio_mdrobotbase_lqr_preset_t;

/**
 * Linear Quadratic Regulator (LQR) Weight Configuration:
 *
 * State Penalty Q = diag(q_x, q_y, q_theta) >= 0:
 * - q_x: Along-track position error penalty [(m/s)^2 / m^2]
 * - q_y: Cross-track position error penalty [(rad/s)^2 / m^2]
 * - q_theta: Heading orientation error penalty [(rad/s)^2 / rad^2]
 *
 * Control Penalty R = diag(r_v, r_omega) > 0:
 * - r_v: Linear velocity effort penalty [1 / (m/s)^2]
 * - r_omega: Angular yaw rate effort penalty [1 / (rad/s)^2]
 */
typedef struct {
    float q_x;
    float q_y;
    float q_theta;
    float r_v;
    float r_omega;
} pbio_mdrobotbase_lqr_weights_t;

typedef enum {
    PBIO_MDROBOTBASE_MOTION_NONE = 0,
    PBIO_MDROBOTBASE_MOTION_NAVIGATE,
    PBIO_MDROBOTBASE_MOTION_TURN,
    PBIO_MDROBOTBASE_MOTION_PIVOT,
    PBIO_MDROBOTBASE_MOTION_TRAJECTORY
} pbio_mdrobotbase_motion_type_t;

typedef enum {
    PBIO_MDROBOTBASE_STATUS_NONE = 0,
    PBIO_MDROBOTBASE_STATUS_RUNNING = 1,
    PBIO_MDROBOTBASE_STATUS_COMPLETED = 2,
    PBIO_MDROBOTBASE_STATUS_STALLED = 3,
    PBIO_MDROBOTBASE_STATUS_TIMED_OUT = 4
} pbio_mdrobotbase_motion_status_t;

typedef struct {
    uint8_t color_id;
    float mean_h, mean_s, mean_v;
    float mean_l, mean_a, mean_b;
    float var_h, var_s, var_v, var_lab;
    uint16_t sample_count;
} pbio_mdrobotbase_color_class_t;

typedef struct {
    uint32_t version;
    float black_ref[3];
    float white_ref[3];
    bool has_black_ref;
    bool has_white_ref;
    float threshold;
    float ambiguity_threshold;
    uint8_t num_prototypes;
    struct {
        uint8_t color_id;
        float h;
        float s;
        float v;
    } prototypes[32];
    uint8_t num_classes;
    pbio_mdrobotbase_color_class_t classes[32];
} pbio_mdrobotbase_color_profile_t;

typedef struct {
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
    float ambiguity_threshold;
    bool is_calibrated;
    // Two-Point Calibration Reference Vectors (G-MDRB-029)
    float black_ref[3];
    float white_ref[3];
    float gain[3];
    bool has_black_ref;
    bool has_white_ref;
    // Multi-Sample Statistical Prototype Calibration (G-MDRB-031)
    pbio_mdrobotbase_color_class_t classes[32];
    size_t num_classes;
    struct {
        uint8_t color_id;
        uint16_t count;
        float r[32];
        float g[32];
        float b[32];
        float h[32];
        float s[32];
        float v[32];
        float l[32];
        float a[32];
        float b_lab[32];
    } sample_acc;
} pbio_mdrobotbase_color_cal_state_t;

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
    pbio_mdrobotbase_lqr_weights_t lqr_weights;
    float lqr_k11;
    float lqr_lut_v[16];
    float lqr_lut_kx[16];
    float lqr_lut_ky[16];
    float lqr_lut_kth[16];
    float lqr_lut_rho[16];
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
    pbio_mdrobotbase_motion_status_t motion_status;

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
    pbio_mdrobotbase_color_cal_state_t color_cal;
} pbio_mdrobotbase_t;


pbio_error_t pbio_mdrobotbase_get_robotbase(pbio_mdrobotbase_t **rb_address, pbio_servo_t *left, pbio_servo_t *right, int32_t wheel_diameter_left, int32_t wheel_diameter_right, int32_t axle_track);
pbio_error_t pbio_mdrobotbase_put_robotbase(pbio_mdrobotbase_t *rb);
void pbio_mdrobotbase_deinit(void);
pbio_error_t pbio_mdrobotbase_init(pbio_mdrobotbase_t *rb, pbio_servo_t *left, pbio_servo_t *right, int32_t wheel_diameter_left, int32_t wheel_diameter_right, int32_t axle_track);
pbio_error_t pbio_mdrobotbase_motion_reset(pbio_mdrobotbase_t *rb);

/**
 * @brief Legacy / Manual mode: Configures constant user-specified feedback gains across the operating range.
 * @note This manual mode does NOT guarantee mathematical DARE optimality or spectral-radius bounds.
 *       For optimal tracking, use pbio_mdrobotbase_set_lqr_weights() or pbio_mdrobotbase_set_lqr_preset().
 */
pbio_error_t pbio_mdrobotbase_set_lqr_gains(pbio_mdrobotbase_t *rb, float k_x, float k_y, float k_theta, bool schedule);
pbio_error_t pbio_mdrobotbase_get_lqr_gains(const pbio_mdrobotbase_t *rb, float *k_x, float *k_y, float *k_theta, bool *schedule);
pbio_error_t pbio_mdrobotbase_set_lqr_weights(pbio_mdrobotbase_t *rb, float q_x, float q_y, float q_theta, float r_v, float r_omega);
pbio_error_t pbio_mdrobotbase_get_lqr_weights(const pbio_mdrobotbase_t *rb, float *q_x, float *q_y, float *q_theta, float *r_v, float *r_omega);

/**
 * @brief Legacy / Reference DARE solver helper (extracts decoupled gains from full DARE solution).
 * @note Production LUT generation in pbio_mdrobotbase_set_lqr_weights() directly invokes
 *       pbio_mdrobotbase_lqr_solve_dare_full().
 */
pbio_error_t pbio_mdrobotbase_lqr_solve_dare(float q_x, float q_y, float q_theta, float r_v, float r_omega, float v_profile, float *k_x, float *k_y, float *k_theta, float *spectral_radius);
pbio_error_t pbio_mdrobotbase_lqr_solve_dare_full(float q_x, float q_y, float q_theta, float r_v, float r_omega, float v_profile, float K[2][3], float P[3][3], float *spectral_radius);
pbio_error_t pbio_mdrobotbase_lqr_compute_riccati_residual(float q_x, float q_y, float q_theta, float r_v, float r_omega, float v_profile, const float P[3][3], float *max_residual);
pbio_error_t pbio_mdrobotbase_lqr_verify_discrete_stability(float k_y, float k_theta, float v_nominal, float *spectral_radius);
pbio_error_t pbio_mdrobotbase_set_lqr_preset(pbio_mdrobotbase_t *rb, pbio_mdrobotbase_lqr_preset_t preset, bool schedule);
pbio_error_t pbio_mdrobotbase_lqr_verify_stability(float k_x, float k_y, float k_theta, float v_nominal, float *damping_ratio, float *natural_freq);
pbio_error_t pbio_mdrobotbase_lqr_step(const pbio_mdrobotbase_t *rb, float v_profile, float x_ref, float y_ref, float path_theta_deg, float *v_cmd, float *w_cmd);
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
pbio_error_t pbio_mdrobotbase_get_motion_status(const pbio_mdrobotbase_t *rb, pbio_mdrobotbase_motion_status_t *status);

/**
 * Semantic Lifecycle FSM Mutation Helpers
 * Production callers MUST use these semantic helpers rather than raw state mutation.
 */
pbio_error_t pbio_mdrobotbase_motion_start(pbio_mdrobotbase_t *rb);
pbio_error_t pbio_mdrobotbase_motion_complete(pbio_mdrobotbase_t *rb);
pbio_error_t pbio_mdrobotbase_motion_stall(pbio_mdrobotbase_t *rb);
pbio_error_t pbio_mdrobotbase_motion_timeout(pbio_mdrobotbase_t *rb);

/**
 * Backward compatibility aliases for semantic lifecycle transitions.
 */
pbio_error_t pbio_mdrobotbase_mark_running(pbio_mdrobotbase_t *rb);
pbio_error_t pbio_mdrobotbase_mark_completed(pbio_mdrobotbase_t *rb);
pbio_error_t pbio_mdrobotbase_mark_stalled(pbio_mdrobotbase_t *rb);
pbio_error_t pbio_mdrobotbase_mark_timed_out(pbio_mdrobotbase_t *rb);

/**
 * Internal / Unit Test FSM Transition Validator.
 * NOTE: Production code MUST NOT call this directly; use semantic helpers above.
 */
pbio_error_t pbio_mdrobotbase_set_motion_status(pbio_mdrobotbase_t *rb, pbio_mdrobotbase_motion_status_t status);
pbio_error_t pbio_mdrobotbase_get_pose(const pbio_mdrobotbase_t *rb, float *x, float *y, float *theta);
pbio_error_t pbio_mdrobotbase_is_busy(const pbio_mdrobotbase_t *rb, bool *busy);
pbio_error_t pbio_mdrobotbase_is_done(const pbio_mdrobotbase_t *rb, bool *done);
pbio_error_t pbio_mdrobotbase_is_stalled(const pbio_mdrobotbase_t *rb, bool *stalled);
pbio_error_t pbio_mdrobotbase_get_motion_type(const pbio_mdrobotbase_t *rb, pbio_mdrobotbase_motion_type_t *motion_type);

// Kinematic Gear Ratio Conversion Helpers (R = motor / wheel)
float pbio_mdrobotbase_motor_to_wheel_deg(const pbio_mdrobotbase_t *rb, float motor_deg);
float pbio_mdrobotbase_wheel_to_motor_deg(const pbio_mdrobotbase_t *rb, float wheel_deg);
float pbio_mdrobotbase_motor_to_wheel_dps(const pbio_mdrobotbase_t *rb, float motor_dps);
int32_t pbio_mdrobotbase_wheel_to_motor_dps(const pbio_mdrobotbase_t *rb, float wheel_dps);

// Angle Normalization Invariants
float pbio_mdrobotbase_wrap_degrees(float angle);

// Native C Color Calibration API
pbio_error_t pbio_mdrobotbase_color_cal_reset(pbio_mdrobotbase_t *rb);
pbio_error_t pbio_mdrobotbase_color_cal_set_baseline(pbio_mdrobotbase_t *rb, float base_h, float base_s, float base_v);
pbio_error_t pbio_mdrobotbase_color_cal_add_prototype(pbio_mdrobotbase_t *rb, uint8_t color_id, float h, float s, float v);
pbio_error_t pbio_mdrobotbase_color_cal_set_threshold(pbio_mdrobotbase_t *rb, float max_distance_threshold);
pbio_error_t pbio_mdrobotbase_color_cal_classify(pbio_mdrobotbase_t *rb, float h, float s, float v, uint8_t *matched_color_id, float *min_distance);

// Native C Color Classification API (G-MDRB-028: Unified Structured Contract)
pbio_error_t pbio_mdrobotbase_color_classify_rgb(pbio_mdrobotbase_t *rb, float r, float g, float b, uint8_t *color_id, float *distance, float *confidence);
pbio_error_t pbio_mdrobotbase_color_classify_hsv(pbio_mdrobotbase_t *rb, float h, float s, float v, uint8_t *color_id, float *distance, float *confidence);

// Native C Two-Point Sensor Calibration API (G-MDRB-029: Dark-Offset & White-Gain Normalization)
pbio_error_t pbio_mdrobotbase_color_cal_set_black_reference(pbio_mdrobotbase_t *rb, float r, float g, float b);
pbio_error_t pbio_mdrobotbase_color_cal_set_white_reference(pbio_mdrobotbase_t *rb, float r, float g, float b);
pbio_error_t pbio_mdrobotbase_color_normalize(pbio_mdrobotbase_t *rb, float r, float g, float b, float *r_norm, float *g_norm, float *b_norm);

// Native C Perceptual Color Classifier API (G-MDRB-030: Circular Hue & CIE L*a*b* Space)
float pbio_mdrobotbase_circular_hue_distance(float h1, float h2);
pbio_error_t pbio_mdrobotbase_rgb_to_lab(float r, float g, float b, float *l, float *a, float *b_val);

// Native C Multi-Sample Statistical Prototype Calibration API (G-MDRB-031: Welford Accumulation & Outlier Rejection)
pbio_error_t pbio_mdrobotbase_color_cal_add_sample(pbio_mdrobotbase_t *rb, uint8_t color_id, float r, float g, float b);
pbio_error_t pbio_mdrobotbase_color_cal_add_sample_hsv(pbio_mdrobotbase_t *rb, uint8_t color_id, float h, float s, float v);
pbio_error_t pbio_mdrobotbase_color_cal_finalize_class(pbio_mdrobotbase_t *rb, uint8_t color_id);
pbio_error_t pbio_mdrobotbase_color_cal_get_class(pbio_mdrobotbase_t *rb, uint8_t color_id, pbio_mdrobotbase_color_class_t *out_class);

// Native C Confidence Scoring & Ambiguity Margin Engine API (G-MDRB-032: Second-Best Margin & Color.NONE Rejection)
pbio_error_t pbio_mdrobotbase_color_cal_set_ambiguity_threshold(pbio_mdrobotbase_t *rb, float threshold);

// Native C Sensor-Specific Calibration Profile Storage API (G-MDRB-033)
pbio_error_t pbio_mdrobotbase_color_cal_export_profile(const pbio_mdrobotbase_t *rb, pbio_mdrobotbase_color_profile_t *profile);
pbio_error_t pbio_mdrobotbase_color_cal_load_profile(pbio_mdrobotbase_t *rb, const pbio_mdrobotbase_color_profile_t *profile);

#endif // _PBIO_MDROBOTBASE_H_
