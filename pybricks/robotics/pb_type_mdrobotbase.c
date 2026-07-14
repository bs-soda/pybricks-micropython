// SPDX-License-Identifier: MIT
// Copyright (c) 2018-2023 The Pybricks Authors

#include "py/mpconfig.h"

#if PYBRICKS_PY_ROBOTICS && PYBRICKS_PY_COMMON_MOTORS

#include <stdlib.h>
#include <math.h>

#include <pbio/mdrobotbase.h>
#include <pbio/imu.h>
#include <pbio/battery.h>
#include <pbdrv/clock.h>
#include "py/mphal.h"
#include <pybricks/common.h>
#include <pybricks/robotics.h>
#include <pybricks/parameters.h>
#include <pybricks/util_mp/pb_kwarg_helper.h>
#include <pybricks/util_mp/pb_obj_helper.h>
#include <pybricks/util_pb/pb_error.h>

typedef struct _pb_type_MDRobotBase_obj_t {
    mp_obj_base_t base;
    pbio_mdrobotbase_t *rb;
} pb_type_MDRobotBase_obj_t;

static float get_battery_compensation_factor(void) {
    int32_t v_actual = pbio_battery_get_average_voltage();
    if (v_actual <= 0) {
        return 1.0f;
    }
    float factor = 8000.0f / (float)v_actual;
    if (factor < 0.9f) return 0.9f;
    if (factor > 1.25f) return 1.25f;
    return factor;
}

// pybricks.robotics.MDRobotBase.set_lqr_gains
static mp_obj_t pb_type_MDRobotBase_set_lqr_gains(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args,
        pb_type_MDRobotBase_obj_t, self,
        PB_ARG_REQUIRED(k_x),
        PB_ARG_REQUIRED(k_y),
        PB_ARG_REQUIRED(k_theta));

    float x = mp_obj_get_float(k_x_in);
    float y = mp_obj_get_float(k_y_in);
    float theta = mp_obj_get_float(k_theta_in);

    pb_assert(pbio_mdrobotbase_set_lqr_gains(self->rb, x, y, theta));

    return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_lqr_gains_obj, 1, pb_type_MDRobotBase_set_lqr_gains);

// pybricks.robotics.MDRobotBase.get_lqr_gains
static mp_obj_t pb_type_MDRobotBase_get_lqr_gains(mp_obj_t self_in) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
    mp_obj_t gains[3];
    gains[0] = mp_obj_new_float_from_f(self->rb->k_x);
    gains[1] = mp_obj_new_float_from_f(self->rb->k_y);
    gains[2] = mp_obj_new_float_from_f(self->rb->k_theta);
    return mp_obj_new_tuple(3, gains);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_lqr_gains_obj, pb_type_MDRobotBase_get_lqr_gains);

// pybricks.robotics.MDRobotBase.set_controller
static mp_obj_t pb_type_MDRobotBase_set_controller(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args,
        pb_type_MDRobotBase_obj_t, self,
        PB_ARG_REQUIRED(type));

    int32_t val = pb_obj_get_int(type_in);
    pb_assert(pbio_mdrobotbase_set_controller(self->rb, (pbio_mdrobotbase_controller_t)val));

    return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_controller_obj, 1, pb_type_MDRobotBase_set_controller);

// pybricks.robotics.MDRobotBase.get_controller
static mp_obj_t pb_type_MDRobotBase_get_controller(mp_obj_t self_in) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
    return mp_obj_new_int(self->rb->controller_type);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_controller_obj, pb_type_MDRobotBase_get_controller);

// pybricks.robotics.MDRobotBase.set_pid_gains
static mp_obj_t pb_type_MDRobotBase_set_pid_gains(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args,
        pb_type_MDRobotBase_obj_t, self,
        PB_ARG_REQUIRED(kp),
        PB_ARG_REQUIRED(ki),
        PB_ARG_REQUIRED(kd));

    float p = mp_obj_get_float(kp_in);
    float i = mp_obj_get_float(ki_in);
    float d = mp_obj_get_float(kd_in);

    pb_assert(pbio_mdrobotbase_set_pid_gains(self->rb, p, i, d));

    return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_pid_gains_obj, 1, pb_type_MDRobotBase_set_pid_gains);

// pybricks.robotics.MDRobotBase.get_pid_gains
static mp_obj_t pb_type_MDRobotBase_get_pid_gains(mp_obj_t self_in) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
    mp_obj_t gains[3];
    gains[0] = mp_obj_new_float_from_f(self->rb->kp);
    gains[1] = mp_obj_new_float_from_f(self->rb->ki);
    gains[2] = mp_obj_new_float_from_f(self->rb->kd);
    return mp_obj_new_tuple(3, gains);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_pid_gains_obj, pb_type_MDRobotBase_get_pid_gains);

// pybricks.robotics.MDRobotBase.set_pid_min_turn
static mp_obj_t pb_type_MDRobotBase_set_pid_min_turn(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args,
        pb_type_MDRobotBase_obj_t, self,
        PB_ARG_REQUIRED(min_turn),
        PB_ARG_REQUIRED(threshold));

    float mt = mp_obj_get_float(min_turn_in);
    float th = mp_obj_get_float(threshold_in);

    pb_assert(pbio_mdrobotbase_set_pid_min_turn(self->rb, mt, th));

    return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_pid_min_turn_obj, 1, pb_type_MDRobotBase_set_pid_min_turn);

// pybricks.robotics.MDRobotBase.get_pid_min_turn
static mp_obj_t pb_type_MDRobotBase_get_pid_min_turn(mp_obj_t self_in) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
    mp_obj_t vals[2];
    vals[0] = mp_obj_new_float_from_f(self->rb->pid_min_turn);
    vals[1] = mp_obj_new_float_from_f(self->rb->pid_min_turn_threshold);
    return mp_obj_new_tuple(2, vals);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_pid_min_turn_obj, pb_type_MDRobotBase_get_pid_min_turn);

// pybricks.robotics.MDRobotBase.reset_state
static mp_obj_t pb_type_MDRobotBase_reset_state(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args,
        pb_type_MDRobotBase_obj_t, self,
        PB_ARG_REQUIRED(x),
        PB_ARG_REQUIRED(y),
        PB_ARG_REQUIRED(theta),
        PB_ARG_REQUIRED(gyro_heading));

    float x_val = mp_obj_get_float(x_in);
    float y_val = mp_obj_get_float(y_in);
    float theta_val = mp_obj_get_float(theta_in);
    float gyro_val = mp_obj_get_float(gyro_heading_in);

    pb_assert(pbio_mdrobotbase_reset_state(self->rb, x_val, y_val, theta_val, gyro_val));

    return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_reset_state_obj, 1, pb_type_MDRobotBase_reset_state);

// pybricks.robotics.MDRobotBase.update_state
static mp_obj_t pb_type_MDRobotBase_update_state(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args,
        pb_type_MDRobotBase_obj_t, self,
        PB_ARG_REQUIRED(gyro_heading));

    float gyro_val = mp_obj_get_float(gyro_heading_in);

    pb_assert(pbio_mdrobotbase_update_state(self->rb, gyro_val));

    return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_update_state_obj, 1, pb_type_MDRobotBase_update_state);

// pybricks.robotics.MDRobotBase.get_state
static mp_obj_t pb_type_MDRobotBase_get_state(mp_obj_t self_in) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
    mp_obj_t state[3];
    state[0] = mp_obj_new_float_from_f(self->rb->x);
    state[1] = mp_obj_new_float_from_f(self->rb->y);
    state[2] = mp_obj_new_float_from_f(self->rb->theta);
    return mp_obj_new_tuple(3, state);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_state_obj, pb_type_MDRobotBase_get_state);

