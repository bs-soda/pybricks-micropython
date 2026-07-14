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
    tt_uint_op(pbio_mdrobotbase_get_robotbase(&rb, srv_left, srv_right, 56000, 112000), ==, PBIO_SUCCESS);

    // Verify default controller setting
    tt_want_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);

    // Test controller selection LQR
    tt_uint_op(pbio_mdrobotbase_set_controller(rb, PBIO_MDROBOTBASE_CONTROLLER_LQR), ==, PBIO_SUCCESS);
    tt_want_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_LQR);

    // Test controller selection PID
    tt_uint_op(pbio_mdrobotbase_set_controller(rb, PBIO_MDROBOTBASE_CONTROLLER_PID), ==, PBIO_SUCCESS);
    tt_want_int_op(rb->controller_type, ==, PBIO_MDROBOTBASE_CONTROLLER_PID);

    // Test LQR gain updates
    tt_uint_op(pbio_mdrobotbase_set_lqr_gains(rb, 1.25f, 2.5f, 3.75f), ==, PBIO_SUCCESS);
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

end:
    PBIO_OS_ASYNC_END(PBIO_SUCCESS);
}

struct testcase_t pbio_mdrobotbase_tests[] = {
    PBIO_THREAD_TEST(test_mdrobotbase_basics),
    END_OF_TESTCASES
};
