# Android environment verification

**Date:** 2026-07-21  
**Branch:** `feature/vdb-mobile-app-v1`

## Results

| Component | Result | Evidence |
|---|---|---|
| JDK / `JAVA_HOME` | **PASS** | OpenJDK 21 / Android Studio JBR |
| `ANDROID_HOME` / `adb` | **PASS** | SDK + platform-tools 37.0.0 |
| Node / npm | **PASS** | v24.15.0 / 11.12.1 |
| Docker Desktop engine | **PASS** | started for this session |
| Local Supabase | **PASS** | auth health 200, REST 200 |
| Samsung S25 | **PASS** | `R3GYC00EBYY` `SM_S931B` status `device` |
| `adb reverse` | **PASS** | `tcp:54321`, `tcp:8081` |

## Connectivity route

Physical device → `adb reverse` → PC `127.0.0.1:54321` (local Supabase) + `:8081` (Metro).  
App env: `EXPO_PUBLIC_APP_ENV=development`, demo mode `false`.