// pybricks.robotics.MDRobotBase.navigate_to_goal
static mp_obj_t pb_type_MDRobotBase_navigate_to_goal_internal(
    pb_type_MDRobotBase_obj_t *self,
    float gx,
    float gy,
    mp_obj_t goal_theta_obj,
    float speed,
    float start_speed,
    float end_speed,
    float accel_d,
    float decel_d,
    bool ramping,
    bool back,
    float tolerance,
    mp_obj_t timeout_ms_obj,
    mp_obj_t then_obj,
    float kick_speed,
    float kick_time) {

    // Read current pose for initial calculations
    float cur_x = self->rb->x;
    float cur_y = self->rb->y;

    float abs_target_speed = fabsf(speed);
    float abs_start_speed = fabsf(start_speed);
    float abs_end_speed = fabsf(end_speed);

    // Dynamically scale ramping distances if default value (50.0mm) is used to prevent motor torque saturation
    if (accel_d == 50.0f) {
        float calc_accel = (abs_target_speed * abs_target_speed - abs_start_speed * abs_start_speed) / 1200.0f;
        if (calc_accel > 50.0f) {
            accel_d = calc_accel;
        }
    }
    if (decel_d == 50.0f) {
        float calc_decel = (abs_target_speed * abs_target_speed - abs_end_speed * abs_end_speed) / 1200.0f;
        if (calc_decel > 50.0f) {
            decel_d = calc_decel;
        }
    }

    float comp = get_battery_compensation_factor();
    accel_d *= comp;
    decel_d *= comp;

    uint32_t timeout;
    if (timeout_ms_obj == mp_const_none) {
        float dx_init = gx - cur_x;
        float dy_init = gy - cur_y;
        float total_dist = sqrtf(dx_init * dx_init + dy_init * dy_init);
        float nominal_speed = fabsf(speed) > 1.0f ? fabsf(speed) : 100.0f;
        timeout = (uint32_t)((total_dist / nominal_speed) * 1500.0f) + 1200;
    } else {
        timeout = (uint32_t)pb_obj_get_int(timeout_ms_obj);
    }

    float gt;
    if (goal_theta_obj == mp_const_none) {
        gt = atan2f(gy - cur_y, gx - cur_x) * (180.0f / 3.14159265f);
    } else {
        gt = mp_obj_get_float(goal_theta_obj);
    }

    pbio_control_on_completion_t stop_behavior = pb_type_enum_get_value(then_obj, &pb_enum_type_Stop);

    float start_x = cur_x;
    float start_y = cur_y;
    uint32_t start_time = pbdrv_clock_get_ms();

    float diam_mm = (float)self->rb->wheel_diameter / 1000.0f;
    float track_mm = (float)self->rb->axle_track / 1000.0f;

    float target_speed = back ? -fabsf(speed) : fabsf(speed);
    float current_start_speed = back ? -fabsf(start_speed) : fabsf(start_speed);
    float current_end_speed = back ? -fabsf(end_speed) : fabsf(end_speed);
    float last_accel_speed_abs = fabsf(current_start_speed);

    // continuous startspeed transition from ongoing servo speed
    int32_t l_dps = 0, r_dps = 0, speed_unused = 0;
    pbio_servo_get_state_user(self->rb->left, &speed_unused, &l_dps);
    pbio_servo_get_state_user(self->rb->right, &speed_unused, &r_dps);
    float current_linear_speed = ((float)(l_dps + r_dps) / 2.0f / 360.0f) * 3.14159265f * diam_mm;
    
    if (fabsf(current_linear_speed) > 40.0f) {
        if (fabsf(current_start_speed) <= 40.0f) {
            current_start_speed = current_linear_speed;
        }
    }

    uint32_t last_time = start_time;
    float last_theta = self->rb->theta;
    float integral = 0.0f;

    while (1) {
        uint32_t elapsed_ms = pbdrv_clock_get_ms() - start_time;
        if (timeout > 0 && elapsed_ms >= timeout) {
            break;
        }

        float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
        pbio_mdrobotbase_update_state(self->rb, gyro_heading);

        float dx = gx - self->rb->x;
        float dy = gy - self->rb->y;
        float dist_remaining = sqrtf(dx * dx + dy * dy);

        if (dist_remaining <= tolerance) {
            break;
        }

        // Project current position onto the path vector to check if we have crossed the target plane
        float path_x = gx - start_x;
        float path_y = gy - start_y;
        float path_len = sqrtf(path_x * path_x + path_y * path_y);
        if (path_len > 1.0f) {
            float dot = path_x * dx + path_y * dy;
            if (dot <= 0.0f) {
                break;
            }
        }

        uint32_t now = pbdrv_clock_get_ms();
        float dt_sec = (float)(now - last_time) / 1000.0f;
        if (dt_sec <= 0.0f) dt_sec = 0.001f;
        last_time = now;

        float delta_theta = self->rb->theta - last_theta;
        while (delta_theta > 180.0f) delta_theta -= 360.0f;
        while (delta_theta < -180.0f) delta_theta += 360.0f;
        float w_raw = delta_theta / dt_sec;
        last_theta = self->rb->theta;

        float dist_traveled = sqrtf((self->rb->x - start_x) * (self->rb->x - start_x) + (self->rb->y - start_y) * (self->rb->y - start_y));

        // Speed Profiling Calculation
        float v_profile = target_speed;
        if (ramping) {
            float v_acc = target_speed;
            if (accel_d > 0.0f && dist_traveled < accel_d) {
                float ratio = dist_traveled / accel_d;
                v_acc = current_start_speed + (target_speed - current_start_speed) * ratio;
            }
            float v_dec = target_speed;
            if (decel_d > 0.0f && dist_remaining < decel_d) {
                float ratio = dist_remaining / decel_d;
                v_dec = current_end_speed + (target_speed - current_end_speed) * ratio;
            }
            if (fabsf(v_acc) < fabsf(v_dec)) {
                v_profile = v_acc;
            } else {
                v_profile = v_dec;
            }

            // Monotonic Speed Filtering during Acceleration phase
            if (dist_remaining >= decel_d && dist_traveled < accel_d && fabsf(current_start_speed) < fabsf(target_speed)) {
                float v_profile_abs = fabsf(v_profile);
                if (v_profile_abs < last_accel_speed_abs) {
                    v_profile_abs = last_accel_speed_abs;
                }
                last_accel_speed_abs = v_profile_abs;
                v_profile = (target_speed >= 0.0f) ? v_profile_abs : -v_profile_abs;
            }

            // Apply stiction kick if requested and still within the kick window
            if (elapsed_ms < (uint32_t)kick_time) {
                float abs_kick_speed = fabsf(kick_speed);
                float v_profile_abs = fabsf(v_profile);
                if (v_profile_abs < abs_kick_speed) {
                    v_profile_abs = abs_kick_speed;
                }
                v_profile = (target_speed >= 0.0f) ? v_profile_abs : -v_profile_abs;
            }
        }

        float target_theta = atan2f(gy - self->rb->y, gx - self->rb->x) * (180.0f / 3.14159265f);
        if (back) {
            target_theta += 180.0f;
        }
        while (target_theta > 180.0f) target_theta -= 360.0f;
        while (target_theta < -180.0f) target_theta += 360.0f;

        float ref_theta = target_theta;
        if (goal_theta_obj != mp_const_none && dist_remaining < decel_d && decel_d > 0.0f) {
            float ratio = dist_remaining / decel_d;
            float diff = gt - target_theta;
            while (diff > 180.0f) diff -= 360.0f;
            while (diff < -180.0f) diff += 360.0f;
            ref_theta = target_theta + diff * (1.0f - ratio);
        }

        float v_cmd = v_profile;
        float w_cmd = 0.0f;

        int32_t left_load = 0;
        int32_t right_load = 0;
        pbio_servo_get_load(self->rb->left, &left_load);
        pbio_servo_get_load(self->rb->right, &right_load);
        float l_avg = (float)(left_load + right_load) / 2.0f;
        float l_diff = (float)(right_load - left_load);

        if (self->rb->controller_type == PBIO_MDROBOTBASE_CONTROLLER_LQR) {
            float cos_theta = cosf(self->rb->theta * (3.14159265f / 180.0f));
            float sin_theta = sinf(self->rb->theta * (3.14159265f / 180.0f));

            float e_x_local = cos_theta * dx + sin_theta * dy;
            float e_y_local = -sin_theta * dx + cos_theta * dy;
            float e_theta_deg = ref_theta - self->rb->theta;
            while (e_theta_deg > 180.0f) e_theta_deg -= 360.0f;
            while (e_theta_deg < -180.0f) e_theta_deg += 360.0f;

            float e_x = e_x_local / 1000.0f;
            float e_y = e_y_local / 1000.0f;
            float e_theta = e_theta_deg * (3.14159265f / 180.0f);

            // Dynamic LQR gain scheduling based on profile velocity
            float v_abs = fabsf(v_profile);
            float sched_scale = sqrtf(v_abs / 300.0f);
            if (sched_scale < 0.2f) sched_scale = 0.2f;

            float scheduled_k_y = self->rb->k_y * sched_scale;
            float scheduled_k_theta = self->rb->k_theta * sched_scale;

            float u_v = -((self->rb->k_x * comp) * e_x);
            float u_w = -((scheduled_k_y * comp) * e_y + (scheduled_k_theta * comp) * e_theta);

            v_cmd = v_profile - u_v * 1000.0f;
            w_cmd = 0.0f - u_w * (180.0f / 3.14159265f);

            // Apply coupled load compensation directly to LQR outputs
            v_cmd = v_cmd - l_avg * 0.5f;
            w_cmd = w_cmd - l_diff * 0.5f;
        } else {
            float e_theta = ref_theta - self->rb->theta;
            while (e_theta > 180.0f) e_theta -= 360.0f;
            while (e_theta < -180.0f) e_theta += 360.0f;

            float i_term = 0.0f;
            if (self->rb->ki > 0.0f) {
                integral += e_theta * dt_sec;
                float max_integral = 100.0f / self->rb->ki;
                if (integral > max_integral) integral = max_integral;
                if (integral < -max_integral) integral = -max_integral;
                i_term = self->rb->ki * integral;
            }

            float d_term = -(self->rb->kd * comp) * w_raw;
            w_cmd = (self->rb->kp * comp) * e_theta + i_term + d_term;

            // Stiction and backlash minimum steering command deadband
            if (self->rb->pid_min_turn > 0.0f && fabsf(e_theta) > self->rb->pid_min_turn_threshold) {
                float min_turn = self->rb->pid_min_turn * comp;
                if (w_cmd > 0.0f) {
                    if (w_cmd < min_turn) w_cmd = min_turn;
                } else {
                    if (w_cmd > -min_turn) w_cmd = -min_turn;
                }
            }

            w_cmd = w_cmd - l_diff * 0.5f;
            v_cmd = v_cmd - l_avg * 0.5f;
        }

        float w_rad = w_cmd * (3.14159265f / 180.0f);
        float left_vel = v_cmd - w_rad * (track_mm / 2.0f);
        float right_vel = v_cmd + w_rad * (track_mm / 2.0f);

        int32_t left_dps = (int32_t)((left_vel / (3.14159265f * diam_mm)) * 360.0f);
        int32_t right_dps = (int32_t)((right_vel / (3.14159265f * diam_mm)) * 360.0f);

        if (left_dps > 1000) left_dps = 1000;
        if (left_dps < -1000) left_dps = -1000;
        if (right_dps > 1000) right_dps = 1000;
        if (right_dps < -1000) right_dps = -1000;

        pbio_servo_run_forever(self->rb->left, left_dps);
        pbio_servo_run_forever(self->rb->right, right_dps);

        mp_hal_delay_ms(10);
    }

    // If goal_theta was specified, perform a final turn-in-place to align heading
    if (goal_theta_obj != mp_const_none) {
        // If timeout was calculated automatically, extend it to include the estimated turn time
        if (timeout_ms_obj == mp_const_none) {
            float e_theta_init = gt - self->rb->theta;
            while (e_theta_init > 180.0f) e_theta_init -= 360.0f;
            while (e_theta_init < -180.0f) e_theta_init += 360.0f;
            float turn_angle = fabsf(e_theta_init);
            
            // Assume 150 deg/s nominal turn rate, add 50% safety margin and 1000ms buffer
            uint32_t turn_timeout_add = (uint32_t)((turn_angle / 150.0f) * 1500.0f) + 1000;
            timeout += turn_timeout_add;
        }

        uint32_t final_last_time = pbdrv_clock_get_ms();
        float final_last_theta = self->rb->theta;
        float final_integral = 0.0f;
        float final_stall_time_ms = 0.0f;

        while (1) {
            uint32_t elapsed_ms = pbdrv_clock_get_ms() - start_time;
            if (timeout > 0 && elapsed_ms >= timeout) {
                break;
            }

            float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
            pbio_mdrobotbase_update_state(self->rb, gyro_heading);

            uint32_t now = pbdrv_clock_get_ms();
            float dt_sec = (float)(now - final_last_time) / 1000.0f;
            if (dt_sec <= 0.0f) dt_sec = 0.001f;
            final_last_time = now;

            float delta_theta = self->rb->theta - final_last_theta;
            while (delta_theta > 180.0f) delta_theta -= 360.0f;
            while (delta_theta < -180.0f) delta_theta += 360.0f;
            float w_raw = delta_theta / dt_sec;
            final_last_theta = self->rb->theta;

            float e_theta = gt - self->rb->theta;
            while (e_theta > 180.0f) e_theta -= 360.0f;
            while (e_theta < -180.0f) e_theta += 360.0f;

            if (fabsf(e_theta) <= 1.5f) {
                break;
            }

            int32_t left_load = 0;
            int32_t right_load = 0;
            pbio_servo_get_load(self->rb->left, &left_load);
            pbio_servo_get_load(self->rb->right, &right_load);
            float l_diff = (float)(right_load - left_load);

            float i_term = 0.0f;
            if (self->rb->ki > 0.0f) {
                final_integral += e_theta * dt_sec;
                float max_integral = 100.0f / self->rb->ki;
                if (final_integral > max_integral) final_integral = max_integral;
                if (final_integral < -max_integral) final_integral = -max_integral;
                i_term = self->rb->ki * final_integral;
            }

            float d_term = -(self->rb->kd * comp) * w_raw;
            float w_cmd = (self->rb->kp * comp) * e_theta + i_term + d_term;
            w_cmd = w_cmd - l_diff * 0.5f;
            if (w_cmd > self->rb->max_angular_speed) w_cmd = self->rb->max_angular_speed;
            if (w_cmd < -self->rb->max_angular_speed) w_cmd = -self->rb->max_angular_speed;

            // Sensor-fused angular stall detection during turn
            if (elapsed_ms > 200) {
                if (fabsf(w_cmd) > 40.0f && fabsf(w_raw) < 10.0f) {
                    final_stall_time_ms += dt_sec * 1000.0f;
                } else {
                    final_stall_time_ms = 0.0f;
                }

                if (final_stall_time_ms > 200.0f) {
                    break;
                }
            }

            float w_rad = w_cmd * (3.14159265f / 180.0f);
            float left_vel = -w_rad * (track_mm / 2.0f);
            float right_vel = w_rad * (track_mm / 2.0f);

            int32_t left_dps = (int32_t)((left_vel / (3.14159265f * diam_mm)) * 360.0f);
            int32_t right_dps = (int32_t)((right_vel / (3.14159265f * diam_mm)) * 360.0f);

            if (left_dps > 800) left_dps = 800;
            if (left_dps < -800) left_dps = -800;
            if (right_dps > 800) right_dps = 800;
            if (right_dps < -800) right_dps = -800;

            pbio_servo_run_forever(self->rb->left, left_dps);
            pbio_servo_run_forever(self->rb->right, right_dps);

            mp_hal_delay_ms(10);
        }
    }

    pbio_servo_stop(self->rb->left, stop_behavior);
    pbio_servo_stop(self->rb->right, stop_behavior);

    // If stop behavior is not coasting, let the motors physically settle to a stop
    if (stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {
        mp_hal_delay_ms(50);
    }

    // Perform a final odometry update to record deceleration and settling motion
    float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
    pbio_mdrobotbase_update_state(self->rb, gyro_heading);

    // If stop behavior is not coasting, reset low-level encoder hardware registers to zero to synchronize physical angles
    if (stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {
        pbio_servo_reset_angle(self->rb->left, 0, false);
        pbio_servo_reset_angle(self->rb->right, 0, false);
        self->rb->last_left_deg = 0.0f;
        self->rb->last_right_deg = 0.0f;
    }

    return mp_const_none;
}

// pybricks.robotics.MDRobotBase.navigate_to_goal
static mp_obj_t pb_type_MDRobotBase_navigate_to_goal(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);

    static const mp_arg_t allowed_args[] = {
        { MP_QSTR_goal_x, MP_ARG_OBJ | MP_ARG_REQUIRED, { } },
        { MP_QSTR_goal_y, MP_ARG_OBJ | MP_ARG_REQUIRED, { } },
        { MP_QSTR_goal_theta, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_speed_mm_s, MP_ARG_INT, {.u_int = 500} },
        { MP_QSTR_start_speed_mm_s, MP_ARG_INT, {.u_int = 20} },
        { MP_QSTR_end_speed_mm_s, MP_ARG_INT, {.u_int = 40} },
        { MP_QSTR_accel_dist_mm, MP_ARG_INT, {.u_int = 50} },
        { MP_QSTR_decel_dist_mm, MP_ARG_INT, {.u_int = 50} },
        { MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = true} },
        { MP_QSTR_backward, MP_ARG_BOOL, {.u_bool = false} },
        { MP_QSTR_tolerance_dist, MP_ARG_INT, {.u_int = 15} },
        { MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)} },
        { MP_QSTR_kick_speed_mm_s, MP_ARG_INT, {.u_int = 0} },
        { MP_QSTR_kick_time_ms, MP_ARG_INT, {.u_int = 0} },
    };

    mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
    mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args, MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

    float gx = mp_obj_get_float(parsed_args[0].u_obj);
    float gy = mp_obj_get_float(parsed_args[1].u_obj);
    mp_obj_t goal_theta_obj = parsed_args[2].u_obj;
    float speed = (float)parsed_args[3].u_int;
    float start_speed = (float)parsed_args[4].u_int;
    float end_speed = (float)parsed_args[5].u_int;
    float accel_d = (float)parsed_args[6].u_int;
    float decel_d = (float)parsed_args[7].u_int;
    bool ramping = parsed_args[8].u_bool;
    bool back = parsed_args[9].u_bool;
    float tolerance = (float)parsed_args[10].u_int;
    mp_obj_t timeout_ms_obj = parsed_args[11].u_obj;
    mp_obj_t then_obj = parsed_args[12].u_obj;
    float kick_speed = (float)parsed_args[13].u_int;
    float kick_time = (float)parsed_args[14].u_int;

    return pb_type_MDRobotBase_navigate_to_goal_internal(
        self, gx, gy, goal_theta_obj, speed, start_speed, end_speed,
        accel_d, decel_d, ramping, back, tolerance, timeout_ms_obj, then_obj,
        kick_speed, kick_time);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_navigate_to_goal_obj, 1, pb_type_MDRobotBase_navigate_to_goal);

