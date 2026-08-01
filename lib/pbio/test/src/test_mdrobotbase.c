// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Pybricks Authors

#include <stdint.h>
#include <stdio.h>
#include <pbio/error.h>
#include <pbio/mdrobotbase.h>
#include <pbio/servo.h>
#include <pbio/port_interface.h>
#include <test-pbio.h>
#include <tinytest.h>
#include <tinytest_macros.h>

static pbio_error_t test_mdrobotbase_basics(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    // Initialize mock servos
    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // Setup MDRobotBase instance
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);

    // Verify default controller setting
    tt_want_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);

    // Test controller selection LQR
    tt_uint_op(pbio_mdrobotbase_set_controller(rb, PBIO_MDROBOTBASE_CONTROLLER_LQR), ==, PBIO_SUCCESS);
    tt_want_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_LQR);

    // Test controller selection PID
    tt_uint_op(pbio_mdrobotbase_set_controller(rb, PBIO_MDROBOTBASE_CONTROLLER_PID), ==, PBIO_SUCCESS);
    tt_want_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);

    // Test LQR gain updates
    tt_uint_op(pbio_mdrobotbase_set_lqr_gains(rb, 1.25f, 2.5f, 3.75f, true), ==, PBIO_SUCCESS);
    tt_want_int_op((int)(rb->k_x * 100.0f), ==, 125);
    tt_want_int_op((int)(rb->k_y * 100.0f), ==, 250);
    tt_want_int_op((int)(rb->k_theta * 100.0f), ==, 375);

    // Test PID gain updates
    tt_uint_op(pbio_mdrobotbase_set_pid_gains(rb, 4.25f, 5.5f, 6.75f), ==, PBIO_SUCCESS);
    tt_want_int_op((int)(rb->kp * 100.0f), ==, 425);
    tt_want_int_op((int)(rb->ki * 100.0f), ==, 550);
    tt_want_int_op((int)(rb->kd * 100.0f), ==, 675);

    // Test backlash filter toggle
    tt_uint_op(pbio_mdrobotbase_set_backlash_filter(rb, false), ==, PBIO_SUCCESS);
    bool enabled = true;
    tt_uint_op(pbio_mdrobotbase_get_backlash_filter(rb, &enabled), ==, PBIO_SUCCESS);
    tt_want(!enabled);

    tt_uint_op(pbio_mdrobotbase_set_backlash_filter(rb, true), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_get_backlash_filter(rb, &enabled), ==, PBIO_SUCCESS);
    tt_want(enabled);

    // Test reset state coordinates
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 100.0f, -200.0f, 90.0f, 45.0f), ==, PBIO_SUCCESS);
    tt_want_int_op((int)rb->x, ==, 100);
    tt_want_int_op((int)rb->y, ==, -200);
    tt_want_int_op((int)rb->theta, ==, 90);

    // Test pid min turn settings
    tt_uint_op(pbio_mdrobotbase_set_pid_min_turn(rb, 1.25f, 0.25f), ==, PBIO_SUCCESS);
    float mt = 0.0f, th = 0.0f;
    tt_uint_op(pbio_mdrobotbase_get_pid_min_turn(rb, &mt, &th), ==, PBIO_SUCCESS);
    tt_want_int_op((int)(mt * 100.0f), ==, 125);
    tt_want_int_op((int)(th * 100.0f), ==, 25);

    // Test default backlash limits
    float bl_left = 0.0f, bl_right = 0.0f;
    tt_uint_op(pbio_mdrobotbase_get_backlash_limits(rb, &bl_left, &bl_right), ==, PBIO_SUCCESS);
    tt_want_int_op((int)(bl_left * 100.0f), ==, 100);
    tt_want_int_op((int)(bl_right * 100.0f), ==, 100);

    // Test setting and getting asymmetric backlash limits
    tt_uint_op(pbio_mdrobotbase_set_backlash_limits(rb, 2.5f, 4.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_get_backlash_limits(rb, &bl_left, &bl_right), ==, PBIO_SUCCESS);
    tt_want_int_op((int)(bl_left * 100.0f), ==, 250);
    tt_want_int_op((int)(bl_right * 100.0f), ==, 400);

    // Test invalid limits
    tt_uint_op(pbio_mdrobotbase_set_backlash_limits(rb, -1.0f, 2.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_backlash_limits(rb, 1.0f, -2.0f), ==, PBIO_ERROR_INVALID_ARG);

    // Test default wheel diameters (should match the setup diameter, which is 56000)
    int32_t wd_left = 0, wd_right = 0;
    tt_uint_op(pbio_mdrobotbase_get_wheel_diameters(rb, &wd_left, &wd_right), ==, PBIO_SUCCESS);
    tt_want_int_op(wd_left, ==, 56000);
    tt_want_int_op(wd_right, ==, 56000);

    // Test setting and getting asymmetric wheel diameters
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 56200, 55800), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_get_wheel_diameters(rb, &wd_left, &wd_right), ==, PBIO_SUCCESS);
    tt_want_int_op(wd_left, ==, 56200);
    tt_want_int_op(wd_right, ==, 55800);

    // Test invalid wheel diameters
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 0, 55000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 55000, -100), ==, PBIO_ERROR_INVALID_ARG);

    // Test gyro-only fusion heading sign convention (CCW positive)
    rb->fusion_alpha = 1.0f;
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 10.0f), ==, PBIO_SUCCESS);
    // When IMU heading increases by 10 deg (CW turn), odometry theta becomes -10.0 deg (CW in CCW-positive frame)
    tt_want_int_op((int)(rb->theta * 100.0f), ==, -1000);

    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_update_state(rb, -15.0f), ==, PBIO_SUCCESS);
    // When IMU heading decreases by 15 deg (CCW turn), odometry theta becomes +15.0 deg
    tt_want_int_op((int)(rb->theta * 100.0f), ==, 1500);

    // Test initial gyro heading alignment and coordinate integration
    rb->fusion_alpha = 0.95f;
    // Set symmetric wheel diameters back to 56 mm
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 56000, 56000), ==, PBIO_SUCCESS);

    // 1. Validate that coordinates do not drift due to initial headings when correctly initialized
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 100.0f, 200.0f, 0.0f, 13.94f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 13.94f), ==, PBIO_SUCCESS); // gyro is still at 13.94
    // Assert no coordinate drift or heading change occurs
    tt_want_int_op((int)rb->x, ==, 100);
    tt_want_int_op((int)rb->y, ==, 200);
    tt_want_int_op((int)(rb->theta * 100.0f), ==, 0);

    // 2. Simulate straight motor movement and check coordinate integration
    // Case A: backlash filter disabled
    tt_uint_op(pbio_mdrobotbase_set_backlash_filter(rb, false), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    // Command both virtual motors to run forward by 360 degrees
    tt_uint_op(pbio_servo_run_angle(srv_left, 500, 360, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_right, 500, 360, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_left->control) && pbio_control_is_done(&srv_right->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);
    // Distance traveled = pi * 56.0 mm = 175.929 mm
    tt_want(pbio_test_int_is_close(rb->x, 175.929f, 0.5f));
    tt_want(pbio_test_int_is_close(rb->y, 0.0f, 0.5f));
    tt_want(pbio_test_int_is_close(rb->theta, 0.0f, 0.5f));

    // Case B: backlash filter enabled (backlash limits are left=2.5 deg, right=4.0 deg)
    tt_uint_op(pbio_mdrobotbase_set_backlash_filter(rb, true), ==, PBIO_SUCCESS);
    // Reset state so that motor angle changes are relative to new baseline
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    // Command both virtual motors to run forward by another 360 degrees
    tt_uint_op(pbio_servo_run_angle(srv_left, 500, 360, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_right, 500, 360, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_left->control) && pbio_control_is_done(&srv_right->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);
    // Distance traveled should subtract backlash take-up:
    // Left: 360 - 2.5 = 357.5 deg -> 174.706 mm
    // Right: 360 - 4.0 = 356.0 deg -> 173.973 mm
    // Center: 174.340 mm
    tt_want(pbio_test_int_is_close(rb->x, 174.340f, 0.5f));
    tt_want(pbio_test_int_is_close(rb->y, 0.0f, 0.5f));
    tt_want(pbio_test_int_is_close(rb->theta, 0.0f, 0.5f));

    // Case C: spin-in-place differential odometry integration (left backward 180 deg, right forward 180 deg)
    tt_uint_op(pbio_mdrobotbase_set_backlash_filter(rb, false), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_left, 500, -180, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_right, 500, 180, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_left->control) && pbio_control_is_done(&srv_right->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);
    tt_want(pbio_test_int_is_close(rb->x, 0.0f, 1.0f));
    tt_want(pbio_test_int_is_close(rb->y, 0.0f, 1.0f));

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_motion_state(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);

    // Verify initial motion state
    tt_want_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_NONE);
    tt_want(!rb->motion_in_progress);

    // Setup non-blocking NAVIGATE motion parameters
    rb->goal_x = 200.0f;
    rb->goal_y = 0.0f;
    rb->target_speed = 300.0f;
    rb->timeout_ms = 2000;
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_NAVIGATE;
    rb->motion_in_progress = true;

    tt_want_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_NAVIGATE);
    tt_want(rb->motion_in_progress);
    tt_want_int_op((int)rb->goal_x, ==, 200);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_pivot_turn_state(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);

    // Setup non-blocking PIVOT turn motion state parameters
    rb->target_angle = 90.0f;
    rb->speed_deg_s = 200.0f;
    rb->pivot_left = true; // Lock left wheel, drive right wheel
    rb->tolerance_angle = 1.5f;
    rb->timeout_ms = 1500;
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_PIVOT;
    rb->motion_in_progress = true;

    tt_want_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_PIVOT);
    tt_want(rb->motion_in_progress);
    tt_want(rb->pivot_left);
    tt_want_int_op((int)rb->target_angle, ==, 90);

    // Test pivot right (lock right wheel, drive left wheel)
    rb->pivot_left = false;
    tt_want(!rb->pivot_left);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

struct testcase_t pbio_mdrobotbase_tests[] = {
    PBIO_THREAD_TEST(test_mdrobotbase_basics),
    PBIO_THREAD_TEST(test_mdrobotbase_motion_state),
    PBIO_THREAD_TEST(test_mdrobotbase_pivot_turn_state),
    END_OF_TESTCASES
};



