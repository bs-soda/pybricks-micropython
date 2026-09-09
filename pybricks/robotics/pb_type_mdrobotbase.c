// SPDX-License-Identifier: MIT
// Copyright (c) 2018-2023 The Pybricks Authors

#include "py/mpconfig.h"

#ifndef MICROPY_EVENT_POLL_HOOK
#define MICROPY_EVENT_POLL_HOOK MICROPY_VM_HOOK_LOOP
#endif

#if PYBRICKS_PY_ROBOTICS && PYBRICKS_PY_COMMON_MOTORS

#include <math.h>
#include <stdlib.h>

#include "py/mphal.h"
#include <pbdrv/clock.h>
#include <pbio/battery.h>
#include <pbio/imu.h>
#include <pbio/mdrobotbase.h>
#include <pybricks/common.h>
#include <pybricks/parameters.h>
#include <pybricks/robotics.h>
#include <pybricks/tools/pb_type_async.h>
#include <pybricks/util_mp/pb_kwarg_helper.h>
#include <pybricks/util_mp/pb_obj_helper.h>
#include <pybricks/util_pb/pb_error.h>

typedef struct _pb_type_MDRobotBase_obj_t {
  mp_obj_base_t base;
  pbio_mdrobotbase_t *rb;
  bool debug;
  pb_type_async_t *last_awaitable;
} pb_type_MDRobotBase_obj_t;

static inline pbio_mdrobotbase_t *pb_type_mdrobotbase_require_open(pb_type_MDRobotBase_obj_t *self) {
  if (!self->rb) {
    mp_raise_msg(&mp_type_RuntimeError, MP_ERROR_TEXT("MDRobotBase is closed"));
  }
  return self->rb;
}

static inline pbio_error_t pb_type_mdrobotbase_motion_start(pb_type_MDRobotBase_obj_t *self) {
  return pbio_mdrobotbase_motion_start(self->rb);
}

static inline pbio_error_t pb_type_mdrobotbase_motion_complete(pb_type_MDRobotBase_obj_t *self) {
  return pbio_mdrobotbase_motion_complete(self->rb);
}

static inline pbio_error_t pb_type_mdrobotbase_motion_stall(pb_type_MDRobotBase_obj_t *self) {
  return pbio_mdrobotbase_motion_stall(self->rb);
}

static inline pbio_error_t pb_type_mdrobotbase_motion_timeout(pb_type_MDRobotBase_obj_t *self) {
  return pbio_mdrobotbase_motion_timeout(self->rb);
}

static inline pbio_error_t pb_type_mdrobotbase_motion_reset(pb_type_MDRobotBase_obj_t *self) {
  return pbio_mdrobotbase_motion_reset(self->rb);
}

// Backward compatibility aliases for semantic lifecycle transitions
static inline pbio_error_t pb_type_mdrobotbase_mark_running(pb_type_MDRobotBase_obj_t *self) {
  return pb_type_mdrobotbase_motion_start(self);
}
static inline pbio_error_t pb_type_mdrobotbase_mark_completed(pb_type_MDRobotBase_obj_t *self) {
  return pb_type_mdrobotbase_motion_complete(self);
}
static inline pbio_error_t pb_type_mdrobotbase_mark_stalled(pb_type_MDRobotBase_obj_t *self) {
  return pb_type_mdrobotbase_motion_stall(self);
}
static inline pbio_error_t pb_type_mdrobotbase_mark_timed_out(pb_type_MDRobotBase_obj_t *self) {
  return pb_type_mdrobotbase_motion_timeout(self);
}


static pbio_error_t update_state_and_debug(pb_type_MDRobotBase_obj_t *self,
                                           float gyro_heading) {
  pbio_error_t err = pbio_mdrobotbase_update_state(self->rb, gyro_heading);
  if (err == PBIO_SUCCESS && self->debug) {
    static uint32_t last_print = 0;
    uint32_t now = pbdrv_clock_get_ms();
    if (now - last_print >= 100) {
      float x = 0.0f, y = 0.0f, theta = 0.0f;
      if (pbio_mdrobotbase_get_pose(self->rb, &x, &y, &theta) == PBIO_SUCCESS) {
        mp_printf(&mp_plat_print, "Pose: X=%.1f, Y=%.1f, Theta=%.1f\n",
                  (double)x, (double)y, (double)theta);
      }
      last_print = now;
    }
  }
  return err;
}

#define pbio_mdrobotbase_update_state(rb, gyro_heading)                        \
  update_state_and_debug(self, gyro_heading)

static float get_battery_compensation_factor(void) {
  // Low-level motor driver (pbio/src/dcmotor.c) already scales PWM duty cycle
  // by (voltage * MAX_DUTY) / v_actual. Returning 1.0f prevents quadratic
  // double compensation (comp^2) which causes 52.6% over-gain at half battery.
  return 1.0f;
}

