# Development Setup Guide

This guide will help you set up the Interview App v2 development environment.

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher (or yarn 1.22.0+)
- **Git**: Latest version
- **Python**: 3.7+ (for node-gyp dependencies)
- **C++ Build Tools**: Platform-specific compiler toolchain

### Platform-Specific Prerequisites

#### Windows
```bash
# Install Windows Build Tools
npm install -g windows-build-tools

# Or using Visual Studio Installer
# Install "C++ build tools" workload
```

#### macOS
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Python (if not already installed)
brew install python
```

#### Linux (Ubuntu/Debian)
```bash
# Install build essentials
sudo apt-get install build-essential python3 python3-pip

# For Electron native dependencies
sudo apt-get install libnss3-dev libatk-ridge-0 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libasound2
```

## Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd interview-app-v2
```

### 2. Install Dependencies

```bash
# Install all dependencies (this may take a few minutes)
npm install

# Verify installation
npm run nx -- --version
```

### 3. Environment Setup

#### API Configuration

Create environment files for the API service:

```bash
# Copy example environment files
cp api/src/environments/environment.example.ts api/src/environments/environment.ts
cp api/src/environments/environment.prod.example.ts api/src/environments/environment.prod.ts
```

Edit the environment files with your configuration:

```typescript
// api/src/environments/environment.ts
export const environment = {
  production: false,
  port: 3000,
  database: {
    filename: 'data/interview-questions.db'
  }
};
```

#### Evaluator Service Configuration

Set up the evaluator service environment:

```bash
# Copy evaluator environment files
cp evaluator/src/environments/environment.example.ts evaluator/src/environments/environment.ts
```

Add your OpenAI API key:

```typescript
// evaluator/src/environments/environment.ts
export const environment = {
  production: false,
  port: 3001,
  openai: {
    apiKey: 'your-openai-api-key-here',
    model: 'gpt-4',
    maxTokens: 1000
  }
};
```

#### UI Configuration

The UI uses environment-specific configurations that are automatically selected based on the build target.

## Development Workflow

### Starting Development Servers

#### Option 1: Start All Services Individually

```bash
# Terminal 1: Start API server
npm run serve:api

# Terminal 2: Start Evaluator service  
npm run serve:evaluator

# Terminal 3: Start UI development server
npm run nxe:serve:frontend

# Terminal 4: Start Electron app (optional)
npm run nxe:serve:backend
```

#### Option 2: Start Services as Needed

For frontend-only development:
```bash
# Start just the Angular dev server
npm run nxe:serve:frontend
# Access at http://localhost:4200
```

For full-stack development:
```bash
# Start backend services
npm run serve:api & npm run serve:evaluator

# Start frontend
npm run nxe:serve:frontend
```

For desktop app development:
```bash
# Build frontend first
npm run nxe:build:frontend

# Start Electron with hot reload
npm run nxe:serve:backend
```

### Development URLs

- **Angular UI**: http://localhost:4200
- **API Server**: http://localhost:3000
- **Evaluator Service**: http://localhost:3001
- **Nx Graph**: http://localhost:4211 (run `npx nx graph`)

## Project Structure

```
interview-app-v2/
├── api/                    # NestJS backend API
│   ├── src/
│   │   ├── app/           # API modules and controllers
│   │   ├── assets/        # Static assets and database
│   │   └── environments/  # Environment configs
│   └── project.json
│
├── evaluator/             # NestJS AI evaluator service
│   ├── src/
│   │   ├── app/          # Evaluator modules
│   │   └── environments/  # Environment configs
│   └── project.json
│
├── ui/                    # Angular frontend
│   ├── src/
│   │   ├── app/          # Angular components and services
│   │   │   ├── core/     # Core services (auth, environment)
│   │   │   ├── features/ # Feature modules (dashboard, interview)
│   │   │   └── shared/   # Shared components and utilities
│   │   ├── assets/       # Static assets
│   │   └── environments/ # Environment configs
│   └── project.json
│
├── electron/              # Electron desktop wrapper
│   ├── src/
│   │   ├── app/          # Electron main process
│   │   │   ├── api/      # IPC handlers
│   │   │   └── constants.ts
│   │   └── environments/ # Environment configs
│   └── project.json
│
├── libs/                  # Shared libraries
│   └── shared-interfaces/ # TypeScript interfaces
│
├── docs/                  # Documentation
├── dist/                  # Build outputs
└── package.json           # Root package configuration
```

