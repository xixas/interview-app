# Cross-Platform Build Guide

This document explains how to build the Interview App for different platforms from Linux.

## Available Build Commands

### Quick Commands
```bash
# Build for current platform (Linux)
npm run build:appimage

# Build for Windows (works directly on Linux)
npm run package:win

# Build for macOS (requires Docker)
npm run docker:build:mac

# Build for all platforms (requires Docker)
npm run docker:build:all
```

### Build Scripts
We provide convenient shell scripts:

```bash
# Build Windows app
./build-windows.sh

# Build macOS app (requires Docker)
./build-mac.sh

# Build all platforms
./build-all-platforms.sh
```

## Platform-Specific Notes

### ✅ Linux (Native)
- **Command**: `npm run build:appimage`
- **Output**: `release/Interview App-1.0.0.AppImage`
- **Requirements**: None (builds natively)
- **Status**: ✅ Working

### ✅ Windows (Cross-compile from Linux)
- **Command**: `npm run package:win`
- **Output**: `release/Interview App Setup 1.0.0.exe`
- **Requirements**: None (electron-builder handles cross-compilation)
- **Status**: ✅ Working
- **Size**: ~127MB installer

### 🐳 macOS (Requires Docker)
- **Command**: `npm run docker:build:mac`
- **Output**: `release/Interview App-1.0.0.dmg`
- **Requirements**: Docker installed and running
- **Status**: ⚠️ Requires Docker setup
- **Note**: Cannot build macOS apps directly on Linux

## Docker Setup for macOS Builds

### Prerequisites
1. **Docker installed**: `docker --version`
2. **Docker running**: `systemctl start docker`

### Commands
```bash
# Build macOS app using Docker
npm run docker:build:mac

# Or use the shell script
./build-mac.sh
```

### Docker Image Used
- **Image**: `electronuserland/builder:wine`
- **Purpose**: Provides cross-platform build environment
- **Includes**: Wine for Windows builds, tools for macOS builds

## Build Output

All builds are created in the `release/` directory:

```
release/
├── Interview App-1.0.0.AppImage          # Linux
├── Interview App Setup 1.0.0.exe         # Windows  
├── Interview App Setup 1.0.0.exe.blockmap
├── Interview App-1.0.0.dmg               # macOS (when built)
├── linux-unpacked/                       # Linux unpacked
└── win-unpacked/                         # Windows unpacked
```

## Build Process

### Step 1: Prepare Application
```bash
# Build all components first
npm run build:electron
```

### Step 2: Choose Platform

#### For Linux + Windows:
```bash
# Build both platforms
npm run build:appimage    # Linux
npm run package:win       # Windows
```

#### For All Platforms (including macOS):
```bash
# Requires Docker for macOS build
npm run docker:build:all
```

## Troubleshooting

### Windows Build Issues
- **Icon Error**: Ensure `build-resources/icon.ico` has 256x256 resolution
- **Solution**: Icon has been updated to include proper sizes

### macOS Build Issues  
- **"dmg-license not found"**: Use Docker approach instead of direct build
- **Solution**: Use `npm run docker:build:mac`

### Docker Issues
- **"Docker not running"**: `sudo systemctl start docker`
- **Permission denied**: Add user to docker group: `sudo usermod -aG docker $USER`

## Performance Notes

### Build Times (Approximate)
- **Linux**: ~30 seconds
- **Windows**: ~45 seconds  
- **macOS (Docker)**: ~2-3 minutes (first time, includes image download)
- **All Platforms (Docker)**: ~3-4 minutes

### File Sizes
- **Linux AppImage**: ~151MB
- **Windows Installer**: ~127MB
- **macOS DMG**: ~140MB (estimated)

## CI/CD Integration

For automated builds, use:
```yaml
# GitHub Actions example
- name: Build All Platforms
  run: |
    npm run build:electron
    npm run build:appimage
    npm run package:win
    # For macOS, set up Docker in CI
    npm run docker:build:mac
```

## Security Notes

- All builds include the same application code
- Windows builds are unsigned (for development)
- For production, add code signing certificates
- macOS builds may require notarization for distribution

## Next Steps

1. ✅ Linux builds working
2. ✅ Windows builds working  
3. 🚧 Test macOS builds with Docker
4. 📦 Add code signing for production
5. 🚀 Set up automated builds in CI/CD