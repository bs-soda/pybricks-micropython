// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Pybricks Authors

#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
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

    // Initialize concrete test servos
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

static pbio_error_t test_mdrobotbase_instance_ownership(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_a, *srv_b, *srv_c, *srv_e, *srv_f;
    static pbio_mdrobotbase_t *rb1, *rb2, *rb3, *rb4, *rb1_re;
    static pbio_port_t *port;
    static pbio_mdrobotbase_t foreign_rb;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id;

    // Setup 5 encoded servos on ports A, B, C, E, F
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_a), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_a, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_b), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_b, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_C, &port), ==, PBIO_SUCCESS);
    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_c), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_c, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_E, &port), ==, PBIO_SUCCESS);
    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_e), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_e, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_F, &port), ==, PBIO_SUCCESS);
    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_f, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // 1. Dual Independent Robot Instances Allocation
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb1, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb2, srv_c, srv_e, 56000, 56000, 112000), ==, PBIO_SUCCESS);

    // Verify distinct memory pointers
    tt_ptr_op(rb1, !=, rb2);

    // 2. State & Controller Independence
    tt_uint_op(pbio_mdrobotbase_set_controller(rb1, PBIO_MDROBOTBASE_CONTROLLER_LQR), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_set_controller(rb2, PBIO_MDROBOTBASE_CONTROLLER_PID), ==, PBIO_SUCCESS);
    tt_want_int_op(rb1->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_LQR);
    tt_want_int_op(rb2->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);

    // Mutate state on robot 1 and verify robot 2 remains uncontaminated
    tt_uint_op(pbio_mdrobotbase_reset_state(rb1, 100.0f, 200.0f, 90.0f, 90.0f), ==, PBIO_SUCCESS);
    tt_want_int_op((int)rb1->x, ==, 100);
    tt_want_int_op((int)rb1->y, ==, 200);
    tt_want_int_op((int)rb2->x, ==, 0);
    tt_want_int_op((int)rb2->y, ==, 0);

    // 3. Duplicate Motor-Pair Rejection (identical servos fail with PBIO_ERROR_BUSY)
    rb1_re = NULL;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb1_re, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_ERROR_BUSY);
    tt_ptr_op(rb1_re, ==, NULL);

    // 3b. Partial Motor Overlap Rejection (cross-pair sharing fails with PBIO_ERROR_BUSY)
    rb3 = NULL;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb3, srv_b, srv_f, 56000, 56000, 112000), ==, PBIO_ERROR_BUSY);
    tt_ptr_op(rb3, ==, NULL);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb3, srv_f, srv_a, 56000, 56000, 112000), ==, PBIO_ERROR_BUSY);
    tt_ptr_op(rb3, ==, NULL);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb3, srv_c, srv_f, 56000, 56000, 112000), ==, PBIO_ERROR_BUSY);
    tt_ptr_op(rb3, ==, NULL);

    // 4. Capacity Exhaustion (allocating beyond declared pool capacity fails with PBIO_ERROR_BUSY)
    rb4 = NULL;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb4, srv_f, srv_a, 56000, 56000, 112000), ==, PBIO_ERROR_BUSY);
    tt_ptr_op(rb4, ==, NULL);

    // 5. Invalid Deallocation Pointer Handling
    tt_uint_op(pbio_mdrobotbase_put_robotbase(NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_put_robotbase(&foreign_rb), ==, PBIO_ERROR_INVALID_ARG);

    // 6. Slot Deallocation and Deterministic Reuse
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb1), ==, PBIO_SUCCESS);
    // Double release should fail
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb1), ==, PBIO_ERROR_INVALID_ARG);

    // Now slot 0 is free and motors A/B are released. Allocation of robot with A/F succeeds and reuses slot 0
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb4, srv_a, srv_f, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_ptr_op(rb4, ==, rb1);

    // Clean up remaining allocated slots
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb4), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb2), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_state_initialization(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_a;
    static pbio_servo_t *srv_b;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_a), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_a, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_b), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_b, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // 1. Fresh Instance Complete Default Initialization
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_want_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);

    // Check pivot gains default to (1.0, 0.0, 0.0)
    tt_want_int_op((int)(rb->kp_pivot * 100.0f), ==, 100);
    tt_want_int_op((int)(rb->ki_pivot * 100.0f), ==, 0);
    tt_want_int_op((int)(rb->kd_pivot * 100.0f), ==, 0);

    // Check transient motion state is strictly 0
    tt_want_int_op((int)rb->stall_time_ms, ==, 0);
    tt_want_int_op((int)rb->turn_integral, ==, 0);
    tt_want_int_op((int)rb->dist_traveled, ==, 0);
    tt_want(rb->motion_in_progress == false);
    tt_want_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_NONE);

    // Check trajectory state is zeroed
    tt_want_int_op(rb->trajectory_num_points, ==, 0);
    tt_want_int_op(rb->trajectory_current_point_idx, ==, 0);
    tt_want(rb->trajectory_final_segment_started == false);

    // Check color calibration state is zeroed
    tt_want_int_op(rb->color_cal.num_prototypes, ==, 0);
    tt_want(rb->color_cal.is_calibrated == false);

    // 2. Transient Motion State Reset Helper Test
    rb->stall_time_ms = 500.0f;
    rb->turn_integral = 25.0f;
    rb->dist_traveled = 1234.0f;
    rb->target_speed_for_ramping = 350.0f;
    rb->trajectory_num_points = 5;
    rb->trajectory_current_point_idx = 2;
    rb->trajectory_final_segment_started = true;
    rb->motion_in_progress = true;
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_TURN;

    // Call motion reset helper
    tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
    tt_want_int_op((int)rb->stall_time_ms, ==, 0);
    tt_want_int_op((int)rb->turn_integral, ==, 0);
    tt_want_int_op((int)rb->dist_traveled, ==, 0);
    tt_want_int_op((int)rb->target_speed_for_ramping, ==, 0);
    tt_want_int_op(rb->trajectory_num_points, ==, 0);
    tt_want_int_op(rb->trajectory_current_point_idx, ==, 0);
    tt_want(rb->trajectory_final_segment_started == false);
    tt_want(rb->motion_in_progress == false);
    tt_want_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_NONE);

    // Verify persistent configuration is preserved
    tt_want_int_op((int)(rb->kp_pivot * 100.0f), ==, 100);
    tt_want_int_op(rb->wheel_diameter_left, ==, 56000);
    tt_want_int_op(rb->axle_track, ==, 112000);

    // 3. Dirty Memory (0xFF Pattern) Re-initialization Hygiene Test
    memset(rb, 0xff, sizeof(pbio_mdrobotbase_t));
    tt_uint_op(pbio_mdrobotbase_init(rb, srv_a, srv_b, 62400, 62400, 120000), ==, PBIO_SUCCESS);

    // Verify complete cleanliness across struct
    tt_want_ptr_op(rb->left, ==, srv_a);
    tt_want_ptr_op(rb->right, ==, srv_b);
    tt_want_int_op(rb->wheel_diameter_left, ==, 62400);
    tt_want_int_op(rb->wheel_diameter_right, ==, 62400);
    tt_want_int_op(rb->axle_track, ==, 120000);
    tt_want_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);
    tt_want_int_op((int)(rb->kp * 100.0f), ==, 100);
    tt_want_int_op((int)(rb->ki * 100.0f), ==, 0);
    tt_want_int_op((int)(rb->kd * 100.0f), ==, 0);
    tt_want_int_op((int)(rb->kp_turn * 100.0f), ==, 100);
    tt_want_int_op((int)(rb->ki_turn * 100.0f), ==, 0);
    tt_want_int_op((int)(rb->kd_turn * 100.0f), ==, 0);
    tt_want_int_op((int)(rb->kp_pivot * 100.0f), ==, 100);
    tt_want_int_op((int)(rb->ki_pivot * 100.0f), ==, 0);
    tt_want_int_op((int)(rb->kd_pivot * 100.0f), ==, 0);
    tt_want_int_op((int)rb->stall_time_ms, ==, 0);
    tt_want_int_op((int)rb->turn_integral, ==, 0);
    tt_want_int_op((int)rb->dist_traveled, ==, 0);
    tt_want_int_op(rb->trajectory_num_points, ==, 0);
    tt_want_int_op(rb->trajectory_current_point_idx, ==, 0);
    tt_want(rb->trajectory_final_segment_started == false);
    tt_want_int_op(rb->color_cal.num_prototypes, ==, 0);
    tt_want(rb->color_cal.is_calibrated == false);
    tt_want(rb->motion_in_progress == false);
    tt_want_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_NONE);

    // 4. NULL Pointer & Invalid Argument Fail-Closed Safety
    tt_uint_op(pbio_mdrobotbase_init(NULL, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_init(rb, NULL, srv_b, 56000, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_init(rb, srv_a, NULL, 56000, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_motion_reset(NULL), ==, PBIO_ERROR_INVALID_ARG);

    // Release allocated robot base
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_geometry_validation(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_a;
    static pbio_servo_t *srv_b;
    static pbio_mdrobotbase_t *rb;
    static pbio_mdrobotbase_t dummy_rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_a), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_a, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_b), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_b, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // 1. Motor Aliasing Rejection (srv_a == srv_a)
    rb = (pbio_mdrobotbase_t *)0x1234;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_a, 56000, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_want_ptr_op(rb, ==, NULL);
    tt_uint_op(pbio_mdrobotbase_init(&dummy_rb, srv_a, srv_a, 56000, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);

    // 2. Non-Positive Wheel Diameters Rejection
    // Left diameter <= 0
    rb = (pbio_mdrobotbase_t *)0x1234;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 0, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_want_ptr_op(rb, ==, NULL);
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, -56000, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_want_ptr_op(rb, ==, NULL);
    tt_uint_op(pbio_mdrobotbase_init(&dummy_rb, srv_a, srv_b, 0, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_init(&dummy_rb, srv_a, srv_b, -56000, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);

    // Right diameter <= 0
    rb = (pbio_mdrobotbase_t *)0x1234;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 0, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_want_ptr_op(rb, ==, NULL);
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, -56000, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_want_ptr_op(rb, ==, NULL);
    tt_uint_op(pbio_mdrobotbase_init(&dummy_rb, srv_a, srv_b, 56000, 0, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_init(&dummy_rb, srv_a, srv_b, 56000, -56000, 112000), ==, PBIO_ERROR_INVALID_ARG);

    // 3. Non-Positive Axle Track Rejection
    rb = (pbio_mdrobotbase_t *)0x1234;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, 0), ==, PBIO_ERROR_INVALID_ARG);
    tt_want_ptr_op(rb, ==, NULL);
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, -112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_want_ptr_op(rb, ==, NULL);
    tt_uint_op(pbio_mdrobotbase_init(&dummy_rb, srv_a, srv_b, 56000, 56000, 0), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_init(&dummy_rb, srv_a, srv_b, 56000, 56000, -112000), ==, PBIO_ERROR_INVALID_ARG);

    // 4. Sanity Upper Bounds Rejection
    // Wheel diameter > 1000000 um (1m)
    rb = (pbio_mdrobotbase_t *)0x1234;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 1000001, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_want_ptr_op(rb, ==, NULL);
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 2000000, 112000), ==, PBIO_ERROR_INVALID_ARG);
    tt_want_ptr_op(rb, ==, NULL);
    tt_uint_op(pbio_mdrobotbase_init(&dummy_rb, srv_a, srv_b, 1000001, 56000, 112000), ==, PBIO_ERROR_INVALID_ARG);

    // Axle track > 5000000 um (5m)
    rb = (pbio_mdrobotbase_t *)0x1234;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, 5000001), ==, PBIO_ERROR_INVALID_ARG);
    tt_want_ptr_op(rb, ==, NULL);
    tt_uint_op(pbio_mdrobotbase_init(&dummy_rb, srv_a, srv_b, 56000, 56000, 6000000), ==, PBIO_ERROR_INVALID_ARG);

    // 5. Valid Construction & Allocation
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_want_ptr_op(rb, !=, NULL);
    tt_want_int_op(rb->wheel_diameter_left, ==, 56000);
    tt_want_int_op(rb->wheel_diameter_right, ==, 56000);
    tt_want_int_op(rb->axle_track, ==, 112000);

    // 6. Dynamic Wheel Diameter Setter Validation
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(NULL, 60000, 60000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 0, 60000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 60000, 0), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, -60000, 60000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 60000, -60000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 1000001, 60000), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 60000, 2000000), ==, PBIO_ERROR_INVALID_ARG);

    // Verify existing dimensions remain unchanged
    tt_want_int_op(rb->wheel_diameter_left, ==, 56000);
    tt_want_int_op(rb->wheel_diameter_right, ==, 56000);

    // Valid setter update
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 62400, 62400), ==, PBIO_SUCCESS);
    tt_want_int_op(rb->wheel_diameter_left, ==, 62400);
    tt_want_int_op(rb->wheel_diameter_right, ==, 62400);

    // 7. Cleanup / Release
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_gear_ratio_kinematics(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_a;
    static pbio_servo_t *srv_b;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_a), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_a, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_b), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_b, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // Setup robot base with D = 56 mm, W = 112 mm
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_want_ptr_op(rb, !=, NULL);

    // Disable backlash filter for direct kinematic verification
    tt_uint_op(pbio_mdrobotbase_set_backlash_filter(rb, false), ==, PBIO_SUCCESS);

    // 1. Conversion Helpers & Parameter Verification
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 2.0f), ==, PBIO_SUCCESS);
    tt_want(pbio_test_int_is_close(pbio_mdrobotbase_motor_to_wheel_deg(rb, 720.0f), 360.0f, 0.001f));
    tt_want_int_op(pbio_mdrobotbase_wheel_to_motor_dps(rb, 360.0f), ==, 720);

    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 0.5f), ==, PBIO_SUCCESS);
    tt_want(pbio_test_int_is_close(pbio_mdrobotbase_motor_to_wheel_deg(rb, 180.0f), 360.0f, 0.001f));
    tt_want_int_op(pbio_mdrobotbase_wheel_to_motor_dps(rb, 360.0f), ==, 180);

    // Invalid gear ratios fail closed
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, -1.5f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 0.00001f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 2000.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(NULL, 1.0f), ==, PBIO_ERROR_INVALID_ARG);

    // 2. Multi-Ratio Straight Odometry Trials (Expected distance = pi * 56 mm = 175.929 mm)
    // Trial A: Ratio 1.0, motor rotation 360 deg
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 1.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_a, 500, 360, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_b, 500, 360, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_a->control) && pbio_control_is_done(&srv_b->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);
    tt_want(pbio_test_int_is_close(rb->x, 175.929f, 0.1f));
    tt_want(pbio_test_int_is_close(rb->y, 0.0f, 0.1f));
    tt_want(pbio_test_int_is_close(rb->theta, 0.0f, 0.1f));

    // Trial B: Ratio 2.0 (2:1 reduction), motor rotation 720 deg -> wheel rotation 360 deg
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 2.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_a, 500, 720, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_b, 500, 720, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_a->control) && pbio_control_is_done(&srv_b->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);
    tt_want(pbio_test_int_is_close(rb->x, 175.929f, 0.1f));
    tt_want(pbio_test_int_is_close(rb->y, 0.0f, 0.1f));
    tt_want(pbio_test_int_is_close(rb->theta, 0.0f, 0.1f));

    // Trial C: Ratio 0.5 (1:2 overdrive), motor rotation 180 deg -> wheel rotation 360 deg
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 0.5f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_a, 500, 180, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_b, 500, 180, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_a->control) && pbio_control_is_done(&srv_b->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);
    tt_want(pbio_test_int_is_close(rb->x, 175.929f, 0.1f));
    tt_want(pbio_test_int_is_close(rb->y, 0.0f, 0.1f));
    tt_want(pbio_test_int_is_close(rb->theta, 0.0f, 0.1f));

    // 3. Multi-Ratio In-Place Turn Odometry (Pure encoder fusion: fusion_alpha = 0.0f)
    // Left backward 720 deg, Right forward 720 deg at R = 2.0
    // d_left = -175.929 mm, d_right = +175.929 mm
    // delta_theta = (d_right - d_left) / track = 351.858 / 112 rad = 3.14159 rad = 180 deg
    rb->fusion_alpha = 0.0f;
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 2.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_a, 500, -720, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_b, 500, 720, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_a->control) && pbio_control_is_done(&srv_b->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);
    tt_want(pbio_test_int_is_close(rb->x, 0.0f, 0.5f));
    tt_want(pbio_test_int_is_close(rb->y, 0.0f, 0.5f));
    tt_want(fabsf(fabsf(rb->theta) - 180.0f) <= 0.5f);

    // Turn at R = 0.5 (180 deg motor rotation -> 360 deg wheel rotation)
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 0.5f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_a, 500, -180, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_b, 500, 180, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_a->control) && pbio_control_is_done(&srv_b->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);
    tt_want(pbio_test_int_is_close(rb->x, 0.0f, 0.5f));
    tt_want(pbio_test_int_is_close(rb->y, 0.0f, 0.5f));
    tt_want(fabsf(fabsf(rb->theta) - 180.0f) <= 0.5f);

    // Release robot base
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_motion_failure_reporting(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_a;
    static pbio_servo_t *srv_b;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_a), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_a, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_b), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_b, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // 1. Fresh Allocation Initial Status Invariant
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    pbio_mdrobotbase_motion_status_t status;
    tt_uint_op(pbio_mdrobotbase_get_motion_status(rb, &status), ==, PBIO_SUCCESS);
    tt_int_op(status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(!rb->motion_in_progress);

    // 2. Motion Status State Transition Invariants
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_get_motion_status(rb, &status), ==, PBIO_SUCCESS);
    tt_int_op(status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);

    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_TIMED_OUT), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_get_motion_status(rb, &status), ==, PBIO_SUCCESS);
    tt_int_op(status, ==, PBIO_MDROBOTBASE_STATUS_TIMED_OUT);

    // Rejection of invalid cross-terminal transition TIMED_OUT -> STALLED
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_STALLED), ==, PBIO_ERROR_INVALID_OP);

    // Restart motion, then transition to STALLED
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_STALLED), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_get_motion_status(rb, &status), ==, PBIO_SUCCESS);
    tt_int_op(status, ==, PBIO_MDROBOTBASE_STATUS_STALLED);

    // Rejection of invalid cross-terminal transition STALLED -> COMPLETED
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED), ==, PBIO_ERROR_INVALID_OP);

    // Restart motion, then transition to COMPLETED
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_get_motion_status(rb, &status), ==, PBIO_SUCCESS);
    tt_int_op(status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);

    // 3. Null Pointer Safety Checks
    tt_uint_op(pbio_mdrobotbase_get_motion_status(NULL, &status), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_get_motion_status(rb, NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_motion_status(NULL, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_ERROR_INVALID_ARG);

    // 4. Clean Lifecycle Reset After Failure
    rb->stall_time_ms = 350.0f;
    rb->turn_integral = 45.0f;
    rb->motion_in_progress = true;
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_TURN;
    rb->motion_status = PBIO_MDROBOTBASE_STATUS_STALLED;

    tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(rb->stall_time_ms == 0.0f);
    tt_want(rb->turn_integral == 0.0f);
    tt_want(!rb->motion_in_progress);
    tt_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_NONE);

    // Verify persistent configuration remained intact
    tt_int_op(rb->wheel_diameter_left, ==, 56000);
    tt_int_op(rb->wheel_diameter_right, ==, 56000);
    tt_int_op(rb->axle_track, ==, 112000);

    // 5. Subsequent Clean Motion Execution
    tt_uint_op(pbio_servo_run_angle(srv_a, 500, 180, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_b, 500, 180, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_a->control) && pbio_control_is_done(&srv_b->control));

    // Release robot base
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_lifecycle_safety(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_a;
    static pbio_servo_t *srv_b;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_a), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_a, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_b), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_b, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    // Sequence 1: Idle stop idempotence (no crash when stopping idle robot)
    tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
    tt_want(!rb->motion_in_progress);
    tt_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_NONE);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    // Calling stop/reset again is a safe no-op
    tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);

    // Sequence 2: Start -> Normal Complete
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_NAVIGATE;
    rb->motion_in_progress = true;
    rb->motion_status = PBIO_MDROBOTBASE_STATUS_RUNNING;
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);
    // Completion marks status and clears in_progress
    rb->motion_status = PBIO_MDROBOTBASE_STATUS_COMPLETED;
    rb->motion_in_progress = false;
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);

    // Sequence 3: Start Motion A -> Preempt with Motion B
    // Motion A starts
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_NAVIGATE;
    rb->motion_in_progress = true;
    rb->motion_status = PBIO_MDROBOTBASE_STATUS_RUNNING;
    // Preemption cancels Motion A and launches Motion B cleanly
    tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
    tt_want(!rb->motion_in_progress);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    // Motion B launches
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_TURN;
    rb->motion_in_progress = true;
    rb->motion_status = PBIO_MDROBOTBASE_STATUS_RUNNING;
    tt_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_TURN);
    tt_want(rb->motion_in_progress);

    // Sequence 4: Start -> Cancel/Stop
    tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
    tt_want(!rb->motion_in_progress);
    tt_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_NONE);

    // Sequence 5: Start -> Timeout
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_NAVIGATE;
    rb->motion_in_progress = true;
    rb->motion_status = PBIO_MDROBOTBASE_STATUS_RUNNING;
    rb->motion_status = PBIO_MDROBOTBASE_STATUS_TIMED_OUT;
    rb->motion_in_progress = false;
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_TIMED_OUT);
    tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);

    // Sequence 6: Start -> Stall
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_PIVOT;
    rb->motion_in_progress = true;
    rb->stall_time_ms = 400.0f;
    rb->motion_status = PBIO_MDROBOTBASE_STATUS_STALLED;
    rb->motion_in_progress = false;
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_STALLED);
    tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(rb->stall_time_ms == 0.0f);

    // Safe release
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_trajectory_controller_validation(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_a;
    static pbio_servo_t *srv_b;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_a), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_a, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_b), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_b, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    // 1. Controller Enum Validation
    // Default controller type must be PID
    tt_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);

    // Reject out-of-range positive enum (e.g. 99)
    tt_uint_op(pbio_mdrobotbase_set_controller(rb, (pbio_mdrobotbase_controller_t)99), ==, PBIO_ERROR_INVALID_ARG);
    tt_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);

    // Reject negative enum (e.g. -1)
    tt_uint_op(pbio_mdrobotbase_set_controller(rb, (pbio_mdrobotbase_controller_t)-1), ==, PBIO_ERROR_INVALID_ARG);
    tt_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);

    // Reject NULL pointer
    tt_uint_op(pbio_mdrobotbase_set_controller(NULL, PBIO_MDROBOTBASE_CONTROLLER_PID), ==, PBIO_ERROR_INVALID_ARG);

    // Accept valid LQR controller enum
    tt_uint_op(pbio_mdrobotbase_set_controller(rb, PBIO_MDROBOTBASE_CONTROLLER_LQR), ==, PBIO_SUCCESS);
    tt_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_LQR);

    // Reject invalid enum when in LQR mode (must not alter existing LQR selection)
    tt_uint_op(pbio_mdrobotbase_set_controller(rb, (pbio_mdrobotbase_controller_t)42), ==, PBIO_ERROR_INVALID_ARG);
    tt_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_LQR);

    // Accept valid PID controller enum
    tt_uint_op(pbio_mdrobotbase_set_controller(rb, PBIO_MDROBOTBASE_CONTROLLER_PID), ==, PBIO_SUCCESS);
    tt_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);

    // 2. Gain Parameters Bounds and Finiteness Validation
    // Negative PID gains rejection
    tt_uint_op(pbio_mdrobotbase_set_pid_gains(rb, -1.0f, 0.0f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_pid_gains(rb, 1.0f, -0.5f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_pid_gains(rb, 1.0f, 0.0f, -0.1f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_pid_gains(NULL, 1.0f, 0.0f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);

    // Turn PID gains rejection
    tt_uint_op(pbio_mdrobotbase_set_turn_pid_gains(rb, -0.5f, 0.0f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_turn_pid_gains(rb, 1.0f, -0.1f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_turn_pid_gains(rb, 1.0f, 0.0f, -0.05f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_turn_pid_gains(NULL, 1.0f, 0.0f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);

    // Pivot PID gains rejection
    tt_uint_op(pbio_mdrobotbase_set_pivot_pid_gains(rb, -2.0f, 0.0f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_pivot_pid_gains(rb, 1.0f, -0.2f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_pivot_pid_gains(rb, 1.0f, 0.0f, -0.1f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_pivot_pid_gains(NULL, 1.0f, 0.0f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);

    // LQR gains rejection
    tt_uint_op(pbio_mdrobotbase_set_lqr_gains(rb, -1.0f, 1.0f, 1.0f, false), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_lqr_gains(rb, 1.0f, -1.0f, 1.0f, false), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_lqr_gains(rb, 1.0f, 1.0f, -1.0f, false), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_lqr_gains(NULL, 1.0f, 1.0f, 1.0f, false), ==, PBIO_ERROR_INVALID_ARG);

    // Valid gain updates succeed
    tt_uint_op(pbio_mdrobotbase_set_pid_gains(rb, 2.5f, 0.1f, 0.05f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_set_turn_pid_gains(rb, 3.0f, 0.2f, 0.1f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_set_pivot_pid_gains(rb, 1.5f, 0.05f, 0.02f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_set_lqr_gains(rb, 0.8f, 0.9f, 0.7f, true), ==, PBIO_SUCCESS);

    // 3. Side-Effect Immunity Guarantee
    // Verify robot remains stopped with zero motion in progress after rejected calls
    tt_want(!rb->motion_in_progress);
    tt_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_NONE);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(rb->trajectory_num_points == 0);

    // Clean release
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_duplicate_motor_rejection(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_a, *srv_b, *srv_c, *srv_d;
    static pbio_mdrobotbase_t *rb1, *rb_dup, *rb2;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id;

    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_a), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_a, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_b), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_b, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_C, &port), ==, PBIO_SUCCESS);
    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_c), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_c, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_E, &port), ==, PBIO_SUCCESS);
    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_d), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_d, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // 1. First Allocation (A, B) succeeds
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb1, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_ptr_op(rb1, !=, NULL);

    // 2. Exact duplicate allocation (A, B) must return PBIO_ERROR_BUSY and leave target NULL
    rb_dup = NULL;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb_dup, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_ERROR_BUSY);
    tt_ptr_op(rb_dup, ==, NULL);

    // 3. Reversed duplicate allocation (B, A) must also return PBIO_ERROR_BUSY
    rb_dup = NULL;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb_dup, srv_b, srv_a, 56000, 56000, 112000), ==, PBIO_ERROR_BUSY);
    tt_ptr_op(rb_dup, ==, NULL);

    // 4. Partial motor overlap: Left motor A already claimed by rb1
    rb_dup = NULL;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb_dup, srv_a, srv_c, 56000, 56000, 112000), ==, PBIO_ERROR_BUSY);
    tt_ptr_op(rb_dup, ==, NULL);

    // 5. Partial motor overlap: Right motor B already claimed by rb1
    rb_dup = NULL;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb_dup, srv_c, srv_b, 56000, 56000, 112000), ==, PBIO_ERROR_BUSY);
    tt_ptr_op(rb_dup, ==, NULL);

    // 6. Independent motor pair (C, D) succeeds concurrently
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb2, srv_c, srv_d, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_ptr_op(rb2, !=, NULL);
    tt_ptr_op(rb1, !=, rb2);

    // 7. Release rb1 (motors A, B freed)
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb1), ==, PBIO_SUCCESS);

    // Now motors (A, B) can be reallocated cleanly
    rb1 = NULL;
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb1, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_ptr_op(rb1, !=, NULL);

    // Clean up
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb1), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb2), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_motion_status_bounds(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    // Initialize concrete test servos
    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // Setup MDRobotBase instance
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_ptr_op(rb, !=, NULL);

    // 1. NULL pointer rejection
    tt_uint_op(pbio_mdrobotbase_set_motion_status(NULL, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_ERROR_INVALID_ARG);

    // 2. All 5 valid enum states succeed and mutate rb->motion_status
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_NONE), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);

    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);

    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);

    // Direct transition COMPLETED -> STALLED rejected by FSM
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_STALLED), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);

    // Start new motion, then transition to STALLED
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_STALLED), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_STALLED);

    // Direct transition STALLED -> TIMED_OUT rejected by FSM
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_TIMED_OUT), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_STALLED);

    // Start new motion, then transition to TIMED_OUT
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_TIMED_OUT), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_TIMED_OUT);

    // Set known state RUNNING to verify immutability on invalid input
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);

    // 3. Out-of-bounds negative integers rejected with PBIO_ERROR_INVALID_ARG and state preserved
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, (pbio_mdrobotbase_motion_status_t)-1), ==, PBIO_ERROR_INVALID_ARG);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);

    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, (pbio_mdrobotbase_motion_status_t)-100), ==, PBIO_ERROR_INVALID_ARG);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);

    // 4. Out-of-bounds positive integers rejected with PBIO_ERROR_INVALID_ARG and state preserved
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, (pbio_mdrobotbase_motion_status_t)5), ==, PBIO_ERROR_INVALID_ARG);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);

    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, (pbio_mdrobotbase_motion_status_t)6), ==, PBIO_ERROR_INVALID_ARG);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);

    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, (pbio_mdrobotbase_motion_status_t)100), ==, PBIO_ERROR_INVALID_ARG);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);

    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, (pbio_mdrobotbase_motion_status_t)999), ==, PBIO_ERROR_INVALID_ARG);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);

    // Clean up
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_kinematic_invariants(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    // Initialize concrete test servos
    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // Setup MDRobotBase instance (D=56mm, W=112mm)
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_ptr_op(rb, !=, NULL);

    // Test across gear ratios R in [0.01, 100.0]
    static const float test_ratios[] = { 0.01f, 0.1f, 0.5f, 1.0f, 2.0f, 10.0f, 100.0f };
    static const float test_angles[] = { -100000.0f, -720.0f, -360.0f, -90.0f, 0.0f, 45.0f, 180.0f, 720.0f, 100000.0f };

    for (size_t r = 0; r < sizeof(test_ratios) / sizeof(test_ratios[0]); r++) {
        float R = test_ratios[r];
        tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, R), ==, PBIO_SUCCESS);

        // 1. Invertibility: wheel_to_motor(motor_to_wheel(m)) == m
        for (size_t a = 0; a < sizeof(test_angles) / sizeof(test_angles[0]); a++) {
            float m = test_angles[a];
            float w = pbio_mdrobotbase_motor_to_wheel_deg(rb, m);
            float m_inv = pbio_mdrobotbase_wheel_to_motor_deg(rb, w);
            float err = fabsf(m_inv - m);
            tt_want(err < 1e-4f);

            // Inverse: motor_to_wheel(wheel_to_motor(w)) == w
            float w_orig = test_angles[a];
            float m_calc = pbio_mdrobotbase_wheel_to_motor_deg(rb, w_orig);
            float w_inv = pbio_mdrobotbase_motor_to_wheel_deg(rb, m_calc);
            float err_inv = fabsf(w_inv - w_orig);
            tt_want(err_inv < 1e-4f);
        }

        // 2. Velocity scaling & sign symmetry
        float v_pos = 360.0f;
        float v_neg = -360.0f;
        float w_pos = pbio_mdrobotbase_motor_to_wheel_dps(rb, v_pos);
        float w_neg = pbio_mdrobotbase_motor_to_wheel_dps(rb, v_neg);
        tt_want(fabsf(w_pos + w_neg) < 1e-4f);
        int32_t m_pos = pbio_mdrobotbase_wheel_to_motor_dps(rb, w_pos);
        int32_t m_neg = pbio_mdrobotbase_wheel_to_motor_dps(rb, w_neg);
        tt_want_int_op(m_pos + m_neg, ==, 0);

        // 3. Differential-drive straight-line heading conservation & distance
        float delta_motor = 720.0f;
        float wheel_deg_left = pbio_mdrobotbase_motor_to_wheel_deg(rb, delta_motor);
        float wheel_deg_right = pbio_mdrobotbase_motor_to_wheel_deg(rb, delta_motor);
        float wheel_diameter = 56.0f;
        float s_left = (wheel_deg_left / 360.0f) * ((float)M_PI * wheel_diameter);
        float s_right = (wheel_deg_right / 360.0f) * ((float)M_PI * wheel_diameter);

        // delta_theta = (s_right - s_left) / W
        float axle_track = 112.0f;
        float delta_theta = (s_right - s_left) / axle_track;
        tt_want(fabsf(delta_theta) <= 1e-5f);

        // distance = (delta_motor / R) * (pi * D / 360)
        float distance = (s_left + s_right) * 0.5f;
        float expected_distance = (delta_motor / R / 360.0f) * ((float)M_PI * wheel_diameter);
        tt_want(fabsf(distance - expected_distance) < 1e-4f);
    }

    // Clean up
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_spin_and_pivot_invariants(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;
    static float initial_right_deg;
    static float initial_left_deg;

    PBIO_OS_ASYNC_BEGIN(state);

    // Initialize concrete test servos (Article I: 100% concrete implementation)
    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // Setup MDRobotBase instance (D=56mm, W=112mm)
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_ptr_op(rb, !=, NULL);

    // Disable backlash filter and set encoder-only fusion for pure geometric invariant verification
    tt_uint_op(pbio_mdrobotbase_set_backlash_filter(rb, false), ==, PBIO_SUCCESS);
    rb->fusion_alpha = 0.0f;

    // -------------------------------------------------------------------------
    // 1. Pure Spin Turn Center Drift Invariant: s_left = -s_right -> sqrt(dx^2 + dy^2) <= 0.05 mm
    // -------------------------------------------------------------------------
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_TURN;
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);

    // Run left motor backward 360 deg, right motor forward 360 deg
    tt_uint_op(pbio_servo_run_angle(srv_left, 500, -360, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_right, 500, 360, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_left->control) && pbio_control_is_done(&srv_right->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);

    // Calculate Euclidean drift norm: sqrt(dx^2 + dy^2)
    float drift = sqrtf(rb->x * rb->x + rb->y * rb->y);
    tt_want(drift <= 0.05f);
    // Heading rotated by 180 degrees
    tt_want(pbio_test_int_is_close(fabsf(rb->theta), 180.0f, 0.5f));

    // -------------------------------------------------------------------------
    // 2. Single-Wheel Left Pivot Arc Conservation: s_left = 0, s_right = W * |delta_theta| +/- 0.1 mm
    // -------------------------------------------------------------------------
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_PIVOT;
    rb->pivot_left = true;
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);

    initial_right_deg = rb->last_right_deg;
    // Lock left wheel (stationary), advance right wheel by 360 deg (175.929 mm arc)
    tt_uint_op(pbio_servo_run_angle(srv_right, 500, 360, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_right->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);

    float actual_wheel_deg_right = fabsf(rb->last_right_deg - initial_right_deg);
    float s_right = (actual_wheel_deg_right / 360.0f) * ((float)M_PI * 56.0f);
    float delta_theta_rad_left_pivot = fabsf(rb->theta) * ((float)M_PI / 180.0f);
    float expected_s_right = 112.0f * delta_theta_rad_left_pivot;
    tt_want(fabsf(s_right - expected_s_right) <= 0.1f);
    tt_want(pbio_test_int_is_close(rb->theta, 90.0f, 1.0f));

    // -------------------------------------------------------------------------
    // 3. Single-Wheel Right Pivot Arc Conservation: s_right = 0, s_left = W * |delta_theta| +/- 0.1 mm
    // -------------------------------------------------------------------------
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_PIVOT;
    rb->pivot_left = false;
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);

    initial_left_deg = rb->last_left_deg;
    // Lock right wheel (stationary), advance left wheel by 360 deg (175.929 mm arc)
    tt_uint_op(pbio_servo_run_angle(srv_left, 500, 360, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_left->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);

    float actual_wheel_deg_left = fabsf(rb->last_left_deg - initial_left_deg);
    float s_left = (actual_wheel_deg_left / 360.0f) * ((float)M_PI * 56.0f);
    float delta_theta_rad_right_pivot = fabsf(rb->theta) * ((float)M_PI / 180.0f);
    float expected_s_left = 112.0f * delta_theta_rad_right_pivot;
    tt_want(fabsf(s_left - expected_s_left) <= 0.1f);
    tt_want(pbio_test_int_is_close(rb->theta, -90.0f, 1.0f));

    // -------------------------------------------------------------------------
    // 4. Continuous Angle Normalization in [-180.0, +180.0] via pbio_mdrobotbase_wrap_degrees
    // -------------------------------------------------------------------------
    tt_want(fabsf(pbio_mdrobotbase_wrap_degrees(0.0f) - 0.0f) < 1e-4f);
    tt_want(fabsf(pbio_mdrobotbase_wrap_degrees(90.0f) - 90.0f) < 1e-4f);
    tt_want(fabsf(pbio_mdrobotbase_wrap_degrees(180.0f) - 180.0f) < 1e-4f);
    tt_want(fabsf(pbio_mdrobotbase_wrap_degrees(-180.0f) - (-180.0f)) < 1e-4f);
    tt_want(fabsf(pbio_mdrobotbase_wrap_degrees(270.0f) - (-90.0f)) < 1e-4f);
    tt_want(fabsf(pbio_mdrobotbase_wrap_degrees(360.0f) - 0.0f) < 1e-4f);
    tt_want(fabsf(pbio_mdrobotbase_wrap_degrees(540.0f) - 180.0f) < 1e-4f);
    tt_want(fabsf(pbio_mdrobotbase_wrap_degrees(-540.0f) - (-180.0f)) < 1e-4f);
    tt_want(fabsf(pbio_mdrobotbase_wrap_degrees(3600.0f) - 0.0f) < 1e-4f);
    tt_want(fabsf(pbio_mdrobotbase_wrap_degrees(-3600.0f) - 0.0f) < 1e-4f);

    // Clean up
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_backlash_distance_conservation(pbio_os_state_t *state, void *context) {
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
    tt_ptr_op(rb, !=, NULL);

    // Configure backlash filtering: deadband limits = 1.0 deg
    tt_uint_op(pbio_mdrobotbase_set_backlash_limits(rb, 1.0f, 1.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_set_backlash_filter(rb, true), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);

    // Verify initial state
    tt_want(rb->x == 0.0f);
    tt_want(rb->y == 0.0f);
    tt_want(rb->theta == 0.0f);

    // Execute 100 cycles of sub-threshold oscillation within +/- 0.5 deg deadband
    for (int cycle = 0; cycle < 100; cycle++) {
        // Forward sub-threshold displacement (+0.5 deg)
        rb->last_left_deg -= 0.5f;
        rb->last_right_deg -= 0.5f;
        tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);

        // Backward sub-threshold displacement (-0.5 deg)
        rb->last_left_deg += 0.5f;
        rb->last_right_deg += 0.5f;
        tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);
    }

    // Distance conservation invariant: zero net drift on x, y, and theta after 100 cycles
    tt_want(rb->x == 0.0f);
    tt_want(rb->y == 0.0f);
    tt_want(rb->theta == 0.0f);

    // Clean up
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_numerical_robustness(pbio_os_state_t *state, void *context) {
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
    tt_ptr_op(rb, !=, NULL);

    // 1. Non-finite input rejection
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, NAN, 0.0f, 0.0f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, INFINITY, 0.0f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, -INFINITY, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, NAN), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 10.0f, 20.0f, 30.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_want(rb->x == 10.0f);
    tt_want(rb->y == 20.0f);
    tt_want(rb->theta == 30.0f);

    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, NAN), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, INFINITY), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, -INFINITY), ==, PBIO_ERROR_INVALID_ARG);

    tt_uint_op(pbio_mdrobotbase_set_fusion_alpha(rb, NAN), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_fusion_alpha(rb, INFINITY), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_fusion_alpha(rb, -INFINITY), ==, PBIO_ERROR_INVALID_ARG);

    tt_uint_op(pbio_mdrobotbase_set_backlash_limits(rb, NAN, 1000.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_backlash_limits(rb, 1.0f, INFINITY), ==, PBIO_ERROR_INVALID_ARG);

    tt_uint_op(pbio_mdrobotbase_set_max_turn_speed(rb, NAN), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_max_turn_speed(rb, INFINITY), ==, PBIO_ERROR_INVALID_ARG);

    tt_uint_op(pbio_mdrobotbase_set_max_pivot_speed(rb, NAN), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_max_pivot_speed(rb, -INFINITY), ==, PBIO_ERROR_INVALID_ARG);

    tt_uint_op(pbio_mdrobotbase_set_pid_min_turn(rb, NAN, 10.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_pid_min_turn(rb, 5.0f, INFINITY), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_pid_min_turn(rb, 5.0f, -INFINITY), ==, PBIO_ERROR_INVALID_ARG);

    // 2. Physical gear ratio bounded domain [0.001, 1000.0]
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 1.5f), ==, PBIO_SUCCESS);
    float ratio = 0.0f;
    tt_uint_op(pbio_mdrobotbase_get_gear_ratio(rb, &ratio), ==, PBIO_SUCCESS);
    tt_want(ratio == 1.5f);

    // Rejection of invalid ratios preserves previous valid ratio
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, -2.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 0.0009f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 1000.1f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_get_gear_ratio(rb, &ratio), ==, PBIO_SUCCESS);
    tt_want(ratio == 1.5f);

    // Valid boundaries
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 0.001f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_get_gear_ratio(rb, &ratio), ==, PBIO_SUCCESS);
    tt_want(ratio == 0.001f);

    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 1000.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_get_gear_ratio(rb, &ratio), ==, PBIO_SUCCESS);
    tt_want(ratio == 1000.0f);

    // 3. Integer motor-speed quantization overflow and saturation
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 100.0f), ==, PBIO_SUCCESS);
    int32_t sat_pos = pbio_mdrobotbase_wheel_to_motor_dps(rb, 1e12f);
    tt_want_int_op(sat_pos, ==, INT32_MAX);

    int32_t sat_neg = pbio_mdrobotbase_wheel_to_motor_dps(rb, -1e12f);
    tt_want_int_op(sat_neg, ==, INT32_MIN);

    int32_t sat_nan = pbio_mdrobotbase_wheel_to_motor_dps(rb, NAN);
    tt_want_int_op(sat_nan, ==, 0);

    int32_t sat_inf = pbio_mdrobotbase_wheel_to_motor_dps(rb, INFINITY);
    tt_want_int_op(sat_inf, ==, INT32_MAX);

    int32_t sat_neginf = pbio_mdrobotbase_wheel_to_motor_dps(rb, -INFINITY);
    tt_want_int_op(sat_neginf, ==, INT32_MIN);

    // Kinematic conversion safety for non-finite values
    tt_want(pbio_mdrobotbase_motor_to_wheel_dps(rb, NAN) == 0.0f);
    tt_want(pbio_mdrobotbase_motor_to_wheel_deg(rb, NAN) == 0.0f);
    tt_want(pbio_mdrobotbase_wheel_to_motor_deg(rb, NAN) == 0.0f);
    tt_want(pbio_mdrobotbase_wrap_degrees(NAN) == 0.0f);

    // 4. Millisecond clock timer wraparound verification
    uint32_t start_ms = 0xFFFFFFF0U;
    uint32_t now_ms = 0x00000010U;
    uint32_t elapsed_ms = (uint32_t)(now_ms - start_ms);
    tt_want_int_op(elapsed_ms, ==, 32);

    uint32_t timeout_ms = 30U;
    tt_want((uint32_t)(now_ms - start_ms) >= timeout_ms);

    uint32_t timeout_longer = 50U;
    tt_want(!((uint32_t)(now_ms - start_ms) >= timeout_longer));

    // Clean up
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_behavioral_trajectory_tracking(pbio_os_state_t *state, void *context) {
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
    tt_ptr_op(rb, !=, NULL);

    // Pure encoder / gyro odometry
    tt_uint_op(pbio_mdrobotbase_set_backlash_filter(rb, false), ==, PBIO_SUCCESS);
    rb->fusion_alpha = 0.0f;

    // Initial state reset to (0, 0, 0)
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_want(rb->x == 0.0f);
    tt_want(rb->y == 0.0f);
    tt_want(rb->theta == 0.0f);

    // Initial motion status must be NONE, not in progress
    pbio_mdrobotbase_motion_status_t motion_status;
    tt_uint_op(pbio_mdrobotbase_get_motion_status(rb, &motion_status), ==, PBIO_SUCCESS);
    tt_want_int_op(motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(!rb->motion_in_progress);

    // Setup a 3-waypoint trajectory: (0, 0) -> (100, 0) -> (100, 100)
    tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
    rb->trajectory_points_x[0] = 0.0f;
    rb->trajectory_points_y[0] = 0.0f;
    rb->trajectory_points_x[1] = 100.0f;
    rb->trajectory_points_y[1] = 0.0f;
    rb->trajectory_points_x[2] = 100.0f;
    rb->trajectory_points_y[2] = 100.0f;
    rb->trajectory_num_points = 3;
    rb->trajectory_current_point_idx = 1;
    rb->target_speed = 150.0f;
    rb->tolerance_dist = 2.0f;
    rb->trajectory_transition_tolerance = 20.0f;
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_TRAJECTORY;
    rb->motion_in_progress = true;
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);

    // Verify dynamic state transitions to RUNNING
    tt_want(rb->motion_in_progress);
    tt_want_int_op(rb->motion_type, ==, PBIO_MDROBOTBASE_MOTION_TRAJECTORY);
    tt_uint_op(pbio_mdrobotbase_get_motion_status(rb, &motion_status), ==, PBIO_SUCCESS);
    tt_want_int_op(motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);

    // Step 1: Simulate progression along segment 1 to (100, 0)
    // Wheel diameter = 56mm -> circumference = pi * 56 = 175.929mm. 100mm = (100 / 175.929) * 360 = 204.627 deg
    tt_uint_op(pbio_servo_run_angle(srv_left, 500, 205, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_right, 500, 205, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_left->control) && pbio_control_is_done(&srv_right->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);

    // Verify odometry X advanced to ~100mm and Y is ~0mm
    tt_want(fabsf(rb->x - 100.0f) <= 2.0f);
    tt_want(fabsf(rb->y - 0.0f) <= 2.0f);

    // Advance to waypoint 2: rotate in place 90 deg (left backward 180, right forward 180)
    // Rotate 90 deg: track = 112mm, diameter = 56mm -> wheel deg = 90 * (112/56) = 180 deg
    rb->trajectory_current_point_idx = 2;
    rb->trajectory_final_segment_started = true;
    tt_uint_op(pbio_servo_run_angle(srv_left, 500, -180, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_right, 500, 180, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_left->control) && pbio_control_is_done(&srv_right->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 90.0f), ==, PBIO_SUCCESS);

    // Heading should be 90 deg
    tt_want(fabsf(rb->theta - 90.0f) <= 1.0f);

    // Translate 100mm along Y axis (heading 90 deg)
    tt_uint_op(pbio_servo_run_angle(srv_left, 500, 205, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_right, 500, 205, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_left->control) && pbio_control_is_done(&srv_right->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 90.0f), ==, PBIO_SUCCESS);

    // Verify arrival within tolerance: |x - 100| <= 2.0mm, |y - 100| <= 2.0mm, |theta - 90| <= 1.0 deg
    tt_want(fabsf(rb->x - 100.0f) <= 2.0f);
    tt_want(fabsf(rb->y - 100.0f) <= 2.0f);
    tt_want(fabsf(rb->theta - 90.0f) <= 1.0f);

    // Mark completed
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED), ==, PBIO_SUCCESS);
    rb->motion_in_progress = false;

    // Verify final state: COMPLETED, not in progress, zero drift
    tt_uint_op(pbio_mdrobotbase_get_motion_status(rb, &motion_status), ==, PBIO_SUCCESS);
    tt_want_int_op(motion_status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);
    tt_want(!rb->motion_in_progress);

    // Clean up
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_accessor_encapsulation(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_a;
    static pbio_servo_t *srv_b;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_a), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_a, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_b), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_b, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_want_ptr_op(rb, !=, NULL);

    // 1. Pose Accessor & Null Argument Invariants
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 150.0f, -250.0f, 45.0f, 0.0f), ==, PBIO_SUCCESS);
    float x = 0.0f, y = 0.0f, theta = 0.0f;
    tt_uint_op(pbio_mdrobotbase_get_pose(rb, &x, &y, &theta), ==, PBIO_SUCCESS);
    tt_want(x == 150.0f);
    tt_want(y == -250.0f);
    tt_want(theta == 45.0f);

    // Rejection of NULL pointers in get_pose
    tt_uint_op(pbio_mdrobotbase_get_pose(NULL, &x, &y, &theta), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_get_pose(rb, NULL, &y, &theta), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_get_pose(rb, &x, NULL, &theta), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_get_pose(rb, &x, &y, NULL), ==, PBIO_ERROR_INVALID_ARG);

    // 2. Lifecycle Status & Busy / Done / Stalled Accessors
    bool busy = true, done = false, stalled = true;
    tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
    tt_want(!busy);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(done);
    tt_uint_op(pbio_mdrobotbase_is_stalled(rb, &stalled), ==, PBIO_SUCCESS);
    tt_want(!stalled);

    // Null checks for boolean accessors
    tt_uint_op(pbio_mdrobotbase_is_busy(NULL, &busy), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_is_busy(rb, NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_is_done(NULL, &done), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_is_stalled(NULL, &stalled), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_is_stalled(rb, NULL), ==, PBIO_ERROR_INVALID_ARG);

    // 3. Motion Type Accessor
    pbio_mdrobotbase_motion_type_t mtype = PBIO_MDROBOTBASE_MOTION_TURN;
    tt_uint_op(pbio_mdrobotbase_get_motion_type(rb, &mtype), ==, PBIO_SUCCESS);
    tt_want_int_op(mtype, ==, PBIO_MDROBOTBASE_MOTION_NONE);
    tt_uint_op(pbio_mdrobotbase_get_motion_type(NULL, &mtype), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_get_motion_type(rb, NULL), ==, PBIO_ERROR_INVALID_ARG);

    // 4. Dynamic Transition Verification via Accessors
    rb->motion_in_progress = true;
    rb->motion_type = PBIO_MDROBOTBASE_MOTION_NAVIGATE;
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
    tt_want(busy);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(!done);
    tt_uint_op(pbio_mdrobotbase_is_stalled(rb, &stalled), ==, PBIO_SUCCESS);
    tt_want(!stalled);
    tt_uint_op(pbio_mdrobotbase_get_motion_type(rb, &mtype), ==, PBIO_SUCCESS);
    tt_want_int_op(mtype, ==, PBIO_MDROBOTBASE_MOTION_NAVIGATE);

    // Simulate stall from RUNNING
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_STALLED), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_is_stalled(rb, &stalled), ==, PBIO_SUCCESS);
    tt_want(stalled);
    tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
    tt_want(!busy);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(done);

    // Direct transition from STALLED to COMPLETED rejected by FSM
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED), ==, PBIO_ERROR_INVALID_OP);

    // Start new motion then complete
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
    tt_want(busy);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(!done);

    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
    tt_want(!busy);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(done);
    tt_uint_op(pbio_mdrobotbase_is_stalled(rb, &stalled), ==, PBIO_SUCCESS);
    tt_want(!stalled);

    // Clean up
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_portable_pointer_validation(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_a, *srv_b;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;
    static pbio_mdrobotbase_t foreign_stack;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_a), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_a, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_b), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_b, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    // 1. Rejection of NULL pointer
    tt_uint_op(pbio_mdrobotbase_put_robotbase(NULL), ==, PBIO_ERROR_INVALID_ARG);

    // 2. Rejection of foreign stack pointer
    memset(&foreign_stack, 0, sizeof(foreign_stack));
    tt_uint_op(pbio_mdrobotbase_put_robotbase(&foreign_stack), ==, PBIO_ERROR_INVALID_ARG);

    // 3. Rejection of foreign heap memory buffer
    void *foreign_heap = malloc(sizeof(pbio_mdrobotbase_t));
    tt_ptr_op(foreign_heap, !=, NULL);
    tt_uint_op(pbio_mdrobotbase_put_robotbase((pbio_mdrobotbase_t *)foreign_heap), ==, PBIO_ERROR_INVALID_ARG);
    free(foreign_heap);

    // 4. Allocate valid robot base instance
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_a, srv_b, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_ptr_op(rb, !=, NULL);

    // 5. Rejection of misaligned address within array boundary
    pbio_mdrobotbase_t *misaligned_rb = (pbio_mdrobotbase_t *)((uintptr_t)rb + 1);
    tt_uint_op(pbio_mdrobotbase_put_robotbase(misaligned_rb), ==, PBIO_ERROR_INVALID_ARG);

    misaligned_rb = (pbio_mdrobotbase_t *)((uintptr_t)rb + 3);
    tt_uint_op(pbio_mdrobotbase_put_robotbase(misaligned_rb), ==, PBIO_ERROR_INVALID_ARG);

    // 6. Rejection of addresses outside array byte range
    pbio_mdrobotbase_t *underflow_rb = (pbio_mdrobotbase_t *)((uintptr_t)rb - sizeof(pbio_mdrobotbase_t) * 10);
    tt_uint_op(pbio_mdrobotbase_put_robotbase(underflow_rb), ==, PBIO_ERROR_INVALID_ARG);

    pbio_mdrobotbase_t *overflow_rb = (pbio_mdrobotbase_t *)((uintptr_t)rb + sizeof(pbio_mdrobotbase_t) * 100);
    tt_uint_op(pbio_mdrobotbase_put_robotbase(overflow_rb), ==, PBIO_ERROR_INVALID_ARG);

    // 7. Legitimate release of valid slot
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

    // 8. Double release rejection
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_ERROR_INVALID_ARG);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_fsm_state_transitions(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;
    static bool busy;
    static bool done;
    static bool stalled;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    // Invariant: Initial state is NONE, motion_in_progress=false, busy=false, done=true
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(!rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
    tt_want(!busy);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(done);

    // 1. Prohibited direct transitions from NONE to terminal states
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(!rb->motion_in_progress);

    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_STALLED), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(!rb->motion_in_progress);

    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_TIMED_OUT), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(!rb->motion_in_progress);

    // 2. Idempotent self-transition: NONE -> NONE
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_NONE), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(!rb->motion_in_progress);

    // 3. Valid transition: NONE -> RUNNING (start motion)
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);
    tt_want(rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
    tt_want(busy);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(!done);

    // 4. Idempotent self-transition: RUNNING -> RUNNING
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);
    tt_want(rb->motion_in_progress);

    // 5. Valid transition: RUNNING -> COMPLETED
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);
    tt_want(!rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
    tt_want(!busy);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(done);

    // 6. Prohibited cross-terminal from COMPLETED
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_STALLED), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_TIMED_OUT), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);

    // 7. Valid restart from COMPLETED: COMPLETED -> RUNNING -> STALLED
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);
    tt_want(rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_STALLED), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_STALLED);
    tt_want(!rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_is_stalled(rb, &stalled), ==, PBIO_SUCCESS);
    tt_want(stalled);

    // 8. Prohibited cross-terminal from STALLED
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_STALLED);
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_TIMED_OUT), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_STALLED);

    // 9. Valid restart from STALLED: STALLED -> RUNNING -> TIMED_OUT
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);
    tt_want(rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_TIMED_OUT), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_TIMED_OUT);
    tt_want(!rb->motion_in_progress);

    // 10. Prohibited cross-terminal from TIMED_OUT
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_COMPLETED), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_TIMED_OUT);
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_STALLED), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_TIMED_OUT);

    // 11. Reset to NONE from terminal state: TIMED_OUT -> NONE
    tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_NONE), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(!rb->motion_in_progress);

    // 12. Exhaustive 5x5 Transition Matrix Sweep
    static const bool expected_allowed[5][5] = {
        // NONE (0)
        { true, true, false, false, false },
        // RUNNING (1)
        { true, true, true, true, true },
        // COMPLETED (2)
        { true, true, true, false, false },
        // STALLED (3)
        { true, true, false, true, false },
        // TIMED_OUT (4)
        { true, true, false, false, true },
    };

    for (int from = 0; from < 5; from++) {
        for (int to = 0; to < 5; to++) {
            // Bring rb to state 'from' safely
            tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
            if (from == PBIO_MDROBOTBASE_STATUS_RUNNING) {
                tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
            } else if (from != PBIO_MDROBOTBASE_STATUS_NONE) {
                tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, PBIO_MDROBOTBASE_STATUS_RUNNING), ==, PBIO_SUCCESS);
                tt_uint_op(pbio_mdrobotbase_set_motion_status(rb, (pbio_mdrobotbase_motion_status_t)from), ==, PBIO_SUCCESS);
            }
            tt_int_op(rb->motion_status, ==, from);

            // Execute transition attempt
            pbio_error_t err = pbio_mdrobotbase_set_motion_status(rb, (pbio_mdrobotbase_motion_status_t)to);
            if (expected_allowed[from][to]) {
                tt_uint_op(err, ==, PBIO_SUCCESS);
                tt_int_op(rb->motion_status, ==, to);
                tt_want_int_op(rb->motion_in_progress, ==, (to == PBIO_MDROBOTBASE_STATUS_RUNNING));
                tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
                tt_want_int_op(busy, ==, (to == PBIO_MDROBOTBASE_STATUS_RUNNING));
                tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
                tt_want_int_op(done, ==, (to != PBIO_MDROBOTBASE_STATUS_RUNNING));
                // Invariant: busy and done can never both be true
                tt_want(!(busy && done));
            } else {
                tt_uint_op(err, ==, PBIO_ERROR_INVALID_OP);
                // State preserved on rejection
                tt_int_op(rb->motion_status, ==, from);
                tt_want_int_op(rb->motion_in_progress, ==, (from == PBIO_MDROBOTBASE_STATUS_RUNNING));
            }
        }
    }

    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_multiscale_kinematic_invariants(pbio_os_state_t *state, void *context) {
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
    tt_ptr_op(rb, !=, NULL);

    // Disable backlash filter and set encoder-only fusion (alpha = 0.0) for pure kinematic invariant evaluation
    tt_uint_op(pbio_mdrobotbase_set_backlash_filter(rb, false), ==, PBIO_SUCCESS);
    rb->fusion_alpha = 0.0f;

    // Define multi-scale Cartesian parameter grid:
    // 6 Gear ratios: [0.2, 0.5, 1.0, 2.5, 5.0, 10.0]
    static const float gear_ratios[] = { 0.2f, 0.5f, 1.0f, 2.5f, 5.0f, 10.0f };
    // 4 Wheel diameters: [30.0, 56.0, 81.6, 120.0] mm in micrometers
    static const int32_t wheel_diameters[] = { 30000, 56000, 81600, 120000 };
    // 4 Axle tracks: [80.0, 112.0, 160.0, 240.0] mm in micrometers
    static const int32_t axle_tracks[] = { 80000, 112000, 160000, 240000 };

    size_t num_ratios = sizeof(gear_ratios) / sizeof(gear_ratios[0]);
    size_t num_diameters = sizeof(wheel_diameters) / sizeof(wheel_diameters[0]);
    size_t num_tracks = sizeof(axle_tracks) / sizeof(axle_tracks[0]);
    size_t total_permutations = num_ratios * num_diameters * num_tracks;
    tt_want_int_op(total_permutations, ==, 96);

    for (size_t g = 0; g < num_ratios; g++) {
        float r = gear_ratios[g];
        tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, r), ==, PBIO_SUCCESS);

        for (size_t d = 0; d < num_diameters; d++) {
            int32_t diam_um = wheel_diameters[d];
            tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, diam_um, diam_um), ==, PBIO_SUCCESS);

            for (size_t w = 0; w < num_tracks; w++) {
                int32_t track_um = axle_tracks[w];
                rb->axle_track = track_um;

                // -------------------------------------------------------------
                // Sub-test 1: Linear Odometry Invariant (Forward Travel)
                // -------------------------------------------------------------
                rb->motion_type = PBIO_MDROBOTBASE_MOTION_NONE;
                tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);

                // Simulate 360 motor degrees forward for both wheels
                rb->last_left_deg -= 360.0f;
                rb->last_right_deg -= 360.0f;
                tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);

                float diam_mm = (float)diam_um / 1000.0f;
                float expected_wheel_deg = 360.0f / r;
                float expected_dist_mm = (expected_wheel_deg / 360.0f) * 3.14159265f * diam_mm;

                float lin_error = fabsf(rb->x - expected_dist_mm);
                float rel_lin_error = lin_error / expected_dist_mm;

                // Acceptance Contract: relative error < 0.01% (0.0001)
                tt_want(rel_lin_error < 0.0001f);
                tt_want(fabsf(rb->y) < 0.001f);
                tt_want(fabsf(rb->theta) < 0.001f);

                // -------------------------------------------------------------
                // Sub-test 2: Differential Heading Integration Invariant
                // -------------------------------------------------------------
                tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);

                // Simulate differential rotation: left backward 180 deg, right forward 180 deg
                float d_motor = 180.0f;
                rb->last_left_deg += d_motor;
                rb->last_right_deg -= d_motor;
                tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);

                float track_mm = (float)track_um / 1000.0f;
                float wheel_deg_turn = d_motor / r;
                float wheel_arc_mm = (wheel_deg_turn / 360.0f) * 3.14159265f * diam_mm;
                float expected_theta_deg = (2.0f * wheel_arc_mm / track_mm) * (180.0f / 3.14159265f);

                // Normalize expected theta to [-180, 180]
                expected_theta_deg = pbio_mdrobotbase_wrap_degrees(expected_theta_deg);

                float heading_error = fabsf(pbio_mdrobotbase_wrap_degrees(rb->theta - expected_theta_deg));

                // Acceptance Contract: heading error < 0.05 degrees
                tt_want(heading_error < 0.05f);

                // Center drift invariant during differential rotation
                float center_drift = sqrtf(rb->x * rb->x + rb->y * rb->y);
                tt_want(center_drift < 0.01f);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Sub-test 3: Concrete Asynchronous Multi-Scale Actuator Integration
    // Test physical motor execution under non-standard scale (R=2.5, D=81.6mm, W=160mm)
    // -------------------------------------------------------------------------
    tt_uint_op(pbio_mdrobotbase_set_gear_ratio(rb, 2.5f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_set_wheel_diameters(rb, 81600, 81600), ==, PBIO_SUCCESS);
    rb->axle_track = 160000;
    tt_uint_op(pbio_mdrobotbase_reset_state(rb, 0.0f, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);

    // Motor command: 500 deg/s for 720 degrees
    tt_uint_op(pbio_servo_run_angle(srv_left, 500, 720, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_run_angle(srv_right, 500, 720, PBIO_CONTROL_ON_COMPLETION_HOLD), ==, PBIO_SUCCESS);
    PBIO_OS_AWAIT_UNTIL(state, pbio_control_is_done(&srv_left->control) && pbio_control_is_done(&srv_right->control));
    tt_uint_op(pbio_mdrobotbase_update_state(rb, 0.0f), ==, PBIO_SUCCESS);

    // Wheel rotation = 720 / 2.5 = 288.0 deg
    // Expected distance = (288 / 360) * pi * 81.6 = 0.8 * 256.35396 = 205.083 mm
    tt_want(pbio_test_int_is_close(rb->x, 205.083f, 0.2f));
    tt_want(pbio_test_int_is_close(rb->y, 0.0f, 0.2f));
    tt_want(pbio_test_int_is_close(rb->theta, 0.0f, 0.2f));

    // Cleanup
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_fsm_terminal_helpers(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;
    static bool busy;
    static bool done;
    static bool stalled;

    PBIO_OS_ASYNC_BEGIN(state);

    // Guard: NULL pointer rejection across all transition helpers
    tt_uint_op(pbio_mdrobotbase_mark_running(NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_mark_completed(NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_mark_stalled(NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_mark_timed_out(NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_motion_start(NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_motion_complete(NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_motion_stall(NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_motion_timeout(NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_motion_reset(NULL), ==, PBIO_ERROR_INVALID_ARG);

    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    // Initial state: NONE, not in progress
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(!rb->motion_in_progress);

    // 0. Semantic Helper: motion_start / motion_reset roundtrip
    tt_uint_op(pbio_mdrobotbase_motion_start(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);
    tt_want(rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_motion_reset(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_NONE);
    tt_want(!rb->motion_in_progress);

    // 1. Mark Running: NONE -> RUNNING
    tt_uint_op(pbio_mdrobotbase_mark_running(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);
    tt_want(rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
    tt_want(busy);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(!done);

    // 2. Mark Completed: RUNNING -> COMPLETED
    tt_uint_op(pbio_mdrobotbase_mark_completed(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);
    tt_want(!rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_is_busy(rb, &busy), ==, PBIO_SUCCESS);
    tt_want(!busy);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(done);

    // 3. Reject illegal cross-terminal transitions from COMPLETED
    tt_uint_op(pbio_mdrobotbase_mark_stalled(rb), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);
    tt_want(!rb->motion_in_progress);

    tt_uint_op(pbio_mdrobotbase_mark_timed_out(rb), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_COMPLETED);
    tt_want(!rb->motion_in_progress);

    // 4. Mark Running from COMPLETED: COMPLETED -> RUNNING
    tt_uint_op(pbio_mdrobotbase_mark_running(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);
    tt_want(rb->motion_in_progress);

    // 5. Mark Stalled: RUNNING -> STALLED
    tt_uint_op(pbio_mdrobotbase_mark_stalled(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_STALLED);
    tt_want(!rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_is_stalled(rb, &stalled), ==, PBIO_SUCCESS);
    tt_want(stalled);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(done);

    // 6. Reject illegal cross-terminal transitions from STALLED
    tt_uint_op(pbio_mdrobotbase_mark_completed(rb), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_STALLED);
    tt_want(!rb->motion_in_progress);

    // 7. Mark Running from STALLED: STALLED -> RUNNING
    tt_uint_op(pbio_mdrobotbase_mark_running(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_RUNNING);
    tt_want(rb->motion_in_progress);

    // 8. Mark Timed Out: RUNNING -> TIMED_OUT
    tt_uint_op(pbio_mdrobotbase_mark_timed_out(rb), ==, PBIO_SUCCESS);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_TIMED_OUT);
    tt_want(!rb->motion_in_progress);
    tt_uint_op(pbio_mdrobotbase_is_done(rb, &done), ==, PBIO_SUCCESS);
    tt_want(done);

    // 9. Reject illegal cross-terminal transitions from TIMED_OUT
    tt_uint_op(pbio_mdrobotbase_mark_completed(rb), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_TIMED_OUT);
    tt_want(!rb->motion_in_progress);

    tt_uint_op(pbio_mdrobotbase_mark_stalled(rb), ==, PBIO_ERROR_INVALID_OP);
    tt_int_op(rb->motion_status, ==, PBIO_MDROBOTBASE_STATUS_TIMED_OUT);
    tt_want(!rb->motion_in_progress);

    // 10. Clean lifecycle teardown
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_color_classification(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;
    static uint8_t color_id_rgb;
    static uint8_t color_id_hsv;
    static float dist_rgb;
    static float dist_hsv;
    static float conf_rgb;
    static float conf_hsv;

    PBIO_OS_ASYNC_BEGIN(state);

    // 1. Setup mock servos and allocate drivebase
    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    // 2. Uncalibrated / Zero Prototypes behavior
    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, &color_id_rgb, &dist_rgb, &conf_rgb), ==, PBIO_SUCCESS);
    tt_int_op(color_id_rgb, ==, 0); // Color.NONE
    tt_want(dist_rgb >= 99999.0f);
    tt_want(conf_rgb == 0.0f);

    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 0.0f, 100.0f, 100.0f, &color_id_hsv, &dist_hsv, &conf_hsv), ==, PBIO_SUCCESS);
    tt_int_op(color_id_hsv, ==, 0); // Color.NONE
    tt_want(dist_hsv >= 99999.0f);
    tt_want(conf_hsv == 0.0f);

    // 3. Register Prototypes
    // Color 1: Red (H=0, S=100, V=100)
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 1, 0.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    // Color 2: Green (H=120, S=100, V=100)
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 2, 120.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    // Color 3: Blue (H=240, S=100, V=100)
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 3, 240.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);

    // 4. Test Pure Red Ingestion: RGB vs HSV Parity (Scenario 1 & 2)
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, &color_id_rgb, &dist_rgb, &conf_rgb), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 0.0f, 100.0f, 100.0f, &color_id_hsv, &dist_hsv, &conf_hsv), ==, PBIO_SUCCESS);
    tt_int_op(color_id_rgb, ==, 1);
    tt_int_op(color_id_hsv, ==, 1);
    tt_want(dist_rgb < 1.0f);
    tt_want(dist_hsv < 1.0f);
    tt_want(conf_rgb >= 0.5f && conf_rgb <= 1.0f);
    tt_want(conf_hsv >= 0.5f && conf_hsv <= 1.0f);

    // 5. Test Pure Green Ingestion
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 0.0f, 100.0f, 0.0f, &color_id_rgb, &dist_rgb, &conf_rgb), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 120.0f, 100.0f, 100.0f, &color_id_hsv, &dist_hsv, &conf_hsv), ==, PBIO_SUCCESS);
    tt_int_op(color_id_rgb, ==, 2);
    tt_int_op(color_id_hsv, ==, 2);

    // 6. Test Pure Blue Ingestion
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 0.0f, 0.0f, 100.0f, &color_id_rgb, &dist_rgb, &conf_rgb), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 240.0f, 100.0f, 100.0f, &color_id_hsv, &dist_hsv, &conf_hsv), ==, PBIO_SUCCESS);
    tt_int_op(color_id_rgb, ==, 3);
    tt_int_op(color_id_hsv, ==, 3);

    // 7. Threshold Guard: Out of range classification -> Color.NONE (0)
    tt_uint_op(pbio_mdrobotbase_color_cal_set_threshold(rb, 10.0f), ==, PBIO_SUCCESS);
    // Dark grey/black reading far from prototypes
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 60.0f, 10.0f, 10.0f, &color_id_hsv, &dist_hsv, &conf_hsv), ==, PBIO_SUCCESS);
    tt_int_op(color_id_hsv, ==, 0);
    tt_want(conf_hsv == 0.0f);

    // 8. Backward-compatible pbio_mdrobotbase_color_cal_classify wrapper
    uint8_t legacy_id = 0;
    float legacy_dist = 0.0f;
    tt_uint_op(pbio_mdrobotbase_color_cal_classify(rb, 0.0f, 100.0f, 100.0f, &legacy_id, &legacy_dist), ==, PBIO_SUCCESS);
    tt_int_op(legacy_id, ==, 1);

    // 9. Fail-Closed Invalid Input Rejection (Scenario 4)
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, -5.0f, 50.0f, 50.0f, &color_id_rgb, &dist_rgb, &conf_rgb), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, NAN, 50.0f, 50.0f, &color_id_rgb, &dist_rgb, &conf_rgb), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, -1.0f, 50.0f, 50.0f, &color_id_hsv, &dist_hsv, &conf_hsv), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, INFINITY, 50.0f, 50.0f, &color_id_hsv, &dist_hsv, &conf_hsv), ==, PBIO_ERROR_INVALID_ARG);

    // 10. Null Pointer Safety (Scenario 5)
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(NULL, 100.0f, 0.0f, 0.0f, &color_id_rgb, &dist_rgb, &conf_rgb), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, NULL, &dist_rgb, &conf_rgb), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, &color_id_rgb, NULL, &conf_rgb), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, &color_id_rgb, &dist_rgb, NULL), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(NULL, 0.0f, 100.0f, 100.0f, &color_id_hsv, &dist_hsv, &conf_hsv), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 0.0f, 100.0f, 100.0f, NULL, &dist_hsv, &conf_hsv), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 0.0f, 100.0f, 100.0f, &color_id_hsv, NULL, &conf_hsv), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 0.0f, 100.0f, 100.0f, &color_id_hsv, &dist_hsv, NULL), ==, PBIO_ERROR_INVALID_ARG);

    // 11. Clean lifecycle teardown
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_two_point_calibration(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;
    static float rn, gn, bn;

    PBIO_OS_ASYNC_BEGIN(state);

    // Setup mock servos and allocate drivebase
    lego_device_type_id_t id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    // 1. Scenario 1: Dark-Offset Calibration Subtraction (AC-MDRB-029-1)
    tt_uint_op(pbio_mdrobotbase_color_cal_set_black_reference(rb, 20.0f, 15.0f, 10.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_white_reference(rb, 220.0f, 215.0f, 210.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, 20.0f, 15.0f, 10.0f, &rn, &gn, &bn), ==, PBIO_SUCCESS);
    tt_want(rn == 0.0f);
    tt_want(gn == 0.0f);
    tt_want(bn == 0.0f);

    // 2. Scenario 2: White-Reference Gain Normalization (AC-MDRB-029-2)
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, 220.0f, 215.0f, 210.0f, &rn, &gn, &bn), ==, PBIO_SUCCESS);
    tt_want(rn == 1.0f);
    tt_want(gn == 1.0f);
    tt_want(bn == 1.0f);

    // Clamping checks: below dark clamps to 0.0, above white clamps to 1.0
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, 0.0f, 0.0f, 0.0f, &rn, &gn, &bn), ==, PBIO_SUCCESS);
    tt_want(rn == 0.0f);
    tt_want(gn == 0.0f);
    tt_want(bn == 0.0f);
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, 300.0f, 300.0f, 300.0f, &rn, &gn, &bn), ==, PBIO_SUCCESS);
    tt_want(rn == 1.0f);
    tt_want(gn == 1.0f);
    tt_want(bn == 1.0f);

    // 3. Scenario 3: Mid-Scale Proportional Linearity (AC-MDRB-029-3)
    tt_uint_op(pbio_mdrobotbase_color_cal_set_black_reference(rb, 0.0f, 0.0f, 0.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_white_reference(rb, 100.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, 50.0f, 25.0f, 75.0f, &rn, &gn, &bn), ==, PBIO_SUCCESS);
    tt_want(fabsf(rn - 0.5f) < 0.001f);
    tt_want(fabsf(gn - 0.25f) < 0.001f);
    tt_want(fabsf(bn - 0.75f) < 0.001f);

    // 4. Scenario 4: Degenerate Dynamic Range Rejection (AC-MDRB-029-4)
    tt_uint_op(pbio_mdrobotbase_color_cal_set_black_reference(rb, 50.0f, 50.0f, 50.0f), ==, PBIO_SUCCESS);
    // Difference <= 5.0 must be rejected
    tt_uint_op(pbio_mdrobotbase_color_cal_set_white_reference(rb, 52.0f, 52.0f, 52.0f), ==, PBIO_ERROR_INVALID_ARG);
    // Inverted range (white < black) must be rejected
    tt_uint_op(pbio_mdrobotbase_color_cal_set_white_reference(rb, 40.0f, 40.0f, 40.0f), ==, PBIO_ERROR_INVALID_ARG);
    // Negative and non-finite checks
    tt_uint_op(pbio_mdrobotbase_color_cal_set_black_reference(rb, -1.0f, 10.0f, 10.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_white_reference(rb, NAN, 100.0f, 100.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, -5.0f, 50.0f, 50.0f, &rn, &gn, &bn), ==, PBIO_ERROR_INVALID_ARG);
    // Null pointer checks
    tt_uint_op(pbio_mdrobotbase_color_cal_set_black_reference(NULL, 0.0f, 0.0f, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_white_reference(NULL, 100.0f, 100.0f, 100.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_normalize(NULL, 50.0f, 50.0f, 50.0f, &rn, &gn, &bn), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, 50.0f, 50.0f, 50.0f, NULL, &gn, &bn), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, 50.0f, 50.0f, 50.0f, &rn, NULL, &bn), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, 50.0f, 50.0f, 50.0f, &rn, &gn, NULL), ==, PBIO_ERROR_INVALID_ARG);

    // 5. Scenario 5: Multi-Lux Illumination Invariant (AC-MDRB-029-5)
    // Surface reflectance: R=0.8, G=0.2, B=0.1
    // Condition 1: Low ambient (500 lux): ambient = 10, white = 110 (span = 100)
    tt_uint_op(pbio_mdrobotbase_color_cal_set_black_reference(rb, 10.0f, 10.0f, 10.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_white_reference(rb, 110.0f, 110.0f, 110.0f), ==, PBIO_SUCCESS);
    float r1, g1, b1;
    // Reading = 10 + 0.8*100 = 90, 10 + 0.2*100 = 30, 10 + 0.1*100 = 20
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, 90.0f, 30.0f, 20.0f, &r1, &g1, &b1), ==, PBIO_SUCCESS);
    tt_want(fabsf(r1 - 0.8f) < 0.001f);
    tt_want(fabsf(g1 - 0.2f) < 0.001f);
    tt_want(fabsf(b1 - 0.1f) < 0.001f);

    // Condition 2: High ambient (1500 lux): ambient = 30, white = 330 (span = 300)
    tt_uint_op(pbio_mdrobotbase_color_cal_set_black_reference(rb, 30.0f, 30.0f, 30.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_white_reference(rb, 330.0f, 330.0f, 330.0f), ==, PBIO_SUCCESS);
    float r2, g2, b2;
    // Reading = 30 + 0.8*300 = 270, 30 + 0.2*300 = 90, 30 + 0.1*300 = 60
    tt_uint_op(pbio_mdrobotbase_color_normalize(rb, 270.0f, 90.0f, 60.0f, &r2, &g2, &b2), ==, PBIO_SUCCESS);
    tt_want(fabsf(r2 - 0.8f) < 0.001f);
    tt_want(fabsf(g2 - 0.2f) < 0.001f);
    tt_want(fabsf(b2 - 0.1f) < 0.001f);

    // Illumination invariance: drift must be < 5% (here < 0.1%)
    tt_want(fabsf(r2 - r1) < 0.05f);
    tt_want(fabsf(g2 - g1) < 0.05f);
    tt_want(fabsf(b2 - b1) < 0.05f);

    // Clean lifecycle teardown
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_perceptual_color_classifier(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    // 1. Scenario 1 & 2: Circular Hue Distance Arithmetic & Invariants
    float dh1 = pbio_mdrobotbase_circular_hue_distance(359.0f, 1.0f);
    float dh2 = pbio_mdrobotbase_circular_hue_distance(1.0f, 359.0f);
    tt_want(fabsf(dh1 - 2.0f) < 1e-4f);
    tt_want(fabsf(dh2 - 2.0f) < 1e-4f);
    tt_want(dh1 == dh2);

    float dh_opp = pbio_mdrobotbase_circular_hue_distance(0.0f, 180.0f);
    tt_want(fabsf(dh_opp - 180.0f) < 1e-4f);
    tt_want(dh_opp <= 180.0f);

    float dh_wrap = pbio_mdrobotbase_circular_hue_distance(720.0f, 10.0f);
    tt_want(fabsf(dh_wrap - 10.0f) < 1e-4f);

    float dh_neg = pbio_mdrobotbase_circular_hue_distance(-10.0f, 10.0f);
    tt_want(fabsf(dh_neg - 20.0f) < 1e-4f);

    float dh_nan = pbio_mdrobotbase_circular_hue_distance(NAN, 1.0f);
    tt_want(dh_nan == 180.0f);

    // 2. Scenario 3 & 4: CIE Lab White and Black Reference Transformations
    float l = -1.0f, a = -1.0f, b = -1.0f;
    // Pure White [100.0, 100.0, 100.0] -> L* in [99.9, 100.1], a* in [-0.5, 0.5], b* in [-0.5, 0.5]
    tt_uint_op(pbio_mdrobotbase_rgb_to_lab(100.0f, 100.0f, 100.0f, &l, &a, &b), ==, PBIO_SUCCESS);
    tt_want(l >= 99.9f && l <= 100.1f);
    tt_want(fabsf(a) < 0.5f);
    tt_want(fabsf(b) < 0.5f);

    // Pure Black [0.0, 0.0, 0.0] -> L* == 0.0, a* == 0.0, b* == 0.0
    tt_uint_op(pbio_mdrobotbase_rgb_to_lab(0.0f, 0.0f, 0.0f, &l, &a, &b), ==, PBIO_SUCCESS);
    tt_want(fabsf(l) < 1e-4f);
    tt_want(fabsf(a) < 1e-4f);
    tt_want(fabsf(b) < 1e-4f);

    // Unambiguous scale contract: [1.0, 1.0, 1.0] is 1% dark gray, NOT 100% white!
    tt_uint_op(pbio_mdrobotbase_rgb_to_lab(1.0f, 1.0f, 1.0f, &l, &a, &b), ==, PBIO_SUCCESS);
    tt_want(l > 0.5f && l < 1.0f);

    // Fail-Closed Validation
    tt_uint_op(pbio_mdrobotbase_rgb_to_lab(-0.1f, 50.0f, 50.0f, &l, &a, &b), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_rgb_to_lab(105.0f, 50.0f, 50.0f, &l, &a, &b), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_rgb_to_lab(NAN, 50.0f, 50.0f, &l, &a, &b), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_rgb_to_lab(100.0f, 100.0f, 100.0f, NULL, &a, &b), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_rgb_to_lab(100.0f, 100.0f, 100.0f, &l, NULL, &b), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_rgb_to_lab(100.0f, 100.0f, 100.0f, &l, &a, NULL), ==, PBIO_ERROR_INVALID_ARG);

    // 3. Scenario 5: Color Classification with Wraparound & Similar Color Discrimination
    lego_device_type_id_t dev_id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &dev_id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, dev_id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &dev_id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, dev_id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);
    // Add prototypes:
    // Color 1: Red (h=0°, s=100, v=100)
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 1, 0.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    // Color 2: Orange (h=30°, s=100, v=100)
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 2, 30.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    // Color 3: Cyan (h=180°, s=100, v=100)
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 3, 180.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    // Color 4: Blue (h=240°, s=100, v=100)
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 4, 240.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);

    uint8_t cid = 0;
    float dist = 0.0f, conf = 0.0f;

    // Red wraparound test: sample h=359° must match Red (1), not Orange or None
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 359.0f, 100.0f, 100.0f, &cid, &dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(cid, ==, 1);
    tt_want(dist < 10.0f);
    tt_want(conf > 0.5f);

    // Warm test sample h=10°: closer to Red (0°) than Orange (30°)
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 10.0f, 100.0f, 100.0f, &cid, &dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(cid, ==, 1);

    // Warm test sample h=25°: closer to Orange (30°) than Red (0°)
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 25.0f, 100.0f, 100.0f, &cid, &dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(cid, ==, 2);

    // Cyan vs Blue discrimination: sample h=185° matches Cyan (3)
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 185.0f, 100.0f, 100.0f, &cid, &dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(cid, ==, 3);

    // Sample h=235° matches Blue (4)
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 235.0f, 100.0f, 100.0f, &cid, &dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(cid, ==, 4);

    // Clean teardown
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

