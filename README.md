# Interview App

An AI-powered mock interview desktop application built with Angular, Electron, and NestJS.

![Interview App](https://img.shields.io/badge/Platform-Cross--Platform-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Angular](https://img.shields.io/badge/Angular-20-red)
![Electron](https://img.shields.io/badge/Electron-34-blue)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/xixas/interview-app.git
cd interview-app

# Install dependencies
npm install

# Start the application
npm run dev:electron
```

## ✨ Features

- **Mock Interview Practice** - Practice with real-world technical questions
- **AI-Powered Evaluation** - Get detailed feedback using OpenAI integration  
- **Audio Recording** - Record and review your interview responses
- **Cross-Platform** - Available for Windows, macOS, and Linux
- **Multiple Technologies** - Questions for various programming languages and frameworks
- **Progress Tracking** - Monitor your improvement over time

## 🏗️ Architecture

This is an Nx monorepo containing:

- **UI** - Angular 20 frontend with PrimeNG components
- **API** - NestJS backend for question management  
- **Evaluator** - NestJS service with OpenAI integration
- **Electron** - Desktop wrapper for native functionality

## 📚 Documentation

- **[User Guide](docs/usage-guide.md)** - How to use the application
- **[Developer Guide](docs/developer-guide.md)** - Setup and development workflow
- **[Architecture](docs/architecture.md)** - System design and components
- **[API Reference](docs/api-reference.md)** - Backend API documentation
- **[Build & Deployment](docs/build-deployment.md)** - Cross-platform building

## 🛠️ Development

```bash
# Start development servers (web version)
npm run dev

# Start with Electron desktop app
npm run dev:electron

# Build for production
npm run build

# Run tests
npm run test
```

## 🏃‍♂️ Requirements

- Node.js 18+
- npm 8+
- Git

## 📦 Available Builds

- **Linux**: AppImage format
- **Windows**: NSIS installer (.exe)
- **macOS**: DMG installer (requires Docker for cross-platform builds)

See [Build & Deployment Guide](docs/build-deployment.md) for detailed instructions.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

Found a bug or need help? Please [create an issue](https://github.com/xixas/interview-app/issues).