static void pb_type_mdrobotbase_cancel_active_motion(pb_type_MDRobotBase_obj_t *self) {
  if (self->last_awaitable) {
    pb_type_async_schedule_stop_iteration(self->last_awaitable);
    self->last_awaitable = NULL;
  }
  if (self->rb && self->rb->motion_in_progress) {
    pbio_servo_stop(self->rb->left, self->rb->stop_behavior);
    pbio_servo_stop(self->rb->right, self->rb->stop_behavior);
    if (self->rb->stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {
      pbio_servo_reset_angle(self->rb->left, 0, false);
      pbio_servo_reset_angle(self->rb->right, 0, false);
      self->rb->last_left_deg = 0.0f;
      self->rb->last_right_deg = 0.0f;
    }
    self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
    self->rb->motion_in_progress = false;
  }
}

static mp_obj_t __attribute__((unused))
pb_type_MDRobotBase_stop(mp_obj_t parent_obj) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(parent_obj);
  pb_type_mdrobotbase_require_open(self);
  if (self->last_awaitable) {
    pb_type_async_schedule_stop_iteration(self->last_awaitable);
    self->last_awaitable = NULL;
  }
  if (self->rb) {
    pbio_servo_stop(self->rb->left, self->rb->stop_behavior);
    pbio_servo_stop(self->rb->right, self->rb->stop_behavior);
    if (self->rb->stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {
      pbio_servo_reset_angle(self->rb->left, 0, false);
      pbio_servo_reset_angle(self->rb->right, 0, false);
      self->rb->last_left_deg = 0.0f;
      self->rb->last_right_deg = 0.0f;
    }
    self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
    self->rb->motion_in_progress = false;
  }
  return mp_const_none;
}

static inline float mdrobotbase_wrap_degrees(float angle) {
  while (angle > 180.0f) {
    angle -= 360.0f;
  }
  while (angle < -180.0f) {
    angle += 360.0f;
  }
  return angle;
}

static inline int32_t mdrobotbase_clamp_speed(int32_t dps, int32_t max_speed) {
  if (dps > max_speed) {
    return max_speed;
  }
  if (dps < -max_speed) {
    return -max_speed;
  }
  return dps;
}

static inline int32_t mdrobotbase_linear_to_angular_dps(pbio_mdrobotbase_t *rb, float linear_vel_mm_s, float wheel_diam_mm) {
  float wheel_dps = (linear_vel_mm_s / (3.14159265f * wheel_diam_mm)) * 360.0f;
  return pbio_mdrobotbase_wheel_to_motor_dps(rb, wheel_dps);
}

static inline bool mdrobotbase_evaluate_stall(pbio_mdrobotbase_t *rb, bool is_stalled, float dt_sec, float threshold_ms) {
  if (is_stalled) {
    rb->stall_time_ms += dt_sec * 1000.0f;
  } else {
    rb->stall_time_ms = 0.0f;
  }
  return (rb->stall_time_ms > threshold_ms);
}

static inline void mdrobotbase_drive_wheels(pb_type_MDRobotBase_obj_t *self,
                                            float left_vel_mms,
                                            float right_vel_mms,
                                            float diam_left_mm,
                                            float diam_right_mm) {
  int32_t left_dps = mdrobotbase_clamp_speed(
      mdrobotbase_linear_to_angular_dps(self->rb, left_vel_mms, diam_left_mm), 1000);
  int32_t right_dps = mdrobotbase_clamp_speed(
      mdrobotbase_linear_to_angular_dps(self->rb, right_vel_mms, diam_right_mm), 1000);
  pbio_servo_run_forever(self->rb->left, left_dps);
  pbio_servo_run_forever(self->rb->right, right_dps);
}

static inline void mdrobotbase_motion_stop(pb_type_MDRobotBase_obj_t *self, bool reset_angles) {
  pbio_servo_stop(self->rb->left, self->rb->stop_behavior);
  pbio_servo_stop(self->rb->right, self->rb->stop_behavior);
  if (reset_angles && self->rb->stop_behavior != PBIO_CONTROL_ON_COMPLETION_COAST) {
    pbio_servo_reset_angle(self->rb->left, 0, false);
    pbio_servo_reset_angle(self->rb->right, 0, false);
    self->rb->last_left_deg = 0.0f;
    self->rb->last_right_deg = 0.0f;
  }
  self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
  self->rb->motion_in_progress = false;
}

static pbio_error_t mdrobotbase_step_navigate(pb_type_MDRobotBase_obj_t *self,
                                              float dt_sec,
                                              uint32_t elapsed_ms,
                                              float comp,
                                              float diam_left_mm,
                                              float diam_right_mm,
                                              float track_mm) {
  if (self->rb->align_final_heading) {
    // Final heading alignment turn
    float delta_theta = mdrobotbase_wrap_degrees(self->rb->theta - self->rb->last_step_theta);
    float w_raw = delta_theta / dt_sec;
    self->rb->last_step_theta = self->rb->theta;

    float e_theta = mdrobotbase_wrap_degrees(self->rb->gt - self->rb->theta);

    if (fabsf(e_theta) <= 1.5f) {
      pb_type_mdrobotbase_motion_complete(self);
      mdrobotbase_motion_stop(self, false);
      return PBIO_SUCCESS;
    }

    float i_term = 0.0f;
    if (self->rb->ki > 0.0f) {
      self->rb->turn_integral += e_theta * dt_sec;
      float max_integral = 100.0f / self->rb->ki;
      if (self->rb->turn_integral > max_integral) self->rb->turn_integral = max_integral;
      if (self->rb->turn_integral < -max_integral) self->rb->turn_integral = -max_integral;
      i_term = self->rb->ki * self->rb->turn_integral;
    }
    float d_term = -(self->rb->kd * comp) * w_raw;
    float w_cmd = (self->rb->kp * comp) * e_theta + i_term + d_term;
    float limit = self->rb->max_turn_speed;
    if (w_cmd > limit) w_cmd = limit;
    if (w_cmd < -limit) w_cmd = -limit;

    if (elapsed_ms > 200) {
      bool is_stalled = (fabsf(w_cmd) > 40.0f && fabsf(w_raw) < 10.0f);
      if (mdrobotbase_evaluate_stall(self->rb, is_stalled, dt_sec, 200.0f)) {
        pb_type_mdrobotbase_motion_stall(self);
        mdrobotbase_motion_stop(self, false);
        return PBIO_ERROR_FAILED;
      }
    }

    float w_rad = w_cmd * (3.14159265f / 180.0f);
    float left_vel = -w_rad * (track_mm / 2.0f);
    float right_vel = w_rad * (track_mm / 2.0f);

    mdrobotbase_drive_wheels(self, left_vel, right_vel, diam_left_mm, diam_right_mm);
    return PBIO_ERROR_AGAIN;
  }

  float dx = self->rb->goal_x - self->rb->x;
  float dy = self->rb->goal_y - self->rb->y;
  float dist_remaining = sqrtf(dx * dx + dy * dy);

  bool plane_crossed = false;
  if (self->rb->path_len > 1.0f) {
    float dot = self->rb->path_x * dx + self->rb->path_y * dy;
    if (dot <= 0.0f) {
      plane_crossed = true;
    }
  }

  if (dist_remaining <= self->rb->tolerance_dist || plane_crossed) {
    if (self->rb->has_goal_theta) {
      self->rb->align_final_heading = true;
      self->rb->turn_integral = 0.0f;
      self->rb->stall_time_ms = 0.0f;
      self->rb->last_step_theta = self->rb->theta;
      return PBIO_ERROR_AGAIN;
    }
    pb_type_mdrobotbase_motion_complete(self);
    mdrobotbase_motion_stop(self, true);
    return PBIO_SUCCESS;
  }

  float delta_theta = mdrobotbase_wrap_degrees(self->rb->theta - self->rb->last_step_theta);
  float w_raw = delta_theta / dt_sec;
  self->rb->last_step_theta = self->rb->theta;

  float step = sqrtf((self->rb->x - self->rb->last_x) * (self->rb->x - self->rb->last_x) +
                     (self->rb->y - self->rb->last_y) * (self->rb->y - self->rb->last_y));
  self->rb->dist_traveled += step;
  self->rb->last_x = self->rb->x;
  self->rb->last_y = self->rb->y;

  float v_profile = self->rb->target_speed_for_ramping;
  bool is_lqr = (self->rb->controller_type == PBIO_MDROBOTBASE_CONTROLLER_LQR);
  if (self->rb->use_ramping) {
    float v_acc = self->rb->target_speed_for_ramping;
    if (self->rb->accel_d > 0.0f && self->rb->dist_traveled < self->rb->accel_d) {
      float ratio = self->rb->dist_traveled / self->rb->accel_d;
      float smooth_ratio = (1.0f - cosf(3.14159265f * ratio)) * 0.5f;
      v_acc = self->rb->current_start_speed +
              (self->rb->target_speed_for_ramping - self->rb->current_start_speed) * smooth_ratio;
    }
    float v_dec = self->rb->target_speed_for_ramping;
    if (!is_lqr && self->rb->decel_d > 0.0f && dist_remaining < (self->rb->decel_d + self->rb->tolerance_dist)) {
      float ratio = (dist_remaining - self->rb->tolerance_dist) / self->rb->decel_d;
      if (ratio < 0.0f) ratio = 0.0f;
      if (ratio > 1.0f) ratio = 1.0f;
      float smooth_ratio = (1.0f - cosf(3.14159265f * ratio)) * 0.5f;
      v_dec = self->rb->current_end_speed +
              (self->rb->target_speed_for_ramping - self->rb->current_end_speed) * smooth_ratio;
    }
    v_profile = (fabsf(v_acc) < fabsf(v_dec)) ? v_acc : v_dec;

    if (elapsed_ms < (uint32_t)self->rb->kick_time) {
      float abs_kick_speed = fabsf(self->rb->kick_speed);
      float v_profile_abs = fabsf(v_profile);
      if (v_profile_abs < abs_kick_speed) v_profile_abs = abs_kick_speed;
      v_profile = (self->rb->target_speed >= 0.0f) ? v_profile_abs : -v_profile_abs;
    }

    float max_change = self->rb->max_accel * dt_sec;
    float v_change = v_profile - self->rb->last_v_profile;
    if (v_change > max_change) v_profile = self->rb->last_v_profile + max_change;
    else if (v_change < -max_change) v_profile = self->rb->last_v_profile - max_change;
    self->rb->last_v_profile = v_profile;
  }

  self->rb->dist_ref += fabsf(v_profile) * dt_sec;
  if (self->rb->dist_ref > self->rb->path_len) self->rb->dist_ref = self->rb->path_len;

  float target_theta;
  if (self->rb->controller_type == PBIO_MDROBOTBASE_CONTROLLER_LQR) {
    target_theta = atan2f(self->rb->goal_y - self->rb->y, self->rb->goal_x - self->rb->x) * (180.0f / 3.14159265f);
    if (self->rb->is_backward) target_theta += 180.0f;
  } else {
    if (self->rb->path_len > 1.0f) {
      float ux = self->rb->path_x / self->rb->path_len;
      float uy = self->rb->path_y / self->rb->path_len;
      float rx = self->rb->x - self->rb->start_x;
      float ry = self->rb->y - self->rb->start_y;
      float e_y_standard = rx * uy - ry * ux;
      float p_theta = atan2f(self->rb->path_y, self->rb->path_x) * (180.0f / 3.14159265f);
      if (self->rb->is_backward) p_theta += 180.0f;
      float cross_gain = 0.3f;
      float dir_sign = self->rb->is_backward ? -1.0f : 1.0f;
      float correction = cross_gain * e_y_standard * dir_sign;
      if (correction > 30.0f) correction = 30.0f;
      if (correction < -30.0f) correction = -30.0f;
      target_theta = p_theta + correction;
    } else {
      target_theta = atan2f(self->rb->goal_y - self->rb->y, self->rb->goal_x - self->rb->x) * (180.0f / 3.14159265f);
      if (self->rb->is_backward) target_theta += 180.0f;
    }
  }
  target_theta = mdrobotbase_wrap_degrees(target_theta);

  float ref_theta = target_theta;
  if (self->rb->has_goal_theta && dist_remaining < self->rb->decel_d && self->rb->decel_d > 0.0f) {
    float ratio = dist_remaining / self->rb->decel_d;
    float diff = mdrobotbase_wrap_degrees(self->rb->gt - target_theta);
    ref_theta = target_theta + diff * (1.0f - ratio);
  }

  float v_cmd = v_profile;
  float w_cmd = 0.0f;

  if (self->rb->controller_type == PBIO_MDROBOTBASE_CONTROLLER_LQR) {
    float x_ref = self->rb->start_x + self->rb->dist_ref * cosf(self->rb->path_theta);
    float y_ref = self->rb->start_y + self->rb->dist_ref * sinf(self->rb->path_theta);

    float dx_ref = x_ref - self->rb->x;
    float dy_ref = y_ref - self->rb->y;

    float theta_rad = self->rb->theta * (3.14159265f / 180.0f);
    float cos_theta = cosf(theta_rad);
    float sin_theta = sinf(theta_rad);

    float e_x_local = cos_theta * dx_ref + sin_theta * dy_ref;
    float e_y_local = -sin_theta * dx_ref + cos_theta * dy_ref;

    float path_theta_deg = mdrobotbase_wrap_degrees(self->rb->path_theta * (180.0f / 3.14159265f) + (self->rb->is_backward ? 180.0f : 0.0f));

    float cross_steer_gain = 0.35f;
    float dir_sign = self->rb->is_backward ? -1.0f : 1.0f;
    float cross_corr = cross_steer_gain * e_y_local * dir_sign;
    if (cross_corr > 30.0f) cross_corr = 30.0f;
    if (cross_corr < -30.0f) cross_corr = -30.0f;

    float ref_theta_lqr = path_theta_deg + cross_corr;
    if (self->rb->has_goal_theta && dist_remaining < self->rb->decel_d && self->rb->decel_d > 0.0f) {
      float ratio = dist_remaining / self->rb->decel_d;
      float diff = mdrobotbase_wrap_degrees(self->rb->gt - ref_theta_lqr);
      ref_theta_lqr = ref_theta_lqr + diff * (1.0f - ratio);
    }

    float e_theta_deg = mdrobotbase_wrap_degrees(ref_theta_lqr - self->rb->theta);

    float e_x = e_x_local / 1000.0f;
    float e_y = e_y_local / 1000.0f;
    float e_theta = e_theta_deg * (3.14159265f / 180.0f);

    float sched_scale = 1.0f;
    if (self->rb->lqr_schedule_enabled) {
      float v_abs = fabsf(v_profile);
      sched_scale = sqrtf(v_abs / 300.0f);
      if (sched_scale < 0.2f) sched_scale = 0.2f;
    }

    float scheduled_k_y = self->rb->k_y * sched_scale;
    float scheduled_k_theta = self->rb->k_theta * sched_scale;

    float u_v = -((self->rb->k_x * comp) * e_x);
    float u_w = -((scheduled_k_y * comp) * e_y + (scheduled_k_theta * comp) * e_theta);

    v_cmd = v_profile - u_v * 1000.0f;
    w_cmd = 0.0f - u_w * (180.0f / 3.14159265f);
  } else {
    float e_theta = mdrobotbase_wrap_degrees(ref_theta - self->rb->theta);

    float i_term = 0.0f;
    if (self->rb->ki > 0.0f) {
      self->rb->turn_integral += e_theta * dt_sec;
      float max_integral = 100.0f / self->rb->ki;
      if (self->rb->turn_integral > max_integral) self->rb->turn_integral = max_integral;
      if (self->rb->turn_integral < -max_integral) self->rb->turn_integral = -max_integral;
      i_term = self->rb->ki * self->rb->turn_integral;
    }

    float d_term = -(self->rb->kd * comp) * w_raw;
    w_cmd = (self->rb->kp * comp) * e_theta + i_term + d_term;

    if (self->rb->pid_min_turn > 0.0f && fabsf(e_theta) > self->rb->pid_min_turn_threshold) {
      float min_turn = self->rb->pid_min_turn * comp;
      if (w_cmd > 0.0f) {
        if (w_cmd < min_turn) w_cmd = min_turn;
      } else {
        if (w_cmd > -min_turn) w_cmd = -min_turn;
      }
    }
  }

  float max_dv = self->rb->max_accel * dt_sec;
  float dv = v_cmd - self->rb->last_v_cmd;
  if (dv > max_dv) v_cmd = self->rb->last_v_cmd + max_dv;
  else if (dv < -max_dv) v_cmd = self->rb->last_v_cmd - max_dv;
  self->rb->last_v_cmd = v_cmd;

  float max_w_accel = (2.0f * self->rb->max_accel / track_mm) * (180.0f / 3.14159265f);
  if (max_w_accel < 1500.0f) max_w_accel = 1500.0f;
  float max_dw = max_w_accel * dt_sec;
  float dw = w_cmd - self->rb->last_w_cmd;
  if (dw > max_dw) w_cmd = self->rb->last_w_cmd + max_dw;
  else if (dw < -max_dw) w_cmd = self->rb->last_w_cmd - max_dw;
  self->rb->last_w_cmd = w_cmd;

  float w_rad = w_cmd * (3.14159265f / 180.0f);
  float left_vel = v_cmd - w_rad * (track_mm / 2.0f);
  float right_vel = v_cmd + w_rad * (track_mm / 2.0f);

  if (elapsed_ms > 200) {
    float v_raw = step / dt_sec;
    bool is_stalled = (fabsf(v_cmd) > 30.0f && fabsf(v_raw) < 10.0f);
    if (mdrobotbase_evaluate_stall(self->rb, is_stalled, dt_sec, 250.0f)) {
      pb_type_mdrobotbase_motion_stall(self);
      mdrobotbase_motion_stop(self, false);
      return PBIO_ERROR_FAILED;
    }
  }

  mdrobotbase_drive_wheels(self, left_vel, right_vel, diam_left_mm, diam_right_mm);
  return PBIO_ERROR_AGAIN;
}

static pbio_error_t mdrobotbase_step_turn(pb_type_MDRobotBase_obj_t *self,
                                          float dt_sec,
                                          uint32_t elapsed_ms,
                                          float comp,
                                          float diam_left_mm,
                                          float diam_right_mm,
                                          float track_mm) {
  float delta_theta = mdrobotbase_wrap_degrees(self->rb->theta - self->rb->last_step_theta);
  float w_raw = delta_theta / dt_sec;
  self->rb->last_step_theta = self->rb->theta;

  float e_theta = mdrobotbase_wrap_degrees(self->rb->target_angle - self->rb->theta);

  if (fabsf(e_theta) <= self->rb->tolerance_angle) {
    if (self->rb->stop_behavior == PBIO_CONTROL_ON_COMPLETION_COAST || fabsf(w_raw) < 15.0f) {
      pb_type_mdrobotbase_motion_complete(self);
      mdrobotbase_motion_stop(self, true);
      return PBIO_SUCCESS;
    }
  }

  float i_term = 0.0f;
  if (self->rb->ki_turn > 0.0f) {
    self->rb->turn_integral += e_theta * dt_sec;
    float max_integral = 100.0f / self->rb->ki_turn;
    if (self->rb->turn_integral > max_integral) self->rb->turn_integral = max_integral;
    if (self->rb->turn_integral < -max_integral) self->rb->turn_integral = -max_integral;
    i_term = self->rb->ki_turn * self->rb->turn_integral;
  }

  float d_term = -(self->rb->kd_turn * comp) * w_raw;
  float turn_kp_val = self->rb->kp_turn;
  float decel_ang_val = self->rb->decel_angle > 0.1f ? self->rb->decel_angle : 15.0f;
  float scheduled_kp = (1.0f + self->rb->kd_turn) * (self->rb->speed_deg_s / decel_ang_val);
  if (scheduled_kp > turn_kp_val) {
    turn_kp_val = scheduled_kp;
  }
  float w_cmd = (turn_kp_val * comp) * e_theta + i_term + d_term;
  float remaining_angle = fabsf(e_theta);
  float turned_angle = self->rb->turn_angle_total - remaining_angle;
  if (turned_angle < 0.0f) turned_angle = 0.0f;

  // Accel limit applies smooth start acceleration ramping
  float accel_limit = self->rb->speed_deg_s;
  if (self->rb->accel_angle > 0.0f && turned_angle < self->rb->accel_angle) {
    accel_limit = self->rb->start_speed +
                  (self->rb->speed_deg_s - self->rb->start_speed) * (turned_angle / self->rb->accel_angle);
  }

  // PID feedback naturally handles deceleration. Max turn speed limit caps max authority.
  float limit = accel_limit < self->rb->speed_deg_s ? accel_limit : self->rb->speed_deg_s;
  if (limit > self->rb->max_turn_speed) limit = self->rb->max_turn_speed;

  if (w_cmd > limit) w_cmd = limit;
  if (w_cmd < -limit) w_cmd = -limit;

  if (elapsed_ms > 300) {
    bool is_stalled = (fabsf(w_cmd) > 60.0f && fabsf(w_raw) < 2.0f);
    if (mdrobotbase_evaluate_stall(self->rb, is_stalled, dt_sec, 400.0f)) {
      pb_type_mdrobotbase_motion_stall(self);
      mdrobotbase_motion_stop(self, false);
      return PBIO_ERROR_FAILED;
    }
  }

  float w_rad = w_cmd * (3.14159265f / 180.0f);
  float left_vel = -w_rad * (track_mm / 2.0f);
  float right_vel = w_rad * (track_mm / 2.0f);

  mdrobotbase_drive_wheels(self, left_vel, right_vel, diam_left_mm, diam_right_mm);
  return PBIO_ERROR_AGAIN;
}

static pbio_error_t mdrobotbase_step_pivot(pb_type_MDRobotBase_obj_t *self,
                                           float dt_sec,
                                           uint32_t elapsed_ms,
                                           float comp,
                                           float diam_left_mm,
                                           float diam_right_mm,
                                           float track_mm) {
  float delta_theta = mdrobotbase_wrap_degrees(self->rb->theta - self->rb->last_step_theta);
  float w_raw = delta_theta / dt_sec;
  self->rb->last_step_theta = self->rb->theta;

  float e_theta = mdrobotbase_wrap_degrees(self->rb->target_angle - self->rb->theta);

  if (fabsf(e_theta) <= self->rb->tolerance_angle) {
    if (self->rb->stop_behavior == PBIO_CONTROL_ON_COMPLETION_COAST || fabsf(w_raw) < 15.0f) {
      pb_type_mdrobotbase_motion_complete(self);
      mdrobotbase_motion_stop(self, true);
      return PBIO_SUCCESS;
    }
  }

  float i_term = 0.0f;
  if (self->rb->ki_pivot > 0.0f) {
    self->rb->turn_integral += e_theta * dt_sec;
    float max_integral = 100.0f / self->rb->ki_pivot;
    if (self->rb->turn_integral > max_integral) self->rb->turn_integral = max_integral;
    if (self->rb->turn_integral < -max_integral) self->rb->turn_integral = -max_integral;
    i_term = self->rb->ki_pivot * self->rb->turn_integral;
  }

  float d_term = -(self->rb->kd_pivot * comp) * w_raw;
  float pivot_kp_val = self->rb->kp_pivot;
  float decel_ang_val = self->rb->decel_angle > 0.1f ? self->rb->decel_angle : 15.0f;
  float scheduled_kp = (1.0f + self->rb->kd_pivot) * (self->rb->speed_deg_s / decel_ang_val);
  if (scheduled_kp > pivot_kp_val) {
    pivot_kp_val = scheduled_kp;
  }
  float w_cmd = (pivot_kp_val * comp) * e_theta + i_term + d_term;
  float remaining_angle = fabsf(e_theta);
  float turned_angle = self->rb->turn_angle_total - remaining_angle;
  if (turned_angle < 0.0f) turned_angle = 0.0f;

  // Accel limit applies smooth start acceleration ramping
  float accel_limit = self->rb->speed_deg_s;
  if (self->rb->accel_angle > 0.0f && turned_angle < self->rb->accel_angle) {
    accel_limit = self->rb->start_speed +
                  (self->rb->speed_deg_s - self->rb->start_speed) * (turned_angle / self->rb->accel_angle);
  }

  // PID feedback naturally handles deceleration. Max pivot speed limit caps max authority.
  float limit = accel_limit < self->rb->speed_deg_s ? accel_limit : self->rb->speed_deg_s;
  if (limit > self->rb->max_pivot_speed) limit = self->rb->max_pivot_speed;

  if (w_cmd > limit) w_cmd = limit;
  if (w_cmd < -limit) w_cmd = -limit;

  if (elapsed_ms > 300) {
    bool is_stalled = (fabsf(w_cmd) > 40.0f && fabsf(w_raw) < 2.0f);
    if (mdrobotbase_evaluate_stall(self->rb, is_stalled, dt_sec, 400.0f)) {
      pb_type_mdrobotbase_motion_stall(self);
      mdrobotbase_motion_stop(self, false);
      return PBIO_ERROR_FAILED;
    }
  }

  float w_rad = w_cmd * (3.14159265f / 180.0f);
  if (self->rb->pivot_left) {
    float right_vel = w_rad * track_mm;
    int32_t right_dps = mdrobotbase_clamp_speed(mdrobotbase_linear_to_angular_dps(self->rb, right_vel, diam_right_mm), 1000);
    pbio_servo_run_forever(self->rb->right, right_dps);
  } else {
    float left_vel = -w_rad * track_mm;
    int32_t left_dps = mdrobotbase_clamp_speed(mdrobotbase_linear_to_angular_dps(self->rb, left_vel, diam_left_mm), 1000);
    pbio_servo_run_forever(self->rb->left, left_dps);
  }
  return PBIO_ERROR_AGAIN;
}

static pbio_error_t mdrobotbase_step_trajectory(pb_type_MDRobotBase_obj_t *self,
                                                float dt_sec,
                                                uint32_t elapsed_ms,
                                                float comp,
                                                float diam_left_mm,
                                                float diam_right_mm,
                                                float track_mm) {
  (void)dt_sec;
  (void)elapsed_ms;

  if (self->rb->trajectory_num_points == 0 || self->rb->trajectory_current_point_idx >= self->rb->trajectory_num_points) {
    pb_type_mdrobotbase_motion_complete(self);
    mdrobotbase_motion_stop(self, false);
    return PBIO_SUCCESS;
  }

  float target_x = self->rb->trajectory_points_x[self->rb->trajectory_current_point_idx];
  float target_y = self->rb->trajectory_points_y[self->rb->trajectory_current_point_idx];

  float dx = target_x - self->rb->x;
  float dy = target_y - self->rb->y;
  float dist_remaining = sqrtf(dx * dx + dy * dy);

  bool is_final_point = (self->rb->trajectory_current_point_idx == self->rb->trajectory_num_points - 1);

  if (is_final_point) {
    if (dist_remaining <= self->rb->tolerance_dist) {
      pb_type_mdrobotbase_motion_complete(self);
      mdrobotbase_motion_stop(self, true);
      return PBIO_SUCCESS;
    }
  } else {
    if (dist_remaining <= self->rb->trajectory_transition_tolerance) {
      self->rb->trajectory_current_point_idx++;
      self->rb->trajectory_seg_start_x = self->rb->x;
      self->rb->trajectory_seg_start_y = self->rb->y;
      target_x = self->rb->trajectory_points_x[self->rb->trajectory_current_point_idx];
      target_y = self->rb->trajectory_points_y[self->rb->trajectory_current_point_idx];
      dx = target_x - self->rb->x;
      dy = target_y - self->rb->y;
      dist_remaining = sqrtf(dx * dx + dy * dy);
    }
  }

  float speed = self->rb->is_backward ? -fabsf(self->rb->target_speed) : fabsf(self->rb->target_speed);
  float target_theta = mdrobotbase_wrap_degrees(atan2f(dy, dx) * (180.0f / 3.14159265f) + (self->rb->is_backward ? 180.0f : 0.0f));

  float e_theta = mdrobotbase_wrap_degrees(target_theta - self->rb->theta);

  float w_cmd = (self->rb->kp_turn * comp) * e_theta;
  if (w_cmd > self->rb->max_turn_speed) w_cmd = self->rb->max_turn_speed;
  if (w_cmd < -self->rb->max_turn_speed) w_cmd = -self->rb->max_turn_speed;

  float w_rad = w_cmd * (3.14159265f / 180.0f);
  float left_vel = speed - w_rad * (track_mm / 2.0f);
  float right_vel = speed + w_rad * (track_mm / 2.0f);

  mdrobotbase_drive_wheels(self, left_vel, right_vel, diam_left_mm, diam_right_mm);
  return PBIO_ERROR_AGAIN;
}

static pbio_error_t pb_type_mdrobotbase_motion_iterate_once(pbio_os_state_t *state,
                                                            mp_obj_t parent_obj) {
  (void)state;
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(parent_obj);

  if (!self->rb || !self->rb->motion_in_progress) {
    self->last_awaitable = NULL;
    return PBIO_SUCCESS;
  }

  if (!pbio_servo_update_loop_is_running(self->rb->left) ||
      !pbio_servo_update_loop_is_running(self->rb->right)) {
    return PBIO_ERROR_NO_DEV;
  }

  // 1. Update Odometry State
  float gyro_heading = pbio_imu_get_heading(PBIO_IMU_HEADING_TYPE_1D);
  pbio_mdrobotbase_update_state(self->rb, gyro_heading);

  uint32_t now = pbdrv_clock_get_ms();
  uint32_t elapsed_ms = now - self->rb->start_time_ms;

  // Global motion timeout check
  if (self->rb->timeout_ms > 0 && elapsed_ms >= self->rb->timeout_ms) {
    pb_type_mdrobotbase_motion_timeout(self);
    mdrobotbase_motion_stop(self, true);
    return PBIO_ERROR_TIMEDOUT;
  }

  float diam_left_mm = (float)self->rb->wheel_diameter_left / 1000.0f;
  float diam_right_mm = (float)self->rb->wheel_diameter_right / 1000.0f;
  float track_mm = (float)self->rb->axle_track / 1000.0f;
  float comp = get_battery_compensation_factor();

  float dt_sec = (float)(now - self->rb->last_step_time_ms) / 1000.0f;
  if (dt_sec <= 0.0f) {
    dt_sec = 0.001f;
  }
  self->rb->last_step_time_ms = now;

  switch (self->rb->motion_type) {
    case PBIO_MDROBOTBASE_MOTION_NAVIGATE:
      return mdrobotbase_step_navigate(self, dt_sec, elapsed_ms, comp, diam_left_mm, diam_right_mm, track_mm);
    case PBIO_MDROBOTBASE_MOTION_TURN:
      return mdrobotbase_step_turn(self, dt_sec, elapsed_ms, comp, diam_left_mm, diam_right_mm, track_mm);
    case PBIO_MDROBOTBASE_MOTION_PIVOT:
      return mdrobotbase_step_pivot(self, dt_sec, elapsed_ms, comp, diam_left_mm, diam_right_mm, track_mm);
    case PBIO_MDROBOTBASE_MOTION_TRAJECTORY:
      return mdrobotbase_step_trajectory(self, dt_sec, elapsed_ms, comp, diam_left_mm, diam_right_mm, track_mm);
    default:
      return PBIO_SUCCESS;
  }
}

static mp_obj_t pb_type_mdrobotbase_wait_or_await(pb_type_MDRobotBase_obj_t *self) {
  pb_type_async_t config = {
      .parent_obj = MP_OBJ_FROM_PTR(self),
      .iter_once = pb_type_mdrobotbase_motion_iterate_once,
      .close = pb_type_MDRobotBase_stop,
      .return_map = NULL,
  };
  return pb_type_async_wait_or_await(&config, &self->last_awaitable, true);
}

// pybricks.robotics.MDRobotBase.set_lqr_gains
static mp_obj_t pb_type_MDRobotBase_set_lqr_gains(size_t n_args,
                                                  const mp_obj_t *pos_args,
                                                  mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                       self, PB_ARG_REQUIRED(k_x), PB_ARG_REQUIRED(k_y),
                       PB_ARG_REQUIRED(k_theta), PB_ARG_DEFAULT_TRUE(schedule));
  pb_type_mdrobotbase_require_open(self);

  float x = mp_obj_get_float(k_x_in);
  float y = mp_obj_get_float(k_y_in);
  float theta = mp_obj_get_float(k_theta_in);
  bool schedule = mp_obj_is_true(schedule_in);

  pb_assert(pbio_mdrobotbase_set_lqr_gains(self->rb, x, y, theta, schedule));

  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_lqr_gains_obj, 1,
                                  pb_type_MDRobotBase_set_lqr_gains);

