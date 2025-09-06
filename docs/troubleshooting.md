# Troubleshooting Guide

This guide helps resolve common issues encountered while developing, building, or using the Interview App.

## Table of Contents

- [Application Startup Issues](#application-startup-issues)
- [Development Server Issues](#development-server-issues)
- [Build and Packaging Issues](#build-and-packaging-issues)
- [Audio Recording Issues](#audio-recording-issues)
- [AI Evaluation Issues](#ai-evaluation-issues)
- [Database Issues](#database-issues)
- [Performance Issues](#performance-issues)
- [Platform-Specific Issues](#platform-specific-issues)

## Application Startup Issues

### Electron App Won't Start

**Symptoms**: Application window doesn't appear, process exits silently

**Possible Causes & Solutions**:

1. **Missing Dependencies**
   ```bash
   # Reinstall all dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Port Conflicts**
   ```bash
   # Check what's using required ports
   netstat -tulpn | grep -E ':(3000|3001|3002)'
   
   # Kill conflicting processes
   pkill -f "node.*3000"
   ```

3. **Permission Issues (Linux/macOS)**
   ```bash
   # Make sure Electron has execution permissions
   chmod +x node_modules/.bin/electron
   ```

4. **Corrupted Electron Installation**
   ```bash
   # Clear Electron cache and reinstall
   rm -rf ~/.cache/electron
   npm run postinstall
   ```

### Service Manager Failures

**Symptoms**: Error messages about API or Evaluator services not starting

**Solutions**:
1. **Check Node.js Installation**
   ```bash
   node --version  # Should be 18+
   which node      # Should return valid path
   ```

2. **Service Spawn Issues**
   ```bash
   # Start services manually for debugging
   npm run serve:api &
   npm run serve:evaluator &
   ```

3. **Database Connection Issues**
   ```bash
   # Verify database file exists
   ls -la api/src/assets/mock-interview-backup-2025-08-08.db
   
   # Check permissions
   chmod 644 api/src/assets/mock-interview-backup-2025-08-08.db
   ```

## Development Server Issues

### Angular Dev Server Won't Start

**Symptoms**: `ng serve` fails or returns errors

**Solutions**:

1. **Clear Angular Cache**
   ```bash
   # Clear Angular build cache
   rm -rf .angular
   npm run nxe:serve:frontend
   ```

2. **Port Already in Use**
   ```bash
   # Use different port
   ng serve --port 4200
   
   # Or kill process using port 3002
   lsof -ti:3002 | xargs kill -9
   ```

3. **TypeScript Compilation Errors**
   ```bash
   # Check TypeScript version compatibility
   npx tsc --version
   
   # Fix type errors
   npm run lint -- --fix
   ```

### NestJS Services Won't Start

**Symptoms**: API or Evaluator services fail to start

**Solutions**:

1. **Check Service Logs**
   ```bash
   # Start services individually to see errors
   cd api && npm run start:dev
   cd evaluator && npm run start:dev
   ```

2. **Database Connection Issues**
   ```bash
   # Verify SQLite3 installation
   which sqlite3
   npm list sqlite3
   ```

3. **Module Import Errors**
   ```bash
   # Clear NestJS cache
   rm -rf dist/
   npm run build:api
   npm run build:evaluator
   ```

## Build and Packaging Issues

### Icon Resolution Errors

**Symptoms**: `image must be at least 256x256`

**Solution**:
```bash
# Convert PNG to proper ICO with multiple resolutions
magick build-resources/icon.png -define icon:auto-resize=256,128,64,48,32,16 build-resources/icon.ico

# Verify icon has correct resolutions
file build-resources/icon.ico
```

### Electron Builder Failures

**Symptoms**: Build fails during packaging

**Common Solutions**:

1. **Clear Build Cache**
   ```bash
   rm -rf release/ dist/
   npm run build:electron
   ```

2. **Node Modules Issues**
   ```bash
   rm -rf node_modules
   npm install
   npm run postinstall
   ```

3. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   export NODE_OPTIONS="--max_old_space_size=4096"
   npm run package:win
   ```

### Cross-Platform Build Issues

**macOS Builds on Linux**:
```bash
# Use Docker-based builds
docker pull electronuserland/builder:wine
npm run docker:build:mac
```

**Windows Builds Missing Dependencies**:
```bash
# Ensure all Windows dependencies are included
npm run package:win -- --publish=never
```

## Audio Recording Issues

### Microphone Not Detected

**Symptoms**: No audio recording capability in the app

**Solutions**:

1. **Browser Permissions**
   - Grant microphone permissions when prompted
   - Check browser settings for microphone access

2. **System Permissions (macOS)**
   ```bash
   # Check system preferences > Security & Privacy > Microphone
   # Ensure the app has microphone permissions
   ```

3. **Electron Permissions**
   ```typescript
   // In electron main process
   const { systemPreferences } = require('electron');
   
   // Request microphone access
   systemPreferences.askForMediaAccess('microphone');
   ```

### Audio Recording Quality Issues

**Solutions**:

1. **Check Recording Settings**
   ```typescript
   // Adjust recording settings
   const constraints = {
     audio: {
       sampleRate: 44100,
       channelCount: 1,
       echoCancellation: true,
       noiseSuppression: true
     }
   };
   ```

2. **Browser Compatibility**
   - Use Chrome/Chromium-based browsers for best compatibility
   - Avoid Firefox if experiencing issues

## AI Evaluation Issues

### OpenAI API Key Issues

**Symptoms**: Evaluation requests fail with authentication errors

**Solutions**:

1. **Verify API Key Format**
   ```bash
   # API key should start with 'sk-'
   echo $OPENAI_API_KEY | head -c 8
   ```

2. **Check API Key Permissions**
   - Ensure key has access to required models (GPT-3.5/GPT-4)
   - Verify billing/usage limits aren't exceeded

3. **Test API Connection**
   ```bash
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        -H "Content-Type: application/json" \
        https://api.openai.com/v1/models
   ```

### Evaluation Service Timeouts

**Symptoms**: Evaluation requests timeout or take too long

**Solutions**:

1. **Increase Timeout Values**
   ```typescript
   // In evaluator service
   const timeout = 60000; // 60 seconds
   ```

2. **Check Network Connectivity**
   ```bash
   # Test connection to OpenAI
   ping api.openai.com
   curl -I https://api.openai.com
   ```

3. **Use Faster Models**
   - Switch from GPT-4 to GPT-3.5-turbo for faster responses
   - Reduce evaluation prompt complexity

## Database Issues

### SQLite Database Corruption

**Symptoms**: Database errors, data not loading

**Solutions**:

1. **Check Database Integrity**
   ```bash
   sqlite3 api/src/assets/mock-interview-backup-2025-08-08.db "PRAGMA integrity_check;"
   ```

2. **Repair Database**
   ```bash
   # Create backup first
   cp api/src/assets/mock-interview-backup-2025-08-08.db backup.db
   
   # Repair database
   sqlite3 backup.db "VACUUM;"
   ```

3. **Restore from Backup**
   ```bash
   # Use the original database file
   git checkout HEAD -- api/src/assets/mock-interview-backup-2025-08-08.db
   ```

### Database Connection Issues

**Symptoms**: Cannot connect to database, queries fail

**Solutions**:

1. **Check File Permissions**
   ```bash
   ls -la api/src/assets/mock-interview-backup-2025-08-08.db
   chmod 644 api/src/assets/mock-interview-backup-2025-08-08.db
   ```

2. **Verify Database Path**
   ```typescript
   // Check database configuration
   console.log(process.cwd());
   console.log(path.resolve('./api/src/assets/mock-interview-backup-2025-08-08.db'));
   ```

3. **SQLite3 Installation**
   ```bash
   npm list sqlite3
   npm install sqlite3 --build-from-source
   ```

## Performance Issues

### Slow Application Startup

**Solutions**:

1. **Optimize Build Size**
   ```bash
   # Analyze bundle size
   npm run build -- --analyze
   
   # Use production build
   npm run build:electron
   ```

2. **Reduce Initial Load**
   - Enable lazy loading for feature modules
   - Optimize images and assets
   - Use OnPush change detection

3. **Database Optimization**
   ```sql
   -- Add indexes for frequently queried columns
   CREATE INDEX IF NOT EXISTS idx_questions_tech_difficulty 
   ON questions(tech_id, difficulty);
   ```

### High Memory Usage

**Solutions**:

1. **Enable Production Mode**
   ```typescript
   // Ensure production mode is enabled
   if (environment.production) {
     enableProdMode();
   }
   ```

2. **Optimize Change Detection**
   ```typescript
   // Use OnPush strategy
   @Component({
     changeDetection: ChangeDetectionStrategy.OnPush
   })
   ```

3. **Memory Profiling**
   ```bash
   # Profile memory usage
   node --inspect --inspect-brk dist/electron/main.js
   ```

## Platform-Specific Issues

### Linux AppImage Issues

**Symptoms**: AppImage won't execute or shows permission errors

**Solutions**:

1. **Make Executable**
   ```bash
   chmod +x "Interview App-1.0.0.AppImage"
   ```

2. **FUSE Requirements**
   ```bash
   # Install FUSE if missing
   sudo apt install fuse  # Ubuntu/Debian
   sudo yum install fuse  # CentOS/RHEL
   ```

3. **Extract and Run**
   ```bash
   # Extract AppImage contents
   ./Interview\ App-1.0.0.AppImage --appimage-extract
   
   # Run extracted version
   ./squashfs-root/AppRun
   ```

### Windows Installation Issues

**Symptoms**: Installer fails or app won't start on Windows

**Solutions**:

1. **Run as Administrator**
   - Right-click installer and select "Run as administrator"

2. **Antivirus Interference**
   - Add app to antivirus whitelist
   - Temporarily disable real-time protection during installation

3. **Missing Visual C++ Redistributables**
   ```
   Download and install:
   - Microsoft Visual C++ Redistributable 2019/2022 (x64)
   ```

### macOS Code Signing Issues

**Symptoms**: "App is damaged" or "Developer cannot be verified"

**Solutions**:

1. **Allow Unsigned Apps**
   ```bash
   # Temporarily allow unsigned apps
   sudo spctl --master-disable
   
   # Or allow specific app
   sudo xattr -r -d com.apple.quarantine "/Applications/Interview App.app"
   ```

2. **Proper Code Signing**
   ```bash
   # Sign the app (requires developer certificate)
   codesign --force --deep --sign "Developer ID" "Interview App.app"
   ```

## Debug Mode and Logging

### Enable Debug Logging

**Electron Main Process**:
```typescript
// Set debug environment
process.env.DEBUG = 'electron*';
process.env.ELECTRON_IS_DEV = '1';
```

**Angular Application**:
```typescript
// Enable debug mode
import { enableDebugMode } from '@angular/core';
enableDebugMode();
```

**NestJS Services**:
```typescript
// Enable verbose logging
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'log', 'debug', 'verbose'],
});
```

### Log File Locations

- **Electron Logs**: `~/.config/Interview App/logs/`
- **Application Logs**: Console and system logs
- **Service Logs**: Stdout when running with npm scripts

## Getting Help

### Before Reporting Issues

1. **Check Console Logs**
   - Open DevTools (F12) and check console
   - Look for error messages and stack traces

2. **Verify Environment**
   ```bash
   node --version
   npm --version
   git --version
   ```

3. **Test with Clean Environment**
   ```bash
   # Fresh clone and install
   git clone <repo>
   cd interview-app
   npm install
   npm run dev:electron
   ```

### Information to Include in Bug Reports

- Operating system and version
- Node.js and npm versions
- Complete error messages and stack traces
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots/videos if applicable

### Useful Commands for Debugging

```bash
# System information
uname -a
node --version
npm --version
npm list --depth=0

# Application status
ps aux | grep node
netstat -tulpn | grep -E ':(3000|3001|3002)'
lsof -i :3000

# File permissions and paths
ls -la api/src/assets/
file build-resources/icon.*
```