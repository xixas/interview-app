# Build & Deployment Guide

This guide explains how to build the Interview App for different platforms and deploy it for distribution.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Builds](#development-builds)
- [Production Builds](#production-builds)
- [Cross-Platform Building](#cross-platform-building)
- [Docker-Based Builds](#docker-based-builds)
- [Build Configuration](#build-configuration)
- [Distribution](#distribution)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js** 18+ (LTS recommended)
- **npm** 8+
- **Git**

### Optional for Cross-Platform Builds

- **Docker** (for macOS builds on Linux)
- **ImageMagick** (for icon conversion)

### Platform-Specific Requirements

#### Linux
- No additional requirements (native builds)

#### Windows (Cross-compile from Linux)
- No additional requirements (electron-builder handles it)

#### macOS (Cross-compile from Linux)
- **Docker** with `electronuserland/builder:wine` image

## Development Builds

Development builds are optimized for fast iteration and debugging.

### Quick Development Build

```bash
# Build all projects for development
npm run build

# Individual project builds
npm run nxe:build:frontend  # Angular UI
npm run build:api           # NestJS API
npm run build:evaluator     # Evaluator service
npm run nxe:build:backend   # Electron wrapper
```

### Development Build Outputs

```
dist/
├── ui/browser/             # Angular production build
├── api/                   # NestJS API build
├── evaluator/             # Evaluator service build
└── electron/              # Electron main process build
```

### Watch Mode for Development

```bash
# Start all services in watch mode
npm run dev

# Individual services in watch mode
npm run nxe:serve:frontend  # Angular dev server
npm run serve:api           # API with nodemon
npm run serve:evaluator     # Evaluator with nodemon
```

## Production Builds

Production builds are optimized for performance and distribution.

### Build for Current Platform

#### Linux (AppImage)
```bash
# Complete build and package
npm run build:appimage

# Output: release/Interview App-1.0.0.AppImage
```

#### Windows (from Linux)
```bash
# Cross-compile Windows build
npm run package:win

# Output: release/Interview App Setup 1.0.0.exe
```

#### macOS (Docker required)
```bash
# Docker-based macOS build
npm run docker:build:mac

# Output: release/Interview App-1.0.0.dmg
```

### Build All Platforms
```bash
# Build for all platforms using Docker
npm run docker:build:all

# Or use the convenience script
./build-all-platforms.sh
```

## Cross-Platform Building

### Available Build Commands

```bash
# Native builds (no Docker needed)
npm run build:appimage      # Linux AppImage
npm run package:win         # Windows installer
npm run package:mac         # macOS (requires Docker)

# Docker-based builds (all platforms)
npm run docker:build:win    # Windows via Docker
npm run docker:build:mac    # macOS via Docker  
npm run docker:build:all    # All platforms via Docker
```

### Helper Scripts

Convenient shell scripts are provided for easier building:

```bash
# Make scripts executable (if not already)
chmod +x build-*.sh

# Use the scripts
./build-windows.sh          # Build Windows installer
./build-mac.sh             # Build macOS DMG (Docker)
./build-all-platforms.sh   # Build all platforms
```

### Platform-Specific Notes

#### Linux (Native)
- **Format**: AppImage (portable executable)
- **Requirements**: None (builds natively)
- **Output Size**: ~145MB
- **Compatibility**: Most modern Linux distributions

#### Windows (Cross-compile)
- **Format**: NSIS installer (.exe)
- **Requirements**: None (electron-builder handles cross-compilation)
- **Output Size**: ~123MB
- **Compatibility**: Windows 10/11 (x64)

#### macOS (Docker)
- **Format**: DMG installer
- **Requirements**: Docker with `electronuserland/builder:wine` image
- **Output Size**: ~140MB (estimated)
- **Compatibility**: macOS 10.13+ (x64, ARM64)

## Docker-Based Builds

For macOS builds and consistent cross-platform compilation, we use Docker.

### Docker Setup

```bash
# Check Docker installation
docker --version

# Pull the electron-builder image
docker pull electronuserland/builder:wine
```

### Docker Build Process

```bash
# Manual Docker build command
docker run --rm \
  --env ELECTRON_CACHE=/root/.cache/electron \
  --env ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder \
  -v "$(pwd)":/project \
  -v "$(pwd)"-node-modules:/project/node_modules \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  /bin/bash -c "cd /project && npm run build:electron && npm run package:all-platforms"
```

### Docker Build Scripts

The helper scripts handle Docker complexity:

```bash
# Windows build via Docker
./build-windows.sh

# macOS build via Docker  
./build-mac.sh

# All platforms via Docker
./build-all-platforms.sh
```

## Build Configuration

### Electron Builder Configuration

Build settings are configured in `package.json` under the `"build"` field:

```json
{
  "build": {
    "productName": "Interview App",
    "appId": "com.osmosys.interview-app",
    "directories": {
      "buildResources": "build-resources",
      "output": "release"
    },
    "files": [
      {
        "from": "dist/electron",
        "to": ".",
        "filter": ["**/*"]
      },
      {
        "from": "dist/ui/browser",
        "to": "ui",
        "filter": ["**/*"]
      }
    ],
    "extraResources": [
      {
        "from": "dist/api",
        "to": "app/dist/api"
      },
      {
        "from": "dist/evaluator", 
        "to": "app/dist/evaluator"
      }
    ]
  }
}
```

### Platform-Specific Configuration

#### Linux Configuration
```json
{
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64"]
      }
    ],
    "category": "Development",
    "icon": "build-resources/icon.png"
  }
}
```

#### Windows Configuration
```json
{
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      }
    ],
    "icon": "build-resources/icon.ico"
  }
}
```

#### macOS Configuration
```json
{
  "mac": {
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ],
    "icon": "build-resources/icon.icns",
    "category": "public.app-category.developer-tools"
  }
}
```

### Build Resources

Icons and assets for different platforms:

```
build-resources/
├── icon.png        # 256x256 PNG (base icon)
├── icon.ico        # Windows icon (multi-resolution)
├── icon.icns       # macOS icon (multi-resolution)
└── background.png  # DMG background (macOS only)
```

### Environment Variables

#### Development
```bash
NODE_ENV=development
API_PORT=3000
EVALUATOR_PORT=3001
UI_DEV_PORT=3002
```

#### Production
```bash
NODE_ENV=production
ELECTRON_IS_DEV=0
```

#### Build-time
```bash
# For signing (optional)
CSC_LINK=path/to/certificate.p12
CSC_KEY_PASSWORD=certificate_password

# For notarization (macOS)
APPLE_ID=your@email.com
APPLE_ID_PASSWORD=app-specific-password
```

## Distribution

### Build Outputs

All builds are created in the `release/` directory:

```
release/
├── Interview App-1.0.0.AppImage          # Linux
├── Interview App Setup 1.0.0.exe         # Windows
├── Interview App Setup 1.0.0.exe.blockmap
├── Interview App-1.0.0.dmg               # macOS
├── linux-unpacked/                       # Linux unpacked
├── win-unpacked/                         # Windows unpacked
└── mac/                                  # macOS unpacked
```

### File Sizes

- **Linux AppImage**: ~145MB
- **Windows Installer**: ~123MB  
- **macOS DMG**: ~140MB (estimated)

### Distribution Methods

#### Direct Download
- Host files on your own server
- Provide download links for each platform
- Include checksums for verification

#### GitHub Releases
```bash
# Create a new release with files
gh release create v1.0.0 \
  release/Interview\ App-1.0.0.AppImage \
  release/Interview\ App\ Setup\ 1.0.0.exe \
  release/Interview\ App-1.0.0.dmg \
  --title "Interview App v1.0.0" \
  --notes "Initial release with cross-platform support"
```

#### Package Managers
- **Windows**: Chocolatey, Scoop
- **macOS**: Homebrew Cask
- **Linux**: Snap Store, AppImage hub

### Auto-Updates

Configure auto-updates in the Electron app:

```typescript
// In electron/src/main.ts
import { autoUpdater } from 'electron-updater';

if (!isDev) {
  autoUpdater.checkForUpdatesAndNotify();
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build applications
      run: npm run build:electron
    
    - name: Build Linux AppImage
      run: npm run build:appimage
    
    - name: Build Windows executable
      run: npm run package:win
    
    - name: Build macOS DMG (Docker)
      run: ./build-mac.sh
    
    - name: Create Release
      uses: softprops/action-gh-release@v1
      with:
        files: |
          release/*.AppImage
          release/*.exe
          release/*.dmg
```

### Build Matrix for Multiple Platforms

```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]

runs-on: ${{ matrix.os }}

steps:
  # Platform-specific build steps
```

### Build Artifacts

Store build artifacts for distribution:

```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: interview-app-builds
    path: |
      release/*.AppImage
      release/*.exe
      release/*.dmg
```

## Troubleshooting

### Common Build Issues

#### Icon Resolution Error
```
Error: image must be at least 256x256
```

**Solution**: Ensure `build-resources/icon.ico` contains 256x256 resolution:
```bash
# Convert PNG to multi-resolution ICO
magick build-resources/icon.png -define icon:auto-resize=256,128,64,48,32,16 build-resources/icon.ico
```

#### Node Modules Issues
```
Error: Cannot find module 'electron'
```

**Solution**: Clean and reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
npm run postinstall
```

#### Docker Build Failures
```
Error: nx: not found
```

**Solution**: Use npm scripts instead of nx directly in Docker:
```bash
# Instead of: nx build ui
# Use: npm run nxe:build:frontend
```

#### Windows Cross-Compilation Issues
```
Error: wine: not found
```

**Solution**: Use Docker-based builds:
```bash
npm run docker:build:win
```

### Build Performance

#### Speed Up Builds
```bash
# Use npm cache
npm ci --prefer-offline

# Parallel builds
npm run build -- --parallel

# Skip unnecessary rebuilds
npm run build -- --skip-nx-cache=false
```

#### Reduce Bundle Size
```bash
# Analyze bundle size
npm run build:analyze

# Tree shaking optimization in Angular
ng build --optimization --build-optimizer
```

### Debug Build Issues

#### Enable Verbose Logging
```bash
# Electron builder debug mode
DEBUG=electron-builder npm run package:win

# Nx debug mode
NX_VERBOSE_LOGGING=true npm run build
```

#### Build Without ASAR
```json
{
  "build": {
    "asar": false
  }
}
```

### Memory Issues

For large builds, increase Node.js memory:
```bash
export NODE_OPTIONS="--max_old_space_size=4096"
npm run build
```

## Best Practices

### Version Management

Use semantic versioning in `package.json`:
```json
{
  "version": "1.2.3"
}
```

### Build Caching

- Use Nx build caching for faster builds
- Cache Docker layers for consistent builds
- Store artifacts between CI runs

### Security

- Sign executables for Windows and macOS
- Use code signing certificates
- Enable notarization for macOS

### Testing Builds

- Test on clean VMs/containers
- Verify all features work in packaged app
- Test auto-updater functionality

### Documentation

- Keep build instructions updated
- Document environment requirements
- Maintain changelog for releases

## Platform-Specific Distribution

### Windows
- **Microsoft Store**: UWP packaging required
- **Direct Download**: NSIS installer
- **Package Managers**: Chocolatey, Scoop, Winget

### macOS
- **Mac App Store**: Additional entitlements required
- **Direct Download**: Signed and notarized DMG
- **Package Managers**: Homebrew Cask

### Linux
- **AppImage**: Universal Linux package (current)
- **Snap**: Ubuntu Software store
- **Flatpak**: Cross-distribution package manager
- **deb/rpm**: Distribution-specific packages