// pybricks.robotics.MDRobotBase.get_lqr_gains
static mp_obj_t pb_type_MDRobotBase_get_lqr_gains(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  mp_obj_t gains[3];
  gains[0] = mp_obj_new_float_from_f(self->rb->k_x);
  gains[1] = mp_obj_new_float_from_f(self->rb->k_y);
  gains[2] = mp_obj_new_float_from_f(self->rb->k_theta);
  return mp_obj_new_tuple(3, gains);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_lqr_gains_obj,
                                 pb_type_MDRobotBase_get_lqr_gains);

// pybricks.robotics.MDRobotBase.set_controller
static mp_obj_t pb_type_MDRobotBase_set_controller(size_t n_args,
                                                   const mp_obj_t *pos_args,
                                                   mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                       self, PB_ARG_REQUIRED(type));
  pb_type_mdrobotbase_require_open(self);

  int32_t val = pb_obj_get_int(type_in);
  if (val != PBIO_MDROBOTBASE_CONTROLLER_PID && val != PBIO_MDROBOTBASE_CONTROLLER_LQR) {
    mp_raise_ValueError(MP_ERROR_TEXT("invalid controller type"));
  }
  pb_assert(pbio_mdrobotbase_set_controller(
      self->rb, (pbio_mdrobotbase_controller_t)val));

  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_controller_obj, 1,
                                  pb_type_MDRobotBase_set_controller);

// pybricks.robotics.MDRobotBase.get_controller
static mp_obj_t pb_type_MDRobotBase_get_controller(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  return mp_obj_new_int(self->rb->controller_type);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_controller_obj,
                                 pb_type_MDRobotBase_get_controller);

// pybricks.robotics.MDRobotBase.set_pid_gains
static mp_obj_t pb_type_MDRobotBase_set_pid_gains(size_t n_args,
                                                  const mp_obj_t *pos_args,
                                                  mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                       self, PB_ARG_REQUIRED(kp), PB_ARG_REQUIRED(ki),
                       PB_ARG_REQUIRED(kd));
  pb_type_mdrobotbase_require_open(self);

  float p = mp_obj_get_float(kp_in);
  float i = mp_obj_get_float(ki_in);
  float d = mp_obj_get_float(kd_in);

  pb_assert(pbio_mdrobotbase_set_pid_gains(self->rb, p, i, d));

  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_pid_gains_obj, 1,
                                  pb_type_MDRobotBase_set_pid_gains);

// pybricks.robotics.MDRobotBase.get_pid_gains
static mp_obj_t pb_type_MDRobotBase_get_pid_gains(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  mp_obj_t gains[3];
  gains[0] = mp_obj_new_float_from_f(self->rb->kp);
  gains[1] = mp_obj_new_float_from_f(self->rb->ki);
  gains[2] = mp_obj_new_float_from_f(self->rb->kd);
  return mp_obj_new_tuple(3, gains);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_pid_gains_obj,
                                 pb_type_MDRobotBase_get_pid_gains);

// pybricks.robotics.MDRobotBase.set_turn_pid_gains
static mp_obj_t pb_type_MDRobotBase_set_turn_pid_gains(size_t n_args,
                                                       const mp_obj_t *pos_args,
                                                       mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                       self, PB_ARG_REQUIRED(kp), PB_ARG_REQUIRED(ki),
                       PB_ARG_REQUIRED(kd));
  pb_type_mdrobotbase_require_open(self);

  float p = mp_obj_get_float(kp_in);
  float i = mp_obj_get_float(ki_in);
  float d = mp_obj_get_float(kd_in);

  pb_assert(pbio_mdrobotbase_set_turn_pid_gains(self->rb, p, i, d));

  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_turn_pid_gains_obj, 1,
                                  pb_type_MDRobotBase_set_turn_pid_gains);

// pybricks.robotics.MDRobotBase.get_turn_pid_gains
static mp_obj_t pb_type_MDRobotBase_get_turn_pid_gains(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  mp_obj_t gains[3];
  gains[0] = mp_obj_new_float_from_f(self->rb->kp_turn);
  gains[1] = mp_obj_new_float_from_f(self->rb->ki_turn);
  gains[2] = mp_obj_new_float_from_f(self->rb->kd_turn);
  return mp_obj_new_tuple(3, gains);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_turn_pid_gains_obj,
                                 pb_type_MDRobotBase_get_turn_pid_gains);