// pybricks.robotics.MDRobotBase.go_forward
static mp_obj_t pb_type_MDRobotBase_go_forward(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);

    static const mp_arg_t allowed_args[] = {
        { MP_QSTR_distance, MP_ARG_OBJ | MP_ARG_REQUIRED, { } },
        { MP_QSTR_speed_mm_s, MP_ARG_INT, {.u_int = 500} },
        { MP_QSTR_start_speed_mm_s, MP_ARG_INT, {.u_int = 20} },
        { MP_QSTR_end_speed_mm_s, MP_ARG_INT, {.u_int = 40} },
        { MP_QSTR_accel_dist_mm, MP_ARG_INT, {.u_int = 50} },
        { MP_QSTR_decel_dist_mm, MP_ARG_INT, {.u_int = 50} },
        { MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = true} },
        { MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)} },
        { MP_QSTR_kick_speed_mm_s, MP_ARG_INT, {.u_int = 0} },
        { MP_QSTR_kick_time_ms, MP_ARG_INT, {.u_int = 0} },
    };

    mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
    mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args, MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

    float distance = mp_obj_get_float(parsed_args[0].u_obj);
    float speed = (float)parsed_args[1].u_int;
    float start_speed = (float)parsed_args[2].u_int;
    float end_speed = (float)parsed_args[3].u_int;
    float accel_d = (float)parsed_args[4].u_int;
    float decel_d = (float)parsed_args[5].u_int;
    bool ramping = parsed_args[6].u_bool;
    mp_obj_t timeout_ms_obj = parsed_args[7].u_obj;
    mp_obj_t then_obj = parsed_args[8].u_obj;
    float kick_speed = (float)parsed_args[9].u_int;
    float kick_time = (float)parsed_args[10].u_int;

    float cur_x = self->rb->x;
    float cur_y = self->rb->y;
    float cur_theta = self->rb->theta;
    float rad = cur_theta * (3.14159265f / 180.0f);

    float gx = cur_x + distance * cosf(rad);
    float gy = cur_y + distance * sinf(rad);
    mp_obj_t goal_theta_obj = mp_const_none;

    return pb_type_MDRobotBase_navigate_to_goal_internal(
        self, gx, gy, goal_theta_obj, speed, start_speed, end_speed,
        accel_d, decel_d, ramping, false, 15.0f, timeout_ms_obj, then_obj,
        kick_speed, kick_time);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_go_forward_obj, 1, pb_type_MDRobotBase_go_forward);

// pybricks.robotics.MDRobotBase.go_backward
static mp_obj_t pb_type_MDRobotBase_go_backward(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);

    static const mp_arg_t allowed_args[] = {
        { MP_QSTR_distance, MP_ARG_OBJ | MP_ARG_REQUIRED, { } },
        { MP_QSTR_speed_mm_s, MP_ARG_INT, {.u_int = 500} },
        { MP_QSTR_start_speed_mm_s, MP_ARG_INT, {.u_int = 20} },
        { MP_QSTR_end_speed_mm_s, MP_ARG_INT, {.u_int = 40} },
        { MP_QSTR_accel_dist_mm, MP_ARG_INT, {.u_int = 50} },
        { MP_QSTR_decel_dist_mm, MP_ARG_INT, {.u_int = 50} },
        { MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = true} },
        { MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)} },
        { MP_QSTR_kick_speed_mm_s, MP_ARG_INT, {.u_int = 0} },
        { MP_QSTR_kick_time_ms, MP_ARG_INT, {.u_int = 0} },
    };

    mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
    mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args, MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

    float distance = mp_obj_get_float(parsed_args[0].u_obj);
    float speed = (float)parsed_args[1].u_int;
    float start_speed = (float)parsed_args[2].u_int;
    float end_speed = (float)parsed_args[3].u_int;
    float accel_d = (float)parsed_args[4].u_int;
    float decel_d = (float)parsed_args[5].u_int;
    bool ramping = parsed_args[6].u_bool;
    mp_obj_t timeout_ms_obj = parsed_args[7].u_obj;
    mp_obj_t then_obj = parsed_args[8].u_obj;
    float kick_speed = (float)parsed_args[9].u_int;
    float kick_time = (float)parsed_args[10].u_int;

    float cur_x = self->rb->x;
    float cur_y = self->rb->y;
    float cur_theta = self->rb->theta;
    float rad = cur_theta * (3.14159265f / 180.0f);

    float gx = cur_x - distance * cosf(rad);
    float gy = cur_y - distance * sinf(rad);
    mp_obj_t goal_theta_obj = mp_const_none;

    return pb_type_MDRobotBase_navigate_to_goal_internal(
        self, gx, gy, goal_theta_obj, speed, start_speed, end_speed,
        accel_d, decel_d, ramping, true, 15.0f, timeout_ms_obj, then_obj,
        kick_speed, kick_time);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_go_backward_obj, 1, pb_type_MDRobotBase_go_backward);

