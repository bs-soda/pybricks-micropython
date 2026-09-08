# SPDX-License-Identifier: MIT
# Copyright (c) 2025-2026 The Pybricks Authors

"""
Pybricks Tools Simulation Module.
Zero mocks, zero stubs: Concrete async scheduling and time delay primitives.
"""

import asyncio
from typing import Coroutine, Any

async def wait(ms: int | float):
    """Pauses the current async task for the given duration in milliseconds."""
    await asyncio.sleep(float(ms) / 1000.0)

def run_task(coro: Coroutine) -> Any:
    """
    Executes a coroutine. If an event loop is currently active, schedules it as
    an asyncio Task and returns the Task handle. Otherwise runs the event loop to completion.
    """
    try:
        loop = asyncio.get_running_loop()
        return loop.create_task(coro)
    except RuntimeError:
        return asyncio.run(coro)

__all__ = ["wait", "run_task"]