// pybricks.robotics.MDRobotBase.set_pivot_pid_gains
static mp_obj_t
pb_type_MDRobotBase_set_pivot_pid_gains(size_t n_args, const mp_obj_t *pos_args,
                                        mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                       self, PB_ARG_REQUIRED(kp), PB_ARG_REQUIRED(ki),
                       PB_ARG_REQUIRED(kd));
  pb_type_mdrobotbase_require_open(self);

  float p = mp_obj_get_float(kp_in);
  float i = mp_obj_get_float(ki_in);
  float d = mp_obj_get_float(kd_in);

  pb_assert(pbio_mdrobotbase_set_pivot_pid_gains(self->rb, p, i, d));

  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_pivot_pid_gains_obj,
                                  1, pb_type_MDRobotBase_set_pivot_pid_gains);

// pybricks.robotics.MDRobotBase.get_pivot_pid_gains
static mp_obj_t pb_type_MDRobotBase_get_pivot_pid_gains(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  mp_obj_t gains[3];
  gains[0] = mp_obj_new_float_from_f(self->rb->kp_pivot);
  gains[1] = mp_obj_new_float_from_f(self->rb->ki_pivot);
  gains[2] = mp_obj_new_float_from_f(self->rb->kd_pivot);
  return mp_obj_new_tuple(3, gains);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_pivot_pid_gains_obj,
                                 pb_type_MDRobotBase_get_pivot_pid_gains);

// pybricks.robotics.MDRobotBase.set_pid_min_turn
static mp_obj_t pb_type_MDRobotBase_set_pid_min_turn(size_t n_args,
                                                     const mp_obj_t *pos_args,
                                                     mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                       self, PB_ARG_REQUIRED(min_turn),
                       PB_ARG_REQUIRED(threshold));
  pb_type_mdrobotbase_require_open(self);

  float mt = mp_obj_get_float(min_turn_in);
  float th = mp_obj_get_float(threshold_in);

  pb_assert(pbio_mdrobotbase_set_pid_min_turn(self->rb, mt, th));

  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_pid_min_turn_obj, 1,
                                  pb_type_MDRobotBase_set_pid_min_turn);

// pybricks.robotics.MDRobotBase.get_pid_min_turn
static mp_obj_t pb_type_MDRobotBase_get_pid_min_turn(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  mp_obj_t vals[2];
  vals[0] = mp_obj_new_float_from_f(self->rb->pid_min_turn);
  vals[1] = mp_obj_new_float_from_f(self->rb->pid_min_turn_threshold);
  return mp_obj_new_tuple(2, vals);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_pid_min_turn_obj,
                                 pb_type_MDRobotBase_get_pid_min_turn);

// pybricks.robotics.MDRobotBase.reset_state
static mp_obj_t pb_type_MDRobotBase_reset_state(size_t n_args,
                                                const mp_obj_t *pos_args,
                                                mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                       self, PB_ARG_REQUIRED(x), PB_ARG_REQUIRED(y),
                       PB_ARG_REQUIRED(theta), PB_ARG_REQUIRED(gyro_heading));
  pb_type_mdrobotbase_require_open(self);

  float x_val = mp_obj_get_float(x_in);
  float y_val = mp_obj_get_float(y_in);
  float theta_val = mp_obj_get_float(theta_in);
  float gyro_val = mp_obj_get_float(gyro_heading_in);

  pb_assert(pbio_mdrobotbase_reset_state(self->rb, x_val, y_val, theta_val,
                                         gyro_val));

  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_reset_state_obj, 1,
                                  pb_type_MDRobotBase_reset_state);

// pybricks.robotics.MDRobotBase.update_state
static mp_obj_t pb_type_MDRobotBase_update_state(size_t n_args,
                                                 const mp_obj_t *pos_args,
                                                 mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                       self, PB_ARG_REQUIRED(gyro_heading));
  pb_type_mdrobotbase_require_open(self);

  float gyro_val = mp_obj_get_float(gyro_heading_in);

  pb_assert(pbio_mdrobotbase_update_state(self->rb, gyro_val));

  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_update_state_obj, 1,
                                  pb_type_MDRobotBase_update_state);

// pybricks.robotics.MDRobotBase.get_state
static mp_obj_t pb_type_MDRobotBase_get_state(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float x = 0.0f, y = 0.0f, theta = 0.0f;
  pb_assert(pbio_mdrobotbase_get_pose(self->rb, &x, &y, &theta));
  mp_obj_t state[3];
  state[0] = mp_obj_new_float_from_f(x);
  state[1] = mp_obj_new_float_from_f(y);
  state[2] = mp_obj_new_float_from_f(theta);
  return mp_obj_new_tuple(3, state);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_state_obj,
                                 pb_type_MDRobotBase_get_state);

// pybricks.robotics.MDRobotBase.set_fusion_alpha
static mp_obj_t pb_type_MDRobotBase_set_fusion_alpha(mp_obj_t self_in, mp_obj_t alpha_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float alpha = mp_obj_get_float(alpha_in);
  pb_assert(pbio_mdrobotbase_set_fusion_alpha(self->rb, alpha));
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_2(pb_type_MDRobotBase_set_fusion_alpha_obj,
                                 pb_type_MDRobotBase_set_fusion_alpha);

// pybricks.robotics.MDRobotBase.get_fusion_alpha
static mp_obj_t pb_type_MDRobotBase_get_fusion_alpha(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float alpha;
  pb_assert(pbio_mdrobotbase_get_fusion_alpha(self->rb, &alpha));
  return mp_obj_new_float_from_f(alpha);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_fusion_alpha_obj,
                                 pb_type_MDRobotBase_get_fusion_alpha);

// pybricks.robotics.MDRobotBase.set_gear_ratio
static mp_obj_t pb_type_MDRobotBase_set_gear_ratio(mp_obj_t self_in, mp_obj_t ratio_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  #if MICROPY_PY_BUILTINS_FLOAT
  float ratio = mp_obj_get_float(ratio_in);
  if (!isfinite(ratio) || ratio < 0.001f || ratio > 1000.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("gear ratio must be a positive non-zero finite value"));
  }
  #else
  float ratio = (float)mp_obj_get_int(ratio_in);
  if (ratio < 0.001f || ratio > 1000.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("gear ratio must be a positive non-zero finite value"));
  }
  #endif
  pb_assert(pbio_mdrobotbase_set_gear_ratio(self->rb, ratio));
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_2(pb_type_MDRobotBase_set_gear_ratio_obj,
                                 pb_type_MDRobotBase_set_gear_ratio);

// pybricks.robotics.MDRobotBase.get_gear_ratio
static mp_obj_t pb_type_MDRobotBase_get_gear_ratio(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float ratio;
  pb_assert(pbio_mdrobotbase_get_gear_ratio(self->rb, &ratio));
  return mp_obj_new_float_from_f(ratio);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_gear_ratio_obj,
                                 pb_type_MDRobotBase_get_gear_ratio);

// pybricks.robotics.MDRobotBase.navigate_to_goal
static mp_obj_t pb_type_MDRobotBase_navigate_to_goal(size_t n_args,
                                                     const mp_obj_t *pos_args,
                                                     mp_map_t *kw_args) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);
  pb_type_mdrobotbase_require_open(self);


  static const mp_arg_t allowed_args[] = {
      {MP_QSTR_goal_x, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
      {MP_QSTR_goal_y, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
      {MP_QSTR_goal_theta, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_start_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_end_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_accel_dist_mm, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_decel_dist_mm, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = false}},
      {MP_QSTR_backward, MP_ARG_BOOL, {.u_bool = false}},
      {MP_QSTR_tolerance_dist, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)}},
      {MP_QSTR_kick_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_kick_time_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
  };

  mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
  mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args,
                   MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

  float gx = mp_obj_get_float(parsed_args[0].u_obj);
  float gy = mp_obj_get_float(parsed_args[1].u_obj);
  if (!isfinite(gx) || !isfinite(gy)) {
    mp_raise_ValueError(MP_ERROR_TEXT("coordinates must be finite"));
  }
  mp_obj_t goal_theta_obj = parsed_args[2].u_obj;
  if (goal_theta_obj != mp_const_none) {
    float gt_val_check = mp_obj_get_float(goal_theta_obj);
    if (!isfinite(gt_val_check)) {
      mp_raise_ValueError(MP_ERROR_TEXT("goal_theta must be finite"));
    }
  }
  float speed = parsed_args[3].u_obj == mp_const_none
                    ? 500.0f
                    : mp_obj_get_float(parsed_args[3].u_obj);
  if (!isfinite(speed)) {
    mp_raise_ValueError(MP_ERROR_TEXT("speed must be finite"));
  }
  float start_speed = parsed_args[4].u_obj == mp_const_none
                          ? 20.0f
                          : mp_obj_get_float(parsed_args[4].u_obj);
  float end_speed = parsed_args[5].u_obj == mp_const_none
                        ? 40.0f
                        : mp_obj_get_float(parsed_args[5].u_obj);

  float accel_d;
  if (parsed_args[6].u_obj == mp_const_none) {
    float abs_target_speed = fabsf(speed);
    float abs_start_speed = fabsf(start_speed);
    accel_d = (abs_target_speed * abs_target_speed -
               abs_start_speed * abs_start_speed) /
              1200.0f;
    if (accel_d < 50.0f)
      accel_d = 50.0f;
  } else {
    accel_d = mp_obj_get_float(parsed_args[6].u_obj);
  }

  float decel_d;
  if (parsed_args[7].u_obj == mp_const_none) {
    float abs_target_speed = fabsf(speed);
    float abs_end_speed = fabsf(end_speed);
    decel_d =
        (abs_target_speed * abs_target_speed - abs_end_speed * abs_end_speed) /
        1200.0f;
    if (decel_d < 50.0f)
      decel_d = 50.0f;
  } else {
    decel_d = mp_obj_get_float(parsed_args[7].u_obj);
  }

  bool ramping = parsed_args[8].u_bool;
  bool back = parsed_args[9].u_bool;
  float tolerance = parsed_args[10].u_obj == mp_const_none
                        ? 15.0f
                        : mp_obj_get_float(parsed_args[10].u_obj);
  mp_obj_t timeout_ms_obj = parsed_args[11].u_obj;
  mp_obj_t then_obj = parsed_args[12].u_obj;
  float kick_speed = parsed_args[13].u_obj == mp_const_none
                         ? 0.0f
                         : mp_obj_get_float(parsed_args[13].u_obj);
  float kick_time = parsed_args[14].u_obj == mp_const_none
                        ? 0.0f
                        : mp_obj_get_float(parsed_args[14].u_obj);

  float comp = get_battery_compensation_factor();
  accel_d *= comp;
  decel_d *= comp;

  float cur_x = self->rb->x;
  float cur_y = self->rb->y;
  float cur_theta = self->rb->theta;
  float dx_init = gx - cur_x;
  float dy_init = gy - cur_y;
  float total_dist = sqrtf(dx_init * dx_init + dy_init * dy_init);

  float t_expected = 0.0f;
  float abs_target_speed = fabsf(speed);
  float abs_start_speed = fabsf(start_speed);
  float abs_end_speed = fabsf(end_speed);
  float nominal_speed = abs_target_speed > 10.0f ? abs_target_speed : 10.0f;
  float total_dist_actual = total_dist - tolerance;
  if (total_dist_actual < 0.0f) total_dist_actual = 0.0f;

  if (total_dist_actual > 0.0f) {
    if (ramping && (accel_d + decel_d > 0.0f)) {
      if (total_dist_actual > (accel_d + decel_d)) {
        float t_acc = 0.0f;
        if (accel_d > 0.0f) {
          float v_avg = (abs_start_speed + nominal_speed) / 2.0f;
          if (v_avg < 10.0f) v_avg = 10.0f;
          t_acc = accel_d / v_avg;
        }
        float t_dec = 0.0f;
        if (decel_d > 0.0f) {
          float v_avg = (nominal_speed + abs_end_speed) / 2.0f;
          if (v_avg < 10.0f) v_avg = 10.0f;
          t_dec = decel_d / v_avg;
        }
        float t_const = (total_dist_actual - accel_d - decel_d) / nominal_speed;
        t_expected = t_acc + t_dec + t_const;
      } else {
        float ratio = total_dist_actual / (accel_d + decel_d);
        float accel_d_prime = accel_d * ratio;
        float decel_d_prime = decel_d * ratio;
        float v_peak = abs_start_speed + (nominal_speed - abs_start_speed) * ratio;
        float t_acc = 0.0f;
        if (accel_d_prime > 0.0f) {
          float v_avg = (abs_start_speed + v_peak) / 2.0f;
          if (v_avg < 10.0f) v_avg = 10.0f;
          t_acc = accel_d_prime / v_avg;
        }
        float t_dec = 0.0f;
        if (decel_d_prime > 0.0f) {
          float v_avg = (v_peak + abs_end_speed) / 2.0f;
          if (v_avg < 10.0f) v_avg = 10.0f;
          t_dec = decel_d_prime / v_avg;
        }
        t_expected = t_acc + t_dec;
      }
    } else {
      t_expected = total_dist_actual / nominal_speed;
    }
  }

  float turn_speed = self->rb->max_turn_speed > 10.0f ? self->rb->max_turn_speed : 200.0f;
  if (total_dist > 5.0f) {
    float path_theta_init = atan2f(dy_init, dx_init) * (180.0f / 3.14159265f);
    if (back) path_theta_init += 180.0f;
    float init_turn_diff = fabsf(mdrobotbase_wrap_degrees(path_theta_init - cur_theta));
    t_expected += (init_turn_diff / turn_speed);
  }
  if (goal_theta_obj != mp_const_none) {
    float gt_val = mp_obj_get_float(goal_theta_obj);
    float path_theta_init = atan2f(dy_init, dx_init) * (180.0f / 3.14159265f);
    if (back) path_theta_init += 180.0f;
    float final_turn_diff = fabsf(mdrobotbase_wrap_degrees(gt_val - path_theta_init));
    t_expected += (final_turn_diff / turn_speed);
  }

  uint32_t timeout;
  if (timeout_ms_obj == mp_const_none) {
    timeout = (uint32_t)(t_expected * 1300.0f) + 800;
  } else {
    timeout = (uint32_t)pb_obj_get_int(timeout_ms_obj);
  }

  float gt = 0.0f;
  if (goal_theta_obj == mp_const_none) {
    gt = atan2f(gy - cur_y, gx - cur_x) * (180.0f / 3.14159265f);
  } else {
    gt = mp_obj_get_float(goal_theta_obj);
  }

  float target_speed_signed = back ? -fabsf(speed) : fabsf(speed);
  float current_start_speed_signed = back ? -fabsf(start_speed) : fabsf(start_speed);
  float current_end_speed_signed = back ? -fabsf(end_speed) : fabsf(end_speed);

  int32_t l_dps = 0, r_dps = 0, speed_unused = 0;
  pbio_servo_get_state_user(self->rb->left, &speed_unused, &l_dps);
  pbio_servo_get_state_user(self->rb->right, &speed_unused, &r_dps);
  float diam_left_mm = (float)self->rb->wheel_diameter_left / 1000.0f;
  float diam_right_mm = (float)self->rb->wheel_diameter_right / 1000.0f;
  float current_linear_speed =
      (((float)l_dps / 360.0f * 3.14159265f * diam_left_mm) +
       ((float)r_dps / 360.0f * 3.14159265f * diam_right_mm)) / 2.0f;

  if (fabsf(current_linear_speed) > 40.0f) {
    if (fabsf(current_start_speed_signed) <= 40.0f) {
      current_start_speed_signed = current_linear_speed;
    }
  }

  float target_speed_for_ramping = target_speed_signed;
  if (ramping && (accel_d + decel_d > 0.0f) && (total_dist_actual < accel_d + decel_d)) {
    float ratio = total_dist_actual / (accel_d + decel_d);
    accel_d *= ratio;
    decel_d *= ratio;
    float abs_start = fabsf(current_start_speed_signed);
    float abs_target = fabsf(target_speed_signed);
    float abs_peak = abs_start + (abs_target - abs_start) * ratio;
    target_speed_for_ramping = (target_speed_signed >= 0.0f) ? abs_peak : -abs_peak;
  }

  float max_accel = 1200.0f;
  float abs_target_ramping = fabsf(target_speed_for_ramping);
  if (accel_d > 0.0f) {
    float a_calc = (abs_target_ramping * abs_target_ramping - abs_start_speed * abs_start_speed) / accel_d;
    if (a_calc > max_accel) max_accel = a_calc;
  }
  if (decel_d > 0.0f) {
    float d_calc = (abs_target_ramping * abs_target_ramping - abs_end_speed * abs_end_speed) / decel_d;
    if (d_calc > max_accel) max_accel = d_calc;
  }
  if (max_accel < 500.0f) max_accel = 500.0f;
  if (max_accel > 3000.0f) max_accel = 3000.0f;

  pb_type_mdrobotbase_cancel_active_motion(self);
  pb_type_mdrobotbase_motion_reset(self);

  self->rb->goal_x = gx;
  self->rb->goal_y = gy;
  self->rb->has_goal_theta = (goal_theta_obj != mp_const_none);
  self->rb->gt = gt;
  self->rb->target_speed = speed;
  self->rb->start_speed = start_speed;
  self->rb->end_speed = end_speed;
  self->rb->accel_d = accel_d;
  self->rb->decel_d = decel_d;
  self->rb->use_ramping = ramping;
  self->rb->is_backward = back;
  self->rb->tolerance_dist = tolerance;
  self->rb->timeout_ms = timeout;
  self->rb->stop_behavior = pb_type_enum_get_value(then_obj, &pb_enum_type_Stop);
  self->rb->kick_speed = kick_speed;
  self->rb->kick_time = kick_time;

  self->rb->start_x = cur_x;
  self->rb->start_y = cur_y;
  self->rb->last_x = cur_x;
  self->rb->last_y = cur_y;
  self->rb->path_x = gx - cur_x;
  self->rb->path_y = gy - cur_y;
  self->rb->path_len = sqrtf(self->rb->path_x * self->rb->path_x + self->rb->path_y * self->rb->path_y);
  self->rb->path_theta = atan2f(self->rb->path_y, self->rb->path_x);
  self->rb->dist_ref = 0.0f;
  self->rb->dist_traveled = 0.0f;
  self->rb->target_speed_for_ramping = target_speed_for_ramping;
  self->rb->current_start_speed = current_start_speed_signed;
  self->rb->current_end_speed = current_end_speed_signed;
  self->rb->max_accel = max_accel;
  self->rb->last_v_profile = current_linear_speed;
  self->rb->last_v_cmd = current_linear_speed;
  self->rb->last_w_cmd = 0.0f;
  self->rb->last_step_theta = self->rb->theta;
  self->rb->turn_integral = 0.0f;
  self->rb->stall_time_ms = 0.0f;
  self->rb->align_final_heading = false;

  self->rb->start_time_ms = pbdrv_clock_get_ms();
  self->rb->last_step_time_ms = self->rb->start_time_ms;
  self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_NAVIGATE;
  pb_type_mdrobotbase_motion_start(self);

  return pb_type_mdrobotbase_wait_or_await(self);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_navigate_to_goal_obj, 1,
                                  pb_type_MDRobotBase_navigate_to_goal);

