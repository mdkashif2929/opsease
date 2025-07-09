#!/bin/bash

# Alternative build script to fix Vite entry module issue
# Use this if the standard npm run build fails

set -e

echo "🔧 Running alternative build process..."

# Build client separately
echo "📦 Building client application..."
cd client
npx vite build --outDir ../dist/public
cd ..

# Build server
echo "🏗️ Building server application..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "✅ Build completed successfully!"

# Verify build outputs
echo "📋 Build verification:"
echo "Client build: $(ls -la dist/public/index.html 2>/dev/null && echo "✅ Found" || echo "❌ Missing")"
echo "Server build: $(ls -la dist/index.js 2>/dev/null && echo "✅ Found" || echo "❌ Missing")"