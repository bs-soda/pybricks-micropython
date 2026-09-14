"""
sample_color_navigation.py
==========================
Comprehensive Pybricks / MDRobotBase sample script for HSV + RGB color detection,
sequential nearby position pickup optimization, and dual-arm attachment pick-and-place.

Hardware & Port Configuration:
------------------------------
Hub: PrimeHub(top_side=Axis.Z, front_side=-Axis.X)
Left Motor: Port F (COUNTERCLOCKWISE)
Right Motor: Port B (CLOCKWISE)
Front Arm: Port E
Back Arm: Port A
Line Sensor: Port C
Color Sensor: Auto-detected (Port D preferred)

Note Positions:
---------------
Index 0: [1232.0, 1059.0] -> Dynamic Color
Index 1: [1365.0, 1059.0] -> Dynamic Color
Index 2: [1498.0, 1059.0] -> Fixed RED (Big Note -> Back Arm Port A)
Index 3: [1629.0, 1059.0] -> Fixed GREEN (Big Note -> Back Arm Port A)
Index 4: [1761.0, 1059.0] -> Dynamic Color
Index 5: [1891.0, 1059.0] -> Dynamic Color

Color Drop-Off Areas:
--------------------
YELLOW: [1068.0, 552.0]
BLACK:  [1223.0, 494.0]
RED:    [1384.0, 528.0]
GREEN:  [1551.0, 596.0]
BLUE:   [1692.0, 661.0]
WHITE:  [1862.0, 756.0]
"""

try:
    import umath as math
except ImportError:
    import math

from pybricks.hubs import PrimeHub

from pybricks.pupdevices import Motor, ColorSensor
from pybricks.parameters import Port, Direction, Color, Stop, Axis, Button
try:
    from pybricks.tools import wait, StopWatch, multitask, run_task
    async def async_wait(ms):
        await wait(ms)
except ImportError:
    import asyncio
    from pybricks.tools import wait, StopWatch
    async def multitask(*coroutines):
        return await asyncio.gather(*coroutines)
    def run_task(coroutine):
        return asyncio.run(coroutine)
    async def async_wait(ms):
        await asyncio.sleep(ms / 1000.0)


try:
    from pybricks.robotics import MDRobotBase
except ImportError:
    from MDRobotBase import MDRobotBase

# =====================================================================
# 1. Hardware Configuration & Coordinate Definitions
# =====================================================================

NOTE_POSITIONS = [
    [1232.0, 1059.0],  # Index 0: Dynamic
    [1365.0, 1059.0],  # Index 1: Dynamic
    [1498.0, 1059.0],  # Index 2: Fixed RED (BIG Note)
    [1629.0, 1059.0],  # Index 3: Fixed GREEN (BIG Note)
    [1761.0, 1059.0],  # Index 4: Dynamic
    [1891.0, 1059.0],  # Index 5: Dynamic
]

COLOR_AREAS = {
    Color.YELLOW: [1068.0, 552.0],
    Color.BLACK:  [1223.0, 494.0],
    Color.RED:    [1384.0, 528.0],
    Color.GREEN:  [1551.0, 596.0],
    Color.BLUE:   [1692.0, 661.0],
    Color.WHITE:  [1862.0, 756.0],
}

COLOR_NAMES = {
    Color.YELLOW: "YELLOW",
    Color.BLACK:  "BLACK",
    Color.RED:    "RED",
    Color.GREEN:  "GREEN",
    Color.BLUE:   "BLUE",
    Color.WHITE:  "WHITE",
    Color.NONE:   "NONE",
}


# =====================================================================
# 2. Multi-Modal HSV + RGB Sensor Fusion Classifier
# =====================================================================

def hsv_to_rgb(hsv_tuple):
    """
    Converts HSV (H: 0-360 deg, S: 0-100%, V: 0-100%) to RGB (R, G, B in 0-100 scale).
    Performs safe attribute and sequence unpacking for Pybricks Color object / tuple compatibility.
    """
    if hsv_tuple is None:
        return (0, 0, 0)

    if hasattr(hsv_tuple, "h"):
        h, s, v = hsv_tuple.h, hsv_tuple.s, hsv_tuple.v
    elif isinstance(hsv_tuple, (tuple, list)):
        h, s, v = hsv_tuple[0], hsv_tuple[1], hsv_tuple[2]
    else:
        return (0, 0, 0)

    s_norm = s / 100.0
    v_norm = v / 100.0
    c = v_norm * s_norm
    h_sec = (h % 360) / 60.0
    x = c * (1.0 - abs((h_sec % 2.0) - 1.0))
    m = v_norm - c

    if 0.0 <= h_sec < 1.0:
        r_p, g_p, b_p = c, x, 0.0
    elif 1.0 <= h_sec < 2.0:
        r_p, g_p, b_p = x, c, 0.0
    elif 2.0 <= h_sec < 3.0:
        r_p, g_p, b_p = 0.0, c, x
    elif 3.0 <= h_sec < 4.0:
        r_p, g_p, b_p = 0.0, x, c
    elif 4.0 <= h_sec < 5.0:
        r_p, g_p, b_p = x, 0.0, c
    else:
        r_p, g_p, b_p = c, 0.0, x

    r = int(round((r_p + m) * 100.0))
    g = int(round((g_p + m) * 100.0))
    b = int(round((b_p + m) * 100.0))
    return (r, g, b)


