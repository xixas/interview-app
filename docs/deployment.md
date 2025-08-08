# Deployment and Packaging Guide

This guide covers building, packaging, and deploying the Interview App v2 for production.

## Production Builds

### Prerequisites

Before creating production builds, ensure all projects are properly configured:

1. **Environment Configuration**: Set up production environment files
2. **API Keys**: Configure OpenAI API key for the evaluator service
3. **Database**: Ensure the SQLite database is in place
4. **Dependencies**: All npm packages are installed

### Building All Applications

```bash
# Build all applications for production
npm run build

# Or build individually
npm run nxe:build:frontend    # Angular UI
npm run nxe:build:backend     # Electron
npm run build:api             # API server
npm run build:evaluator       # Evaluator service
```

### Build Outputs

After building, you'll find the outputs in the `dist/` directory:

```
dist/
├── ui/browser/              # Angular production build
├── electron/                # Electron main process
├── api/                     # API server build
├── evaluator/              # Evaluator service build
└── shared-interfaces/      # Shared library build
```

## Desktop App Packaging

### Electron Desktop App

The desktop application uses `electron-builder` for packaging:

#### Package for Current Platform

```bash
# Package the app (creates unpacked version)
npm run nxe:package:app

# Create distributable (installer/executable)
npm run nxe:make:app
```

#### Package Output Locations

```
dist/
├── packages/              # Packaged app
│   ├── linux-unpacked/   # Linux executable
│   ├── win-unpacked/      # Windows executable  
│   └── mac/               # macOS app bundle
└── executables/           # Distributables
    ├── *.AppImage         # Linux AppImage
    ├── *.exe              # Windows installer
    └── *.dmg              # macOS disk image
```

#### Platform-Specific Packaging

```bash
# Linux
npm run nxe:make:app -- --linux

# Windows (from Linux/macOS with wine)
npm run nxe:make:app -- --win

# macOS
npm run nxe:make:app -- --mac
```

### Electron Builder Configuration

The packaging configuration is in `electron/project.json`:

```json
{
  "make": {
    "executor": "nx-electron:make",
    "options": {
      "name": "interview-app",
      "frontendProject": "ui",
      "sourcePath": "dist",
      "outputPath": "dist/executables"
    }
  }
}
```

### Code Signing (Production)

For distribution, you'll need to code sign the application:

#### Windows Code Signing

```bash
# Set up code signing certificate
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"

# Build with signing
npm run nxe:make:app -- --win
```

#### macOS Code Signing

```bash
# Set up Apple Developer certificate
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"
export CSC_KEY_PASSWORD="keychain-password"

# Build with signing and notarization
npm run nxe:make:app -- --mac
```

## Backend Services Deployment

### API Server Deployment

#### Docker Deployment

Create a Dockerfile for the API server:

```dockerfile
# api/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY dist/api ./
COPY api/src/assets ./assets

# Install production dependencies
COPY api/package*.json ./
RUN npm ci --only=production

EXPOSE 3000

CMD ["node", "main.js"]
```

Build and deploy:

```bash
# Build Docker image
docker build -t interview-app-api ./api

# Run container
docker run -p 3000:3000 -v $(pwd)/data:/app/data interview-app-api
```

#### Traditional Server Deployment

```bash
# Copy built files to server
scp -r dist/api user@server:/opt/interview-app/api
scp -r api/src/assets user@server:/opt/interview-app/api/assets

# Install dependencies on server
ssh user@server "cd /opt/interview-app/api && npm ci --only=production"

# Set up systemd service
sudo tee /etc/systemd/system/interview-api.service > /dev/null <<EOF
[Unit]
Description=Interview App API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/interview-app/api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node main.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable interview-api
sudo systemctl start interview-api
```

### Evaluator Service Deployment

Similar to the API server, but include environment variables for OpenAI:

```bash
# Environment variables for production
export OPENAI_API_KEY="your-api-key"
export NODE_ENV="production"

# Docker run with environment
docker run -p 3001:3001 \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e NODE_ENV="production" \
  interview-app-evaluator
```

### Nginx Configuration

Set up Nginx as a reverse proxy:

```nginx
# /etc/nginx/sites-available/interview-app
server {
    listen 80;
    server_name your-domain.com;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Evaluator proxy
    location /evaluator/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve static Angular app
    location / {
        root /var/www/interview-app;
        try_files $uri $uri/ /index.html;
    }
}
```