// Multi-Sample Prototype Statistical Calibration & Variance Modeling Test Suite (G-MDRB-031)
static pbio_error_t test_mdrobotbase_statistical_color_calibration(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t dev_id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &dev_id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, dev_id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &dev_id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, dev_id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);

    // Scenario 4: Minimum sample count guard (AC-MDRB-031-4)
    // Ingest only 3 samples (< 5)
    for (int i = 0; i < 3; i++) {
        tt_uint_op(pbio_mdrobotbase_color_cal_add_sample_hsv(rb, 1, 0.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    }
    // Finalization must fail closed with PBIO_ERROR_INVALID_OP
    tt_uint_op(pbio_mdrobotbase_color_cal_finalize_class(rb, 1), ==, PBIO_ERROR_INVALID_OP);

    // Scenario 1: Multi-Sample Online Accumulation (AC-MDRB-031-1)
    // Reset and ingest 20 samples distributed around Red (mean_h ~ 0°, sigma ~ 3°)
    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);
    float red_samples[20] = {
        0.0f, 1.5f, 3.0f, -1.5f, -3.0f,
        2.0f, -2.0f, 4.0f, -4.0f, 0.5f,
        -0.5f, 2.5f, -2.5f, 1.0f, -1.0f,
        3.5f, -3.5f, 0.0f, 2.0f, -2.0f
    };
    for (int i = 0; i < 20; i++) {
        float h = red_samples[i];
        if (h < 0.0f) h += 360.0f;
        tt_uint_op(pbio_mdrobotbase_color_cal_add_sample_hsv(rb, 1, h, 95.0f, 90.0f), ==, PBIO_SUCCESS);
    }
    tt_uint_op(pbio_mdrobotbase_color_cal_finalize_class(rb, 1), ==, PBIO_SUCCESS);

    pbio_mdrobotbase_color_class_t cclass;
    tt_uint_op(pbio_mdrobotbase_color_cal_get_class(rb, 1, &cclass), ==, PBIO_SUCCESS);
    tt_int_op(cclass.sample_count, ==, 20);
    // mean_h must converge to 0° +- 0.5° (or >= 359.5°)
    float diff_mean = pbio_mdrobotbase_circular_hue_distance(cclass.mean_h, 0.0f);
    tt_want(diff_mean <= 0.5f);
    // var_h must be around 5.0 - 11.0 (analytical variance for this set is ~6.5)
    tt_want(cclass.var_h >= 5.0f && cclass.var_h <= 11.0f);

    // Scenario 2: Circular Mean Hue Around Boundary (AC-MDRB-031-2)
    // Ingest 10 samples alternating between 358° and 2°
    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);
    for (int i = 0; i < 10; i++) {
        float h = (i % 2 == 0) ? 358.0f : 2.0f;
        tt_uint_op(pbio_mdrobotbase_color_cal_add_sample_hsv(rb, 1, h, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    }
    tt_uint_op(pbio_mdrobotbase_color_cal_finalize_class(rb, 1), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_get_class(rb, 1, &cclass), ==, PBIO_SUCCESS);
    diff_mean = pbio_mdrobotbase_circular_hue_distance(cclass.mean_h, 0.0f);
    tt_want(diff_mean < 0.1f);
    // Linear average would be 180° - assert that circular distance to 180° is nearly 180°
    tt_want(pbio_mdrobotbase_circular_hue_distance(cclass.mean_h, 180.0f) > 170.0f);

    // Scenario 3: Transient Outlier Glitch Rejection (AC-MDRB-031-3)
    // Ingest 18 samples centered around Red (h=0°, sigma=2°) and 2 corrupted outlier samples (h=180°)
    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);
    float clean_red[18] = {
        0.0f, 1.0f, -1.0f, 2.0f, -2.0f, 0.5f, -0.5f, 1.5f, -1.5f,
        0.0f, 0.8f, -0.8f, 1.2f, -1.2f, 0.3f, -0.3f, 1.8f, -1.8f
    };
    for (int i = 0; i < 18; i++) {
        float h = clean_red[i];
        if (h < 0.0f) h += 360.0f;
        tt_uint_op(pbio_mdrobotbase_color_cal_add_sample_hsv(rb, 2, h, 90.0f, 85.0f), ==, PBIO_SUCCESS);
    }
    // Ingest 2 corrupted outlier samples at 180°
    tt_uint_op(pbio_mdrobotbase_color_cal_add_sample_hsv(rb, 2, 180.0f, 90.0f, 85.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_sample_hsv(rb, 2, 180.0f, 90.0f, 85.0f), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_color_cal_finalize_class(rb, 2), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_get_class(rb, 2, &cclass), ==, PBIO_SUCCESS);
    // Verify that the 2 outliers were discarded: sample_count == 18
    tt_int_op(cclass.sample_count, ==, 18);
    // Final mean must remain centered near 0°, unaffected by the 180° glitches
    diff_mean = pbio_mdrobotbase_circular_hue_distance(cclass.mean_h, 0.0f);
    tt_want(diff_mean <= 0.5f);

    // Clean teardown
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

// Confidence Scoring & Ambiguity Margin Rejection Test Suite (G-MDRB-032)
static pbio_error_t test_mdrobotbase_confidence_and_ambiguity_rejection(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t dev_id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &dev_id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, dev_id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &dev_id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, dev_id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    // 1. Argument validation on ambiguity threshold (AC-MDRB-032-4)
    tt_uint_op(pbio_mdrobotbase_color_cal_set_ambiguity_threshold(rb, -1.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_ambiguity_threshold(rb, NAN), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_ambiguity_threshold(NULL, 10.0f), ==, PBIO_ERROR_INVALID_ARG);

    // 2. Single Prototype Classification (AC-MDRB-032-1)
    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_threshold(rb, 50.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 1, 0.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);

    uint8_t best_id = 99;
    float min_dist = 0.0f;
    float conf = 0.0f;
    // Sample near prototype 1
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 2.0f, 100.0f, 100.0f, &best_id, &min_dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(best_id, ==, 1);
    tt_want(conf >= 0.999f); // 1.0 confidence for single prototype within threshold

    // 3. Out-of-threshold rejection (AC-MDRB-032-2)
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 180.0f, 100.0f, 100.0f, &best_id, &min_dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(best_id, ==, 0);
    tt_want(conf == 0.0f);

    // 4. Ambiguity Margin Rejection (AC-MDRB-032-3)
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 2, 30.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_ambiguity_threshold(rb, 10.0f), ==, PBIO_SUCCESS);

    // Ambiguous sample equidistant between prototype 1 (h=0) and prototype 2 (h=30)
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 15.0f, 100.0f, 100.0f, &best_id, &min_dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(best_id, ==, 0); // Rejection due to ambiguity margin

    // Clearly closer to prototype 1 (h=2, margin ~ 26 > 10)
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 2.0f, 100.0f, 100.0f, &best_id, &min_dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(best_id, ==, 1);
    tt_want(conf > 0.7f);

    // 5. Reset restores defaults
    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);

    // Clean teardown
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

static pbio_error_t test_mdrobotbase_comprehensive_verification_matrix(pbio_os_state_t *state, void *context) {
    static pbio_servo_t *srv_left;
    static pbio_servo_t *srv_right;
    static pbio_mdrobotbase_t *rb;
    static pbio_port_t *port;

    PBIO_OS_ASYNC_BEGIN(state);

    lego_device_type_id_t dev_id = LEGO_DEVICE_TYPE_ID_ANY_ENCODED_MOTOR;
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_A, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &dev_id, &srv_left), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_left, dev_id, PBIO_DIRECTION_COUNTERCLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_port(PBIO_PORT_ID_B, &port), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_port_get_servo(port, &dev_id, &srv_right), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_servo_setup(srv_right, dev_id, PBIO_DIRECTION_CLOCKWISE, 1000, true, 0), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 56000, 112000), ==, PBIO_SUCCESS);
    tt_assert(rb != NULL);

    // 1. Two-point calibration across illumination sweep
    // Black reference: [10, 10, 10], White reference: [900, 900, 900]
    tt_uint_op(pbio_mdrobotbase_color_cal_set_black_reference(rb, 10.0f, 10.0f, 10.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_white_reference(rb, 900.0f, 900.0f, 900.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_threshold(rb, 45.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_ambiguity_threshold(rb, 8.0f), ==, PBIO_SUCCESS);

    // 2. Register multi-sample prototypes: Red (h=0) and Orange (h=30)
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 1, 0.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 2, 30.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);

    uint8_t best_id = 99;
    float min_dist = 0.0f;
    float conf = 0.0f;

    // 3. Circular hue wraparound check: Red at 359° and 1°
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 359.0f, 95.0f, 95.0f, &best_id, &min_dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(best_id, ==, 1);
    tt_want(conf > 0.6f);
    tt_want(min_dist < 15.0f);

    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 1.0f, 95.0f, 95.0f, &best_id, &min_dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(best_id, ==, 1);
    tt_want(conf > 0.6f);
    tt_want(min_dist < 15.0f);

    // 4. Adjacent color separation: Orange at 29°
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 29.0f, 95.0f, 95.0f, &best_id, &min_dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(best_id, ==, 2);
    tt_want(conf > 0.6f);

    // 5. Borderline ambiguity rejection: sample at 15° (equidistant between 0° and 30°)
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 15.0f, 95.0f, 95.0f, &best_id, &min_dist, &conf), ==, PBIO_SUCCESS);
    tt_int_op(best_id, ==, 0); // Must be rejected as Color.NONE

    // 6. Native Threshold, Baseline, Prototype, and Classification Input Validation Pass
    tt_uint_op(pbio_mdrobotbase_color_cal_set_threshold(rb, NAN), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_threshold(rb, INFINITY), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_threshold(rb, 0.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_threshold(rb, -5.0f), ==, PBIO_ERROR_INVALID_ARG);

    tt_uint_op(pbio_mdrobotbase_color_cal_set_baseline(rb, NAN, 50.0f, 50.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_baseline(rb, 0.0f, -1.0f, 50.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_baseline(rb, 0.0f, 105.0f, 50.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_baseline(rb, 0.0f, 50.0f, -1.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_baseline(rb, 0.0f, 50.0f, 105.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_baseline(rb, 720.0f, 50.0f, 50.0f), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 0, 0.0f, 100.0f, 100.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 1, NAN, 100.0f, 100.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 1, 0.0f, -1.0f, 100.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 1, 0.0f, 105.0f, 100.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 1, 0.0f, 100.0f, -1.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 1, 0.0f, 100.0f, 105.0f), ==, PBIO_ERROR_INVALID_ARG);

    uint8_t dummy_id = 0;
    float dummy_d = 0.0f, dummy_c = 0.0f;
    // HSV Classification validation: S > 100, V > 100, H >= 360, H < 0
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 0.0f, 105.0f, 50.0f, &dummy_id, &dummy_d, &dummy_c), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 0.0f, 50.0f, 105.0f, &dummy_id, &dummy_d, &dummy_c), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, 360.0f, 50.0f, 50.0f, &dummy_id, &dummy_d, &dummy_c), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, -1.0f, 50.0f, 50.0f, &dummy_id, &dummy_d, &dummy_c), ==, PBIO_ERROR_INVALID_ARG);

    // HSV Sample Accumulation validation: S > 100, V > 100, H >= 360, H < 0
    tt_uint_op(pbio_mdrobotbase_color_cal_add_sample_hsv(rb, 1, 0.0f, 105.0f, 50.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_sample_hsv(rb, 1, 0.0f, 50.0f, 105.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_sample_hsv(rb, 1, 360.0f, 50.0f, 50.0f), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_sample_hsv(rb, 1, -1.0f, 50.0f, 50.0f), ==, PBIO_ERROR_INVALID_ARG);

    // RGB Classification validation: R > 100, G > 100, B > 100
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 105.0f, 50.0f, 50.0f, &dummy_id, &dummy_d, &dummy_c), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 50.0f, 105.0f, 50.0f, &dummy_id, &dummy_d, &dummy_c), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 50.0f, 50.0f, 105.0f, &dummy_id, &dummy_d, &dummy_c), ==, PBIO_ERROR_INVALID_ARG);

    // 7. 6-class Confusion Matrix Verification (Matching VirtualHub Golden Vectors, 30 trials per class = 180 total)
    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_threshold(rb, 35.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_set_ambiguity_threshold(rb, 5.0f), ==, PBIO_SUCCESS);

    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 1, 0.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 2, 30.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 3, 60.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 4, 120.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 5, 180.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_color_cal_add_prototype(rb, 6, 240.0f, 100.0f, 100.0f), ==, PBIO_SUCCESS);

    float class_hues[6] = {0.0f, 30.0f, 60.0f, 120.0f, 180.0f, 240.0f};
    for (uint8_t c = 0; c < 6; c++) {
        uint8_t expected_id = c + 1;
        for (int trial = 0; trial < 30; trial++) {
            float noise_h = class_hues[c] + (float)((trial % 7) - 3) * 1.0f;
            if (noise_h < 0.0f) {
                noise_h += 360.0f;
            } else if (noise_h >= 360.0f) {
                noise_h -= 360.0f;
            }
            float noise_s = 100.0f - (float)(trial % 4) * 1.5f;
            float noise_v = 100.0f - (float)(trial % 4) * 1.5f;
            uint8_t classified_id = 0;
            float d = 0.0f, cf = 0.0f;
            tt_uint_op(pbio_mdrobotbase_color_classify_hsv(rb, noise_h, noise_s, noise_v, &classified_id, &d, &cf), ==, PBIO_SUCCESS);
            tt_int_op(classified_id, ==, expected_id);
            tt_want(cf > 0.40f);
        }
    }

    // 8. Sensor Calibration Profile Storage & Parity Verification
    pbio_mdrobotbase_color_profile_t profile;
    tt_uint_op(pbio_mdrobotbase_color_cal_export_profile(rb, &profile), ==, PBIO_SUCCESS);
    tt_uint_op(profile.version, ==, 1);
    tt_uint_op(profile.num_prototypes, ==, 6);
    tt_want_int_op((int)profile.threshold, ==, 35);

    // Reset and confirm 0 prototypes (uncalibrated return Color.NONE)
    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);
    uint8_t uncal_id = 0;
    float uncal_d = 0.0f, uncal_c = 0.0f;
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, &uncal_id, &uncal_d, &uncal_c), ==, PBIO_SUCCESS);
    tt_int_op(uncal_id, ==, 0);

    // Reload profile and verify restoration
    tt_uint_op(pbio_mdrobotbase_color_cal_load_profile(rb, &profile), ==, PBIO_SUCCESS);
    uint8_t restored_id = 0;
    float restored_d = 0.0f, restored_c = 0.0f;
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, &restored_id, &restored_d, &restored_c), ==, PBIO_SUCCESS);
    tt_int_op(restored_id, ==, 1);

    // 8b. Transactional Atomic Profile Loading Regression Verification (P1 Finding Remediation)
    // Verify that attempting to load corrupted profiles preserves the exact existing calibration state.
    pbio_mdrobotbase_color_profile_t corrupt_profile = profile;
    corrupt_profile.prototypes[0].h = 400.0f; // Invalid hue >= 360.0f
    tt_uint_op(pbio_mdrobotbase_color_cal_load_profile(rb, &corrupt_profile), ==, PBIO_ERROR_INVALID_ARG);

    // Assert that live state is untouched: 6 prototypes, valid classification still works
    uint8_t preserved_id = 0;
    float preserved_d = 0.0f, preserved_c = 0.0f;
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, &preserved_id, &preserved_d, &preserved_c), ==, PBIO_SUCCESS);
    tt_int_op(preserved_id, ==, 1); // Prototype 1 (Red) still matches!

    // Verify invalid threshold < 0.0f preserves state
    corrupt_profile = profile;
    corrupt_profile.threshold = -5.0f;
    tt_uint_op(pbio_mdrobotbase_color_cal_load_profile(rb, &corrupt_profile), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, &preserved_id, &preserved_d, &preserved_c), ==, PBIO_SUCCESS);
    tt_int_op(preserved_id, ==, 1);

    // Verify invalid version preserves state
    corrupt_profile = profile;
    corrupt_profile.version = 99;
    tt_uint_op(pbio_mdrobotbase_color_cal_load_profile(rb, &corrupt_profile), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, &preserved_id, &preserved_d, &preserved_c), ==, PBIO_SUCCESS);
    tt_int_op(preserved_id, ==, 1);

    // Verify invalid white reference (r <= r0 + 5.0f) preserves state
    corrupt_profile = profile;
    corrupt_profile.has_black_ref = true;
    corrupt_profile.black_ref[0] = 50.0f;
    corrupt_profile.black_ref[1] = 50.0f;
    corrupt_profile.black_ref[2] = 50.0f;
    corrupt_profile.has_white_ref = true;
    corrupt_profile.white_ref[0] = 51.0f; // <= black_ref + 5.0f
    corrupt_profile.white_ref[1] = 90.0f;
    corrupt_profile.white_ref[2] = 90.0f;
    tt_uint_op(pbio_mdrobotbase_color_cal_load_profile(rb, &corrupt_profile), ==, PBIO_ERROR_INVALID_ARG);
    tt_uint_op(pbio_mdrobotbase_color_classify_rgb(rb, 100.0f, 0.0f, 0.0f, &preserved_id, &preserved_d, &preserved_c), ==, PBIO_SUCCESS);
    tt_int_op(preserved_id, ==, 1);

    // 9. Clean Reset
    tt_uint_op(pbio_mdrobotbase_color_cal_reset(rb), ==, PBIO_SUCCESS);
    tt_uint_op(pbio_mdrobotbase_put_robotbase(rb), ==, PBIO_SUCCESS);

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

