# Windows Android setup — exact steps (Matthijs / Samsung Galaxy S25)

**Status:** required before local APK install and Samsung S25 validation.  
**Current machine check (2026-07-20):** `ANDROID_HOME` unset, `JAVA_HOME` unset, no `%LOCALAPPDATA%\Android\Sdk`, `adb` not on PATH → **BLOCKED**.

No silent system installs are performed by the agent. Follow these steps manually.

## 1. Install Android Studio

1. Download Android Studio from https://developer.android.com/studio
2. Run the installer (Standard installation).
3. Open Android Studio → **More Actions** → **SDK Manager**.

## 2. Install SDK components

In SDK Manager:

| Component                      | Recommendation                     |
| ------------------------------ | ---------------------------------- |
| Android SDK Platform           | **API 35** (and API 34 if listed)  |
| Android SDK Build-Tools        | Latest stable (e.g. 35.x)          |
| Android SDK Platform-Tools     | Always install (`adb`)             |
| Android SDK Command-line Tools | Latest                             |
| Emulator (optional)            | Only if you want AVD; S25 uses USB |

Apply / OK and wait for downloads.

## 3. Environment variables (Windows)

System Properties → Environment Variables → User variables:

```text
ANDROID_HOME = C:\Users\<YOU>\AppData\Local\Android\Sdk
JAVA_HOME    = C:\Program Files\Android\Android Studio\jbr
```

Add to **Path**:

```text
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
%JAVA_HOME%\bin
```

Open a **new** PowerShell and verify:

```powershell
echo $env:ANDROID_HOME
echo $env:JAVA_HOME
adb version
java -version
```

## 4. Samsung Galaxy S25 — USB debugging

1. Settings → About phone → tap **Build number** 7× → Developer options unlocked.
2. Settings → Developer options → enable **USB debugging**.
3. Optional: enable **Install via USB** / disable MIUI-like optimisations if present (One UI: keep USB debugging on).
4. Connect USB cable (data-capable).
5. On phone: accept **Allow USB debugging?** RSA fingerprint prompt.
6. If Windows does not see the device: install Samsung USB drivers (Samsung Smart Switch or OEM USB driver pack).

Verify:

```powershell
adb devices
# Expect: <serial>    device
```

If `unauthorized`, unlock phone and re-accept the RSA prompt.

## 5. Local app build (after SDK is ready)

From repo root (`feature/vdb-mobile-app-v1`):

```powershell
npx expo prebuild --clean
npx expo run:android
```

Or Gradle debug APK after prebuild:

```powershell
cd android
.\gradlew.bat assembleDebug
```

APK typically lands under `android\app\build\outputs\apk\debug\`.

Install:

```powershell
adb install -r <path-to-debug.apk>
```

Package id: `nl.vdbdigital.app`

## 6. What NOT to do yet

- No Play Store upload
- No production signing / release keystore in CI without owner approval
- No claim of Samsung PASS without filling `docs/samsung-s25-device-results.md`

## 7. After setup succeeds

Update:

- `docs/android-build-evidence.md` with real artifact path, size, build time
- `docs/samsung-s25-device-results.md` with PASS/FAIL per flow