## Web Application Deployment

### Static Hosting (Recommended)

The Angular frontend is a static SPA that can be hosted on:

- **Netlify**: Drag and drop `dist/ui/browser/`
- **Vercel**: Connect your Git repository
- **AWS S3 + CloudFront**: Upload static files
- **GitHub Pages**: Use GitHub Actions for deployment

### GitHub Pages Deployment

Create a GitHub Action for automatic deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build frontend
      run: npm run nxe:build:frontend
    
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist/ui/browser
```

### Environment Variables for Production

Create production environment files:

```typescript
// ui/src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-api.com',
  evaluatorUrl: 'https://your-evaluator.com',
  appName: 'Interview App',
  version: '1.0.0',
  features: {
    audioRecording: true,
    aiAnalysis: true,
    darkMode: true,
    electronIntegration: false,
  },
  limits: {
    maxQuestions: 50,
    maxSessionTime: 7200,
    maxFileSize: 10 * 1024 * 1024,
  }
};
```

## Database Management

### Production Database Setup

For production, consider migrating from SQLite to PostgreSQL:

```typescript
// api/src/environments/environment.prod.ts
export const environment = {
  production: true,
  port: process.env.PORT || 3000,
  database: {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  }
};
```

### Database Migration Scripts

```bash
# Export SQLite data to SQL
sqlite3 api/src/assets/mock-interview-backup-2025-08-08.db .dump > questions.sql

# Import to PostgreSQL
psql -h localhost -U username -d interview_db < questions.sql
```

## Monitoring and Logging

### Application Monitoring

Set up logging and monitoring:

```typescript
// Add to your NestJS services
import { Logger } from '@nestjs/common';

@Injectable()
export class ApiService {
  private readonly logger = new Logger(ApiService.name);

  async getQuestions() {
    this.logger.log('Fetching questions from database');
    // ... your code
  }
}
```

### Health Checks

Add health check endpoints:

```typescript
// api/src/app/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version
    };
  }
}
```

## CI/CD Pipeline

### Complete GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
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
    
    - name: Run tests
      run: npm run test
    
    - name: Run linting
      run: npm run lint

  build:
    needs: test
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
    
    - name: Build all applications
      run: npm run build
    
    - name: Upload build artifacts
      uses: actions/upload-artifact@v3
      with:
        name: build-artifacts
        path: dist/

  package-desktop:
    needs: build
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    
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
      run: npm run build
    
    - name: Package Electron app
      run: npm run nxe:make:app
    
    - name: Upload desktop artifacts
      uses: actions/upload-artifact@v3
      with:
        name: desktop-app-${{ matrix.os }}
        path: dist/executables/
```

## Security Considerations

### API Security

1. **API Keys**: Store in environment variables, never in code
2. **Rate Limiting**: Implement rate limiting for API endpoints
3. **HTTPS**: Always use HTTPS in production
4. **CORS**: Configure proper CORS policies

### Desktop App Security

1. **Code Signing**: Sign your Electron application
2. **Auto-updater**: Implement secure auto-update mechanism
3. **CSP**: Configure Content Security Policy
4. **IPC Security**: Validate all IPC messages

## Performance Optimization

### Frontend Optimization

```bash
# Analyze bundle size
npx webpack-bundle-analyzer dist/ui/browser/stats.json

# Optimize builds
npm run nxe:build:frontend -- --optimization --buildOptimizer
```

### Backend Optimization

1. **Database Indexing**: Add indexes for frequently queried columns
2. **Caching**: Implement Redis for API response caching
3. **Compression**: Enable gzip compression in Nginx

## Troubleshooting Deployment

### Common Issues

1. **Missing Dependencies**: Ensure all production dependencies are listed in `package.json`
2. **Environment Variables**: Double-check all environment variables are set
3. **File Permissions**: Ensure proper file permissions on deployed files
4. **Database Connections**: Verify database connection strings and credentials

### Rollback Strategy

1. Keep previous version available
2. Use database migrations with rollback scripts
3. Implement health checks for automatic rollback
4. Monitor application metrics post-deployment

This deployment guide should help you successfully deploy the Interview App v2 to various environments. For specific hosting platform instructions, refer to their respective documentation.