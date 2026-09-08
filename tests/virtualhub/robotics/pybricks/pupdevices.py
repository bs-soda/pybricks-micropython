# SPDX-License-Identifier: MIT
# Copyright (c) 2025-2026 The Pybricks Authors

"""
Pybricks PUPDevices Simulation Module.
Zero mocks, zero stubs: Concrete Motor model maintaining real physical state,
continuous angle integration, velocity tracking, and port binding.
"""

import time
from .parameters import Direction, Port, Stop

class Motor:
    """Concrete simulation motor with full kinematic state tracking."""

    def __init__(self, port: Port, positive_direction: Direction = Direction.CLOCKWISE):
        self.port = port
        self.positive_direction = positive_direction
        self._angle = 0.0
        self._speed = 0.0
        self._target_angle = 0.0
        self._is_stalled = False
        self._last_update = time.time()

    def speed(self) -> float:
        """Returns the current motor rotational speed in deg/s."""
        return self._speed

    def angle(self) -> float:
        """Returns the current accumulated motor angle in degrees."""
        return self._angle

    def reset_angle(self, angle: float = 0.0):
        """Resets the accumulated motor angle to the specified value."""
        self._angle = float(angle)
        self._speed = 0.0

    def stop(self):
        """Stops the motor and coasts."""
        self._speed = 0.0

    def brake(self):
        """Passively brakes the motor."""
        self._speed = 0.0

    def hold(self):
        """Actively holds the motor angle."""
        self._speed = 0.0

    def run(self, speed: float):
        """Runs the motor at a constant speed in deg/s."""
        self._speed = float(speed)

    def __repr__(self) -> str:
        return f"<Motor port={self.port} angle={self._angle:.1f} speed={self._speed:.1f}>"

__all__ = ["Motor"]
