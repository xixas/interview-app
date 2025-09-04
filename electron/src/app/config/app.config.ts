import { app } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export interface AppConfig {
  ports: {
    api: {
      preferred: number;
      fallbacks: number[];
    };
    evaluator: {
      preferred: number;
      fallbacks: number[];
    };
    ui: {
      preferred: number;
      fallbacks: number[];
    };
  };
  database: {
    questionsDbPath: string;
    userHistoryDbPath: string;
    userDataDir: string;
  };
  services: {
    autoStart: boolean;
    timeout: number;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.createDefaultConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private createDefaultConfig(): AppConfig {
    // Get user data directory (OS-appropriate location)
    const userDataDir = this.getUserDataDirectory();
    
    return {
      ports: {
        api: {
          preferred: parseInt(process.env.API_PORT || '3000'),
          fallbacks: [3003, 3004, 3005, 3006, 3007]
        },
        evaluator: {
          preferred: parseInt(process.env.EVALUATOR_PORT || '3001'),
          fallbacks: [3008, 3009, 3010, 3011, 3012]
        },
        ui: {
          preferred: parseInt(process.env.UI_PORT || '3002'),
          fallbacks: [3013, 3014, 3015, 3016, 3017]
        }
      },
      database: {
        questionsDbPath: this.getQuestionsDbPath(),
        userHistoryDbPath: join(userDataDir, 'user-history.db'),
        userDataDir
      },
      services: {
        autoStart: true,
        timeout: 30000 // 30 seconds
      }
    };
  }

  private getUserDataDirectory(): string {
    let userDataPath: string;
    
    if (app.isPackaged) {
      // In packaged app, use system user data directory
      userDataPath = app.getPath('userData');
    } else {
      // In development, use project data directory
      const projectRoot = join(__dirname, '..', '..', '..', '..');
      userDataPath = join(projectRoot, 'data');
    }

    // Ensure directory exists
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true });
    }

    return userDataPath;
  }


  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Runtime configuration updates
  setApiPort(port: number): void {
    this.config.ports.api.preferred = port;
  }

  setEvaluatorPort(port: number): void {
    this.config.ports.evaluator.preferred = port;
  }

  setUiPort(port: number): void {
    this.config.ports.ui.preferred = port;
  }

  // Getters for easy access
  getApiPort(): number {
    return this.config.ports.api.preferred;
  }

  getEvaluatorPort(): number {
    return this.config.ports.evaluator.preferred;
  }

  getUiPort(): number {
    return this.config.ports.ui.preferred;
  }

  getUserDataDir(): string {
    return this.config.database.userDataDir;
  }

  getQuestionsDbPath(): string {
    if (app.isPackaged) {
      // In packaged app, questions DB is in resources/assets
      return join(process.resourcesPath, 'assets', 'questions.db');
    } else {
      // In development, use the cleaned questions DB from project root
      return join(process.cwd(), 'api', 'src', 'assets', 'questions.db');
    }
  }

  getUserHistoryDbPath(): string {
    return this.config.database.userHistoryDbPath;
  }

  // Environment variables for child processes
  getEnvironmentVariables(): Record<string, string> {
    return {
      API_PORT: this.getApiPort().toString(),
      EVALUATOR_PORT: this.getEvaluatorPort().toString(),
      UI_PORT: this.getUiPort().toString(),
      USER_DATA_DIR: this.getUserDataDir(),
      QUESTIONS_DB_PATH: this.getQuestionsDbPath(),
      USER_HISTORY_DB_PATH: this.getUserHistoryDbPath(),
      NODE_ENV: app.isPackaged ? 'production' : 'development',
      ELECTRON_IS_DEV: app.isPackaged ? '0' : '1'
    };
  }
}