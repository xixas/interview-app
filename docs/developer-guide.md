# Developer Guide

This guide covers everything you need to know to develop, build, and deploy the Interview App.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Building & Deployment](#building--deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## Development Setup

### Prerequisites

- **Node.js** 18+ 
- **npm** 8+
- **Git**
- **Docker** (for macOS builds only)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/xixas/interview-app.git
   cd interview-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   # Copy example environment files
   cp .env.example .env
   ```

### Development Servers

The application consists of multiple services that can be started individually or together:

#### Option 1: All Services + Electron (Recommended)
```bash
npm run dev:electron
```

This starts:
- Angular UI dev server (http://localhost:3002)
- API server (http://localhost:3000)
- Evaluator service (http://localhost:3001)
- Electron desktop app

#### Option 2: Web Development Only
```bash
npm run dev
```

This starts the web servers without Electron for faster development cycles.

#### Option 3: Individual Services
```bash
# Start Angular UI only
npm run nxe:serve:frontend

# Start API server only  
npm run serve:api

# Start evaluator service only
npm run serve:evaluator

# Start Electron only (requires built frontend)
npm run nxe:serve:backend
```

## Project Structure

```
interview-app/
├── ui/                     # Angular 20 frontend application
│   ├── src/app/
│   │   ├── core/          # Core services, guards, interceptors
│   │   ├── features/      # Feature modules (interview, settings, etc.)
│   │   ├── shared/        # Shared components and utilities
│   │   └── layouts/       # Application layouts
├── api/                    # NestJS API server
│   ├── src/
│   │   ├── app/           # Application modules
│   │   ├── assets/        # Static assets (database files)
│   │   └── main.ts        # Application entry point
├── evaluator/             # NestJS AI evaluation service
│   ├── src/
│   │   ├── app/           # Evaluation logic
│   │   └── main.ts        # Service entry point
├── electron/              # Electron desktop wrapper
│   ├── src/
│   │   ├── app/           # Main process logic
│   │   │   ├── services/  # System services (database, IPC)
│   │   │   └── api/       # IPC handlers
│   │   └── main.ts        # Electron main process
├── shared-interfaces/     # Shared TypeScript interfaces
├── examples/             # Reference implementations
├── docs/                 # Documentation
└── build-resources/      # Build assets (icons, etc.)
```

### Key Technologies

- **Frontend**: Angular 20, PrimeNG, TypeScript, SCSS
- **Backend**: NestJS, TypeScript, SQLite (TypeORM)
- **Desktop**: Electron, IPC Communication
- **AI**: OpenAI API integration
- **Build System**: Nx monorepo, Webpack, electron-builder
- **Testing**: Jest, Playwright

## Development Workflow

### 1. Feature Development

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Develop your feature**
   - Use Nx generators for consistency
   - Follow Angular style guide
   - Write tests for new functionality

3. **Test your changes**
   ```bash
   npm run test
   npm run lint
   ```

### 2. Code Standards

#### Angular Components
- Use standalone components (Angular 20+)
- Use signals for state management
- OnPush change detection strategy
- Use `inject()` function instead of constructor injection

Example:
```typescript
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

@Component({
  selector: 'app-example',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{count()}}</div>`
})
export class ExampleComponent {
  private readonly service = inject(SomeService);
  protected readonly count = signal(0);
}
```

#### NestJS Services
- Use dependency injection
- Implement proper error handling
- Use DTOs for validation
- Document with Swagger decorators

#### Electron IPC
- Type-safe IPC contracts
- Proper error handling
- Context isolation enabled

### 3. Database Development

The application uses SQLite with TypeORM:

- **Database file**: `api/src/assets/mock-interview-backup-2025-08-08.db`
- **Entities**: Located in `api/src/app/entities/`
- **Services**: Database operations in service files

#### Database Schema
```sql
-- Technologies (15 total)
CREATE TABLE tech (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Questions (3,844 total)
CREATE TABLE questions (
  id INTEGER PRIMARY KEY,
  tech_id INTEGER,
  question TEXT NOT NULL,
  answer TEXT,
  difficulty TEXT DEFAULT 'Fundamental',
  example TEXT,
  FOREIGN KEY (tech_id) REFERENCES tech(id)
);

-- Interview sessions and responses
CREATE TABLE interview_sessions (...);
CREATE TABLE interview_responses (...);
```

## Building & Deployment

### Local Development Builds

```bash
# Build all projects
npm run build

# Build specific projects
npm run nxe:build:frontend  # Angular
npm run build:api           # API server
npm run build:evaluator     # Evaluator service
npm run nxe:build:backend   # Electron
```

### Production Builds

#### Linux (Native)
```bash
npm run build:appimage
# Output: release/Interview App-1.0.0.AppImage
```

#### Windows (Cross-compile from Linux)
```bash
npm run package:win
# Output: release/Interview App Setup 1.0.0.exe
```

#### macOS (Docker required)
```bash
npm run docker:build:mac
# Output: release/Interview App-1.0.0.dmg
```

#### All Platforms
```bash
./build-all-platforms.sh
```

### Build Scripts

Convenient shell scripts are provided:
- `build-windows.sh` - Build Windows installer
- `build-mac.sh` - Build macOS DMG (Docker)
- `build-all-platforms.sh` - Build for all platforms

### Build Configuration

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
    "files": [...],
    "extraResources": [...],
    "linux": { "target": "AppImage" },
    "win": { "target": "nsis" },
    "mac": { "target": "dmg" }
  }
}
```

## Testing

### Unit Tests
```bash
# Run all tests
npm run test

