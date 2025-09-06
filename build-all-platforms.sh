#!/bin/bash

# Build for all platforms using Docker on Linux
# This script builds the Electron app for Linux, Windows, and macOS

set -e

echo "🚀 Building Interview App for ALL platforms..."
echo "📦 This will use Docker to cross-compile for Windows and macOS"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Pull the Docker image if not present
echo "📥 Pulling electron-builder Docker image..."
docker pull electronuserland/builder:wine

# Run the build
echo "🔨 Building application for Linux, Windows, and macOS..."
docker run --rm \
    --env ELECTRON_CACHE=/root/.cache/electron \
    --env ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder \
    -v "$(pwd)":/project \
    -v "$(pwd)"-node-modules:/project/node_modules \
    -v ~/.cache/electron:/root/.cache/electron \
    -v ~/.cache/electron-builder:/root/.cache/electron-builder \
    electronuserland/builder:wine \
    /bin/bash -c "cd /project && npm run build:electron && npm run package:all-platforms"

echo "✅ All platform builds complete!"
echo "📁 Check the 'release' directory for:"
echo "   - Linux: .AppImage file"
echo "   - Windows: .exe installer"
echo "   - macOS: .dmg file"