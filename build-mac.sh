#!/bin/bash

# Build macOS app using Docker on Linux
# This script builds the Electron app for macOS platform

set -e

echo "🚀 Building Interview App for macOS..."
echo "📦 This will use Docker to cross-compile for macOS"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Pull the Docker image if not present
echo "📥 Pulling electron-builder Docker image..."
docker pull electronuserland/builder:wine

# Run the build
echo "🔨 Building application..."
docker run --rm \
    --env ELECTRON_CACHE=/root/.cache/electron \
    --env ELECTRON_BUILDER_CACHE=/root/.cache/electron-builder \
    -v "$(pwd)":/project \
    -v "$(pwd)"-node-modules:/project/node_modules \
    -v ~/.cache/electron:/root/.cache/electron \
    -v ~/.cache/electron-builder:/root/.cache/electron-builder \
    electronuserland/builder:wine \
    /bin/bash -c "cd /project && npm run build:electron && npm run package:mac"

echo "✅ macOS build complete!"
echo "📁 Check the 'release' directory for your macOS installer (.dmg)"