# Run tests for specific project
nx test ui
nx test api
nx test evaluator
```

### E2E Tests
```bash
# Run Playwright E2E tests
npm run test:e2e

# Run with visible browser
npm run test:e2e:headed

# Open Playwright UI
npm run test:e2e:ui
```

### Linting
```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

## Contributing

### Before Contributing

1. **Read the documentation** - Understand the architecture and patterns
2. **Check existing issues** - Avoid duplicate work
3. **Discuss major changes** - Create an issue first for significant features

### Pull Request Process

1. **Fork and clone** the repository
2. **Create feature branch** from `main`
3. **Make your changes** following code standards
4. **Add/update tests** for new functionality
5. **Update documentation** if needed
6. **Test thoroughly** - unit tests, E2E tests, manual testing
7. **Create pull request** with clear description

### Commit Standards

Use conventional commits format:
```
feat: add new interview evaluation criteria
fix: resolve audio recording issue in Firefox
docs: update API documentation
test: add E2E tests for settings page
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's running on ports
netstat -tulpn | grep -E ':(3000|3001|3002)'

# Kill processes if needed
pkill -f "node.*3000"
```

#### Build Issues
```bash
# Clear Nx cache
nx reset

# Clean node_modules
rm -rf node_modules package-lock.json
npm install
```

#### Electron Issues
```bash
# Clear Electron cache
rm -rf node_modules/.cache/electron

# Rebuild native modules
npm run postinstall
```

#### Database Issues
- Ensure database file exists: `api/src/assets/mock-interview-backup-2025-08-08.db`
- Check file permissions
- Verify SQLite3 installation

### Debug Mode

#### Frontend Debugging
- Use Angular DevTools extension
- Check browser console for errors
- Use `ng.profiler.timeChangeDetection()` for performance

#### Backend Debugging
- Enable debug logs in NestJS
- Use VS Code debugger with launch configurations
- Check service health endpoints:
  - API: http://localhost:3000/api
  - Evaluator: http://localhost:3001/api/evaluator/health

#### Electron Debugging
- Enable developer tools in production builds
- Use `console.log` in main process (visible in terminal)
- Use `console.log` in renderer process (visible in DevTools)

### Environment Variables

```bash
# Development
NODE_ENV=development
API_PORT=3000
EVALUATOR_PORT=3001
UI_DEV_PORT=3002

# Production
NODE_ENV=production
OPENAI_API_KEY=your_key_here
```

### Getting Help

1. **Check documentation** - Most issues are covered here
2. **Search existing issues** on GitHub
3. **Create new issue** with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Console/log output

## Performance Tips

### Development
- Use `npm run dev` for web-only development (faster)
- Enable hot reload for faster iteration
- Use Chrome DevTools performance tab

### Production
- Enable production mode
- Use OnPush change detection
- Lazy load feature modules
- Optimize images and assets

### Build Optimization
- Use parallel builds where possible
- Cache dependencies between builds
- Monitor bundle size with webpack-bundle-analyzer

## Security Considerations

- **Electron**: Context isolation enabled, no Node.js in renderer
- **API Keys**: Store in environment variables, never commit to repo
- **CORS**: Configure appropriately for production
- **CSP**: Content Security Policy headers
- **Input Validation**: Use DTOs with class-validator

## Additional Resources

- [Angular Documentation](https://angular.dev)
- [NestJS Documentation](https://nestjs.com)
- [Electron Documentation](https://electronjs.org)
- [Nx Documentation](https://nx.dev)
- [PrimeNG Documentation](https://primeng.org)