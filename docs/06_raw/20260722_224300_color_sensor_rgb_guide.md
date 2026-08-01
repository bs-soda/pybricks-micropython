# Native C Architecture Specification: SPIKE Prime ColorSensor RGB Pipeline in Pybricks Firmware

**Date & Time**: 2026-07-22 22:45:00 UTC+7  
**Workspace**: `/Users/batrarethsudprasert/projects/wro/pybricks-micropython`  
**Target Device ID**: `LEGO_DEVICE_TYPE_ID_SPIKE_COLOR_SENSOR`  
**Native C Source Files**:
- SPIKE Color Sensor Driver: [pb_type_pupdevices_colorsensor.c](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/pupdevices/pb_type_pupdevices_colorsensor.c)
- Color Calibration Engine: [pb_color_map.c](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/util_pb/pb_color_map.c)

---

## 1. Complete SPIKE Prime RGB Data Pipeline

```
[SPIKE Prime Hardware Sensor]
            |
            | (Reads 10-bit raw ADC: 0..1024)
            v
[LEGO_DEVICE_MODE_PUP_COLOR_SENSOR__RGB_I]
            |
            | Bit-Shift Right by 2: (data >> 2)
            v
[8-bit Cartesian RGB Struct (0..255)]
            |
            | pb_color_map_rgb_to_hsv(&rgb, hsv)
            v
[Cylindrical HSV Struct (h: 0..360, s: 0..100, v: 0..100)]
```

---

## 2. Step-by-Step C Code Breakdown

### Step 1: Hardware I/O Mode & 10-Bit ADC Sampling ([pb_type_pupdevices_colorsensor.c:L41](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/pupdevices/pb_type_pupdevices_colorsensor.c#L41))
SPIKE Prime ColorSensor samples raw channel data via `LEGO_DEVICE_MODE_PUP_COLOR_SENSOR__RGB_I`:
```c
int16_t *data = pb_type_device_get_data(self_in, LEGO_DEVICE_MODE_PUP_COLOR_SENSOR__RGB_I);
// data[0] = Red (0..1024)
// data[1] = Green (0..1024)
// data[2] = Blue (0..1024)
```

### Step 2: 10-Bit to 8-Bit Bit-Shift Conversion ([pb_type_pupdevices_colorsensor.c:L68-L72](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/pupdevices/pb_type_pupdevices_colorsensor.c#L68-L72))
Raw 10-bit values ($0 \dots 1024$) are converted to standard 8-bit RGB ($0 \dots 255$) by right-shifting 2 bits (`>> 2`):
```c
const pbio_color_rgb_t rgb = {
    .r = data[0] == 1024 ? 255 : data[0] >> 2,
    .g = data[1] == 1024 ? 255 : data[1] >> 2,
    .b = data[2] == 1024 ? 255 : data[2] >> 2,
};
```

### Step 3: Color Map Calibration & Hue Optimization ([pb_color_map.c:L30-L43](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/util_pb/pb_color_map.c#L30-L43))
To ensure accurate Yellow and Red classification under SPIKE Prime's internal LED spectrum, Pybricks applies hue calibration:
```c
void pb_color_map_rgb_to_hsv(const pbio_color_rgb_t *rgb, pbio_color_hsv_t *hsv) {
    pbio_color_rgb_to_hsv(rgb, hsv);

    // Hue shift calibration for SPIKE Prime LED spectrum
    if (hsv->h >= 350) {
        hsv->h = (350 + 2 * (hsv->h - 350)) % 360;
    } else if (hsv->h < 40) {
        hsv->h += 10;
    } else if (hsv->h < 60) {
        hsv->h = 50 + (hsv->h - 40) / 2;
    }
}
```

### Step 4: Saturation & Value Curve Non-Linear Compensation ([pb_type_pupdevices_colorsensor.c:L77-L81](file:///Users/batrarethsudprasert/projects/wro/pybricks-micropython/pybricks/pupdevices/pb_type_pupdevices_colorsensor.c#L77-L81))
```c
// Approximately double saturation for low values to boost contrast
hsv->s = hsv->s * (200 - hsv->s) / 100;

// Boost low brightness values by +50%
hsv->v = hsv->v * (150 - hsv->v / 2) / 100;
```
