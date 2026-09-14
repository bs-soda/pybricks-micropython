# SPDX-License-Identifier: MIT
# Copyright (c) 2025-2026 The Pybricks Authors

"""
Pybricks Parameters Simulation Module.
Zero mocks, zero stubs: Concrete parameter classes for Port, Direction, and Stop.
"""

from enum import Enum, IntEnum

class Port(IntEnum):
    A = 1
    B = 2
    C = 3
    D = 4
    E = 5
    F = 6

class Direction(IntEnum):
    CLOCKWISE = 1
    COUNTERCLOCKWISE = -1

class Stop(IntEnum):
    COAST = 0
    BRAKE = 1
    HOLD = 2

__all__ = ["Port", "Direction", "Stop"]