struct testcase_t pbio_mdrobotbase_tests[] = {
    PBIO_THREAD_TEST(test_mdrobotbase_basics),
    PBIO_THREAD_TEST(test_mdrobotbase_motion_state),
    PBIO_THREAD_TEST(test_mdrobotbase_pivot_turn_state),
    PBIO_THREAD_TEST(test_mdrobotbase_instance_ownership),
    PBIO_THREAD_TEST(test_mdrobotbase_state_initialization),
    PBIO_THREAD_TEST(test_mdrobotbase_geometry_validation),
    PBIO_THREAD_TEST(test_mdrobotbase_gear_ratio_kinematics),
    PBIO_THREAD_TEST(test_mdrobotbase_motion_failure_reporting),
    PBIO_THREAD_TEST(test_mdrobotbase_lifecycle_safety),
    PBIO_THREAD_TEST(test_mdrobotbase_trajectory_controller_validation),
    PBIO_THREAD_TEST(test_mdrobotbase_duplicate_motor_rejection),
    PBIO_THREAD_TEST(test_mdrobotbase_motion_status_bounds),
    PBIO_THREAD_TEST(test_mdrobotbase_kinematic_invariants),
    PBIO_THREAD_TEST(test_mdrobotbase_spin_and_pivot_invariants),
    PBIO_THREAD_TEST(test_mdrobotbase_backlash_distance_conservation),
    PBIO_THREAD_TEST(test_mdrobotbase_numerical_robustness),
    PBIO_THREAD_TEST(test_mdrobotbase_behavioral_trajectory_tracking),
    PBIO_THREAD_TEST(test_mdrobotbase_accessor_encapsulation),
    PBIO_THREAD_TEST(test_mdrobotbase_portable_pointer_validation),
    PBIO_THREAD_TEST(test_mdrobotbase_fsm_state_transitions),
    PBIO_THREAD_TEST(test_mdrobotbase_multiscale_kinematic_invariants),
    PBIO_THREAD_TEST(test_mdrobotbase_fsm_terminal_helpers),
    PBIO_THREAD_TEST(test_mdrobotbase_color_classification),
    PBIO_THREAD_TEST(test_mdrobotbase_two_point_calibration),
    PBIO_THREAD_TEST(test_mdrobotbase_perceptual_color_classifier),
    PBIO_THREAD_TEST(test_mdrobotbase_statistical_color_calibration),
    PBIO_THREAD_TEST(test_mdrobotbase_confidence_and_ambiguity_rejection),
    PBIO_THREAD_TEST(test_mdrobotbase_comprehensive_verification_matrix),
    END_OF_TESTCASES
};
