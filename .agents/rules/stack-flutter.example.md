---
description: Flutter & Mobile Native (iOS, Android, Huawei) stack conventions — copy to stack-flutter.md at bootstrap and set alwaysApply
alwaysApply: false
---

# Flutter & Native Mobile (iOS / Android / Huawei) Conventions

Copy to `.agents/rules/flutter.md` (or your stack name) and set `alwaysApply: true`.

## 1. UI Component-First & Widgetbook
- **Component-First Isolation:** Build isolated Flutter widgets with dedicated **Widgetbook** use-cases (`widgetbook/`) before assembling full screens.
- **5-State Widget Contract:** Every interactive widget MUST support:
  1. `Default`
  2. `Hover / Focus` (Desktop & Web responsive modes)
  3. `Loading / Shimmer Skeleton`
  4. `Error / Inline Feedback`
  5. `Disabled / Empty State`
- **Design Tokens:** Strict separation of Design Tokens (`AppColors`, `AppTypography`, `AppSpacing`, `AppThemeData`). Never hardcode `Color(0xFF...)` or magic double paddings inside leaf widgets.
- **State Management:** BLoC / Cubit or Riverpod with clear separation between presentation and business logic. Zero business logic inside UI build methods.

## 2. Triple Native Platform Support (iOS + Android + Huawei)
- **Target OS & API Support:**
  - **iOS:** iOS 16.0+ (Swift / Objective-C Platform Channels / FFI).
  - **Android:** Android SDK 34+ (API 35 ready, Kotlin Coroutines, Jetpack Compose interop).
  - **Huawei / HarmonyOS:** HarmonyOS NEXT & HMS Core integration (Huawei Push Kit, AGC, Huawei Account, Huawei In-App Purchases, Huawei Petal Maps).
- **Native Device Capabilities:**
  - **Biometrics:** `local_auth` / Native BiometricPrompt (Face ID, Touch ID, Android Biometric, Huawei 3D Face Unlock).
  - **Push Notifications:** Unified push router handling APNs (iOS), FCM (Google Play Android), and Huawei Push Kit (HMS Android / HarmonyOS).
  - **Secure Storage:** iOS Keychain (`kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`), Android EncryptedSharedPreferences with Android Keystore, and HarmonyOS HUKS (Huawei Universal Keystore Service).
  - **Background Daemons & Geolocation:** Native WorkManager, BGTaskScheduler, and HarmonyOS Continuous Tasks.
- **Always Up-to-Date SDK Alignment:** Keep native Gradle dependencies, Podspecs, and ArkTS package configurations pinned to the latest stable enterprise toolchains.

## 3. Automated Testing & Patrol Native Automation
- **Patrol Native Testing:** Use **Patrol** (`patrol test`) for end-to-end and native UI integration tests:
  - Interacting with native OS permission dialogs (Camera, Location, Notifications).
  - Webview and biometric prompt automation.
  - Multi-platform native test execution across iOS Simulators, Android Emulators, and Huawei Device Cloud.
- **Widget Unit & Golden Tests:** Golden file regression tests for every Widgetbook use-case to catch visual regressions before PR review.
- **Accessibility:** Screen reader semantics (`Semantics` widget), minimum touch target size $\ge 48 \times 48$ dp, dynamic text scaling support up to 200%.
