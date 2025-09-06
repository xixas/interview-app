# Configuration Guide

This guide covers all configuration options for the Interview App, including environment variables, application settings, and deployment configurations.

## Table of Contents

- [Environment Configuration](#environment-configuration)
- [Application Settings](#application-settings)
- [API Configuration](#api-configuration)
- [Database Configuration](#database-configuration)
- [Build Configuration](#build-configuration)
- [Development Configuration](#development-configuration)
- [Production Configuration](#production-configuration)

## Environment Configuration

### Environment Variables

The application uses different environment variables for development and production.

#### Development Environment

Create a `.env` file in the root directory:

```bash
# Development Environment
NODE_ENV=development

# Service Ports
API_PORT=3000
EVALUATOR_PORT=3001
UI_DEV_PORT=3002

# Database Configuration
DATABASE_PATH=./api/src/assets/mock-interview-backup-2025-08-08.db
DATABASE_TYPE=sqlite

# OpenAI Configuration (Optional for development)
OPENAI_API_KEY=sk-your-development-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000

# Debug Settings
DEBUG=false
LOG_LEVEL=info
ELECTRON_IS_DEV=1

# CORS Settings (Development)
CORS_ORIGIN=http://localhost:3002
CORS_METHODS=GET,HEAD,PUT,PATCH,POST,DELETE
CORS_CREDENTIALS=true
```

#### Production Environment

```bash
# Production Environment
NODE_ENV=production

# Service Ports (will be auto-assigned in Electron)
API_PORT=3000
EVALUATOR_PORT=3001

# Database Configuration
DATABASE_PATH=./resources/app/dist/api/assets/mock-interview-backup-2025-08-08.db
DATABASE_TYPE=sqlite

# OpenAI Configuration (Required for AI features)
OPENAI_API_KEY=sk-your-production-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=3000

# Debug Settings
DEBUG=false
LOG_LEVEL=warn
ELECTRON_IS_DEV=0

# Security Settings
CORS_ORIGIN=*
CORS_CREDENTIALS=false
```

### Platform-Specific Environment

#### Linux Configuration
```bash
# Linux-specific paths
APP_DATA_PATH=~/.config/interview-app
LOG_PATH=~/.config/interview-app/logs
CACHE_PATH=~/.cache/interview-app
```

#### Windows Configuration
```bash
# Windows-specific paths
APP_DATA_PATH=%APPDATA%/interview-app
LOG_PATH=%APPDATA%/interview-app/logs
CACHE_PATH=%LOCALAPPDATA%/interview-app/cache
```

#### macOS Configuration
```bash
# macOS-specific paths
APP_DATA_PATH=~/Library/Application\ Support/interview-app
LOG_PATH=~/Library/Logs/interview-app
CACHE_PATH=~/Library/Caches/interview-app
```

## Application Settings

### Angular Configuration

#### Development Settings (`ui/src/environments/environment.ts`)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  evaluatorUrl: 'http://localhost:3001/api',
  enableDebugMode: true,
  enableServiceWorker: false,
  logLevel: 'debug',
  features: {
    audioRecording: true,
    aiEvaluation: true,
    offlineMode: false,
    analytics: false
  },
  ui: {
    theme: 'aura-light',
    enableAnimations: true,
    showDebugInfo: true
  }
};
```

#### Production Settings (`ui/src/environments/environment.prod.ts`)
```typescript
export const environment = {
  production: true,
  apiUrl: '/api',  // Relative to Electron app
  evaluatorUrl: '/api/evaluator',  // Relative to Electron app
  enableDebugMode: false,
  enableServiceWorker: true,
  logLevel: 'error',
  features: {
    audioRecording: true,
    aiEvaluation: true,
    offlineMode: true,
    analytics: true
  },
  ui: {
    theme: 'aura-light',
    enableAnimations: true,
    showDebugInfo: false
  }
};
```

#### Electron-Specific Settings (`ui/src/environments/environment.electron.ts`)
```typescript
export const environment = {
  production: false,
  electron: true,
  apiUrl: 'http://localhost:3000/api',
  evaluatorUrl: 'http://localhost:3001/api',
  enableIPC: true,
  nativeFeatures: {
    fileSystem: true,
    notifications: true,
    systemIntegration: true,
    autoUpdater: false
  }
};
```

### Electron Configuration

#### Main Process Configuration (`electron/src/app/config/app.config.ts`)
```typescript
export interface AppConfig {
  isDevelopment: boolean;
  ports: {
    api: number;
    evaluator: number;
    ui: number;
  };
  database: {
    path: string;
    type: 'sqlite';
    synchronize: boolean;
    logging: boolean;
  };
  security: {
    nodeIntegration: boolean;
    contextIsolation: boolean;
    enableRemoteModule: boolean;
    allowRunningInsecureContent: boolean;
  };
  window: {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
    resizable: boolean;
    titleBarStyle: string;
  };
}

export const defaultConfig: AppConfig = {
  isDevelopment: process.env.NODE_ENV !== 'production',
  ports: {
    api: parseInt(process.env.API_PORT) || 3000,
    evaluator: parseInt(process.env.EVALUATOR_PORT) || 3001,
    ui: parseInt(process.env.UI_DEV_PORT) || 3002
  },
  database: {
    path: process.env.DATABASE_PATH || './database.db',
    type: 'sqlite',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development'
  },
  security: {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    allowRunningInsecureContent: false
  },
  window: {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    resizable: true,
    titleBarStyle: 'default'
  }
};
```

## API Configuration

### NestJS API Service Configuration

#### Main Configuration (`api/src/app/app.module.ts`)
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'sqlite',
        database: process.env.DATABASE_PATH || 'database.db',
        entities: [Tech, Questions, InterviewSessions, InterviewResponses],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    QuestionsModule,
    InterviewHistoryModule,
  ],
})
export class AppModule {}
```

#### CORS Configuration
```typescript
// In main.ts
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3002',
  methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: process.env.CORS_CREDENTIALS === 'true',
});
```

#### Rate Limiting Configuration
```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,  // Time window in seconds
      limit: 100,  // Max requests per window
    }),
  ],
})
export class AppModule {}
```

### Evaluator Service Configuration

#### OpenAI Configuration (`evaluator/src/app/evaluator.service.ts`)
```typescript
export class EvaluatorService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID, // Optional
      timeout: parseInt(process.env.OPENAI_TIMEOUT) || 30000,
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES) || 3,
    });
  }

  async evaluateAnswer(params: EvaluateAnswerDto) {
    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(),
        },
        {
          role: 'user',
          content: this.formatUserPrompt(params),
        },
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
    });

    return this.parseEvaluationResponse(response);
  }
}
```

## Database Configuration

### SQLite Configuration

#### TypeORM Configuration
```typescript
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: process.env.DATABASE_PATH || './database.db',
  entities: [
    Tech,
    Questions,
    InterviewSessions,
    InterviewResponses,
  ],
  synchronize: false, // Never true in production
  logging: process.env.NODE_ENV === 'development',
  cache: {
    duration: 30000, // 30 seconds
  },
  extra: {
    // SQLite-specific options
    busyTimeout: 30000,
    synchronous: 'NORMAL',
    journalMode: 'WAL',
    cacheSize: -64000, // 64MB cache
  },
};
```

#### Connection Pool Configuration
```typescript
export const connectionPoolConfig = {
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
  min: 1,
  max: 1, // SQLite doesn't support concurrent writes
};
```

### Database Migration Configuration

#### Migration Settings
```typescript
export const migrationConfig = {
  migrationsRun: false,
  migrations: ['src/migrations/*.ts'],
  cli: {
    migrationsDir: 'src/migrations',
  },
};
```

## Build Configuration

### Nx Configuration (`nx.json`)
```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": [
          "build",
          "test",
          "lint"
        ],
        "parallel": 3,
        "useDaemonProcess": true
      }
    }
  },
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"]
    }
  },
  "workspaceLayout": {
    "appsDir": ".",
    "libsDir": "shared-interfaces"
  }
}
```

### Angular Build Configuration (`ui/project.json`)
```json
{
  "targets": {
    "build": {
      "executor": "@angular/build:application",
      "options": {
        "outputPath": "dist/ui/browser",
        "index": "ui/src/index.html",
        "browser": "ui/src/main.ts",
        "polyfills": ["zone.js"],
        "tsConfig": "ui/tsconfig.app.json",
        "assets": [
          "ui/src/favicon.ico",
          "ui/src/assets"
        ],
        "styles": ["ui/src/styles.scss"],
        "scripts": [],
        "budgets": [
          {
            "type": "initial",
            "maximumWarning": "500kb",
            "maximumError": "1mb"
          }
        ]
      },
      "configurations": {
        "production": {
          "optimization": true,
          "outputHashing": "all",
          "sourceMap": false,
          "namedChunks": false,
          "extractLicenses": true,
          "budgets": [
            {
              "type": "initial",
              "maximumWarning": "500kb",
              "maximumError": "1mb"
            }
          ]
        },
        "electron": {
          "baseHref": "./",
          "deployUrl": "./"
        }
      }
    }
  }
}
```

### Electron Builder Configuration (`package.json`)
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
      },
      {
        "from": "api/src/assets/mock-interview-backup-2025-08-08.db",
        "to": "assets/mock-interview-backup-2025-08-08.db"
      }
    ],
    "linux": {
      "target": "AppImage",
      "category": "Development"
    },
    "win": {
      "target": "nsis"
    },
    "mac": {
      "target": "dmg",
      "category": "public.app-category.developer-tools"
    }
  }
}
```

## Development Configuration

### Proxy Configuration (`ui/proxy.conf.json`)
```json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": true,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/api/evaluator/*": {
    "target": "http://localhost:3001",
    "secure": true,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

### ESLint Configuration (`.eslintrc.json`)
```json
{
  "root": true,
  "ignorePatterns": ["**/*"],
  "plugins": ["@nx"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx", "*.js", "*.jsx"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "enforceBuildableLibDependency": true,
            "allow": [],
            "depConstraints": [
              {
                "sourceTag": "*",
                "onlyDependOnLibsWithTags": ["*"]
              }
            ]
          }
        ]
      }
    }
  ]
}
```

### Jest Configuration (`jest.config.ts`)
```typescript
export default {
  displayName: 'interview-app',
  preset: './jest.preset.js',
  globalSetup: '<rootDir>/src/test-setup.ts',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: './coverage/interview-app',
  transform: {
    '^.+\\.(ts|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
```

## Production Configuration

### Performance Optimization

#### Angular Production Settings
```typescript
// Optimize bundle size
export const productionConfig = {
  optimization: true,
  buildOptimizer: true,
  aot: true,
  extractCss: true,
  namedChunks: false,
  extractLicenses: true,
  vendorChunk: false,
  commonChunk: false,
};
```

#### Service Worker Configuration
```typescript
// Enable service worker in production
@NgModule({
  imports: [
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
})
export class AppModule {}
```

### Security Configuration

#### Content Security Policy
```html
<!-- In index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-eval'; 
               style-src 'self' 'unsafe-inline';
               img-src 'self' data: https:;
               connect-src 'self' https://api.openai.com;">
```

#### Electron Security Settings
```typescript
// In electron main.ts
const securityConfig = {
  nodeIntegration: false,
  contextIsolation: true,
  enableRemoteModule: false,
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  webSecurity: true,
};
```

### Logging Configuration

#### Production Logging
```typescript
export const loggingConfig = {
  level: 'warn',
  format: 'json',
  transports: [
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'combined.log',
    }),
  ],
};
```

## Configuration Validation

### Environment Validation Schema
```typescript
import Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  API_PORT: Joi.number().default(3000),
  EVALUATOR_PORT: Joi.number().default(3001),
  UI_DEV_PORT: Joi.number().default(3002),
  
  DATABASE_PATH: Joi.string().required(),
  
  OPENAI_API_KEY: Joi.string()
    .pattern(/^sk-/)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
});
```

### Runtime Configuration Validation
```typescript
export function validateConfiguration(config: any) {
  const { error, value } = configValidationSchema.validate(config);
  
  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
  }
  
  return value;
}
```

This comprehensive configuration guide ensures that the Interview App can be properly configured for different environments and use cases while maintaining security and performance best practices.