// pybricks.robotics.MDRobotBase.turn_to_angle
static mp_obj_t pb_type_MDRobotBase_turn_to_angle_internal(
    pb_type_MDRobotBase_obj_t *self,
    float target_angle,
    float speed_deg_s,
    mp_obj_t tolerance_obj,
    mp_obj_t timeout_ms_obj,
    mp_obj_t then_obj,
    float accel_angle,
    float start_turn_rate) {

    float tolerance = 1.5f;
    if (tolerance_obj != mp_const_none) {
        tolerance = mp_obj_get_float(tolerance_obj);
    }

    float cur_theta = self->rb->theta;
    float e_theta_init = target_angle - cur_theta;
    while (e_theta_init > 180.0f) e_theta_init -= 360.0f;
    while (e_theta_init < -180.0f) e_theta_init += 360.0f;
    float turn_angle = fabsf(e_theta_init);

    uint32_t timeout;
    if (timeout_ms_obj == mp_const_none) {
        float nominal_speed = speed_deg_s > 10.0f ? speed_deg_s : 150.0f;
        timeout = (uint32_t)((turn_angle / nominal_speed) * 1500.0f) + 1000;
    } else {
        timeout = (uint32_t)pb_obj_get_int(timeout_ms_obj);
    }

    pbio_control_on_completion_t stop_behavior = pb_type_enum_get_value(then_obj, &pb_enum_type_Stop);
    uint32_t start_time = pbdrv_clock_get_ms();
    uint32_t last_time = start_time;
    float last_theta = self->rb->theta;
    float integral = 0.0f;
    float stall_time_ms = 0.0f;

    float diam_mm = (float)self->rb->wheel_diameter / 1000.0f;
    float track_mm = (float)self->rb->axle_track / 1000.0f;

    float comp = get_battery_compensation_factor();

    if (start_turn_rate <= 40.0f) {
        float pretension_rate = 40.0f * (e_theta_init >= 0.0f ? 1.0f : -1.0f);
        float w_rad = pretension_rate * (3.14159265f / 180.0f);
        float left_vel = -w_rad * (track_mm / 2.0f);
        float right_vel = w_rad * (track_mm / 2.0f);
        int32_t left_dps = (int32_t)((left_vel / (3.14159265f * diam_mm)) * 360.0f);
        int32_t right_dps = (int32_t)((right_vel / (3.14159265f * diam_mm)) * 360.0f);
        pbio_servo_run_forever(self->rb->left, left_dps);
        pbio_servo_run_forever(self->rb->right, right_dps);
        mp_hal_delay_ms(80);

        float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
        pbio_mdrobotbase_update_state(self->rb, gyro_heading);
        last_time = pbdrv_clock_get_ms();
        last_theta = self->rb->theta;
    }

    while (1) {
        uint32_t elapsed_ms = pbdrv_clock_get_ms() - start_time;
        if (timeout > 0 && elapsed_ms >= timeout) {
            break;
        }

        float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
        pbio_mdrobotbase_update_state(self->rb, gyro_heading);

        uint32_t now = pbdrv_clock_get_ms();
        float dt_sec = (float)(now - last_time) / 1000.0f;
        if (dt_sec <= 0.0f) dt_sec = 0.001f;
        last_time = now;

        float delta_theta = self->rb->theta - last_theta;
        while (delta_theta > 180.0f) delta_theta -= 360.0f;
        while (delta_theta < -180.0f) delta_theta += 360.0f;
        float w_raw = delta_theta / dt_sec;
        last_theta = self->rb->theta;

        float e_theta = target_angle - self->rb->theta;
        while (e_theta > 180.0f) e_theta -= 360.0f;
        while (e_theta < -180.0f) e_theta += 360.0f;

        if (fabsf(e_theta) <= tolerance) {
            break;
        }

        int32_t left_load = 0;
        int32_t right_load = 0;
        pbio_servo_get_load(self->rb->left, &left_load);
        pbio_servo_get_load(self->rb->right, &right_load);
        float l_diff = (float)(right_load - left_load);

        float i_term = 0.0f;
        if (self->rb->ki > 0.0f) {
            integral += e_theta * dt_sec;
            float max_integral = 100.0f / self->rb->ki;
            if (integral > max_integral) integral = max_integral;
            if (integral < -max_integral) integral = -max_integral;
            i_term = self->rb->ki * integral;
        }

        float d_term = -(self->rb->kd * comp) * w_raw;
        float w_cmd = (self->rb->kp * comp) * e_theta + i_term + d_term;
        w_cmd = w_cmd - l_diff * 0.5f;
        float remaining_angle = fabsf(e_theta);
        float turned_angle = turn_angle - remaining_angle;
        if (turned_angle < 0.0f) turned_angle = 0.0f;

        float accel_limit = speed_deg_s;
        if (accel_angle > 0.0f && turned_angle < accel_angle) {
            accel_limit = start_turn_rate + (speed_deg_s - start_turn_rate) * (turned_angle / accel_angle);
        }

        float limit = accel_limit < self->rb->max_angular_speed ? accel_limit : self->rb->max_angular_speed;
        if (w_cmd > limit) w_cmd = limit;
        if (w_cmd < -limit) w_cmd = -limit;

        // Sensor-fused angular stall detection during turn
        if (elapsed_ms > 200) {
            if (fabsf(w_cmd) > 40.0f && fabsf(w_raw) < 10.0f) {
                stall_time_ms += dt_sec * 1000.0f;
            } else {
                stall_time_ms = 0.0f;
            }

            if (stall_time_ms > 200.0f) {
                break;
            }
        }

        float w_rad = w_cmd * (3.14159265f / 180.0f);
        float left_vel = -w_rad * (track_mm / 2.0f);
        float right_vel = w_rad * (track_mm / 2.0f);

        int32_t left_dps = (int32_t)((left_vel / (3.14159265f * diam_mm)) * 360.0f);
        int32_t right_dps = (int32_t)((right_vel / (3.14159265f * diam_mm)) * 360.0f);

        if (left_dps > 1000) left_dps = 1000;
        if (left_dps < -1000) left_dps = -1000;
        if (right_dps > 1000) right_dps = 1000;
        if (right_dps < -1000) right_dps = -1000;

        pbio_servo_run_forever(self->rb->left, left_dps);
        pbio_servo_run_forever(self->rb->right, right_dps);

        mp_hal_delay_ms(10);
    }

    pbio_servo_stop(self->rb->left, stop_behavior);
    pbio_servo_stop(self->rb->right, stop_behavior);

    if (stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {
        mp_hal_delay_ms(50);
    }

    float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
    pbio_mdrobotbase_update_state(self->rb, gyro_heading);

    return mp_const_none;
}

// pybricks.robotics.MDRobotBase.turn_to_angle
static mp_obj_t pb_type_MDRobotBase_turn_to_angle(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);

    static const mp_arg_t allowed_args[] = {
        { MP_QSTR_target_angle, MP_ARG_OBJ | MP_ARG_REQUIRED, { } },
        { MP_QSTR_speed_deg_s, MP_ARG_INT, {.u_int = 300} },
        { MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)} },
        { MP_QSTR_accel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_start_turn_rate, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    };

    mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
    mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args, MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

    float target_angle = mp_obj_get_float(parsed_args[0].u_obj);
    float speed_deg_s = (float)parsed_args[1].u_int;
    mp_obj_t tolerance_obj = parsed_args[2].u_obj;
    mp_obj_t timeout_ms_obj = parsed_args[3].u_obj;
    mp_obj_t then_obj = parsed_args[4].u_obj;
    float accel_angle = parsed_args[5].u_obj == mp_const_none ? 15.0f : mp_obj_get_float(parsed_args[5].u_obj);
    float start_turn_rate = parsed_args[6].u_obj == mp_const_none ? 40.0f : mp_obj_get_float(parsed_args[6].u_obj);

    return pb_type_MDRobotBase_turn_to_angle_internal(
        self, target_angle, speed_deg_s, tolerance_obj, timeout_ms_obj, then_obj, accel_angle, start_turn_rate);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_turn_to_angle_obj, 1, pb_type_MDRobotBase_turn_to_angle);

// pybricks.robotics.MDRobotBase.turn_angle
static mp_obj_t pb_type_MDRobotBase_turn_angle(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);

    static const mp_arg_t allowed_args[] = {
        { MP_QSTR_angle, MP_ARG_OBJ | MP_ARG_REQUIRED, { } },
        { MP_QSTR_speed_deg_s, MP_ARG_INT, {.u_int = 300} },
        { MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)} },
        { MP_QSTR_accel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_start_turn_rate, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    };

    mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
    mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args, MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

    float angle = mp_obj_get_float(parsed_args[0].u_obj);
    float speed_deg_s = (float)parsed_args[1].u_int;
    mp_obj_t tolerance_obj = parsed_args[2].u_obj;
    mp_obj_t timeout_ms_obj = parsed_args[3].u_obj;
    mp_obj_t then_obj = parsed_args[4].u_obj;
    float accel_angle = parsed_args[5].u_obj == mp_const_none ? 15.0f : mp_obj_get_float(parsed_args[5].u_obj);
    float start_turn_rate = parsed_args[6].u_obj == mp_const_none ? 40.0f : mp_obj_get_float(parsed_args[6].u_obj);

    float target_angle = self->rb->theta + angle;
    while (target_angle > 180.0f) target_angle -= 360.0f;
    while (target_angle < -180.0f) target_angle += 360.0f;

    return pb_type_MDRobotBase_turn_to_angle_internal(
        self, target_angle, speed_deg_s, tolerance_obj, timeout_ms_obj, then_obj, accel_angle, start_turn_rate);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_turn_angle_obj, 1, pb_type_MDRobotBase_turn_angle);