def classify_hsv_rgb(hsv_tuple, rgb_tuple=None):
    """
    Fuses Cylindrical HSV (Hue, Saturation, Value) and Cartesian RGB (Red, Green, Blue)
    channel data for robust WRO color classification. Automatically derives RGB from HSV
    if rgb_tuple is None or unavailable on hardware (e.g. Pybricks SPIKE Prime ColorSensor).
    """
    if hsv_tuple is None:
        return Color.NONE

    if hasattr(hsv_tuple, "h"):
        h, s, v = hsv_tuple.h, hsv_tuple.s, hsv_tuple.v
    else:
        h, s, v = hsv_tuple[0], hsv_tuple[1], hsv_tuple[2]

    if rgb_tuple is None:
        rgb_tuple = hsv_to_rgb(hsv_tuple)

    if hasattr(rgb_tuple, "r"):
        r, g, b = rgb_tuple.r, rgb_tuple.g, rgb_tuple.b
    else:
        r, g, b = rgb_tuple[0], rgb_tuple[1], rgb_tuple[2]

    # --- 1. Black & White Achromatic Thresholding ---
    if v < 18 or (r < 15 and g < 15 and b < 15):
        return Color.BLACK

    if (v > 60 and s < 25) or (r > 55 and g > 55 and b > 55 and abs(r - g) < 15 and abs(g - b) < 15):
        return Color.WHITE

    # --- 2. Chromatic Color Classification ---
    if (h < 25 or h > 335) or (r > g + 15 and r > b + 15):
        return Color.RED

    if (30 <= h <= 75) or (r > 35 and g > 35 and b < 30 and abs(r - g) < 25):
        return Color.YELLOW

    if (85 <= h <= 160) or (g > r + 10 and g > b + 10):
        return Color.GREEN

    if (180 <= h <= 260) or (b > r + 10 and b > g + 10):
        return Color.BLUE

    return Color.NONE


def classify_hsv(hsv_tuple):
    """Alias / fallback classifier using HSV data for backward compatibility."""
    return classify_hsv_rgb(hsv_tuple, rgb_tuple=None)