// pybricks.robotics.MDRobotBase.go_forward
static mp_obj_t pb_type_MDRobotBase_go_forward(size_t n_args,
                                               const mp_obj_t *pos_args,
                                               mp_map_t *kw_args) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);
  pb_type_mdrobotbase_require_open(self);

  static const mp_arg_t allowed_args[] = {
      {MP_QSTR_distance, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
      {MP_QSTR_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_start_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_end_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_accel_dist_mm, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_decel_dist_mm, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = false}},
      {MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)}},
      {MP_QSTR_kick_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_kick_time_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
  };

  mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
  mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args,
                   MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

  float distance = mp_obj_get_float(parsed_args[0].u_obj);
  float cur_x = self->rb->x;
  float cur_y = self->rb->y;
  float cur_theta = self->rb->theta;
  float rad = cur_theta * (3.14159265f / 180.0f);

  float gx = cur_x + distance * cosf(rad);
  float gy = cur_y + distance * sinf(rad);

  mp_obj_t nav_args[3];
  nav_args[0] = pos_args[0];
  nav_args[1] = mp_obj_new_float(gx);
  nav_args[2] = mp_obj_new_float(gy);

  mp_map_t nav_kw;
  mp_map_init(&nav_kw, kw_args->used + 10);
  for (size_t i = 0; i < kw_args->alloc; i++) {
    if (MP_MAP_SLOT_IS_FILLED(kw_args, i)) {
      if (kw_args->table[i].key != MP_OBJ_NEW_QSTR(MP_QSTR_distance)) {
        mp_map_lookup(&nav_kw, kw_args->table[i].key, MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = kw_args->table[i].value;
      }
    }
  }

  if (parsed_args[1].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_speed_mm_s), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[1].u_obj;
  if (parsed_args[2].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_start_speed_mm_s), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[2].u_obj;
  if (parsed_args[3].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_end_speed_mm_s), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[3].u_obj;
  if (parsed_args[4].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_accel_dist_mm), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[4].u_obj;
  if (parsed_args[5].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_decel_dist_mm), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[5].u_obj;
  if (parsed_args[6].u_bool) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_use_ramping), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = mp_const_true;
  if (parsed_args[7].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_timeout_ms), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[7].u_obj;
  if (parsed_args[8].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_then), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[8].u_obj;
  if (parsed_args[9].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_kick_speed_mm_s), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[9].u_obj;
  if (parsed_args[10].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_kick_time_ms), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[10].u_obj;

  return pb_type_MDRobotBase_navigate_to_goal(3, nav_args, &nav_kw);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_go_forward_obj, 1,
                                  pb_type_MDRobotBase_go_forward);

// pybricks.robotics.MDRobotBase.go_backward
static mp_obj_t pb_type_MDRobotBase_go_backward(size_t n_args,
                                                const mp_obj_t *pos_args,
                                                mp_map_t *kw_args) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);
  pb_type_mdrobotbase_require_open(self);

  static const mp_arg_t allowed_args[] = {
      {MP_QSTR_distance, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
      {MP_QSTR_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_start_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_end_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_accel_dist_mm, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_decel_dist_mm, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = false}},
      {MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)}},
      {MP_QSTR_kick_speed_mm_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_kick_time_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
  };

  mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
  mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args,
                   MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

  float distance = mp_obj_get_float(parsed_args[0].u_obj);
  float cur_x = self->rb->x;
  float cur_y = self->rb->y;
  float cur_theta = self->rb->theta;
  float rad = cur_theta * (3.14159265f / 180.0f);

  float gx = cur_x - distance * cosf(rad);
  float gy = cur_y - distance * sinf(rad);

  mp_obj_t nav_args[3];
  nav_args[0] = pos_args[0];
  nav_args[1] = mp_obj_new_float(gx);
  nav_args[2] = mp_obj_new_float(gy);

  mp_map_t nav_kw;
  mp_map_init(&nav_kw, kw_args->used + 11);
  for (size_t i = 0; i < kw_args->alloc; i++) {
    if (MP_MAP_SLOT_IS_FILLED(kw_args, i)) {
      if (kw_args->table[i].key != MP_OBJ_NEW_QSTR(MP_QSTR_distance)) {
        mp_map_lookup(&nav_kw, kw_args->table[i].key, MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = kw_args->table[i].value;
      }
    }
  }
  mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_backward), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = mp_const_true;

  if (parsed_args[1].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_speed_mm_s), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[1].u_obj;
  if (parsed_args[2].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_start_speed_mm_s), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[2].u_obj;
  if (parsed_args[3].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_end_speed_mm_s), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[3].u_obj;
  if (parsed_args[4].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_accel_dist_mm), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[4].u_obj;
  if (parsed_args[5].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_decel_dist_mm), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[5].u_obj;
  if (parsed_args[6].u_bool) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_use_ramping), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = mp_const_true;
  if (parsed_args[7].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_timeout_ms), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[7].u_obj;
  if (parsed_args[8].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_then), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[8].u_obj;
  if (parsed_args[9].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_kick_speed_mm_s), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[9].u_obj;
  if (parsed_args[10].u_obj != mp_const_none) mp_map_lookup(&nav_kw, MP_OBJ_NEW_QSTR(MP_QSTR_kick_time_ms), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[10].u_obj;

  return pb_type_MDRobotBase_navigate_to_goal(3, nav_args, &nav_kw);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_go_backward_obj, 1,
                                  pb_type_MDRobotBase_go_backward);

// pybricks.robotics.MDRobotBase.turn_to_angle
static mp_obj_t pb_type_MDRobotBase_turn_to_angle(size_t n_args,
                                                  const mp_obj_t *pos_args,
                                                  mp_map_t *kw_args) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);
  pb_type_mdrobotbase_require_open(self);

  static const mp_arg_t allowed_args[] = {
      {MP_QSTR_target_angle, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
      {MP_QSTR_speed_deg_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)}},
      {MP_QSTR_accel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_start_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_decel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_end_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
  };

  mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
  mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args,
                   MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

  float target_angle = mp_obj_get_float(parsed_args[0].u_obj);
  if (!isfinite(target_angle)) {
    mp_raise_ValueError(MP_ERROR_TEXT("target_angle must be finite"));
  }
  float speed_deg_s = parsed_args[1].u_obj == mp_const_none
                          ? 300.0f
                          : mp_obj_get_float(parsed_args[1].u_obj);
  if (!isfinite(speed_deg_s) || speed_deg_s <= 0.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("speed must be positive and finite"));
  }
  mp_obj_t tolerance_obj = parsed_args[2].u_obj;
  mp_obj_t timeout_ms_obj = parsed_args[3].u_obj;
  mp_obj_t then_obj = parsed_args[4].u_obj;
  float accel_angle = parsed_args[5].u_obj == mp_const_none
                          ? 15.0f
                          : mp_obj_get_float(parsed_args[5].u_obj);
  float start_speed = parsed_args[6].u_obj == mp_const_none
                          ? 40.0f
                          : mp_obj_get_float(parsed_args[6].u_obj);
  float decel_angle = parsed_args[7].u_obj == mp_const_none
                          ? 15.0f
                          : mp_obj_get_float(parsed_args[7].u_obj);
  float end_speed = parsed_args[8].u_obj == mp_const_none
                        ? 20.0f
                        : mp_obj_get_float(parsed_args[8].u_obj);

  float tolerance = 1.5f;
  if (tolerance_obj != mp_const_none) {
    tolerance = mp_obj_get_float(tolerance_obj);
  }

  float cur_theta = self->rb->theta;
  float e_theta_init = mdrobotbase_wrap_degrees(target_angle - cur_theta);
  float turn_angle = fabsf(e_theta_init);

  uint32_t timeout;
  if (timeout_ms_obj == mp_const_none) {
    float v_cruise = speed_deg_s < self->rb->max_turn_speed ? speed_deg_s : self->rb->max_turn_speed;
    if (v_cruise < 10.0f) v_cruise = 150.0f;
    float v_start = start_speed < v_cruise ? start_speed : v_cruise;
    float v_end = end_speed < v_cruise ? end_speed : v_cruise;

    float t_accel = (accel_angle > 0.0f && (v_start + v_cruise) > 0.0f) ? (2.0f * accel_angle) / (v_start + v_cruise) : 0.0f;
    float t_decel = (decel_angle > 0.0f && (v_cruise + v_end) > 0.0f) ? (2.0f * decel_angle) / (v_cruise + v_end) : 0.0f;
    float t_cruise = 0.0f;
    if (turn_angle > (accel_angle + decel_angle)) {
      t_cruise = (turn_angle - (accel_angle + decel_angle)) / v_cruise;
    } else {
      t_accel *= 0.5f;
      t_decel *= 0.5f;
    }
    float t_total = t_accel + t_cruise + t_decel;
    timeout = (uint32_t)(t_total * 1000.0f * 1.6f) + 1200;
  } else {
    timeout = (uint32_t)pb_obj_get_int(timeout_ms_obj);
  }

  pb_type_mdrobotbase_cancel_active_motion(self);
  pb_type_mdrobotbase_motion_reset(self);

  self->rb->target_angle = target_angle;
  self->rb->speed_deg_s = speed_deg_s;
  self->rb->tolerance_angle = tolerance;
  self->rb->timeout_ms = timeout;
  self->rb->stop_behavior = pb_type_enum_get_value(then_obj, &pb_enum_type_Stop);
  self->rb->accel_angle = accel_angle;
  self->rb->start_speed = start_speed;
  self->rb->decel_angle = decel_angle;
  self->rb->end_speed = end_speed;
  self->rb->turn_angle_total = turn_angle;

  self->rb->turn_integral = 0.0f;
  self->rb->stall_time_ms = 0.0f;
  self->rb->last_step_theta = self->rb->theta;

  self->rb->start_time_ms = pbdrv_clock_get_ms();
  self->rb->last_step_time_ms = self->rb->start_time_ms;
  self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_TURN;
  pb_type_mdrobotbase_motion_start(self);

  return pb_type_mdrobotbase_wait_or_await(self);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_turn_to_angle_obj, 1,
                                  pb_type_MDRobotBase_turn_to_angle);

