# Native Windows Desktop Application Build & Packaging Guide (`mat-metric`)

**Date**: 2026-07-24T18:44:00+07:00  
**Target Codebase**: `mat-metric`  
**File Target**: [`mat-metric/package.json`](file:///Users/batrarethsudprasert/projects/wro/mat-metric/package.json)

---

## 1. Executive Summary

The `mat-metric` IDE application is powered by **Electron + Vite + React 19 + TypeScript + Monaco Editor**.

We updated `mat-metric/package.json` to support building native Windows desktop applications:
1. **Windows NSIS Setup Installer** (`WRO-MatMetric Setup 1.0.0.exe` with desktop shortcut & customizable installation directory).
2. **Windows Standalone Portable Executable** (`WRO-MatMetric 1.0.0.exe` - zero installation required, runs standalone from USB/disk).

---

## 2. Build Scripts & Commands

From the `mat-metric` directory:

### 2.1 Build Windows Desktop Installer & Portable Executable

```bash
cd /Users/batrarethsudprasert/projects/wro/mat-metric
npm run package:win
```

This runs `tsc -b && vite build` and invokes `electron-builder --win` to generate:
- `release/WRO-MatMetric Setup 1.0.0.exe` (NSIS Installer)
- `release/WRO-MatMetric 1.0.0.exe` (Portable Standalone)

### 2.2 Cross-Platform Multi-Target Build (Windows, macOS, Linux)

```bash
npm run package:all
```

Generates:
- **macOS**: `release/WRO-MatMetric-1.0.0.dmg`
- **Windows**: `release/WRO-MatMetric Setup 1.0.0.exe` & `release/WRO-MatMetric 1.0.0.exe`
- **Linux**: `release/WRO-MatMetric-1.0.0.AppImage`

---

## 3. Configuration in `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "package": "npm run build && electron-builder",
    "package:win": "npm run build && electron-builder --win",
    "package:all": "npm run build && electron-builder -mwl"
  },
  "build": {
    "appId": "com.wro.matmetric",
    "productName": "WRO-MatMetric",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

---

## 4. Verification

- **Build Output**: `npm run build` executed cleanly without errors.
- **Vitest Suite**: `npx vitest run` passed 25/25 tests.
