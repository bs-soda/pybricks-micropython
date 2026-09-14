// SPDX-License-Identifier: MIT
// Copyright (c) 2018-2021 The Pybricks Authors

#include <stddef.h>

#include <pbio/error.h>

/**
 * Gets a string describing an error.
 * @param [in]  err     The error code
 * @return              A string describing the error or *NULL*
 */
const char *pbio_error_str(pbio_error_t err) {
    switch (err) {
        case PBIO_SUCCESS:
            break;
        case PBIO_ERROR_FAILED:
            return "Unknown error";
        case PBIO_ERROR_INVALID_ARG:
            return "Invalid argument";
        case PBIO_ERROR_IO:
            return "I/O error";
        case PBIO_ERROR_BUSY:
            return "Device or resource busy";
        case PBIO_ERROR_NO_DEV:
            return "Device not connected";
        case PBIO_ERROR_NOT_IMPLEMENTED:
            return "Not implemented";
        case PBIO_ERROR_NOT_SUPPORTED:
            return "Not supported";
        case PBIO_ERROR_AGAIN:
            return "Try again later";
        case PBIO_ERROR_INVALID_OP:
            return "Invalid operation";
        case PBIO_ERROR_TIMEDOUT:
            return "Timed out";
        case PBIO_ERROR_CANCELED:
            return "Canceled";
        case PBIO_ERROR_LQR_FAILED:
            return "LQR controller failed to compute a valid command";
        case PBIO_ERROR_ODOMETRY_FAILED:
            return "MDRobotBase odometry update failed";
        case PBIO_ERROR_IMU_FAILED:
            return "MDRobotBase IMU heading unavailable";
        case PBIO_ERROR_NAVIGATION_STALLED:
            return "MDRobotBase navigation stalled";
        case PBIO_ERROR_TURN_STALLED:
            return "MDRobotBase turn stalled";
        case PBIO_ERROR_PIVOT_STALLED:
            return "MDRobotBase pivot stalled";
        case PBIO_ERROR_TRAJECTORY_STALLED:
            return "MDRobotBase trajectory stalled";
    }

    return NULL;
}
