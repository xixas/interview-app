# Architecture Documentation

This document provides a comprehensive overview of the Interview App's architecture, system design, and technical decisions.

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Database Design](#database-design)
- [Communication Patterns](#communication-patterns)
- [Security Model](#security-model)
- [Technology Stack](#technology-stack)
- [Design Decisions](#design-decisions)

## System Overview

The Interview App is a cross-platform desktop application built using modern web technologies and Electron. It provides AI-powered mock interview practice with audio recording, evaluation, and progress tracking capabilities.

### Key Characteristics

- **Monorepo Architecture**: Nx-managed workspace with multiple applications
- **Desktop-First**: Electron wrapper with native OS integration
- **Microservices Pattern**: Separated API and Evaluator services
- **Local-First**: SQLite database with potential for cloud sync
- **Type-Safe**: Full TypeScript implementation across all layers

## High-Level Architecture

```mermaid
graph TB
    subgraph "Desktop Environment"
        subgraph "Electron Main Process"
            EM[Electron Main]
            DB[Database Service]
            IPC[IPC Handlers]
            SM[Service Manager]
        end
        
        subgraph "Electron Renderer Process"
            UI[Angular UI App]
            subgraph "Angular Modules"
                CORE[Core Module]
                FEAT[Feature Modules]
                SHARED[Shared Components]
            end
        end
        
        subgraph "NestJS Services"
            API[API Service<br/>Port 3000]
            EVAL[Evaluator Service<br/>Port 3001]
        end
    end
    
    subgraph "External Services"
        OPENAI[OpenAI API]
        OS[Operating System]
    end
    
    UI <--> IPC
    IPC <--> DB
    IPC <--> SM
    SM --> API
    SM --> EVAL
    UI --> API
    UI --> EVAL
    EVAL --> OPENAI
    EM --> OS
    DB --> SQLite[(SQLite DB)]
    
    classDef electron fill:#e1f5fe
    classDef angular fill:#fff3e0
    classDef nestjs fill:#e8f5e8
    classDef external fill:#fce4ec
    
    class EM,DB,IPC,SM electron
    class UI,CORE,FEAT,SHARED angular
    class API,EVAL nestjs
    class OPENAI,OS external
```

## Component Architecture

### Frontend Architecture (Angular 20)

```mermaid
graph TD
    subgraph "Angular Application"
        subgraph "App Shell"
            SHELL[App Shell Component]
            LAYOUT[Layout Components]
            SIDEBAR[Sidebar Navigation]
        end
        
        subgraph "Core Module"
            GUARDS[Route Guards]
            SERVICES[Core Services]
            INTERCEPTORS[HTTP Interceptors]
        end
        
        subgraph "Feature Modules"
            DASH[Dashboard Module]
            INTERVIEW[Interview Module]
            EVALUATOR[Evaluator Module]
            SETTINGS[Settings Module]
            HISTORY[History Module]
        end
        
        subgraph "Shared Module"
            COMPONENTS[Shared Components]
            PIPES[Custom Pipes]
            DIRECTIVES[Custom Directives]
        end
    end
    
    SHELL --> LAYOUT
    SHELL --> SIDEBAR
    LAYOUT --> DASH
    LAYOUT --> INTERVIEW
    LAYOUT --> EVALUATOR
    LAYOUT --> SETTINGS
    LAYOUT --> HISTORY
    SERVICES --> COMPONENTS
    GUARDS --> SERVICES
```

### Backend Architecture (NestJS Services)

```mermaid
graph TD
    subgraph "API Service (Port 3000)"
        subgraph "Controllers"
            QC[Questions Controller]
            HC[History Controller]
            AC[App Controller]
        end
        
        subgraph "Services"
            QS[Questions Service]
            HS[History Service]
        end
        
        subgraph "Data Layer"
            ENTITIES[TypeORM Entities]
            REPOS[Repositories]
        end
    end
    
    subgraph "Evaluator Service (Port 3001)"
        subgraph "Evaluation"
            EC[Evaluator Controller]
            ES[Evaluator Service]
            OPENAI_CLIENT[OpenAI Client]
        end
    end
    
    QC --> QS
    HC --> HS
    QS --> ENTITIES
    HS --> ENTITIES
    ENTITIES --> REPOS
    REPOS --> SQLite[(SQLite Database)]
    
    EC --> ES
    ES --> OPENAI_CLIENT
    OPENAI_CLIENT --> OPENAI[OpenAI API]
```

### Electron Architecture

```mermaid
graph TD
    subgraph "Electron Main Process"
        MAIN[Main.ts]
        
        subgraph "Services"
            DB_SERVICE[Database Service]
            PM[Port Manager]
            SM[Service Manager]
            QUEUE[Database Queue]
        end
        
        subgraph "IPC Layer"
            HANDLERS[IPC Handlers]
            PRELOAD[Preload Scripts]
        end
        
        subgraph "Configuration"
            CONFIG[App Config]
            ENV[Environment]
        end
    end
    
    subgraph "Electron Renderer Process"
        RENDERER[Angular App]
        IPC_CLIENT[IPC Client Services]
    end
    
    MAIN --> DB_SERVICE
    MAIN --> PM
    MAIN --> SM
    DB_SERVICE --> QUEUE
    HANDLERS --> DB_SERVICE
    HANDLERS --> CONFIG
    PRELOAD --> HANDLERS
    RENDERER --> PRELOAD
    IPC_CLIENT --> PRELOAD
```

## Data Flow

### Interview Session Flow

```mermaid
sequenceDiagram
    participant UI as Angular UI
    participant IPC as IPC Handler
    participant API as API Service
    participant DB as SQLite DB
    participant EVAL as Evaluator Service
    participant AI as OpenAI API
    
    UI->>API: GET /questions?tech=JavaScript&difficulty=Medium&count=5
    API->>DB: Query questions table
    DB->>API: Return question data
    API->>UI: Return questions array
    
    UI->>UI: User answers question
    UI->>EVAL: POST /evaluate {question, answer, context}
    EVAL->>AI: Send evaluation request
    AI->>EVAL: Return evaluation response
    EVAL->>UI: Return evaluation results
    
    UI->>IPC: Save session data
    IPC->>DB: INSERT into interview_sessions
    IPC->>DB: INSERT into interview_responses
    DB->>IPC: Confirm save
    IPC->>UI: Confirm saved
```

### Service Startup Flow

```mermaid
sequenceDiagram
    participant MAIN as Electron Main
    participant SM as Service Manager
    participant PM as Port Manager
    participant API as API Service
    participant EVAL as Evaluator Service
    participant UI as Angular UI
    
    MAIN->>SM: Initialize services
    SM->>PM: Allocate ports
    PM->>SM: Return available ports
    
    SM->>API: Start API service (port 3000)
    API->>SM: Service ready
    
    SM->>EVAL: Start Evaluator service (port 3001)
    EVAL->>SM: Service ready
    
    SM->>MAIN: All services ready
    MAIN->>UI: Load Angular app
    UI->>API: Health check
    UI->>EVAL: Health check
```

## Database Design

### Entity Relationship Diagram

```mermaid
erDiagram
    Tech {
        int id PK
        string name UK "Technology name"
        datetime created_at
    }
    
    Questions {
        int id PK
        int tech_id FK
        text question "Question content"
        text answer "Expected answer"
        string difficulty "Fundamental|Advanced|Extensive"
        text example "Code example"
        datetime created_at
    }
    
    InterviewSessions {
        int id PK
        string session_name
        datetime created_at
        datetime completed_at
        int total_questions
        real total_score
    }
    
    InterviewResponses {
        int id PK
        int session_id FK
        int question_id FK
        text user_answer
        string audio_url
        real evaluation_score
        text evaluation_feedback
        datetime created_at
    }
    
    Tech ||--o{ Questions : "has many"
    InterviewSessions ||--o{ InterviewResponses : "contains"
    Questions ||--o{ InterviewResponses : "answered in"
```

### Database Statistics

- **Technologies**: 15 total (JavaScript, Python, React, Angular, etc.)
- **Questions**: 3,844 total across all technologies
- **Difficulty Distribution**: 
  - Fundamental: ~40%
  - Advanced: ~45% 
  - Extensive: ~15%

### Table Schemas

#### Tech Table
```sql
CREATE TABLE tech (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Questions Table
```sql
CREATE TABLE questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tech_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  difficulty TEXT DEFAULT 'Fundamental',
  example TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tech_id) REFERENCES tech(id)
);
```

#### Interview Sessions Table
```sql
CREATE TABLE interview_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  total_questions INTEGER DEFAULT 0,
  total_score REAL DEFAULT 0
);
```

#### Interview Responses Table
```sql
CREATE TABLE interview_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  user_answer TEXT,
  audio_url TEXT,
  evaluation_score REAL,
  evaluation_feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES interview_sessions(id),
  FOREIGN KEY (question_id) REFERENCES questions(id)
);
```

## Communication Patterns

### IPC Communication

```mermaid
graph LR
    subgraph "Renderer Process (Angular)"
        SERVICE[IPC Service]
        COMPONENT[Angular Component]
    end
    
    subgraph "Main Process (Electron)"
        PRELOAD[Preload Script]
        HANDLER[IPC Handler]
        DB_SERVICE[Database Service]
    end
    
    COMPONENT --> SERVICE
    SERVICE --> PRELOAD
    PRELOAD --> HANDLER
    HANDLER --> DB_SERVICE
    
    DB_SERVICE --> HANDLER
    HANDLER --> PRELOAD
    PRELOAD --> SERVICE
    SERVICE --> COMPONENT
```

### HTTP Communication

```mermaid
graph TD
    subgraph "Angular UI"
        HTTP_CLIENT[HTTP Client]
        SERVICES[Angular Services]
    end
    
    subgraph "API Service"
        CONTROLLERS[NestJS Controllers]
        BUSINESS_LOGIC[Service Layer]
    end
    
    subgraph "Evaluator Service"
        EVAL_CONTROLLER[Evaluator Controller]
        AI_LOGIC[AI Service Layer]
    end
    
    SERVICES --> HTTP_CLIENT
    HTTP_CLIENT --> CONTROLLERS
    HTTP_CLIENT --> EVAL_CONTROLLER
    CONTROLLERS --> BUSINESS_LOGIC
    EVAL_CONTROLLER --> AI_LOGIC
```

## Security Model

### Electron Security

```mermaid
graph TD
    subgraph "Security Boundaries"
        subgraph "Main Process (Trusted)"
            MAIN[Main Process Code]
            FS[File System Access]
            OS_API[OS APIs]
        end
        
        subgraph "Renderer Process (Sandboxed)"
            UI[Angular UI]
            LIMITED[Limited Permissions]
        end
        
        subgraph "Preload Script (Bridge)"
            PRELOAD[Type-Safe IPC Bridge]
            VALIDATION[Input Validation]
        end
    end
    
    UI --> PRELOAD
    PRELOAD --> MAIN
    MAIN --> FS
    MAIN --> OS_API
    
    style MAIN fill:#e8f5e8
    style UI fill:#fff3e0
    style PRELOAD fill:#e1f5fe
```

### Security Features

- **Context Isolation**: Enabled by default
- **Node Integration**: Disabled in renderer process
- **CSP Headers**: Content Security Policy implemented
- **Type-Safe IPC**: All IPC communication is strongly typed
- **Input Validation**: All user inputs validated before processing
- **API Key Management**: OpenAI keys stored securely, never logged

## Technology Stack

### Frontend Stack

```mermaid
graph TD
    subgraph "Frontend Technologies"
        ANGULAR[Angular 20]
        TYPESCRIPT[TypeScript 5.8]
        PRIMENG[PrimeNG 20]
        TAILWIND[Tailwind CSS]
        RXJS[RxJS 7.8]
    end
    
    subgraph "Build Tools"
        NX[Nx 21.3]
        WEBPACK[Webpack 5]
        ESBUILD[esbuild]
    end
    
    subgraph "Development Tools"
        ESLINT[ESLint 9]
        PRETTIER[Prettier]
        JEST[Jest 30]
        PLAYWRIGHT[Playwright]
    end
```

### Backend Stack

```mermaid
graph TD
    subgraph "Backend Technologies"
        NESTJS[NestJS 11]
        TYPEORM[TypeORM 0.3]
        SQLITE[SQLite3]
        OPENAI[OpenAI SDK 5.12]
    end
    
    subgraph "Desktop Technologies"
        ELECTRON[Electron 34.5]
        ELECTRON_BUILDER[electron-builder 24]
    end
    
    subgraph "Development Tools"
        NODEMON[Nodemon]
        SWAGGER[Swagger/OpenAPI]
        MULTER[Multer 2.0]
    end
```

## Design Decisions

### Architecture Decisions

#### 1. Monorepo with Nx
**Decision**: Use Nx monorepo for managing multiple applications
**Rationale**: 
- Shared code and interfaces
- Consistent build and test processes
- Dependency management across services
- Better developer experience

#### 2. Electron Desktop Wrapper
**Decision**: Use Electron instead of native apps
**Rationale**:
- Cross-platform compatibility
- Leverage web technologies
- Rapid development and deployment
- Rich ecosystem and community

#### 3. Microservices Pattern
**Decision**: Separate API and Evaluator services
**Rationale**:
- Separation of concerns
- Independent scaling
- Different resource requirements (AI vs. CRUD)
- Better testing and maintenance

#### 4. SQLite for Data Storage
**Decision**: Use SQLite instead of cloud database
**Rationale**:
- Local-first approach
- No external dependencies
- Fast query performance
- Easy backup and migration

### Technical Decisions

#### 1. Angular 20 with Standalone Components
**Decision**: Use latest Angular with standalone architecture
**Rationale**:
- Modern development patterns
- Better tree-shaking
- Simplified module structure
- Signals for reactive state management

#### 2. PrimeNG for UI Components
**Decision**: Use PrimeNG instead of Material or custom components
**Rationale**:
- Rich component library
- Professional appearance
- Good Angular integration
- Excellent documentation

#### 3. TypeScript Throughout
**Decision**: Full TypeScript implementation
**Rationale**:
- Type safety across all layers
- Better developer experience
- Reduced runtime errors
- Enhanced IDE support

#### 4. IPC for Electron Communication
**Decision**: Use IPC instead of remote module
**Rationale**:
- Better security (context isolation)
- More explicit communication
- Type-safe contracts
- Future-proof architecture

### Performance Decisions

#### 1. OnPush Change Detection
**Decision**: Use OnPush strategy for all components
**Rationale**:
- Better performance
- Predictable update cycles
- Works well with signals
- Reduces unnecessary renders

#### 2. Lazy Loading Feature Modules
**Decision**: Implement lazy loading for feature modules
**Rationale**:
- Faster initial load time
- Better memory usage
- Modular architecture
- Progressive enhancement

#### 3. Database Query Optimization
**Decision**: Implement query caching and indexing
**Rationale**:
- Faster question retrieval
- Better user experience
- Reduced database load
- Scalable architecture

### Security Decisions

#### 1. Context Isolation in Electron
**Decision**: Enable context isolation and disable node integration
**Rationale**:
- Enhanced security
- Prevent code injection
- Better isolation between processes
- Industry best practices

#### 2. API Key Management
**Decision**: Store API keys in secure local storage
**Rationale**:
- User controls their keys
- No server-side key management
- Better privacy
- Compliance with OpenAI terms

## Future Architecture Considerations

### Potential Enhancements

1. **Cloud Sync**: Add PostgreSQL backend with cloud synchronization
2. **Microservices**: Further split services for better scalability
3. **Real-time Features**: WebSocket support for collaborative features
4. **Mobile Support**: React Native or PWA for mobile devices
5. **Analytics**: Advanced performance analytics and insights

### Scalability Considerations

- **Database Migration**: SQLite to PostgreSQL for cloud deployment
- **Service Discovery**: Implement service registry for microservices
- **Load Balancing**: Horizontal scaling for AI evaluation service
- **Caching Strategy**: Redis for session and query caching
- **CDN Integration**: Asset delivery optimization