class NoteColorNavigator:
    """
    Encapsulates Dual-Arm (Front Arm for Standard Notes, Back Arm for Big RED/GREEN Notes)
    with Sequential Nearby Position Pickup Optimization and Unique Candidate Pool Popping.
    """

    def __init__(self, robot, front_arm=None, back_arm=None, color_sensor=None):
        self.robot = robot
        self.front_arm = front_arm
        self.back_arm = back_arm
        self.color_sensor = color_sensor
        self.slot_colors = [Color.NONE] * 6

        # Fixed slots: Index 2 -> RED, Index 3 -> GREEN (BIG Notes)
        self.slot_colors[2] = Color.RED
        self.slot_colors[3] = Color.GREEN

        # Dynamic color candidate pool (each note has a UNIQUE color!)
        self.available_colors = [Color.YELLOW, Color.BLACK, Color.BLUE, Color.WHITE]

    def pop_color(self, color):
        """
        Pops detected color from the available candidate pool, guaranteeing
        that each note color remains 100% unique across all slots.
        """
        if color in self.available_colors:
            self.available_colors.remove(color)
            remaining_names = [COLOR_NAMES.get(c, 'UNKNOWN') for c in self.available_colors]
            print(f"[Unique Color Engine] Popped '{COLOR_NAMES.get(color)}'. Remaining Pool: {remaining_names}")
            return True
        return False

    def resolve_unassigned_slots(self):
        """Fills any unassigned dynamic slots using process of elimination from available_colors pool."""
        for i in range(6):
            if self.slot_colors[i] == Color.NONE:
                if self.available_colors:
                    assigned = self.available_colors.pop(0)
                    self.slot_colors[i] = assigned
                    print(f"[Process of Elimination] Assigned remaining color '{COLOR_NAMES.get(assigned)}' to Slot {i}.")

    def grab_note(self, is_big_note=False):
        """Actuates either BACK ARM (big RED/GREEN notes) or FRONT ARM (standard notes)."""
        if is_big_note:
            print("Actuating BACK ARM (Port A) to grab BIG note (RED/GREEN)...")
            if self.back_arm is not None:
                self.back_arm.run_angle(speed=400, rotation_angle=120, then=Stop.HOLD)
                wait(200)
        else:
            print("Actuating FRONT ARM (Port E) to grab STANDARD note...")
            if self.front_arm is not None:
                self.front_arm.run_angle(speed=400, rotation_angle=120, then=Stop.HOLD)
                wait(200)

    def release_note(self, is_big_note=False):
        """Releases note using either BACK ARM or FRONT ARM."""
        if is_big_note:
            print("Actuating BACK ARM (Port A) to release BIG note...")
            if self.back_arm is not None:
                self.back_arm.run_angle(speed=400, rotation_angle=-120, then=Stop.HOLD)
                wait(200)
        else:
            print("Actuating FRONT ARM (Port E) to release STANDARD note...")
            if self.front_arm is not None:
                self.front_arm.run_angle(speed=400, rotation_angle=-120, then=Stop.HOLD)
                wait(200)

    async def detect_slot_color_multi_sample(self, index, num_samples=7, sample_delay_ms=10):
        """
        Collects num_samples temporal/spatial readings over slot index, filtering votes
        against the available candidate color pool. Pops winning color upon detection.
        """
        if index == 2:
            return Color.RED
        if index == 3:
            return Color.GREEN

        if self.slot_colors[index] != Color.NONE:
            return self.slot_colors[index]

        # Automatic resolution if only 1 candidate remains in pool
        if len(self.available_colors) == 1:
            last_color = self.available_colors[0]
            self.pop_color(last_color)
            self.slot_colors[index] = last_color
            print(f"[Elimination Engine] Slot {index} automatically resolved to '{COLOR_NAMES.get(last_color)}'.")
            return last_color

        if self.color_sensor is None:
            fallback = Color.BLACK if Color.BLACK in self.available_colors else (self.available_colors[0] if self.available_colors else Color.BLACK)
            self.pop_color(fallback)
            self.slot_colors[index] = fallback
            return fallback

        votes = {}
        for _ in range(num_samples):
            raw_color = None
            try:
                raw_color_val = self.color_sensor.color()
                try:
                    raw_color = await raw_color_val
                except (TypeError, AttributeError):
                    raw_color = raw_color_val
            except Exception:
                pass

            hsv, rgb = None, None
            try:
                hsv_val = self.color_sensor.hsv()
                try:
                    hsv = await hsv_val
                except (TypeError, AttributeError):
                    hsv = hsv_val
            except Exception:
                pass

            if hasattr(self.color_sensor, "rgb"):
                try:
                    rgb_val = self.color_sensor.rgb()
                    try:
                        rgb = await rgb_val
                    except (TypeError, AttributeError):
                        rgb = rgb_val
                except Exception:
                    rgb = None

            if rgb is None and hsv is not None:
                rgb = hsv_to_rgb(hsv)

            if hsv is not None:
                fused_color = classify_hsv_rgb(hsv, rgb)
                if fused_color in self.available_colors:
                    votes[fused_color] = votes.get(fused_color, 0) + 1
            elif raw_color in self.available_colors:
                votes[raw_color] = votes.get(raw_color, 0) + 1

            await async_wait(sample_delay_ms)

        best_color = None
        if votes:
            best_color = max(votes, key=votes.get)
        elif self.available_colors:
            best_color = Color.BLACK if Color.BLACK in self.available_colors else self.available_colors[0]

        if best_color is not None:
            self.pop_color(best_color)
            self.slot_colors[index] = best_color
            return best_color

        return Color.BLACK

    async def detect_slot_color(self, index):
        """Detects color using fixed assignment for Index 2 & 3, HSV+RGB multi-sample for others."""
        return await self.detect_slot_color_multi_sample(index, num_samples=5, sample_delay_ms=10)



    async def execute_sequential_sweep(self, drive_speed=400.0):
        """
        Optimized Sequential Sweep with Real-Time Odometry Position Tracking:
        Performs a fast straight-line scan along the note slot axis, using real-time
        odometry (x, y, theta) to trigger multi-sample color classification over each slot.
        Then executes sequential pick-and-place with Front Arm / Back Arm to drop-off areas.
        """
        print("=== Starting Optimized Sequential Nearby Pickup Mission ===")

        # Check starting position to determine scan direction (0->5 or 5->0)
        x, y, theta = self.robot.get_state()
        print(f"Start Pose -> x: {x:.1f}, y: {y:.1f}, theta: {theta:.1f}")
        is_fwd_scan = True
        if x < (NOTE_POSITIONS[2][0] + NOTE_POSITIONS[3][0]) / 2.0:
            is_fwd_scan = False

        # Step 1: Scan & Identify Colors along the note line (Drive DONE -> Scan BEGIN)
        if is_fwd_scan:
            print("\n--- Phase 1: Sequential Scan across Slots 5 to 0 (Drive DONE -> Scan BEGIN) ---")
            await self.robot.navigate_to_goal(
                goal_x=2050.0,
                goal_y=900.0,
                goal_theta=-180.0,
                speed_mm_s=500.0,
                start_speed_mm_s=50.0,
                end_speed_mm_s=20.0,
                accel_dist_mm=50.0,
                decel_dist_mm=100.0,
                use_ramping=False,
                tolerance_dist=10.0,
                then=Stop.HOLD
            )

            for i in reversed(range(6)):
                note_x, note_y = NOTE_POSITIONS[i]
                target_x = note_x - 45.0

                # 1. Drive to slot goal and come to a COMPLETE HOLD
                await self.robot.navigate_to_goal(
                    goal_x=target_x,
                    goal_y=930.0,
                    speed_mm_s=drive_speed,
                    start_speed_mm_s=drive_speed,
                    end_speed_mm_s=0.0,
                    accel_dist_mm=50.0,
                    decel_dist_mm=50.0,
                    use_ramping=False,
                    tolerance_dist=10.0,
                    then=Stop.HOLD
                )

                # 2. Navigation DONE -> Robot stationary -> SCAN BEGINS
                await async_wait(100)
                curr_x, curr_y, curr_theta = self.robot.get_state()
                self.slot_colors[i] = await self.detect_slot_color_multi_sample(i, num_samples=7, sample_delay_ms=10)
                color_name = COLOR_NAMES.get(self.slot_colors[i], 'UNKNOWN')
                print(f"[Navigate DONE -> Scan BEGIN] Pose: ({curr_x:.1f}, {curr_y:.1f}) | Slot {i} ({note_x:.1f}, {note_y:.1f}) -> Detected Color: {color_name}")

        else:
            print("\n--- Phase 1: Sequential Scan across Slots 0 to 5 (Drive DONE -> Scan BEGIN) ---")
            await self.robot.navigate_to_goal(
                goal_x=900.0,
                goal_y=900.0,
                goal_theta=0.0,
                speed_mm_s=500.0,
                start_speed_mm_s=50.0,
                end_speed_mm_s=20.0,
                accel_dist_mm=50.0,
                decel_dist_mm=100.0,
                use_ramping=False,
                tolerance_dist=10.0,
                then=Stop.HOLD
            )
            for i in range(6):
                note_x, note_y = NOTE_POSITIONS[i]
                target_x = note_x - 45.0

                # 1. Drive to slot goal and come to a COMPLETE HOLD
                await self.robot.navigate_to_goal(
                    goal_x=target_x,
                    goal_y=930.0,
                    speed_mm_s=drive_speed,
                    start_speed_mm_s=drive_speed,
                    end_speed_mm_s=0.0,
                    accel_dist_mm=50.0,
                    decel_dist_mm=50.0,
                    use_ramping=False,
                    tolerance_dist=10.0,
                    then=Stop.HOLD
                )

                # 2. Navigation DONE -> Robot stationary -> SCAN BEGINS
                await async_wait(100)
                curr_x, curr_y, curr_theta = self.robot.get_state()
                self.slot_colors[i] = await self.detect_slot_color_multi_sample(i, num_samples=7, sample_delay_ms=10)
                color_name = COLOR_NAMES.get(self.slot_colors[i], 'UNKNOWN')
                print(f"[Navigate DONE -> Scan BEGIN] Pose: ({curr_x:.1f}, {curr_y:.1f}) | Slot {i} ({note_x:.1f}, {note_y:.1f}) -> Detected Color: {color_name}")

        # Post-scan process of elimination for any unassigned dynamic slots
        self.resolve_unassigned_slots()

        # Step 2: Sequential Pickup & Placement
        print("\n--- Phase 2: Sequential Nearby Grab & Deposit ---")
        processed = [False] * 6

        for i in range(6):
            if processed[i]:
                continue

            note_x, note_y = NOTE_POSITIONS[i]
            color = self.slot_colors[i]
            is_big_note = (color in (Color.RED, Color.GREEN)) or (i in (2, 3))
            color_name = COLOR_NAMES.get(color, "UNKNOWN")
            arm_str = "BACK ARM (Port A)" if is_big_note else "FRONT ARM (Port E)"

            print(f"\nProcessing Slot {i} ({color_name}) using {arm_str}...")

            # Move straight to note position using odometry
            await self.robot.navigate_to_goal(
                goal_x=note_x,
                goal_y=note_y,
                speed_mm_s=drive_speed,
                backward=is_big_note,
                then=Stop.HOLD
            )
            await async_wait(100)

            # Grab note with appropriate arm
            self.grab_note(is_big_note=is_big_note)
            processed[i] = True

            # Move to target drop-off area
            if color in COLOR_AREAS:
                area_x, area_y = COLOR_AREAS[color]
                print(f"Navigating to {color_name} Area at ({area_x:.1f}, {area_y:.1f})...")
                await self.robot.navigate_to_goal(
                    goal_x=area_x,
                    goal_y=area_y,
                    speed_mm_s=drive_speed,
                    backward=is_big_note,
                    then=Stop.HOLD
                )
                await async_wait(100)
                self.release_note(is_big_note=is_big_note)

                # Short retreat away from drop area
                await self.robot.navigate_to_goal(
                    goal_x=area_x - 50.0 if not is_big_note else area_x + 50.0,
                    goal_y=area_y - 50.0 if not is_big_note else area_y + 50.0,
                    speed_mm_s=250.0,
                    backward=not is_big_note,
                    then=Stop.HOLD
                )

        print("\n=== Optimized Sequential Mission Complete! ===")

    async def scan_colors_task(self):
        """
        Asynchronous background coroutine scanning colors in parallel WHILE navigate_to_goal is driving.
        Terminates immediately when navigation finishes (self.is_scanning == False).
        """
        print("[Parallel Scan Started] Coroutine active in-flight during drive...")
        while self.is_scanning:
            curr_x, curr_y, curr_theta = self.robot.get_state()
            for i, (note_x, note_y) in enumerate(NOTE_POSITIONS):
                target_x = note_x - 45.0
                if abs(curr_x - target_x) <= 45.0 and self.slot_colors[i] == Color.NONE:
                    detected = await self.detect_slot_color_multi_sample(i, num_samples=5, sample_delay_ms=5)
                    if detected != Color.NONE:
                        color_name = COLOR_NAMES.get(detected, 'UNKNOWN')
                        print(f"[Parallel In-Flight Scan] Pose: ({curr_x:.1f}, {curr_y:.1f}) | Slot {i} -> {color_name}")
            await async_wait(15)

        print("[Drive DONE -> Scan TERMINATED] Robot reached goal; scanning stopped completely.")


    async def drive_sweep_task(self, drive_speed=400.0):
        """Asynchronous coroutine navigating straight along the note sweep path while yielding for in-flight scanning."""
        goal_x = 900.0 if self.is_fwd_scan else 2050.0
        goal_y = 930.0
        print(f"[Drive Task Started] Navigating to Goal ({goal_x:.1f}, {goal_y:.1f}) at {drive_speed} mm/s...")

        await self.robot.navigate_to_goal(
            goal_x=goal_x,
            goal_y=goal_y,
            goal_theta=-180.0,
            speed_mm_s=drive_speed,
            start_speed_mm_s=drive_speed,
            end_speed_mm_s=drive_speed,
            accel_dist_mm=50.0,
            decel_dist_mm=100.0,
            use_ramping=False,
            tolerance_dist=10.0,
            then=Stop.COAST
        )

        # 2. Drive DONE -> Stop scanning immediately so robot scans nothing when navigation finishes
        self.is_scanning = False
        print("[Drive Task DONE] Reached target coordinate; scanning stopped.")



    async def execute_parallel_sweep_multitask(self, drive_speed=400.0):
        """
        Executes straight-line navigation and color detection concurrently in parallel
        using pybricks.tools.multitask. As soon as navigate_to_goal completes, scanning stops.
        """
        print("=== Starting Parallel Multitask Navigation & In-Flight Color Scanning ===")
        self.is_scanning = True
        x, y, theta = self.robot.get_state()
        self.is_fwd_scan = (x >= (NOTE_POSITIONS[2][0] + NOTE_POSITIONS[3][0]) / 2.0)

        if self.is_fwd_scan:
            await self.robot.navigate_to_goal(
                goal_x=2050.0,
                goal_y=900.0,
                goal_theta=-180.0,
                speed_mm_s=500.0,
                start_speed_mm_s=50.0,
                end_speed_mm_s=20.0,
                accel_dist_mm=50.0,
                decel_dist_mm=100.0,
                use_ramping=False,
                tolerance_dist=10.0,
                then=Stop.COAST
            )
        else:
            await self.robot.navigate_to_goal(
                goal_x=900.0,
                goal_y=900.0,
                goal_theta=-180.0,
                speed_mm_s=500.0,
                start_speed_mm_s=50.0,
                end_speed_mm_s=20.0,
                accel_dist_mm=50.0,
                decel_dist_mm=100.0,
                use_ramping=False,
                backward=True,
                tolerance_dist=10.0,
                then=Stop.COAST
            )

        # Run drive and in-flight scan in parallel
        await multitask(
            self.scan_colors_task(),
            self.drive_sweep_task(drive_speed=drive_speed)
        )
        self.resolve_unassigned_slots()
        print("=== Parallel Multitask Navigation Complete! (Scan stopped post-navigation) ===")


    async def _move_arm_by_angle_with_stall_impl(self, motor, speed, rotation_angle, then=Stop.HOLD, timeout_ms=3000, acceleration=None):
        if motor is None:
            pass
            return False
        old_limits = None
        try:
            old_limits = motor.control.limits()
            new_speed = old_limits[0]
            new_accel = acceleration if acceleration is not None else old_limits[1]
            new_torque = old_limits[2]
            motor.control.limits(new_speed, new_accel, new_torque)
        except Exception:
            pass
        try:
            motor.run_angle(speed, rotation_angle, then=then, wait=False)
        except Exception as e:
            pass
            if old_limits is not None:
                try:
                    motor.control.limits(old_limits[0], old_limits[1], old_limits[2])
                except Exception:
                    pass
            return False
        await wait(100)
        timer = StopWatch()
        stalled = False
        while timer.time() < timeout_ms:
            done = False
            try:
                done = motor.control.done()
            except Exception:
                try:
                    done = motor.done()
                except Exception:
                    pass
            if done:
                break
            is_stalled = False
            try:
                is_stalled = motor.control.stalled()
            except Exception:
                try:
                    is_stalled = motor.stalled()
                except Exception:
                    pass
            try:
                current_speed = motor.speed()
                if abs(current_speed) < 10:
                    is_stalled = True
            except Exception:
                pass
            if is_stalled:
                stalled = True
                pass
                break
            await wait(10)
        if stalled:
            try:
                motor.hold()
            except Exception:
                try:
                    motor.brake()
                except Exception:
                    pass
        if old_limits is not None:
            try:
                motor.control.limits(old_limits[0], old_limits[1], old_limits[2])
            except Exception:
                pass
        return stalled

    async def move_back_arm_angle(self, speed, rotation_angle, then=Stop.HOLD, stop_on_stall=True, timeout_ms=3000, acceleration=None):
        if self.back_arm is None:
            return False
        native_stop = then
        if stop_on_stall:
            res = await self._move_arm_by_angle_with_stall_impl(self.back_arm, speed, rotation_angle, then=native_stop, timeout_ms=timeout_ms, acceleration=acceleration)
            return res
        else:
            old_limits = None
            if acceleration is not None:
                try:
                    old_limits = self.back_arm.control.limits()
                    self.back_arm.control.limits(old_limits[0], acceleration, old_limits[2])
                except Exception:
                    pass
            try:
                self.back_arm.run_angle(speed, rotation_angle, then=native_stop, wait=False)
                await wait(100)
                while True:
                    done = False
                    try:
                        done = self.back_arm.control.done()
                    except Exception:
                        try:
                            done = self.back_arm.done()
                        except Exception:
                            pass
                    if done:
                        break
                    await wait(10)
            except Exception:
                pass
            if old_limits is not None:
                try:
                    self.back_arm.control.limits(old_limits[0], old_limits[1], old_limits[2])
                except Exception:
                    pass
            return False

    async def move_front_arm_angle(self, speed, rotation_angle, then=Stop.HOLD, stop_on_stall=True, timeout_ms=3000, acceleration=None):
        if self.front_arm is None:
            return False
        native_stop = then

        if stop_on_stall:
            res = await self._move_arm_by_angle_with_stall_impl(self.front_arm, speed, rotation_angle, then=native_stop, timeout_ms=timeout_ms, acceleration=acceleration)
            return res
        else:
            old_limits = None
            if acceleration is not None:
                try:
                    old_limits = self.front_arm.control.limits()
                    self.front_arm.control.limits(old_limits[0], acceleration, old_limits[2])
                except Exception:
                    pass
            try:
                self.front_arm.run_angle(speed, rotation_angle, then=native_stop, wait=False)
                await wait(100)
                while True:
                    done = False
                    try:
                        done = self.front_arm.control.done()
                    except Exception:
                        try:
                            done = self.front_arm.done()
                        except Exception:
                            pass
                    if done:
                        break
                    await wait(10)
            except Exception:
                pass
            if old_limits is not None:
                try:
                    self.front_arm.control.limits(old_limits[0], old_limits[1], old_limits[2])
                except Exception:
                    pass
            return False