static mp_obj_t pb_type_MDRobotBase_pivot_turn_to_angle_internal(
    pb_type_MDRobotBase_obj_t *self,
    float target_angle,
    float speed_deg_s,
    mp_obj_t pivot_side_obj,
    mp_obj_t tolerance_obj,
    mp_obj_t timeout_ms_obj,
    mp_obj_t then_obj,
    float accel_angle,
    float start_turn_rate) {

    float tolerance = 1.5f;
    if (tolerance_obj != mp_const_none) {
        tolerance = mp_obj_get_float(tolerance_obj);
    }

    bool pivot_left = true;
    if (pivot_side_obj != mp_const_none && mp_obj_is_str(pivot_side_obj)) {
        const char *side_str = mp_obj_str_get_str(pivot_side_obj);
        if (side_str[0] == 'r' || side_str[0] == 'R') {
            pivot_left = false;
        }
    }

    float cur_theta = self->rb->theta;
    float e_theta_init = target_angle - cur_theta;
    while (e_theta_init > 180.0f) e_theta_init -= 360.0f;
    while (e_theta_init < -180.0f) e_theta_init += 360.0f;
    float turn_angle = fabsf(e_theta_init);

    uint32_t timeout;
    if (timeout_ms_obj == mp_const_none) {
        float nominal_speed = speed_deg_s > 10.0f ? speed_deg_s : 100.0f;
        timeout = (uint32_t)((turn_angle / nominal_speed) * 1500.0f) + 1000;
    } else {
        timeout = (uint32_t)pb_obj_get_int(timeout_ms_obj);
    }

    pbio_control_on_completion_t stop_behavior = pb_type_enum_get_value(then_obj, &pb_enum_type_Stop);
    uint32_t start_time = pbdrv_clock_get_ms();
    uint32_t last_time = start_time;
    float last_theta = self->rb->theta;
    float integral = 0.0f;
    float stall_time_ms = 0.0f;

    float diam_mm = (float)self->rb->wheel_diameter / 1000.0f;
    float track_mm = (float)self->rb->axle_track / 1000.0f;

    float comp = get_battery_compensation_factor();

    if (start_turn_rate <= 40.0f) {
        float pretension_rate = 40.0f * (e_theta_init >= 0.0f ? 1.0f : -1.0f);
        float w_rad = pretension_rate * (3.14159265f / 180.0f);
        if (pivot_left) {
            pbio_servo_stop(self->rb->left, PBIO_CONTROL_ON_COMPLETION_HOLD);
            float right_vel = w_rad * track_mm;
            int32_t right_dps = (int32_t)((right_vel / (3.14159265f * diam_mm)) * 360.0f);
            pbio_servo_run_forever(self->rb->right, right_dps);
        } else {
            pbio_servo_stop(self->rb->right, PBIO_CONTROL_ON_COMPLETION_HOLD);
            float left_vel = -w_rad * track_mm;
            int32_t left_dps = (int32_t)((left_vel / (3.14159265f * diam_mm)) * 360.0f);
            pbio_servo_run_forever(self->rb->left, left_dps);
        }
        mp_hal_delay_ms(80);

        float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
        pbio_mdrobotbase_update_state(self->rb, gyro_heading);
        last_time = pbdrv_clock_get_ms();
        last_theta = self->rb->theta;
    }

    while (1) {
        uint32_t elapsed_ms = pbdrv_clock_get_ms() - start_time;
        if (timeout > 0 && elapsed_ms >= timeout) {
            break;
        }

        float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
        pbio_mdrobotbase_update_state(self->rb, gyro_heading);

        uint32_t now = pbdrv_clock_get_ms();
        float dt_sec = (float)(now - last_time) / 1000.0f;
        if (dt_sec <= 0.0f) dt_sec = 0.001f;
        last_time = now;

        float delta_theta = self->rb->theta - last_theta;
        while (delta_theta > 180.0f) delta_theta -= 360.0f;
        while (delta_theta < -180.0f) delta_theta += 360.0f;
        float w_raw = delta_theta / dt_sec;
        last_theta = self->rb->theta;

        float e_theta = target_angle - self->rb->theta;
        while (e_theta > 180.0f) e_theta -= 360.0f;
        while (e_theta < -180.0f) e_theta += 360.0f;

        if (fabsf(e_theta) <= tolerance) {
            break;
        }

        int32_t right_load = 0;
        int32_t left_load = 0;
        pbio_servo_get_load(self->rb->right, &right_load);
        pbio_servo_get_load(self->rb->left, &left_load);

        float i_term = 0.0f;
        if (self->rb->ki > 0.0f) {
            integral += e_theta * dt_sec;
            float max_integral = 100.0f / self->rb->ki;
            if (integral > max_integral) integral = max_integral;
            if (integral < -max_integral) integral = -max_integral;
            i_term = self->rb->ki * integral;
        }

        float d_term = -(self->rb->kd * comp) * w_raw;
        float w_cmd = (self->rb->kp * comp) * e_theta + i_term + d_term;
        if (pivot_left) {
            w_cmd = w_cmd - (float)right_load * 0.5f;
        } else {
            w_cmd = w_cmd + (float)left_load * 0.5f;
        }

        float remaining_angle = fabsf(e_theta);
        float turned_angle = turn_angle - remaining_angle;
        if (turned_angle < 0.0f) turned_angle = 0.0f;

        float accel_limit = speed_deg_s;
        if (accel_angle > 0.0f && turned_angle < accel_angle) {
            accel_limit = start_turn_rate + (speed_deg_s - start_turn_rate) * (turned_angle / accel_angle);
        }

        float limit = accel_limit < self->rb->max_angular_speed ? accel_limit : self->rb->max_angular_speed;
        if (w_cmd > limit) w_cmd = limit;
        if (w_cmd < -limit) w_cmd = -limit;

        // Sensor-fused angular stall detection during turn
        if (elapsed_ms > 200) {
            if (fabsf(w_cmd) > 40.0f && fabsf(w_raw) < 10.0f) {
                stall_time_ms += dt_sec * 1000.0f;
            } else {
                stall_time_ms = 0.0f;
            }

            if (stall_time_ms > 200.0f) {
                break;
            }
        }

        float w_rad = w_cmd * (3.14159265f / 180.0f);

        if (pivot_left) {
            // Lock left motor
            pbio_servo_stop(self->rb->left, PBIO_CONTROL_ON_COMPLETION_HOLD);
            
            // Run right motor
            float right_vel = w_rad * track_mm;
            int32_t right_dps = (int32_t)((right_vel / (3.14159265f * diam_mm)) * 360.0f);

            if (right_dps > 1000) right_dps = 1000;
            if (right_dps < -1000) right_dps = -1000;
            pbio_servo_run_forever(self->rb->right, right_dps);
        } else {
            // Lock right motor
            pbio_servo_stop(self->rb->right, PBIO_CONTROL_ON_COMPLETION_HOLD);
            
            // Run left motor
            float left_vel = -w_rad * track_mm;
            int32_t left_dps = (int32_t)((left_vel / (3.14159265f * diam_mm)) * 360.0f);

            if (left_dps > 1000) left_dps = 1000;
            if (left_dps < -1000) left_dps = -1000;
            pbio_servo_run_forever(self->rb->left, left_dps);
        }

        mp_hal_delay_ms(10);
    }

    pbio_servo_stop(self->rb->left, stop_behavior);
    pbio_servo_stop(self->rb->right, stop_behavior);

    if (stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {
        mp_hal_delay_ms(50);
    }

    float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
    pbio_mdrobotbase_update_state(self->rb, gyro_heading);

    return mp_const_none;
}

// pybricks.robotics.MDRobotBase.pivot_turn_to_angle
static mp_obj_t pb_type_MDRobotBase_pivot_turn_to_angle(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);

    static const mp_arg_t allowed_args[] = {
        { MP_QSTR_target_angle, MP_ARG_OBJ | MP_ARG_REQUIRED, { } },
        { MP_QSTR_speed_deg_s, MP_ARG_INT, {.u_int = 200} },
        { MP_QSTR_pivot_side, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)} },
        { MP_QSTR_accel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_start_turn_rate, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    };

    mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
    mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args, MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

    float target_angle = mp_obj_get_float(parsed_args[0].u_obj);
    float speed_deg_s = (float)parsed_args[1].u_int;
    mp_obj_t pivot_side_obj = parsed_args[2].u_obj;
    mp_obj_t tolerance_obj = parsed_args[3].u_obj;
    mp_obj_t timeout_ms_obj = parsed_args[4].u_obj;
    mp_obj_t then_obj = parsed_args[5].u_obj;
    float accel_angle = parsed_args[6].u_obj == mp_const_none ? 15.0f : mp_obj_get_float(parsed_args[6].u_obj);
    float start_turn_rate = parsed_args[7].u_obj == mp_const_none ? 40.0f : mp_obj_get_float(parsed_args[7].u_obj);

    return pb_type_MDRobotBase_pivot_turn_to_angle_internal(
        self, target_angle, speed_deg_s, pivot_side_obj, tolerance_obj, timeout_ms_obj, then_obj, accel_angle, start_turn_rate);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_pivot_turn_to_angle_obj, 1, pb_type_MDRobotBase_pivot_turn_to_angle);

// pybricks.robotics.MDRobotBase.pivot_turn_angle
static mp_obj_t pb_type_MDRobotBase_pivot_turn_angle(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);

    static const mp_arg_t allowed_args[] = {
        { MP_QSTR_angle, MP_ARG_OBJ | MP_ARG_REQUIRED, { } },
        { MP_QSTR_speed_deg_s, MP_ARG_INT, {.u_int = 200} },
        { MP_QSTR_pivot_side, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)} },
        { MP_QSTR_accel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_start_turn_rate, MP_ARG_OBJ, {.u_obj = mp_const_none} },
    };

    mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
    mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args, MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

    float angle = mp_obj_get_float(parsed_args[0].u_obj);
    float speed_deg_s = (float)parsed_args[1].u_int;
    mp_obj_t pivot_side_obj = parsed_args[2].u_obj;
    mp_obj_t tolerance_obj = parsed_args[3].u_obj;
    mp_obj_t timeout_ms_obj = parsed_args[4].u_obj;
    mp_obj_t then_obj = parsed_args[5].u_obj;
    float accel_angle = parsed_args[6].u_obj == mp_const_none ? 15.0f : mp_obj_get_float(parsed_args[6].u_obj);
    float start_turn_rate = parsed_args[7].u_obj == mp_const_none ? 40.0f : mp_obj_get_float(parsed_args[7].u_obj);

    float target_angle = self->rb->theta + angle;
    while (target_angle > 180.0f) target_angle -= 360.0f;
    while (target_angle < -180.0f) target_angle += 360.0f;

    return pb_type_MDRobotBase_pivot_turn_to_angle_internal(
        self, target_angle, speed_deg_s, pivot_side_obj, tolerance_obj, timeout_ms_obj, then_obj, accel_angle, start_turn_rate);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_pivot_turn_angle_obj, 1, pb_type_MDRobotBase_pivot_turn_angle);

