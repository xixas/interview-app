# Interview App v2 - Desktop Edition

A comprehensive mock interview desktop application built with modern web technologies and Electron. This application provides AI-powered interview practice, evaluation, and analytics for technical interviews.

## 🚀 Features

- **Mock Interview Sessions**: Practice with real-world technical questions
- **AI-Powered Evaluation**: Get detailed feedback using OpenAI integration
- **Audio Recording**: Record your responses for better practice
- **Desktop Integration**: Native file operations, notifications, and system integration
- **Technology Focus**: Multiple programming languages and frameworks
- **Progress Tracking**: Comprehensive analytics and performance metrics
- **Dark/Light Theme**: Modern UI with PrimeNG components
- **Comprehensive Testing**: Full E2E test coverage with Playwright

## 🏗️ Architecture

This is an **Nx monorepo** containing multiple applications:

- **UI** (`/ui`): Angular 20+ frontend with PrimeNG components
- **API** (`/api`): NestJS backend for question management
- **Evaluator** (`/evaluator`): NestJS service with OpenAI integration
- **Electron** (`/electron`): Desktop wrapper with native integrations
- **Shared Libraries** (`/libs`): Common interfaces and utilities

## 🛠️ Tech Stack

- **Frontend**: Angular 20, PrimeNG, TypeScript, SCSS
- **Backend**: NestJS, TypeScript, SQLite
- **Desktop**: Electron, IPC Communication
- **AI**: OpenAI API for evaluation
- **Build**: Nx, Webpack, electron-builder
- **Testing**: Jest, Playwright E2E, ESLint

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd interview-app-v2

# Install dependencies
npm install

# Start development servers (web only)
npm run dev
```

This will start:
- Angular UI dev server at `http://localhost:3002`
- API server at `http://localhost:3000`
- Evaluator service at `http://localhost:3001`

### Desktop App Development

```bash
# Start all services + Electron desktop app
npm run dev:electron

# Or build all projects and start Electron separately
npm run build
npm run nxe:serve:backend
```

## 📚 Documentation

- [Development Setup](./docs/development.md) - Detailed setup instructions
- [Deployment Guide](./docs/deployment.md) - Building and packaging for production
- [Architecture Overview](./docs/architecture.md) - System design and components
- [API Documentation](./docs/api.md) - Backend API reference

## 🧪 Available Scripts

### Development
- `npm run dev` - Start all backend services + Angular dev server (web only)
- `npm run dev:electron` - Start all services + Electron desktop app
- `npm run nxe:serve:frontend` - Start Angular dev server only
- `npm run nxe:serve:backend` - Start Electron app only
- `npm run serve:api` - Start API server only
- `npm run serve:evaluator` - Start evaluator service only

### Building
- `npm run nxe:build:frontend` - Build Angular app
- `npm run nxe:build:backend` - Build Electron app
- `npm run build:api` - Build API server
- `npm run build:evaluator` - Build evaluator service

### Testing
- `npm run test` - Run all unit tests
- `npm run test:e2e` - Run Electron E2E tests
- `npm run test:e2e:web` - Run web E2E tests  
- `npm run test:e2e:headed` - Run E2E tests with visible app
- `npm run test:e2e:debug` - Debug E2E tests step-by-step
- `npm run test:e2e:ui` - Open Playwright test UI
- `npm run lint` - Run linting

See [PLAYWRIGHT_TESTING_GUIDE.md](./PLAYWRIGHT_TESTING_GUIDE.md) for comprehensive testing documentation.

### Packaging
- `npm run nxe:package:app` - Package desktop app
- `npm run nxe:make:app` - Create distributable

## 🌟 Key Features

### Mock Interviews
- Technology-specific question sets
- Difficulty levels (Easy, Medium, Hard, Mixed)
- Audio recording and playback
- Timed sessions with progress tracking

### AI Evaluation
- Technical accuracy assessment
- Communication skills analysis
- Detailed feedback and improvements
- Scoring across multiple dimensions

### Desktop Integration
- Native file save/open dialogs
- System notifications
- Menu integration with keyboard shortcuts
- Settings persistence
- System information access

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Issues & Support

For bugs, feature requests, or support, please create an issue in the repository.

## 🔧 Environment Variables

The application uses environment-specific configuration:

- **Development**: Uses `environment.ts` with live reload
- **Production**: Uses `environment.prod.ts` with optimizations
- **Electron**: Uses `environment.electron.ts` with desktop features

See the documentation for detailed configuration options.