robot = None
navigator = None
hub = None
front_arm = None
back_arm = None
line_sensor = None
color_sensor = None
async def main():
    # Start Point
    await navigator.move_front_arm_angle(speed=250, rotation_angle=-10) # +Release -Grab

    # Settle To Grab Bottom Cable
    await multitask(
        navigator.move_front_arm_angle(speed=250, rotation_angle=200), # +Release -Grab
        robot.turn_to_angle(
            target_angle=20.0,
            speed_deg_s=500.0,
            tolerance=1.0,
            # timeout_ms=3000,
            then=Stop.HOLD,
            accel_angle=15.0,
            start_speed=40.0,
            decel_angle=15.0,
            end_speed=20.0
        )
    )
    await robot.navigate_to_goal(
        goal_x=800.0,              # Target X coordinate (mm)
        goal_y=350.0,              # Target Y coordinate (mm)
        # goal_theta=90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=300.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=50.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )
    await robot.navigate_to_goal(
        goal_x=635.0,              # Target X coordinate (mm)
        goal_y=210.0,              # Target Y coordinate (mm)
        goal_theta=90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=100.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=50.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )

    # Grab Bottom Cable
    x,y,theta = robot.get_state()
    print(f"x:{x}, y:{y}, theta: {theta}")
    # robot.reset_state(640, y, theta, hub.imu.heading())
    await multitask(
        robot.navigate_to_goal(
            goal_x=635.0,              # Target X coordinate (mm)
            goal_y=190.0,              # Target Y coordinate (mm)
            goal_theta=90.0,           # Target heading (degrees) to align to at the end
            speed_mm_s=100.0,          # Cruise speed (mm/s)
            start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
            end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
            accel_dist_mm=50.0,
            decel_dist_mm=50.0,
            use_ramping=False,
            backward=True,
            tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
            then=Stop.COAST
        ),
        navigator.move_back_arm_angle(speed=450, rotation_angle=-240) # +Release -Grab
    )

    # Settle to Grab Microphone
    await robot.navigate_to_goal(
        goal_x=800.0,              # Target X coordinate (mm)
        goal_y=330.0,              # Target Y coordinate (mm)
        goal_theta=0.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=100.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=50.0,
        use_ramping=False,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )
    await robot.navigate_to_goal(
        goal_x=1080.0,              # Target X coordinate (mm)
        goal_y=140.0,              # Target Y coordinate (mm)
        goal_theta=-18.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=100.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=50.0,
        use_ramping=False,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.HOLD
    )
    # Grab Microphone
    await navigator.move_front_arm_angle(speed=300, rotation_angle=-180) # +Release -Grab
    front_arm.hold()

    # Settle to Release Bottom Cable
    await robot.navigate_to_goal(
        goal_x=398.0,              # Target X coordinate (mm)
        goal_y=625.0,              # Target Y coordinate (mm)
        goal_theta=10.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=300.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )

    await robot.navigate_to_goal(
        goal_x=250.0,              # Target X coordinate (mm)
        goal_y=625.0,              # Target Y coordinate (mm)
        goal_theta=13.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=120.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )

    # Release Bottom Cable
    await navigator.move_back_arm_angle(speed=450, rotation_angle=240) # +Release -Grab
    await robot.go_backward(
        distance=60,
        speed_mm_s=100,
        start_speed_mm_s=10,
        end_speed_mm_s=20,
        accel_dist_mm=50,
        decel_dist_mm=20,
        then=Stop.HOLD
    )

    # Settle to Release Microphone
    await robot.navigate_to_goal(
        goal_x=560.0,              # Target X coordinate (mm)
        goal_y=730.0,              # Target Y coordinate (mm)
        # goal_theta=-90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=200.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )
    await robot.turn_to_angle(
        target_angle=-180.0,
        speed_deg_s=500.0,
        tolerance=1.0,
        # timeout_ms=3000,
        then=Stop.HOLD,
        accel_angle=15.0,
        start_speed=40.0,
        decel_angle=15.0,
        end_speed=20.0
    )
    await robot.navigate_to_goal(
        goal_x=360.0,              # Target X coordinate (mm)
        goal_y=730.0,              # Target Y coordinate (mm)
        goal_theta=-180.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=100.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )
    x,y,theta = robot.get_state()
    print(f"x:{x}, y:{y}, theta: {theta}")
    # Release Microphone
    await navigator.move_front_arm_angle(speed=300, rotation_angle=180) # +Release -Grab
    await robot.navigate_to_goal(
        goal_x=635.0,              # Target X coordinate (mm)
        goal_y=750.0,              # Target Y coordinate (mm)
        goal_theta=-90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=200.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )

    # Settle To Grab Top Cable
    await robot.navigate_to_goal(
        goal_x=635.0,              # Target X coordinate (mm)
        goal_y=930.0,              # Target Y coordinate (mm)
        goal_theta=-90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=100.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )

    # Grab Top Cable
    await robot.navigate_to_goal(
        goal_x=635.0,              # Target X coordinate (mm)
        goal_y=970.0,              # Target Y coordinate (mm)
        goal_theta=-90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=200.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )
    await navigator.move_back_arm_angle(speed=450, rotation_angle=-240) # +Release -Grab

    # Settle To Release Top Cable
    await robot.navigate_to_goal(
        goal_x=327.0,              # Target X coordinate (mm)
        goal_y=869.0,              # Target Y coordinate (mm)
        goal_theta=-10.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=95.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=50.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.HOLD
    )

    # Release Top Cable
    await multitask(
        robot.go_backward(
            distance=160,
            speed_mm_s=90,
            start_speed_mm_s=10,
            end_speed_mm_s=15,
            accel_dist_mm=50,
            decel_dist_mm=50,
            then=Stop.HOLD
        ),
        navigator.move_back_arm_angle(speed=450, rotation_angle=240) # +Release -Grab
    )

    await robot.turn_to_angle(
        target_angle=9.0,
        speed_deg_s=500.0,
        tolerance=1.0,
        # timeout_ms=3000,
        then=Stop.HOLD,
        accel_angle=15.0,
        start_speed=40.0,
        decel_angle=15.0,
        end_speed=20.0
    )

    # Settle To Red Note 1498.0, 900.0
    await robot.navigate_to_goal(
        goal_x=1100.0,              # Target X coordinate (mm)
        goal_y=700.0,              # Target Y coordinate (mm)
        goal_theta=0.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=200.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=20.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.HOLD
    )
    await robot.navigate_to_goal(
        goal_x=1520.0,              # Target X coordinate (mm)
        goal_y=850.0,              # Target Y coordinate (mm)
        goal_theta=90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=200.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=20.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.HOLD
    )
    # Grab Red Note
    await robot.go_forward(
        distance=100,
        speed_mm_s=100,
        start_speed_mm_s=10,
        end_speed_mm_s=20,
        accel_dist_mm=50,
        decel_dist_mm=50,
        then=Stop.HOLD
    )
    await navigator.move_front_arm_angle(speed=100, rotation_angle=-150) # +Release -Grab
    front_arm.hold()

    # Settle to Release Red Note 1380, 600 Error 1430, 640
    await robot.navigate_to_goal(
        goal_x=1390.0,              # Target X coordinate (mm)
        goal_y=443.0,              # Target Y coordinate (mm)
        goal_theta=90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=120.0,          # Cruise speed (mm/s)
        start_speed_mm_s=41.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=150.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.HOLD
    )

    # Release Red Note
    await navigator.move_front_arm_angle(speed=450, rotation_angle=180) # +Release -Grab
    await robot.go_backward(
        distance=130,
        speed_mm_s=100,
        start_speed_mm_s=10,
        end_speed_mm_s=20,
        accel_dist_mm=50,
        decel_dist_mm=50,
        then=Stop.HOLD
    )
    await robot.turn_to_angle(
        target_angle=0.0,
        speed_deg_s=500.0,
        tolerance=1.0,
        # timeout_ms=3000,
        then=Stop.HOLD,
        accel_angle=15.0,
        start_speed=40.0,
        decel_angle=15.0,
        end_speed=20.0
    )
    await robot.go_forward(
        distance=300,
        speed_mm_s=200,
        start_speed_mm_s=10,
        end_speed_mm_s=20,
        accel_dist_mm=50,
        decel_dist_mm=50,
        then=Stop.HOLD
    )

    # Settle to Grab Green 1625,876
    await robot.navigate_to_goal(
        goal_x=1640.0,              # Target X coordinate (mm)
        goal_y=883.0,              # Target Y coordinate (mm)
        goal_theta=90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=200.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )
    # Grab Green Note
    await robot.go_forward(
        distance=100,
        speed_mm_s=95,
        start_speed_mm_s=10,
        end_speed_mm_s=20,
        accel_dist_mm=50,
        decel_dist_mm=50,
        then=Stop.HOLD
    )
    await navigator.move_front_arm_angle(speed=100, rotation_angle=-150) # +Release -Grab
    front_arm.hold()

    # Settle to Release Green Note 1550, 800
    await robot.navigate_to_goal(
        goal_x=1563.0,              # Target X coordinate (mm)
        goal_y=770.0,              # Target Y coordinate (mm)
        goal_theta=90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=120.0,          # Cruise speed (mm/s)
        start_speed_mm_s=41.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=150.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.HOLD
    )
    await robot.navigate_to_goal(
        goal_x=1550.0,              # Target X coordinate (mm)
        goal_y=500.0,              # Target Y coordinate (mm)
        goal_theta=90.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=200.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=150.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.HOLD
    )

    # Release Green Note
    await navigator.move_front_arm_angle(speed=450, rotation_angle=180) # +Release -Grab
    await robot.go_backward(
        distance=200,
        speed_mm_s=95,
        start_speed_mm_s=10,
        end_speed_mm_s=20,
        accel_dist_mm=50,
        decel_dist_mm=50,
        then=Stop.HOLD
    )
    await robot.turn_to_angle(
        target_angle=-180.0,      # Target heading in degrees (-180.0 to 180.0)
        speed_deg_s=300.0,      # Max turning velocity ceiling (deg/s)
        start_speed=30.0,       # Initial breakaway speed (deg/s)
        end_speed=20.0,         # Final settlement speed before holding (deg/s)
        accel_angle=20.0,       # Acceleration ramp angle (deg)
        decel_angle=20.0,       # Deceleration ramp angle (deg)
        tolerance=1.5,          # Completion tolerance band (deg)
        then=Stop.HOLD          # Active motor holding state
    )

    # Settle to Sweep Instruments
    await robot.navigate_to_goal(
        goal_x=2162.0,              # Target X coordinate (mm)
        goal_y=110.0,              # Target Y coordinate (mm)
        goal_theta=-180.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=300.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=20.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )
    await robot.navigate_to_goal(
        goal_x=2362.0,              # Target X coordinate (mm)
        goal_y=110.0,              # Target Y coordinate (mm)
        goal_theta=-180.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=300.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=10.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        backward=True,
        tolerance_dist=20.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.COAST
    )
    await robot.turn_to_angle(
        target_angle=-180.0,      # Target heading in degrees (-180.0 to 180.0)
        speed_deg_s=300.0,      # Max turning velocity ceiling (deg/s)
        start_speed=30.0,       # Initial breakaway speed (deg/s)
        end_speed=20.0,         # Final settlement speed before holding (deg/s)
        accel_angle=20.0,       # Acceleration ramp angle (deg)
        decel_angle=20.0,       # Deceleration ramp angle (deg)
        tolerance=1.5,          # Completion tolerance band (deg)
        then=Stop.HOLD          # Active motor holding state
    )

    # x,y,theta = robot.get_state()
    # robot.reset_state(2362-80.0, 110.0, theta, hub.imu.heading())
    # robot.set_max_angular_speed(1000.0)
    # x,y,theta = robot.get_state()
    # print(f"x:{x}, y:{y}, theta: {theta}")

    # Sweep Instruments
    await robot.navigate_to_goal(
        goal_x=300.0,              # Target X coordinate (mm)
        goal_y=110,              # Target Y coordinate (mm)
        goal_theta=-180.0,           # Target heading (degrees) to align to at the end
        speed_mm_s=200.0,          # Cruise speed (mm/s)
        start_speed_mm_s=50.0,     # Blends continuously from the previous end_speed
        end_speed_mm_s=20.0,       # Slow down speed before stopping/turning
        accel_dist_mm=50.0,
        decel_dist_mm=100.0,
        use_ramping=False,
        tolerance_dist=10.0,       # Settle tolerance radius (mm) around the target coordinate
        then=Stop.HOLD
    )

    x,y,theta = robot.get_state()
    print(f"x:{x}, y:{y}, theta: {theta}")

# =====================================================================
# 3. Hardware Entry Point & Main Execution Block
# =====================================================================

if __name__ == '__main__':
    hub = PrimeHub(top_side=Axis.Z, front_side=-Axis.X)
    left_motor = Motor(Port.F, Direction.COUNTERCLOCKWISE)
    right_motor = Motor(Port.B, Direction.CLOCKWISE)


    try:
        front_arm = Motor(Port.E)
        print('Front Arm on Port E.')
    except Exception as e:
        print(f'Front Arm on Port E: {e}')

    try:
        back_arm = Motor(Port.A)
        print('Back Arm on Port A.')
    except Exception as e:
        print(f'Back Arm on Port A: {e}')


    try:
        line_sensor = ColorSensor(Port.C)
        print('Line Sensor on Port C.')
    except Exception as e:
        print(f'Line Sensor on Port C: {e}')

    detected_sensors = {}
    for port_name in [Port.A, Port.B, Port.C, Port.D, Port.E, Port.F]:
        if port_name in (Port.F, Port.B, Port.E, Port.A, Port.C):
            continue
        try:
            sensor_obj = ColorSensor(port_name)
            detected_sensors[port_name] = sensor_obj
            print(f'ColorSensor on Port {port_name}.')
        except Exception:
            pass

    if detected_sensors:
        for pref in (Port.D, Port.C, Port.E, Port.A):
            if pref in detected_sensors:
                color_sensor = detected_sensors[pref]
                print(f'Selecting ColorSensor on Port {pref}.')
                break
        if color_sensor is None:
            first_port = list(detected_sensors.keys())[0]
            color_sensor = detected_sensors[first_port]
            print(f'Selecting ColorSensor on Port {first_port}.')

    if color_sensor is None:
        print('other ports.')

    # Native C MDRobotBase constructor
    robot = MDRobotBase(
        left_motor=left_motor,
        right_motor=right_motor,
        wheel_diameter_left=63.4,
        wheel_diameter_right=63.4,
        axle_track=160.0
    )


    # 2. Force 100% 1.0 Pure Gyro Odometry & PID Correction - Default 0.95
    # robot.set_fusion_alpha(1.0)
    # 2. Configure drivetrain gear ratio (12t motor gear to 36t wheel gear = 0.3625 or 12/36)
    robot.set_gear_ratio(0.53)

    # 1. Reset state (sets coordinates to x=0, y=0, theta=0, gyro_heading=0)
    robot.reset_state(2150.0, 555.0, 0.0, hub.imu.heading())
    robot.set_max_angular_speed(1000.0)

    # 2. Select LQR controller and configure gains
    # controller: 0 = PID, 1 = LQR
    robot.set_controller(1)
    robot.set_pid_gains(10.0, 0, 0.1)
    # Note: These gains dynamically schedule in C based on the current speed profile.
    robot.set_lqr_gains(k_x=1.5, k_y=2.5, k_theta=8.0)
    # Optional: Configure backlash filter for cleaner trajectory tracking
    robot.set_backlash_filter(True)
    robot.set_backlash_limits(left_limit=1.2, right_limit=1.2) # backlash in degrees
    print("Configured LQR gains:", robot.get_pid_gains())
    hub.speaker.beep()

    navigator = NoteColorNavigator(
        robot=robot,
        front_arm=front_arm,
        back_arm=back_arm,
        color_sensor=color_sensor
    )
    # navigator.execute_sequential_sweep(drive_speed=300.0)
    run_task(main())