// pybricks.robotics.MDRobotBase.follow_trajectory
static mp_obj_t pb_type_MDRobotBase_follow_trajectory(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);

    static const mp_arg_t allowed_args[] = {
        { MP_QSTR_points, MP_ARG_OBJ | MP_ARG_REQUIRED, { } },
        { MP_QSTR_speed, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_start_speed, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_end_speed, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_accel_d, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_decel_d, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_transition_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_back, MP_ARG_OBJ, {.u_obj = mp_const_none} },
        { MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)} },
    };

    mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
    mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args, MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

    mp_obj_t points_obj = parsed_args[0].u_obj;
    size_t num_points = 0;
    mp_obj_t *points = NULL;
    mp_obj_get_array(points_obj, &num_points, &points);
    if (num_points == 0) {
        return mp_const_none;
    }

    float speed = parsed_args[1].u_obj == mp_const_none ? 300.0f : mp_obj_get_float(parsed_args[1].u_obj);
    float start_speed = parsed_args[2].u_obj == mp_const_none ? 0.0f : mp_obj_get_float(parsed_args[2].u_obj);
    float end_speed = parsed_args[3].u_obj == mp_const_none ? 0.0f : mp_obj_get_float(parsed_args[3].u_obj);
    float accel_d = parsed_args[4].u_obj == mp_const_none ? 50.0f : mp_obj_get_float(parsed_args[4].u_obj);
    float decel_d = parsed_args[5].u_obj == mp_const_none ? 50.0f : mp_obj_get_float(parsed_args[5].u_obj);
    float tolerance = parsed_args[6].u_obj == mp_const_none ? 10.0f : mp_obj_get_float(parsed_args[6].u_obj);
    float transition_tolerance = parsed_args[7].u_obj == mp_const_none ? 50.0f : mp_obj_get_float(parsed_args[7].u_obj);
    bool back = parsed_args[8].u_obj == mp_const_none ? false : mp_obj_is_true(parsed_args[8].u_obj);
    pbio_control_on_completion_t stop_behavior = pb_type_enum_get_value(parsed_args[9].u_obj, &pb_enum_type_Stop);

    // Initial setup
    float cur_x = self->rb->x;
    float cur_y = self->rb->y;

    float diam_mm = (float)self->rb->wheel_diameter / 1000.0f;
    float track_mm = (float)self->rb->axle_track / 1000.0f;

    float target_speed = back ? -fabsf(speed) : fabsf(speed);
    float current_start_speed = back ? -fabsf(start_speed) : fabsf(start_speed);
    float current_end_speed = back ? -fabsf(end_speed) : fabsf(end_speed);

    // continuous startspeed transition
    int32_t l_dps = 0, r_dps = 0, speed_unused = 0;
    pbio_servo_get_state_user(self->rb->left, &speed_unused, &l_dps);
    pbio_servo_get_state_user(self->rb->right, &speed_unused, &r_dps);
    float current_linear_speed = ((float)(l_dps + r_dps) / 2.0f / 360.0f) * 3.14159265f * diam_mm;
    if (fabsf(current_linear_speed) > 40.0f) {
        if (fabsf(current_start_speed) <= 40.0f) {
            current_start_speed = current_linear_speed;
        }
    }

    float comp = get_battery_compensation_factor();
    accel_d *= comp;
    decel_d *= comp;

    size_t current_point_idx = 0;
    uint32_t start_time = pbdrv_clock_get_ms();
    uint32_t last_time = start_time;
    float last_theta = self->rb->theta;
    float integral = 0.0f;

    float final_segment_start_x = cur_x;
    float final_segment_start_y = cur_y;
    bool final_segment_started = false;

    float last_target_theta = self->rb->theta;
    bool is_first_iter = true;
    float last_w_cmd = 0.0f;

    // Track the start coordinates of the current segment
    float seg_start_x = cur_x;
    float seg_start_y = cur_y;

    // Pre-calculate transition speeds for each waypoint based on turn angle
    float transition_speeds[num_points];
    float target_speed_signed = target_speed;
    float target_speed_unsigned = fabsf(speed);

    for (size_t i = 0; i < num_points; i++) {
        if (i == num_points - 1) {
            transition_speeds[i] = current_end_speed;
        } else {
            // Coordinates of incoming segment start (Point A)
            float ax = cur_x, ay = cur_y;
            if (i > 0) {
                size_t p_len;
                mp_obj_t *p_coords;
                mp_obj_get_array(points[i - 1], &p_len, &p_coords);
                ax = mp_obj_get_float(p_coords[0]);
                ay = mp_obj_get_float(p_coords[1]);
            }
            
            // Point B (the current waypoint)
            size_t p_len;
            mp_obj_t *p_coords;
            mp_obj_get_array(points[i], &p_len, &p_coords);
            float bx = mp_obj_get_float(p_coords[0]);
            float by = mp_obj_get_float(p_coords[1]);
            
            // Point C (the next waypoint)
            mp_obj_get_array(points[i + 1], &p_len, &p_coords);
            float cx = mp_obj_get_float(p_coords[0]);
            float cy = mp_obj_get_float(p_coords[1]);
            
            float theta1 = atan2f(by - ay, bx - ax);
            float theta2 = atan2f(cy - by, cx - bx);
            float diff = theta2 - theta1;
            while (diff > 3.14159265f) diff -= 2.0f * 3.14159265f;
            while (diff < -3.14159265f) diff += 2.0f * 3.14159265f;
            
            float cos_turn = cosf(diff);
            if (cos_turn < 0.0f) cos_turn = 0.0f;
            
            float trans_speed = target_speed_unsigned * cos_turn;
            float min_trans_speed = 50.0f;
            if (trans_speed < min_trans_speed) trans_speed = min_trans_speed;
            if (trans_speed > target_speed_unsigned) trans_speed = target_speed_unsigned;
            
            transition_speeds[i] = back ? -trans_speed : trans_speed;
        }
    }

    // We calculate a generous safety timeout based on the total distance of the trajectory
    float total_dist = 0.0f;
    float prev_tx = cur_x;
    float prev_ty = cur_y;
    for (size_t i = 0; i < num_points; i++) {
        size_t p_len;
        mp_obj_t *p_coords;
        mp_obj_get_array(points[i], &p_len, &p_coords);
        float tx = mp_obj_get_float(p_coords[0]);
        float ty = mp_obj_get_float(p_coords[1]);
        float dx = tx - prev_tx;
        float dy = ty - prev_ty;
        total_dist += sqrtf(dx * dx + dy * dy);
        prev_tx = tx;
        prev_ty = ty;
    }
    float nominal_speed = fabsf(speed) > 1.0f ? fabsf(speed) : 100.0f;
    uint32_t timeout = (uint32_t)((total_dist / nominal_speed) * 1500.0f) + 1500;

    while (1) {
        uint32_t elapsed_ms = pbdrv_clock_get_ms() - start_time;
        if (timeout > 0 && elapsed_ms >= timeout) {
            break;
        }

        float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
        pbio_mdrobotbase_update_state(self->rb, gyro_heading);

        // Get current target coordinate details
        size_t p_len;
        mp_obj_t *p_coords;
        mp_obj_get_array(points[current_point_idx], &p_len, &p_coords);
        float gx = mp_obj_get_float(p_coords[0]);
        float gy = mp_obj_get_float(p_coords[1]);
        float gt = 0.0f;
        bool has_gt = false;
        if (p_len >= 3 && p_coords[2] != mp_const_none) {
            gt = mp_obj_get_float(p_coords[2]);
            has_gt = true;
        }

        float dx = gx - self->rb->x;
        float dy = gy - self->rb->y;
        float dist_remaining = sqrtf(dx * dx + dy * dy);

        // If we are at an intermediate point and are within transition tolerance, switch to the next point
        if (current_point_idx < num_points - 1) {
            if (dist_remaining < transition_tolerance) {
                seg_start_x = gx;
                seg_start_y = gy;
                current_point_idx++;
                continue;
            }
        } else {
            // Final point arrival check
            if (dist_remaining <= tolerance) {
                break;
            }
            if (!final_segment_started) {
                final_segment_start_x = self->rb->x;
                final_segment_start_y = self->rb->y;
                final_segment_started = true;
            }
            // Project onto the final segment path vector to check if target plane was crossed
            float path_x = gx - final_segment_start_x;
            float path_y = gy - final_segment_start_y;
            float path_len = sqrtf(path_x * path_x + path_y * path_y);
            if (path_len > 1.0f) {
                float dot = path_x * dx + path_y * dy;
                if (dot <= 0.0f) {
                    break;
                }
            }
        }

        uint32_t now = pbdrv_clock_get_ms();
        float dt_sec = (float)(now - last_time) / 1000.0f;
        if (dt_sec <= 0.0f) dt_sec = 0.001f;
        last_time = now;

        float delta_theta = self->rb->theta - last_theta;
        while (delta_theta > 180.0f) delta_theta -= 360.0f;
        while (delta_theta < -180.0f) delta_theta += 360.0f;
        float w_raw = delta_theta / dt_sec;
        last_theta = self->rb->theta;

        float seg_start_speed = (current_point_idx == 0) ? current_start_speed : transition_speeds[current_point_idx - 1];
        float seg_end_speed = transition_speeds[current_point_idx];

        float dist_from_start = sqrtf((self->rb->x - seg_start_x) * (self->rb->x - seg_start_x) + (self->rb->y - seg_start_y) * (self->rb->y - seg_start_y));

        // Speed Profiling Calculation
        float v_profile = target_speed_signed;
        float v_acc = target_speed_signed;
        if (accel_d > 0.0f && dist_from_start < accel_d) {
            float ratio = dist_from_start / accel_d;
            v_acc = seg_start_speed + (target_speed_signed - seg_start_speed) * ratio;
        }
        float v_dec = target_speed_signed;
        if (decel_d > 0.0f && dist_remaining < decel_d) {
            float ratio = dist_remaining / decel_d;
            v_dec = seg_end_speed + (target_speed_signed - seg_end_speed) * ratio;
        }
        if (fabsf(v_acc) < fabsf(v_dec)) {
            v_profile = v_acc;
        } else {
            v_profile = v_dec;
        }

        // Steer heading calculation
        float target_theta;
        if (has_gt && current_point_idx == num_points - 1 && dist_remaining < decel_d) {
            // Blend into the final target heading near the end
            float ratio = dist_remaining / decel_d;
            float path_theta = atan2f(gy - self->rb->y, gx - self->rb->x) * (180.0f / 3.14159265f);
            if (back) {
                path_theta += 180.0f;
            }
            while (path_theta > 180.0f) path_theta -= 360.0f;
            while (path_theta < -180.0f) path_theta += 360.0f;

            float diff = gt - path_theta;
            while (diff > 180.0f) diff -= 360.0f;
            while (diff < -180.0f) diff += 360.0f;
            target_theta = path_theta + diff * (1.0f - ratio);
        } else {
            // Calculate Pure Pursuit look-ahead point
            float seg_x = gx - seg_start_x;
            float seg_y = gy - seg_start_y;
            float seg_len = sqrtf(seg_x * seg_x + seg_y * seg_y);
            
            float target_look_x = gx;
            float target_look_y = gy;
            
            if (seg_len > 1.0f) {
                float ux = seg_x / seg_len;
                float uy = seg_y / seg_len;
                
                float wx = self->rb->x - seg_start_x;
                float wy = self->rb->y - seg_start_y;
                float d_proj = wx * ux + wy * uy;
                if (d_proj < 0.0f) d_proj = 0.0f;
                if (d_proj > seg_len) d_proj = seg_len;
                
                // Velocity-dependent dynamic look-ahead scaling
                float speed_ratio = target_speed_unsigned > 1.0f ? (fabsf(v_profile) / target_speed_unsigned) : 1.0f;
                float lookahead_dist = transition_tolerance * (1.0f + speed_ratio);
                if (lookahead_dist < 50.0f) lookahead_dist = 50.0f;
                
                float d_look = d_proj + lookahead_dist;
                if (d_look <= seg_len) {
                    target_look_x = seg_start_x + d_look * ux;
                    target_look_y = seg_start_y + d_look * uy;
                } else {
                    if (current_point_idx < num_points - 1) {
                        size_t next_len;
                        mp_obj_t *next_coords;
                        mp_obj_get_array(points[current_point_idx + 1], &next_len, &next_coords);
                        float nx = mp_obj_get_float(next_coords[0]);
                        float ny = mp_obj_get_float(next_coords[1]);
                        
                        float next_seg_x = nx - gx;
                        float next_seg_y = ny - gy;
                        float next_seg_len = sqrtf(next_seg_x * next_seg_x + next_seg_y * next_seg_y);
                        if (next_seg_len > 1.0f) {
                            float next_ux = next_seg_x / next_seg_len;
                            float next_uy = next_seg_y / next_seg_len;
                            float rem_d = d_look - seg_len;
                            if (rem_d > next_seg_len) rem_d = next_seg_len;
                            target_look_x = gx + rem_d * next_ux;
                            target_look_y = gy + rem_d * next_uy;
                        }
                    }
                }
            }
            
            target_theta = atan2f(target_look_y - self->rb->y, target_look_x - self->rb->x) * (180.0f / 3.14159265f);
            if (back) {
                target_theta += 180.0f;
            }
            while (target_theta > 180.0f) target_theta -= 360.0f;
            while (target_theta < -180.0f) target_theta += 360.0f;
        }

        // Apply slew rate limiting on target_theta to smooth waypoint transitions
        if (is_first_iter) {
            last_target_theta = target_theta;
            is_first_iter = false;
        } else {
            float diff = target_theta - last_target_theta;
            while (diff > 180.0f) diff -= 360.0f;
            while (diff < -180.0f) diff += 360.0f;
            
            float max_change = self->rb->max_angular_speed * dt_sec;
            if (diff > max_change) diff = max_change;
            else if (diff < -max_change) diff = -max_change;
            
            target_theta = last_target_theta + diff;
            while (target_theta > 180.0f) target_theta -= 360.0f;
            while (target_theta < -180.0f) target_theta += 360.0f;
            last_target_theta = target_theta;
        }

        float v_cmd = v_profile;
        float w_cmd = 0.0f;

        int32_t left_load = 0;
        int32_t right_load = 0;
        pbio_servo_get_load(self->rb->left, &left_load);
        pbio_servo_get_load(self->rb->right, &right_load);
        float l_avg = (float)(left_load + right_load) / 2.0f;
        float l_diff = (float)(right_load - left_load);

        if (self->rb->controller_type == PBIO_MDROBOTBASE_CONTROLLER_LQR) {
            float cos_theta = cosf(self->rb->theta * (3.14159265f / 180.0f));
            float sin_theta = sinf(self->rb->theta * (3.14159265f / 180.0f));

            float e_x_local = cos_theta * dx + sin_theta * dy;
            float e_y_local = -sin_theta * dx + cos_theta * dy;
            float e_theta_deg = target_theta - self->rb->theta;
            while (e_theta_deg > 180.0f) e_theta_deg -= 360.0f;
            while (e_theta_deg < -180.0f) e_theta_deg += 360.0f;

            float e_x = e_x_local / 1000.0f;
            float e_y = e_y_local / 1000.0f;
            float e_theta = e_theta_deg * (3.14159265f / 180.0f);

            // Dynamic LQR gain scheduling based on profile velocity
            float v_abs = fabsf(v_profile);
            float sched_scale = sqrtf(v_abs / 300.0f);
            if (sched_scale < 0.2f) sched_scale = 0.2f;

            float scheduled_k_y = self->rb->k_y * sched_scale;
            float scheduled_k_theta = self->rb->k_theta * sched_scale;

            float u_v = -((self->rb->k_x * comp) * e_x);
            float u_w = -((scheduled_k_y * comp) * e_y + (scheduled_k_theta * comp) * e_theta);

            v_cmd = v_profile - u_v * 1000.0f;
            w_cmd = 0.0f - u_w * (180.0f / 3.14159265f);

            // Apply load compensation
            v_cmd = v_cmd - l_avg * 0.5f;
            w_cmd = w_cmd - l_diff * 0.5f;
        } else {
            float e_theta = target_theta - self->rb->theta;
            while (e_theta > 180.0f) e_theta -= 360.0f;
            while (e_theta < -180.0f) e_theta += 360.0f;

            // Scale linear speed by the cosine of the heading error to slow down in sharp turns
            float alignment_factor = cosf(e_theta * (3.14159265f / 180.0f));
            if (alignment_factor < 0.0f) alignment_factor = 0.0f;
            v_cmd = v_profile * alignment_factor;

            float i_term = 0.0f;
            if (self->rb->ki > 0.0f) {
                integral += e_theta * dt_sec;
                float max_integral = 100.0f / self->rb->ki;
                if (integral > max_integral) integral = max_integral;
                if (integral < -max_integral) integral = -max_integral;
                i_term = self->rb->ki * integral;
            }

            float d_term = -(self->rb->kd * comp) * w_raw;
            w_cmd = (self->rb->kp * comp) * e_theta + i_term + d_term;

            // Stiction and backlash minimum steering command deadband
            if (self->rb->pid_min_turn > 0.0f && fabsf(e_theta) > self->rb->pid_min_turn_threshold) {
                float min_turn = self->rb->pid_min_turn * comp;
                if (w_cmd > 0.0f) {
                    if (w_cmd < min_turn) w_cmd = min_turn;
                } else {
                    if (w_cmd > -min_turn) w_cmd = -min_turn;
                }
            }

            w_cmd = w_cmd - l_diff * 0.5f;
            v_cmd = v_cmd - l_avg * 0.5f;
        }

        // Slew-rate limit the commanded steering rate to prevent angular acceleration spikes
        if (!is_first_iter) {
            float max_w_accel = self->rb->max_angular_speed * 1.5f;
            float max_delta_w = max_w_accel * dt_sec;
            float w_diff = w_cmd - last_w_cmd;
            if (w_diff > max_delta_w) {
                w_cmd = last_w_cmd + max_delta_w;
            } else if (w_diff < -max_delta_w) {
                w_cmd = last_w_cmd - max_delta_w;
            }
        }
        last_w_cmd = w_cmd;

        float w_rad = w_cmd * (3.14159265f / 180.0f);
        float left_vel = v_cmd - w_rad * (track_mm / 2.0f);
        float right_vel = v_cmd + w_rad * (track_mm / 2.0f);

        int32_t left_dps = (int32_t)((left_vel / (3.14159265f * diam_mm)) * 360.0f);
        int32_t right_dps = (int32_t)((right_vel / (3.14159265f * diam_mm)) * 360.0f);

        if (left_dps > 1000) left_dps = 1000;
        if (left_dps < -1000) left_dps = -1000;
        if (right_dps > 1000) right_dps = 1000;
        if (right_dps < -1000) right_dps = -1000;

        pbio_servo_run_forever(self->rb->left, left_dps);
        pbio_servo_run_forever(self->rb->right, right_dps);

        mp_hal_delay_ms(10);
    }

    // Stop at final endpoint
    pbio_servo_stop(self->rb->left, stop_behavior);
    pbio_servo_stop(self->rb->right, stop_behavior);
    if (stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {
        mp_hal_delay_ms(50);
    }

    // Final orientation turn alignment if target angle specified
    size_t last_p_len;
    mp_obj_t *last_p_coords;
    mp_obj_get_array(points[num_points - 1], &last_p_len, &last_p_coords);
    if (last_p_len >= 3 && last_p_coords[2] != mp_const_none) {
        float gt = mp_obj_get_float(last_p_coords[2]);
        uint32_t final_last_time = pbdrv_clock_get_ms();
        float final_last_theta = self->rb->theta;
        float final_integral = 0.0f;
        float final_stall_time_ms = 0.0f;

        while (1) {
            uint32_t elapsed_ms = pbdrv_clock_get_ms() - start_time;
            if (timeout > 0 && elapsed_ms >= timeout) {
                break;
            }

            float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
            pbio_mdrobotbase_update_state(self->rb, gyro_heading);

            uint32_t now = pbdrv_clock_get_ms();
            float dt_sec = (float)(now - final_last_time) / 1000.0f;
            if (dt_sec <= 0.0f) dt_sec = 0.001f;
            final_last_time = now;

            float delta_theta = self->rb->theta - final_last_theta;
            while (delta_theta > 180.0f) delta_theta -= 360.0f;
            while (delta_theta < -180.0f) delta_theta += 360.0f;
            float w_raw = delta_theta / dt_sec;
            final_last_theta = self->rb->theta;

            float e_theta = gt - self->rb->theta;
            while (e_theta > 180.0f) e_theta -= 360.0f;
            while (e_theta < -180.0f) e_theta += 360.0f;

            if (fabsf(e_theta) <= tolerance) {
                break;
            }

            int32_t left_load = 0;
            int32_t right_load = 0;
            pbio_servo_get_load(self->rb->left, &left_load);
            pbio_servo_get_load(self->rb->right, &right_load);
            float l_diff = (float)(right_load - left_load);

            float i_term = 0.0f;
            if (self->rb->ki > 0.0f) {
                final_integral += e_theta * dt_sec;
                float max_integral = 100.0f / self->rb->ki;
                if (final_integral > max_integral) final_integral = max_integral;
                if (final_integral < -max_integral) final_integral = -max_integral;
                i_term = self->rb->ki * final_integral;
            }

            float d_term = -(self->rb->kd * comp) * w_raw;
            float w_cmd = (self->rb->kp * comp) * e_theta + i_term + d_term;
            w_cmd = w_cmd - l_diff * 0.5f;
            if (w_cmd > self->rb->max_angular_speed) w_cmd = self->rb->max_angular_speed;
            if (w_cmd < -self->rb->max_angular_speed) w_cmd = -self->rb->max_angular_speed;

            // Sensor-fused angular stall detection during turn
            if (elapsed_ms > 200) {
                if (fabsf(w_cmd) > 40.0f && fabsf(w_raw) < 10.0f) {
                    final_stall_time_ms += dt_sec * 1000.0f;
                } else {
                    final_stall_time_ms = 0.0f;
                }

                if (final_stall_time_ms > 200.0f) {
                    break;
                }
            }

            float w_rad = w_cmd * (3.14159265f / 180.0f);
            float left_vel = -w_rad * (track_mm / 2.0f);
            float right_vel = w_rad * (track_mm / 2.0f);

            int32_t left_dps = (int32_t)((left_vel / (3.14159265f * diam_mm)) * 360.0f);
            int32_t right_dps = (int32_t)((right_vel / (3.14159265f * diam_mm)) * 360.0f);

            if (left_dps > 800) left_dps = 800;
            if (left_dps < -800) left_dps = -800;
            if (right_dps > 800) right_dps = 800;
            if (right_dps < -800) right_dps = -800;

            pbio_servo_run_forever(self->rb->left, left_dps);
            pbio_servo_run_forever(self->rb->right, right_dps);

            mp_hal_delay_ms(10);
        }

        pbio_servo_stop(self->rb->left, stop_behavior);
        pbio_servo_stop(self->rb->right, stop_behavior);
        if (stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {
            mp_hal_delay_ms(50);
        }
    }

    float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
    pbio_mdrobotbase_update_state(self->rb, gyro_heading);

    return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_follow_trajectory_obj, 1, pb_type_MDRobotBase_follow_trajectory);

// pybricks.robotics.MDRobotBase.set_backlash_filter
static mp_obj_t pb_type_MDRobotBase_set_backlash_filter(mp_obj_t self_in, mp_obj_t enabled_in) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
    bool enabled = mp_obj_is_true(enabled_in);
    pb_assert(pbio_mdrobotbase_set_backlash_filter(self->rb, enabled));
    return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_2(pb_type_MDRobotBase_set_backlash_filter_obj, pb_type_MDRobotBase_set_backlash_filter);

// pybricks.robotics.MDRobotBase.get_backlash_filter
static mp_obj_t pb_type_MDRobotBase_get_backlash_filter(mp_obj_t self_in) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
    bool enabled = false;
    pb_assert(pbio_mdrobotbase_get_backlash_filter(self->rb, &enabled));
    return mp_obj_new_bool(enabled);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_backlash_filter_obj, pb_type_MDRobotBase_get_backlash_filter);