// pybricks.robotics.MDRobotBase.turn_angle
static mp_obj_t pb_type_MDRobotBase_turn_angle(size_t n_args,
                                               const mp_obj_t *pos_args,
                                               mp_map_t *kw_args) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);
  pb_type_mdrobotbase_require_open(self);

  static const mp_arg_t allowed_args[] = {
      {MP_QSTR_angle, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
      {MP_QSTR_speed_deg_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)}},
      {MP_QSTR_accel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_start_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_decel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_end_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
  };

  mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
  mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args,
                   MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

  float angle = mp_obj_get_float(parsed_args[0].u_obj);
  float target_angle = mdrobotbase_wrap_degrees(self->rb->theta + angle);

  mp_obj_t turn_args[2];
  turn_args[0] = pos_args[0];
  turn_args[1] = mp_obj_new_float(target_angle);

  mp_map_t turn_kw;
  mp_map_init(&turn_kw, kw_args->used + 8);
  for (size_t i = 0; i < kw_args->alloc; i++) {
    if (MP_MAP_SLOT_IS_FILLED(kw_args, i)) {
      if (kw_args->table[i].key != MP_OBJ_NEW_QSTR(MP_QSTR_angle)) {
        mp_map_lookup(&turn_kw, kw_args->table[i].key, MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = kw_args->table[i].value;
      }
    }
  }

  if (parsed_args[1].u_obj != mp_const_none) mp_map_lookup(&turn_kw, MP_OBJ_NEW_QSTR(MP_QSTR_speed_deg_s), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[1].u_obj;
  if (parsed_args[2].u_obj != mp_const_none) mp_map_lookup(&turn_kw, MP_OBJ_NEW_QSTR(MP_QSTR_tolerance), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[2].u_obj;
  if (parsed_args[3].u_obj != mp_const_none) mp_map_lookup(&turn_kw, MP_OBJ_NEW_QSTR(MP_QSTR_timeout_ms), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[3].u_obj;
  if (parsed_args[4].u_obj != mp_const_none) mp_map_lookup(&turn_kw, MP_OBJ_NEW_QSTR(MP_QSTR_then), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[4].u_obj;
  if (parsed_args[5].u_obj != mp_const_none) mp_map_lookup(&turn_kw, MP_OBJ_NEW_QSTR(MP_QSTR_accel_angle), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[5].u_obj;
  if (parsed_args[6].u_obj != mp_const_none) mp_map_lookup(&turn_kw, MP_OBJ_NEW_QSTR(MP_QSTR_start_speed), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[6].u_obj;
  if (parsed_args[7].u_obj != mp_const_none) mp_map_lookup(&turn_kw, MP_OBJ_NEW_QSTR(MP_QSTR_decel_angle), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[7].u_obj;
  if (parsed_args[8].u_obj != mp_const_none) mp_map_lookup(&turn_kw, MP_OBJ_NEW_QSTR(MP_QSTR_end_speed), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[8].u_obj;

  return pb_type_MDRobotBase_turn_to_angle(2, turn_args, &turn_kw);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_turn_angle_obj, 1,
                                  pb_type_MDRobotBase_turn_angle);

// pybricks.robotics.MDRobotBase.pivot_turn_to_angle
static mp_obj_t pb_type_MDRobotBase_pivot_turn_to_angle(size_t n_args,
                                                        const mp_obj_t *pos_args,
                                                        mp_map_t *kw_args) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);
  pb_type_mdrobotbase_require_open(self);

  static const mp_arg_t allowed_args[] = {
      {MP_QSTR_target_angle, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
      {MP_QSTR_speed_deg_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_pivot_side, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)}},
      {MP_QSTR_accel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_start_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_decel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_end_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
  };

  mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
  mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args,
                   MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

  float target_angle = mp_obj_get_float(parsed_args[0].u_obj);
  if (!isfinite(target_angle)) {
    mp_raise_ValueError(MP_ERROR_TEXT("target_angle must be finite"));
  }
  float speed_deg_s = parsed_args[1].u_obj == mp_const_none
                          ? 200.0f
                          : mp_obj_get_float(parsed_args[1].u_obj);
  if (!isfinite(speed_deg_s) || speed_deg_s <= 0.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("speed must be positive and finite"));
  }
  mp_obj_t pivot_side_obj = parsed_args[2].u_obj;
  mp_obj_t tolerance_obj = parsed_args[3].u_obj;
  mp_obj_t timeout_ms_obj = parsed_args[4].u_obj;
  mp_obj_t then_obj = parsed_args[5].u_obj;
  float accel_angle = parsed_args[6].u_obj == mp_const_none
                          ? 15.0f
                          : mp_obj_get_float(parsed_args[6].u_obj);
  float start_speed = parsed_args[7].u_obj == mp_const_none
                          ? 40.0f
                          : mp_obj_get_float(parsed_args[7].u_obj);
  float decel_angle = parsed_args[8].u_obj == mp_const_none
                          ? 15.0f
                          : mp_obj_get_float(parsed_args[8].u_obj);
  float end_speed = parsed_args[9].u_obj == mp_const_none
                        ? 20.0f
                        : mp_obj_get_float(parsed_args[9].u_obj);

  float tolerance = 1.5f;
  if (tolerance_obj != mp_const_none) {
    tolerance = mp_obj_get_float(tolerance_obj);
  }

  float cur_theta = self->rb->theta;
  float e_theta_init = mdrobotbase_wrap_degrees(target_angle - cur_theta);
  float turn_angle = fabsf(e_theta_init);

  bool pivot_left = true;
  if (pivot_side_obj != mp_const_none && mp_obj_is_str(pivot_side_obj)) {
    const char *side_str = mp_obj_str_get_str(pivot_side_obj);
    if (side_str[0] == 'r' || side_str[0] == 'R') {
      pivot_left = false;
    }
  } else if (pivot_side_obj == mp_const_none) {
    if (e_theta_init < 0.0f) {
      pivot_left = false;
    }
  }

  uint32_t timeout;
  if (timeout_ms_obj == mp_const_none) {
    float v_cruise = speed_deg_s < self->rb->max_pivot_speed ? speed_deg_s : self->rb->max_pivot_speed;
    if (v_cruise < 10.0f) v_cruise = 100.0f;
    float v_start = start_speed < v_cruise ? start_speed : v_cruise;
    float v_end = end_speed < v_cruise ? end_speed : v_cruise;

    float t_accel = (accel_angle > 0.0f && (v_start + v_cruise) > 0.0f) ? (2.0f * accel_angle) / (v_start + v_cruise) : 0.0f;
    float t_decel = (decel_angle > 0.0f && (v_cruise + v_end) > 0.0f) ? (2.0f * decel_angle) / (v_cruise + v_end) : 0.0f;
    float t_cruise = 0.0f;
    if (turn_angle > (accel_angle + decel_angle)) {
      t_cruise = (turn_angle - (accel_angle + decel_angle)) / v_cruise;
    } else {
      t_accel *= 0.5f;
      t_decel *= 0.5f;
    }
    float t_total = t_accel + t_cruise + t_decel;
    // Pivot turns scale by 2.0x for double turn radius inertia + 1500ms padding
    timeout = (uint32_t)(t_total * 1000.0f * 2.0f) + 1500;
  } else {
    timeout = (uint32_t)pb_obj_get_int(timeout_ms_obj);
  }

  pb_type_mdrobotbase_cancel_active_motion(self);
  pb_type_mdrobotbase_motion_reset(self);

  self->rb->target_angle = target_angle;
  self->rb->speed_deg_s = speed_deg_s;
  self->rb->pivot_left = pivot_left;
  self->rb->tolerance_angle = tolerance;
  self->rb->timeout_ms = timeout;
  self->rb->stop_behavior = pb_type_enum_get_value(then_obj, &pb_enum_type_Stop);
  self->rb->accel_angle = accel_angle;
  self->rb->start_speed = start_speed;
  self->rb->decel_angle = decel_angle;
  self->rb->end_speed = end_speed;
  self->rb->turn_angle_total = turn_angle;

  self->rb->turn_integral = 0.0f;
  self->rb->stall_time_ms = 0.0f;
  self->rb->last_step_theta = self->rb->theta;

  if (pivot_left) {
    pbio_servo_stop(self->rb->left, PBIO_CONTROL_ON_COMPLETION_HOLD);
  } else {
    pbio_servo_stop(self->rb->right, PBIO_CONTROL_ON_COMPLETION_HOLD);
  }

  self->rb->start_time_ms = pbdrv_clock_get_ms();
  self->rb->last_step_time_ms = self->rb->start_time_ms;
  self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_PIVOT;
  pb_type_mdrobotbase_motion_start(self);

  return pb_type_mdrobotbase_wait_or_await(self);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_pivot_turn_to_angle_obj, 1,
                                  pb_type_MDRobotBase_pivot_turn_to_angle);

// pybricks.robotics.MDRobotBase.pivot_turn_angle
static mp_obj_t pb_type_MDRobotBase_pivot_turn_angle(size_t n_args,
                                                     const mp_obj_t *pos_args,
                                                     mp_map_t *kw_args) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);
  pb_type_mdrobotbase_require_open(self);

  static const mp_arg_t allowed_args[] = {
      {MP_QSTR_angle, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
      {MP_QSTR_speed_deg_s, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_pivot_side, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)}},
      {MP_QSTR_accel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_start_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_decel_angle, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_end_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
  };

  mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
  mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args,
                   MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

  float angle = mp_obj_get_float(parsed_args[0].u_obj);
  float target_angle = mdrobotbase_wrap_degrees(self->rb->theta + angle);

  mp_obj_t pivot_args[2];
  pivot_args[0] = pos_args[0];
  pivot_args[1] = mp_obj_new_float(target_angle);

  mp_map_t pivot_kw;
  mp_map_init(&pivot_kw, kw_args->used + 9);
  for (size_t i = 0; i < kw_args->alloc; i++) {
    if (MP_MAP_SLOT_IS_FILLED(kw_args, i)) {
      if (kw_args->table[i].key != MP_OBJ_NEW_QSTR(MP_QSTR_angle)) {
        mp_map_lookup(&pivot_kw, kw_args->table[i].key, MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = kw_args->table[i].value;
      }
    }
  }

  if (parsed_args[1].u_obj != mp_const_none) mp_map_lookup(&pivot_kw, MP_OBJ_NEW_QSTR(MP_QSTR_speed_deg_s), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[1].u_obj;
  if (parsed_args[2].u_obj != mp_const_none) mp_map_lookup(&pivot_kw, MP_OBJ_NEW_QSTR(MP_QSTR_pivot_side), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[2].u_obj;
  if (parsed_args[3].u_obj != mp_const_none) mp_map_lookup(&pivot_kw, MP_OBJ_NEW_QSTR(MP_QSTR_tolerance), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[3].u_obj;
  if (parsed_args[4].u_obj != mp_const_none) mp_map_lookup(&pivot_kw, MP_OBJ_NEW_QSTR(MP_QSTR_timeout_ms), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[4].u_obj;
  if (parsed_args[5].u_obj != mp_const_none) mp_map_lookup(&pivot_kw, MP_OBJ_NEW_QSTR(MP_QSTR_then), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[5].u_obj;
  if (parsed_args[6].u_obj != mp_const_none) mp_map_lookup(&pivot_kw, MP_OBJ_NEW_QSTR(MP_QSTR_accel_angle), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[6].u_obj;
  if (parsed_args[7].u_obj != mp_const_none) mp_map_lookup(&pivot_kw, MP_OBJ_NEW_QSTR(MP_QSTR_start_speed), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[7].u_obj;
  if (parsed_args[8].u_obj != mp_const_none) mp_map_lookup(&pivot_kw, MP_OBJ_NEW_QSTR(MP_QSTR_decel_angle), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[8].u_obj;
  if (parsed_args[9].u_obj != mp_const_none) mp_map_lookup(&pivot_kw, MP_OBJ_NEW_QSTR(MP_QSTR_end_speed), MP_MAP_LOOKUP_ADD_IF_NOT_FOUND)->value = parsed_args[9].u_obj;

  return pb_type_MDRobotBase_pivot_turn_to_angle(2, pivot_args, &pivot_kw);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_pivot_turn_angle_obj, 1,
                                  pb_type_MDRobotBase_pivot_turn_angle);

// pybricks.robotics.MDRobotBase.follow_trajectory
static mp_obj_t pb_type_MDRobotBase_follow_trajectory(size_t n_args,
                                                      const mp_obj_t *pos_args,
                                                      mp_map_t *kw_args) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(pos_args[0]);
  pb_type_mdrobotbase_require_open(self);

  static const mp_arg_t allowed_args[] = {
      {MP_QSTR_points, MP_ARG_OBJ | MP_ARG_REQUIRED, {}},
      {MP_QSTR_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_start_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_end_speed, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_accel_d, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_decel_d, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_transition_tolerance, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_use_ramping, MP_ARG_BOOL, {.u_bool = false}},
      {MP_QSTR_back, MP_ARG_OBJ, {.u_obj = mp_const_none}},
      {MP_QSTR_then, MP_ARG_OBJ, {.u_rom_obj = MP_ROM_PTR(&pb_Stop_HOLD_obj)}},
      {MP_QSTR_timeout_ms, MP_ARG_OBJ, {.u_obj = mp_const_none}},
  };

  mp_arg_val_t parsed_args[MP_ARRAY_SIZE(allowed_args)];
  mp_arg_parse_all(n_args - 1, pos_args + 1, kw_args,
                   MP_ARRAY_SIZE(allowed_args), allowed_args, parsed_args);

  mp_obj_t points_obj = parsed_args[0].u_obj;
  size_t num_points = 0;
  mp_obj_t *points = NULL;
  mp_obj_get_array(points_obj, &num_points, &points);
  if (num_points < 2) {
    mp_raise_ValueError(MP_ERROR_TEXT("trajectory requires at least 2 points"));
  }

  if (num_points > 64) {
    mp_raise_ValueError(MP_ERROR_TEXT("trajectory exceeds maximum capacity of 64 points"));
  }

  float speed = parsed_args[1].u_obj == mp_const_none
                    ? 300.0f
                    : mp_obj_get_float(parsed_args[1].u_obj);
  float start_speed = parsed_args[2].u_obj == mp_const_none
                          ? 0.0f
                          : mp_obj_get_float(parsed_args[2].u_obj);
  float end_speed = parsed_args[3].u_obj == mp_const_none
                        ? 0.0f
                        : mp_obj_get_float(parsed_args[3].u_obj);
  float accel_d = parsed_args[4].u_obj == mp_const_none
                      ? 50.0f
                      : mp_obj_get_float(parsed_args[4].u_obj);
  float decel_d = parsed_args[5].u_obj == mp_const_none
                      ? 50.0f
                      : mp_obj_get_float(parsed_args[5].u_obj);
  float tolerance = parsed_args[6].u_obj == mp_const_none
                        ? 10.0f
                        : mp_obj_get_float(parsed_args[6].u_obj);
  float transition_tolerance = parsed_args[7].u_obj == mp_const_none
                                   ? 50.0f
                                   : mp_obj_get_float(parsed_args[7].u_obj);

  if (!isfinite(speed) || speed <= 0.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("speed must be positive and finite"));
  }
  if (!isfinite(start_speed) || start_speed < 0.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("start_speed must be non-negative and finite"));
  }
  if (!isfinite(end_speed) || end_speed < 0.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("end_speed must be non-negative and finite"));
  }
  if (!isfinite(accel_d) || accel_d <= 0.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("accel_d must be positive and finite"));
  }
  if (!isfinite(decel_d) || decel_d <= 0.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("decel_d must be positive and finite"));
  }
  if (!isfinite(tolerance) || tolerance <= 0.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("tolerance must be positive and finite"));
  }
  if (!isfinite(transition_tolerance) || transition_tolerance <= 0.0f) {
    mp_raise_ValueError(MP_ERROR_TEXT("transition_tolerance must be positive and finite"));
  }

  bool ramping = parsed_args[8].u_bool;
  bool back = parsed_args[9].u_obj == mp_const_none
                  ? false
                  : mp_obj_is_true(parsed_args[9].u_obj);
  pbio_control_on_completion_t stop_behavior =
      pb_type_enum_get_value(parsed_args[10].u_obj, &pb_enum_type_Stop);
  mp_obj_t timeout_ms_obj = parsed_args[11].u_obj;

  float temp_x[64];
  float temp_y[64];
  for (size_t i = 0; i < num_points; i++) {
    size_t p_len;
    mp_obj_t *p_coords;
    mp_obj_get_array(points[i], &p_len, &p_coords);
    if (p_len < 2) {
      mp_raise_ValueError(MP_ERROR_TEXT("trajectory point must have at least (x, y) coordinates"));
    }
    float px = mp_obj_get_float(p_coords[0]);
    float py = mp_obj_get_float(p_coords[1]);
    if (!isfinite(px) || !isfinite(py)) {
      mp_raise_ValueError(MP_ERROR_TEXT("trajectory coordinates must be finite"));
    }
    temp_x[i] = px;
    temp_y[i] = py;
  }

  uint32_t timeout;
  if (timeout_ms_obj == mp_const_none) {
    timeout = (uint32_t)(num_points * 2000) + 1000;
  } else {
    timeout = (uint32_t)pb_obj_get_int(timeout_ms_obj);
  }

  pb_type_mdrobotbase_cancel_active_motion(self);
  pb_type_mdrobotbase_motion_reset(self);

  for (size_t i = 0; i < num_points; i++) {
    self->rb->trajectory_points_x[i] = temp_x[i];
    self->rb->trajectory_points_y[i] = temp_y[i];
  }

  self->rb->trajectory_num_points = num_points;
  self->rb->trajectory_current_point_idx = 0;
  self->rb->target_speed = speed;
  self->rb->start_speed = start_speed;
  self->rb->end_speed = end_speed;
  self->rb->accel_d = accel_d;
  self->rb->decel_d = decel_d;
  self->rb->tolerance_dist = tolerance;
  self->rb->trajectory_transition_tolerance = transition_tolerance;
  self->rb->use_ramping = ramping;
  self->rb->is_backward = back;
  self->rb->stop_behavior = stop_behavior;
  self->rb->timeout_ms = timeout;

  self->rb->trajectory_seg_start_x = self->rb->x;
  self->rb->trajectory_seg_start_y = self->rb->y;

  self->rb->start_time_ms = pbdrv_clock_get_ms();
  self->rb->last_step_time_ms = self->rb->start_time_ms;
  self->rb->motion_type = PBIO_MDROBOTBASE_MOTION_TRAJECTORY;
  pb_type_mdrobotbase_motion_start(self);

  return pb_type_mdrobotbase_wait_or_await(self);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_follow_trajectory_obj, 1,
                                  pb_type_MDRobotBase_follow_trajectory);

// pybricks.robotics.MDRobotBase.set_backlash_filter
static mp_obj_t pb_type_MDRobotBase_set_backlash_filter(mp_obj_t self_in,
                                                        mp_obj_t enabled_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  bool enabled = mp_obj_is_true(enabled_in);
  pb_assert(pbio_mdrobotbase_set_backlash_filter(self->rb, enabled));
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_2(pb_type_MDRobotBase_set_backlash_filter_obj,
                                 pb_type_MDRobotBase_set_backlash_filter);

// pybricks.robotics.MDRobotBase.get_backlash_filter
static mp_obj_t pb_type_MDRobotBase_get_backlash_filter(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  bool enabled = false;
  pb_assert(pbio_mdrobotbase_get_backlash_filter(self->rb, &enabled));
  return mp_obj_new_bool(enabled);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_backlash_filter_obj,
                                 pb_type_MDRobotBase_get_backlash_filter);

// pybricks.robotics.MDRobotBase.set_backlash_limits
static mp_obj_t
pb_type_MDRobotBase_set_backlash_limits(size_t n_args, const mp_obj_t *pos_args,
                                        mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                       self, PB_ARG_REQUIRED(left_limit),
                       PB_ARG_REQUIRED(right_limit));
  pb_type_mdrobotbase_require_open(self);

  float left = mp_obj_get_float(left_limit_in);
  float right = mp_obj_get_float(right_limit_in);

  pb_assert(pbio_mdrobotbase_set_backlash_limits(self->rb, left, right));

  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_backlash_limits_obj,
                                  1, pb_type_MDRobotBase_set_backlash_limits);

// pybricks.robotics.MDRobotBase.get_backlash_limits
static mp_obj_t pb_type_MDRobotBase_get_backlash_limits(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float left = 0.0f;
  float right = 0.0f;
  pb_assert(pbio_mdrobotbase_get_backlash_limits(self->rb, &left, &right));
  mp_obj_t limits[2] = {mp_obj_new_float_from_f(left),
                        mp_obj_new_float_from_f(right)};
  return mp_obj_new_tuple(2, limits);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_backlash_limits_obj,
                                 pb_type_MDRobotBase_get_backlash_limits);

// pybricks.robotics.MDRobotBase.set_wheel_diameters
static mp_obj_t
pb_type_MDRobotBase_set_wheel_diameters(size_t n_args, const mp_obj_t *pos_args,
                                        mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                       self, PB_ARG_REQUIRED(left_diameter),
                       PB_ARG_REQUIRED(right_diameter));
  pb_type_mdrobotbase_require_open(self);

  #if MICROPY_PY_BUILTINS_FLOAT
  if (mp_obj_is_float(left_diameter_in)) {
    mp_float_t val = mp_obj_get_float(left_diameter_in);
    if (!isfinite(val) || val <= 0.0f) {
      mp_raise_ValueError(MP_ERROR_TEXT("wheel diameter must be positive non-zero finite value"));
    }
  }
  if (mp_obj_is_float(right_diameter_in)) {
    mp_float_t val = mp_obj_get_float(right_diameter_in);
    if (!isfinite(val) || val <= 0.0f) {
      mp_raise_ValueError(MP_ERROR_TEXT("wheel diameter must be positive non-zero finite value"));
    }
  }
  #endif

  int32_t left = pb_obj_get_scaled_int(left_diameter_in, 1000);
  int32_t right = pb_obj_get_scaled_int(right_diameter_in, 1000);

  pb_assert(pbio_mdrobotbase_set_wheel_diameters(self->rb, left, right));

  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_wheel_diameters_obj,
                                  1, pb_type_MDRobotBase_set_wheel_diameters);

// pybricks.robotics.MDRobotBase.get_wheel_diameters
static mp_obj_t pb_type_MDRobotBase_get_wheel_diameters(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  int32_t left = 0;
  int32_t right = 0;
  pb_assert(pbio_mdrobotbase_get_wheel_diameters(self->rb, &left, &right));
  mp_obj_t diams[2] = {mp_obj_new_float((float)left / 1000.0f),
                       mp_obj_new_float((float)right / 1000.0f)};
  return mp_obj_new_tuple(2, diams);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_wheel_diameters_obj,
                                 pb_type_MDRobotBase_get_wheel_diameters);

// pybricks.robotics.MDRobotBase.set_max_angular_speed
static mp_obj_t pb_type_MDRobotBase_set_max_angular_speed(mp_obj_t self_in,
                                                          mp_obj_t speed_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float speed = mp_obj_get_float(speed_in);
  pb_assert(pbio_mdrobotbase_set_max_angular_speed(self->rb, speed));
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_2(pb_type_MDRobotBase_set_max_angular_speed_obj,
                                 pb_type_MDRobotBase_set_max_angular_speed);

// pybricks.robotics.MDRobotBase.get_max_angular_speed
static mp_obj_t pb_type_MDRobotBase_get_max_angular_speed(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float speed;
  pb_assert(pbio_mdrobotbase_get_max_angular_speed(self->rb, &speed));
  return mp_obj_new_float(speed);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_max_angular_speed_obj,
                                 pb_type_MDRobotBase_get_max_angular_speed);

// pybricks.robotics.MDRobotBase.set_max_turn_speed
static mp_obj_t pb_type_MDRobotBase_set_max_turn_speed(mp_obj_t self_in,
                                                       mp_obj_t speed_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float speed = mp_obj_get_float(speed_in);
  pb_assert(pbio_mdrobotbase_set_max_turn_speed(self->rb, speed));
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_2(pb_type_MDRobotBase_set_max_turn_speed_obj,
                                 pb_type_MDRobotBase_set_max_turn_speed);

// pybricks.robotics.MDRobotBase.get_max_turn_speed
static mp_obj_t pb_type_MDRobotBase_get_max_turn_speed(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float speed;
  pb_assert(pbio_mdrobotbase_get_max_turn_speed(self->rb, &speed));
  return mp_obj_new_float(speed);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_max_turn_speed_obj,
                                 pb_type_MDRobotBase_get_max_turn_speed);

// pybricks.robotics.MDRobotBase.set_max_pivot_speed
static mp_obj_t pb_type_MDRobotBase_set_max_pivot_speed(mp_obj_t self_in,
                                                        mp_obj_t speed_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float speed = mp_obj_get_float(speed_in);
  pb_assert(pbio_mdrobotbase_set_max_pivot_speed(self->rb, speed));
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_2(pb_type_MDRobotBase_set_max_pivot_speed_obj,
                                 pb_type_MDRobotBase_set_max_pivot_speed);

// pybricks.robotics.MDRobotBase.get_max_pivot_speed
static mp_obj_t pb_type_MDRobotBase_get_max_pivot_speed(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  float speed;
  pb_assert(pbio_mdrobotbase_get_max_pivot_speed(self->rb, &speed));
  return mp_obj_new_float(speed);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_get_max_pivot_speed_obj,
                                 pb_type_MDRobotBase_get_max_pivot_speed);

// pybricks.robotics.MDRobotBase.__init__
static mp_obj_t pb_type_MDRobotBase_make_new(const mp_obj_type_t *type,
                                             size_t n_args, size_t n_kw,
                                             const mp_obj_t *args) {
  PB_PARSE_ARGS_CLASS(n_args, n_kw, args, PB_ARG_REQUIRED(left_motor),
                      PB_ARG_REQUIRED(right_motor),
                      PB_ARG_REQUIRED(wheel_diameter_left),
                      PB_ARG_REQUIRED(wheel_diameter_right),
                      PB_ARG_REQUIRED(axle_track), PB_ARG_DEFAULT_FALSE(debug));

  if (left_motor_in == right_motor_in) {
    mp_raise_ValueError(MP_ERROR_TEXT("left and right motors must be distinct"));
  }

  #if MICROPY_PY_BUILTINS_FLOAT
  if (mp_obj_is_float(wheel_diameter_left_in)) {
    mp_float_t val = mp_obj_get_float(wheel_diameter_left_in);
    if (!isfinite(val) || val <= 0.0f) {
      mp_raise_ValueError(MP_ERROR_TEXT("wheel diameter and axle track must be positive non-zero finite values"));
    }
  }
  if (mp_obj_is_float(wheel_diameter_right_in)) {
    mp_float_t val = mp_obj_get_float(wheel_diameter_right_in);
    if (!isfinite(val) || val <= 0.0f) {
      mp_raise_ValueError(MP_ERROR_TEXT("wheel diameter and axle track must be positive non-zero finite values"));
    }
  }
  if (mp_obj_is_float(axle_track_in)) {
    mp_float_t val = mp_obj_get_float(axle_track_in);
    if (!isfinite(val) || val <= 0.0f) {
      mp_raise_ValueError(MP_ERROR_TEXT("wheel diameter and axle track must be positive non-zero finite values"));
    }
  }
  #endif

  pb_type_MDRobotBase_obj_t *self =
      mp_obj_malloc(pb_type_MDRobotBase_obj_t, type);

  pbio_servo_t *srv_left = pb_type_motor_get_servo(left_motor_in);
  pbio_servo_t *srv_right = pb_type_motor_get_servo(right_motor_in);

  pb_assert(pbio_mdrobotbase_get_robotbase(
      &self->rb, srv_left, srv_right,
      pb_obj_get_scaled_int(wheel_diameter_left_in, 1000),
      pb_obj_get_scaled_int(wheel_diameter_right_in, 1000),
      pb_obj_get_scaled_int(axle_track_in, 1000)));

  self->debug = mp_obj_is_true(debug_in);
  self->last_awaitable = NULL;

  return MP_OBJ_FROM_PTR(self);
}

// Native C Color Calibration Python API Bindings
static mp_obj_t pb_type_MDRobotBase_reset_color_calibration(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  pb_assert(pbio_mdrobotbase_color_cal_reset(self->rb));
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_reset_color_calibration_obj,
                                 pb_type_MDRobotBase_reset_color_calibration);

static mp_obj_t pb_type_MDRobotBase_set_color_baseline(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                      self,
                      PB_ARG_REQUIRED(base_h),
                      PB_ARG_REQUIRED(base_s),
                      PB_ARG_REQUIRED(base_v));
  pb_type_mdrobotbase_require_open(self);
  pb_assert(pbio_mdrobotbase_color_cal_set_baseline(
      self->rb,
      mp_obj_get_float(base_h_in),
      mp_obj_get_float(base_s_in),
      mp_obj_get_float(base_v_in)));
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_color_baseline_obj, 1,
                                  pb_type_MDRobotBase_set_color_baseline);

static mp_obj_t pb_type_MDRobotBase_set_color_threshold(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                      self,
                      PB_ARG_REQUIRED(threshold));
  pb_type_mdrobotbase_require_open(self);
  pb_assert(pbio_mdrobotbase_color_cal_set_threshold(
      self->rb,
      mp_obj_get_float(threshold_in)));
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_set_color_threshold_obj, 1,
                                  pb_type_MDRobotBase_set_color_threshold);

static mp_obj_t pb_type_MDRobotBase_add_color_prototype(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                      self,
                      PB_ARG_REQUIRED(color_id),
                      PB_ARG_REQUIRED(h),
                      PB_ARG_REQUIRED(s),
                      PB_ARG_REQUIRED(v));
  pb_type_mdrobotbase_require_open(self);
  pb_assert(pbio_mdrobotbase_color_cal_add_prototype(
      self->rb,
      (uint8_t)mp_obj_get_int(color_id_in),
      mp_obj_get_float(h_in),
      mp_obj_get_float(s_in),
      mp_obj_get_float(v_in)));
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_add_color_prototype_obj, 1,
                                  pb_type_MDRobotBase_add_color_prototype);

static mp_obj_t pb_type_MDRobotBase_classify_color(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                      self,
                      PB_ARG_REQUIRED(c1),
                      PB_ARG_REQUIRED(c2),
                      PB_ARG_REQUIRED(c3));
  pb_type_mdrobotbase_require_open(self);
  uint8_t matched_color_id = 0;
  float min_dist = 0.0f;
  float confidence = 0.0f;
  pb_assert(pbio_mdrobotbase_color_classify_rgb(
      self->rb,
      mp_obj_get_float(c1_in),
      mp_obj_get_float(c2_in),
      mp_obj_get_float(c3_in),
      &matched_color_id,
      &min_dist,
      &confidence));

  mp_obj_t tuple[3] = {
      MP_OBJ_NEW_SMALL_INT(matched_color_id),
      mp_obj_new_float(min_dist),
      mp_obj_new_float(confidence)
  };
  return mp_obj_new_tuple(3, tuple);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_classify_color_obj, 1,
                                  pb_type_MDRobotBase_classify_color);

static mp_obj_t pb_type_MDRobotBase_classify_color_rgb(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                      self,
                      PB_ARG_REQUIRED(r),
                      PB_ARG_REQUIRED(g),
                      PB_ARG_REQUIRED(b));
  pb_type_mdrobotbase_require_open(self);
  uint8_t matched_color_id = 0;
  float min_dist = 0.0f;
  float confidence = 0.0f;
  pb_assert(pbio_mdrobotbase_color_classify_rgb(
      self->rb,
      mp_obj_get_float(r_in),
      mp_obj_get_float(g_in),
      mp_obj_get_float(b_in),
      &matched_color_id,
      &min_dist,
      &confidence));

  mp_obj_t tuple[3] = {
      MP_OBJ_NEW_SMALL_INT(matched_color_id),
      mp_obj_new_float(min_dist),
      mp_obj_new_float(confidence)
  };
  return mp_obj_new_tuple(3, tuple);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_classify_color_rgb_obj, 1,
                                  pb_type_MDRobotBase_classify_color_rgb);

static mp_obj_t pb_type_MDRobotBase_classify_color_hsv(size_t n_args, const mp_obj_t *pos_args, mp_map_t *kw_args) {
  PB_PARSE_ARGS_METHOD(n_args, pos_args, kw_args, pb_type_MDRobotBase_obj_t,
                      self,
                      PB_ARG_REQUIRED(h),
                      PB_ARG_REQUIRED(s),
                      PB_ARG_REQUIRED(v));
  pb_type_mdrobotbase_require_open(self);
  uint8_t matched_color_id = 0;
  float min_dist = 0.0f;
  float confidence = 0.0f;
  pb_assert(pbio_mdrobotbase_color_classify_hsv(
      self->rb,
      mp_obj_get_float(h_in),
      mp_obj_get_float(s_in),
      mp_obj_get_float(v_in),
      &matched_color_id,
      &min_dist,
      &confidence));

  mp_obj_t tuple[3] = {
      MP_OBJ_NEW_SMALL_INT(matched_color_id),
      mp_obj_new_float(min_dist),
      mp_obj_new_float(confidence)
  };
  return mp_obj_new_tuple(3, tuple);
}
static MP_DEFINE_CONST_FUN_OBJ_KW(pb_type_MDRobotBase_classify_color_hsv_obj, 1,
                                  pb_type_MDRobotBase_classify_color_hsv);

// Finalizer and slot reclamation
static mp_obj_t pb_type_MDRobotBase_close(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  if (self->rb) {
    pb_type_mdrobotbase_cancel_active_motion(self);
    pbio_mdrobotbase_put_robotbase(self->rb);
    self->rb = NULL;
  }
  return mp_const_none;
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_close_obj,
                                 pb_type_MDRobotBase_close);

// pybricks.robotics.MDRobotBase.stalled
static mp_obj_t pb_type_MDRobotBase_stalled(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  bool stalled = false;
  pb_assert(pbio_mdrobotbase_is_stalled(self->rb, &stalled));
  return mp_obj_new_bool(stalled);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_stalled_obj,
                                 pb_type_MDRobotBase_stalled);

// pybricks.robotics.MDRobotBase.done
static mp_obj_t pb_type_MDRobotBase_done(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  bool done = true;
  pb_assert(pbio_mdrobotbase_is_done(self->rb, &done));
  return mp_obj_new_bool(done);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_done_obj,
                                 pb_type_MDRobotBase_done);

// pybricks.robotics.MDRobotBase.status
static mp_obj_t pb_type_MDRobotBase_status(mp_obj_t self_in) {
  pb_type_MDRobotBase_obj_t *self = MP_OBJ_TO_PTR(self_in);
  pb_type_mdrobotbase_require_open(self);
  pbio_mdrobotbase_motion_status_t status = PBIO_MDROBOTBASE_STATUS_NONE;
  pb_assert(pbio_mdrobotbase_get_motion_status(self->rb, &status));
  return MP_OBJ_NEW_SMALL_INT(status);
}
static MP_DEFINE_CONST_FUN_OBJ_1(pb_type_MDRobotBase_status_obj,
                                 pb_type_MDRobotBase_status);

// locals dict elements
static const mp_rom_map_elem_t pb_type_MDRobotBase_locals_dict_table[] = {
    {MP_ROM_QSTR(MP_QSTR___del__),
     MP_ROM_PTR(&pb_type_MDRobotBase_close_obj)},
    {MP_ROM_QSTR(MP_QSTR_close),
     MP_ROM_PTR(&pb_type_MDRobotBase_close_obj)},
    {MP_ROM_QSTR(MP_QSTR_stalled),
     MP_ROM_PTR(&pb_type_MDRobotBase_stalled_obj)},
    {MP_ROM_QSTR(MP_QSTR_done),
     MP_ROM_PTR(&pb_type_MDRobotBase_done_obj)},
    {MP_ROM_QSTR(MP_QSTR_status),
     MP_ROM_PTR(&pb_type_MDRobotBase_status_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_lqr_gains),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_lqr_gains_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_lqr_gains),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_lqr_gains_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_controller),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_controller_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_controller),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_controller_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_pid_gains),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_pid_gains_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_pid_gains),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_pid_gains_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_turn_pid_gains),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_turn_pid_gains_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_turn_pid_gains),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_turn_pid_gains_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_pivot_pid_gains),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_pivot_pid_gains_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_pivot_pid_gains),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_pivot_pid_gains_obj)},
    {MP_ROM_QSTR(MP_QSTR_reset_state),
     MP_ROM_PTR(&pb_type_MDRobotBase_reset_state_obj)},
    {MP_ROM_QSTR(MP_QSTR_update_state),
     MP_ROM_PTR(&pb_type_MDRobotBase_update_state_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_state),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_state_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_fusion_alpha),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_fusion_alpha_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_fusion_alpha),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_fusion_alpha_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_gear_ratio),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_gear_ratio_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_gear_ratio),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_gear_ratio_obj)},
    {MP_ROM_QSTR(MP_QSTR_navigate_to_goal),
     MP_ROM_PTR(&pb_type_MDRobotBase_navigate_to_goal_obj)},
    {MP_ROM_QSTR(MP_QSTR_go_forward),
     MP_ROM_PTR(&pb_type_MDRobotBase_go_forward_obj)},
    {MP_ROM_QSTR(MP_QSTR_go_backward),
     MP_ROM_PTR(&pb_type_MDRobotBase_go_backward_obj)},
    {MP_ROM_QSTR(MP_QSTR_turn_to_angle),
     MP_ROM_PTR(&pb_type_MDRobotBase_turn_to_angle_obj)},
    {MP_ROM_QSTR(MP_QSTR_turn_angle),
     MP_ROM_PTR(&pb_type_MDRobotBase_turn_angle_obj)},
    {MP_ROM_QSTR(MP_QSTR_pivot_turn_to_angle),
     MP_ROM_PTR(&pb_type_MDRobotBase_pivot_turn_to_angle_obj)},
    {MP_ROM_QSTR(MP_QSTR_pivot_turn_angle),
     MP_ROM_PTR(&pb_type_MDRobotBase_pivot_turn_angle_obj)},
    {MP_ROM_QSTR(MP_QSTR_follow_trajectory),
     MP_ROM_PTR(&pb_type_MDRobotBase_follow_trajectory_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_backlash_filter),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_backlash_filter_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_backlash_filter),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_backlash_filter_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_backlash_limits),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_backlash_limits_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_backlash_limits),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_backlash_limits_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_max_angular_speed),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_max_angular_speed_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_max_angular_speed),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_max_angular_speed_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_max_turn_speed),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_max_turn_speed_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_max_turn_speed),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_max_turn_speed_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_max_pivot_speed),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_max_pivot_speed_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_max_pivot_speed),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_max_pivot_speed_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_pid_min_turn),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_pid_min_turn_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_pid_min_turn),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_pid_min_turn_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_wheel_diameters),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_wheel_diameters_obj)},
    {MP_ROM_QSTR(MP_QSTR_get_wheel_diameters),
     MP_ROM_PTR(&pb_type_MDRobotBase_get_wheel_diameters_obj)},
    {MP_ROM_QSTR(MP_QSTR_reset_color_calibration),
     MP_ROM_PTR(&pb_type_MDRobotBase_reset_color_calibration_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_color_baseline),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_color_baseline_obj)},
    {MP_ROM_QSTR(MP_QSTR_set_color_threshold),
     MP_ROM_PTR(&pb_type_MDRobotBase_set_color_threshold_obj)},
    {MP_ROM_QSTR(MP_QSTR_add_color_prototype),
     MP_ROM_PTR(&pb_type_MDRobotBase_add_color_prototype_obj)},
    {MP_ROM_QSTR(MP_QSTR_classify_color),
     MP_ROM_PTR(&pb_type_MDRobotBase_classify_color_obj)},
    {MP_ROM_QSTR(MP_QSTR_classify_color_rgb),
     MP_ROM_PTR(&pb_type_MDRobotBase_classify_color_rgb_obj)},
    {MP_ROM_QSTR(MP_QSTR_classify_color_hsv),
     MP_ROM_PTR(&pb_type_MDRobotBase_classify_color_hsv_obj)},
};
static MP_DEFINE_CONST_DICT(pb_type_MDRobotBase_locals_dict,
                            pb_type_MDRobotBase_locals_dict_table);

// type definition structure
MP_DEFINE_CONST_OBJ_TYPE(pb_type_MDRobotBase, MP_QSTR_MDRobotBase,
                         MP_TYPE_FLAG_NONE, make_new,
                         pb_type_MDRobotBase_make_new, locals_dict,
                         &pb_type_MDRobotBase_locals_dict);

#endif // PYBRICKS_PY_ROBOTICS && PYBRICKS_PY_COMMON_MOTORS
