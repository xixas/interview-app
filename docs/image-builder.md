# 🚀 Interview App – Image Creation Guide

This document describes how to build distributable images of the **Interview App** for **Linux (AppImage)**, **Windows (NSIS installer)**, and **macOS (DMG)**.
The process ensures native modules like **sqlite3** are rebuilt for Electron runtime, preventing crashes.

---

## 1. Prerequisites

* Node.js & npm installed
* Run `npm install` once to install dependencies
* Electron version: **34.5.6** (used in rebuild step)
* Ensure caches for Electron are writable:

  * Linux: `~/.cache/electron`, `~/.cache/electron-builder`

---

## 2. Build the App (common step)

Before packaging for any OS:

```bash
npm run build:electron
```

This compiles **UI, API, Evaluator, and Electron shell** into `dist/`.

---

## 3. Linux (AppImage)

### Local build (on Linux):

```bash
npm run package:appimage-rebuild
```

This runs:

1. `electron-rebuild` for sqlite3
2. `electron-builder` to produce `AppImage`

Result: `release/*.AppImage`

---

## 4. Windows (NSIS installer)

### Local build (on Windows):

```bash
npm run package:win-rebuild
```

### Cross-build (from Linux using Docker + Wine):

```bash
npm run docker:build:win
```

Result: `release/*.exe`

---

## 5. macOS (DMG)

### Local build (on macOS):

```bash
npm run package:mac-rebuild
```

⚠️ macOS builds **must run on a macOS machine** (or CI macOS runner).

Result: `release/*.dmg`

---

## 6. All Platforms (multi-target)

For CI or advanced users:

```bash
npm run package:all-rebuild
```

This rebuilds all native modules and then runs `electron-builder` for **Linux, Windows, macOS**.
⚠️ Requires platform support:

* Linux runner for AppImage
* macOS runner for DMG
* Wine/Docker for Windows build

---

## 7. Useful Checks

After packaging, verify `.node` files are **not inside asar**:

```bash
npx asar list release/linux-unpacked/resources/app.asar | grep '\.node$' || echo "✅ No native binaries inside asar"
```

Unpacked binaries will be placed under `resources/app.asar.unpacked`.

---

## 8. Quick Reference – Scripts

* **Linux AppImage**: `npm run package:appimage-rebuild`
* **Windows (local)**: `npm run package:win-rebuild`
* **Windows (docker)**: `npm run docker:build:win`
* **macOS**: `npm run package:mac-rebuild`
* **All platforms**: `npm run package:all-rebuild`