// pybricks.robotics.MDRobotBase.set_max_angular_speed
static mp_obj_t pb_type_MDRobotBase_set_max_angular_speed(mp_obj_t self_in, mp_obj_t speed_in) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
    float speed = mp_obj_get_float(speed_in);
    pb_assert(pbio_mdrobotbase_set_max_angular_speed(self->rb, speed));
    return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_2(pb_type_MDRobotBase_set_max_angular_speed_obj, pb_type_MDRobotBase_set_max_angular_speed);

// pybricks.robotics.MDRobotBase.get_max_angular_speed
static mp_obj_t pb_type_MDRobotBase_get_max_angular_speed(mp_obj_t self_in) {
    pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
    float speed;
    pb_assert(pbio_mdrobotbase_get_max_angular_speed(self->rb, &speed));
    return mp_obj_new_float(speed);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_max_angular_speed_obj, pb_type_MDRobotBase_get_max_angular_speed);

// pybricks.robotics.MDRobotBase.__init__
static mp_obj_t pb_type_MDRobotBase_make_new(const mp_obj_type_t *type, size_t n_args, size_t n_kw, const mp_obj_t *args) {
    PB_PARSE_ARGS_CLASS(n_args, n_kw, args,
        PB_ARG_REQUIRED(left_motor),
        PB_ARG_REQUIRED(right_motor),
        PB_ARG_REQUIRED(wheel_diameter),
        PB_ARG_REQUIRED(axle_track));

    pb_type_MDRobotBase_obj_t *self = mp_obj_malloc(pb_type_MDRobotBase_obj_t, type);

    pbio_servo_t *srv_left = pb_type_motor_get_servo(left_motor_in);
    pbio_servo_t *srv_right = pb_type_motor_get_servo(right_motor_in);

    pb_assert(pbio_mdrobotbase_get_robotbase(&self->rb,
        srv_left,
        srv_right,
        pb_obj_get_scaled_int(wheel_diameter_in, 1000),
        pb_obj_get_scaled_int(axle_track_in, 1000)));

    return MP_OBJ_FROM_PTR(self);
}

