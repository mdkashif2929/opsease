# Build Fix for Vite Entry Module Error

## Issue Identified
The deployment is failing with this error:
```
Could not resolve entry module "client/index.html"
```

## Root Cause
The Vite configuration is not properly resolving the entry point for the client application during the Docker build process.

## Fix Applied

### 1. Updated vite.config.ts
Added explicit rollupOptions to specify the correct entry point:

```typescript
build: {
  outDir: path.resolve(import.meta.dirname, "dist/public"),
  emptyOutDir: true,
  rollupOptions: {
    input: path.resolve(import.meta.dirname, "client/index.html")
  }
}
```

### 2. Alternative Build Command
If the issue persists, you can try this alternative build approach in your deployment:

```bash
# Instead of: npm run build
# Use these separate commands:
cd client && npx vite build --outDir ../dist/public
cd .. && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

### 3. Dockerfile Alternative
If using Docker, ensure the build context includes all necessary files:

```dockerfile
# Make sure all files are copied before build
COPY . /app/.
RUN npm ci --production=false
RUN npm run build
```

## Verification Steps
1. Check that `client/index.html` exists in the build context
2. Verify `client/src/main.tsx` is the correct entry script
3. Ensure all client dependencies are installed
4. Test build locally before deployment

## If Problem Persists
Try building the client and server separately:
```bash
# Build client
cd client
vite build --outDir ../dist/public

# Build server  
cd ..
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```