## Common Development Tasks

### Building Applications

```bash
# Build all applications
npm run build

# Build specific applications
npm run nxe:build:frontend    # Angular UI
npm run nxe:build:backend     # Electron
npm run build:api             # API server
npm run build:evaluator       # Evaluator service
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests for specific project
npm run nxe:test:frontend
npm run nxe:test:backend
npx nx test api
npx nx test evaluator
```

### Linting and Code Quality

```bash
# Run linting
npm run lint

# Fix linting issues automatically
npm run lint -- --fix

# Run linting on specific project
npx nx lint ui
npx nx lint api
```

### Database Management

The API uses SQLite with a pre-populated question database:

```bash
# Database location
ls api/src/assets/

# View database schema
sqlite3 api/src/assets/mock-interview-backup-2025-08-08.db ".schema"

# Query questions
sqlite3 api/src/assets/mock-interview-backup-2025-08-08.db "SELECT count(*) FROM questions;"
```

## Debugging

### Frontend Debugging

Angular with Chrome DevTools:
1. Open http://localhost:4200 in Chrome
2. Open DevTools (F12)
3. Use Angular DevTools extension for enhanced debugging

### Backend Debugging

API and Evaluator services with VSCode:
1. Add breakpoints in your code
2. Run the service in debug mode:
   ```bash
   npx nx serve api --inspect
   npx nx serve evaluator --inspect
   ```
3. Attach VSCode debugger to the running process

### Electron Debugging

1. Enable DevTools in development:
   ```typescript
   // In electron/src/app/app.ts
   if (isDevelopmentMode()) {
     mainWindow.webContents.openDevTools();
   }
   ```

2. Debug main process:
   ```bash
   npm run nxe:serve:backend -- --inspect=5858
   ```

## Troubleshooting

### Common Issues

#### Node-gyp Build Errors
```bash
# Clear npm cache
npm cache clean --force

# Rebuild native dependencies
npm rebuild

# Install specific Python version for node-gyp
npm config set python python3
```

#### Port Already in Use
```bash
# Find and kill process using port 4200
lsof -ti:4200 | xargs kill -9

# Or use different port
npm run nxe:serve:frontend -- --port 4201
```

#### Electron Won't Start
```bash
# Rebuild Electron
npm run postinstall

# Clear Electron cache
rm -rf node_modules/.cache/electron

# Reinstall Electron
npm uninstall electron
npm install electron --save-dev
```

#### OpenAI API Issues
- Verify your API key is valid
- Check rate limits and quotas
- Ensure billing is set up for your OpenAI account

### Development Best Practices

#### Code Organization
- Follow Angular style guide for frontend code
- Use NestJS conventions for backend services
- Keep shared interfaces in the `libs/` folder
- Write unit tests for business logic

#### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new interview feature"

# Push and create PR
git push origin feature/new-feature
```

#### Performance Tips
- Use Angular OnPush change detection strategy
- Implement lazy loading for large components
- Optimize Electron preload scripts
- Monitor bundle sizes with webpack-bundle-analyzer

## IDE Setup

### VSCode Extensions

Recommended extensions for optimal development experience:

```json
{
  "recommendations": [
    "angular.ng-template",
    "ms-vscode.typescript-hero",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "nrwl.angular-console"
  ]
}
```

### VSCode Settings

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Next Steps

After completing the development setup:

1. Read the [Architecture Overview](./architecture.md)
2. Review the [API Documentation](./api.md)
3. Check out the [Deployment Guide](./deployment.md)
4. Start developing! 🚀