// locals dict elements
static const mp_rom_map_elem_t pb_type_MDRobotBase_locals_dict_table[] = {
    { MP_ROM_QSTR(MP_QSTR_set_lqr_gains), MP_ROM_PTR(&pb_type_MDRobotBase_set_lqr_gains_obj) },
    { MP_ROM_QSTR(MP_QSTR_get_lqr_gains), MP_ROM_PTR(&pb_type_MDRobotBase_get_lqr_gains_obj) },
    { MP_ROM_QSTR(MP_QSTR_set_controller), MP_ROM_PTR(&pb_type_MDRobotBase_set_controller_obj) },
    { MP_ROM_QSTR(MP_QSTR_get_controller), MP_ROM_PTR(&pb_type_MDRobotBase_get_controller_obj) },
    { MP_ROM_QSTR(MP_QSTR_set_pid_gains), MP_ROM_PTR(&pb_type_MDRobotBase_set_pid_gains_obj) },
    { MP_ROM_QSTR(MP_QSTR_get_pid_gains), MP_ROM_PTR(&pb_type_MDRobotBase_get_pid_gains_obj) },
    { MP_ROM_QSTR(MP_QSTR_reset_state), MP_ROM_PTR(&pb_type_MDRobotBase_reset_state_obj) },
    { MP_ROM_QSTR(MP_QSTR_update_state), MP_ROM_PTR(&pb_type_MDRobotBase_update_state_obj) },
    { MP_ROM_QSTR(MP_QSTR_get_state), MP_ROM_PTR(&pb_type_MDRobotBase_get_state_obj) },
    { MP_ROM_QSTR(MP_QSTR_navigate_to_goal), MP_ROM_PTR(&pb_type_MDRobotBase_navigate_to_goal_obj) },
    { MP_ROM_QSTR(MP_QSTR_go_forward), MP_ROM_PTR(&pb_type_MDRobotBase_go_forward_obj) },
    { MP_ROM_QSTR(MP_QSTR_go_backward), MP_ROM_PTR(&pb_type_MDRobotBase_go_backward_obj) },
    { MP_ROM_QSTR(MP_QSTR_turn_to_angle), MP_ROM_PTR(&pb_type_MDRobotBase_turn_to_angle_obj) },
    { MP_ROM_QSTR(MP_QSTR_turn_angle), MP_ROM_PTR(&pb_type_MDRobotBase_turn_angle_obj) },
    { MP_ROM_QSTR(MP_QSTR_pivot_turn_to_angle), MP_ROM_PTR(&pb_type_MDRobotBase_pivot_turn_to_angle_obj) },
    { MP_ROM_QSTR(MP_QSTR_pivot_turn_angle), MP_ROM_PTR(&pb_type_MDRobotBase_pivot_turn_angle_obj) },
    { MP_ROM_QSTR(MP_QSTR_follow_trajectory), MP_ROM_PTR(&pb_type_MDRobotBase_follow_trajectory_obj) },
    { MP_ROM_QSTR(MP_QSTR_set_backlash_filter), MP_ROM_PTR(&pb_type_MDRobotBase_set_backlash_filter_obj) },
    { MP_ROM_QSTR(MP_QSTR_get_backlash_filter), MP_ROM_PTR(&pb_type_MDRobotBase_get_backlash_filter_obj) },
    { MP_ROM_QSTR(MP_QSTR_set_max_angular_speed), MP_ROM_PTR(&pb_type_MDRobotBase_set_max_angular_speed_obj) },
    { MP_ROM_QSTR(MP_QSTR_get_max_angular_speed), MP_ROM_PTR(&pb_type_MDRobotBase_get_max_angular_speed_obj) },
    { MP_ROM_QSTR(MP_QSTR_set_pid_min_turn), MP_ROM_PTR(&pb_type_MDRobotBase_set_pid_min_turn_obj) },
    { MP_ROM_QSTR(MP_QSTR_get_pid_min_turn), MP_ROM_PTR(&pb_type_MDRobotBase_get_pid_min_turn_obj) },
};
static MP_DEFINE_CONST_DICT(pb_type_MDRobotBase_locals_dict, pb_type_MDRobotBase_locals_dict_table);

// type definition structure
MP_DEFINE_CONST_OBJ_TYPE(
    pb_type_MDRobotBase,
    MP_QSTR_MDRobotBase,
    MP_TYPE_FLAG_NONE,
    make_new, pb_type_MDRobotBase_make_new,
    locals_dict, &pb_type_MDRobotBase_locals_dict
);

#endif // PYBRICKS_PY_ROBOTICS && PYBRICKS_PY_COMMON_MOTORS
