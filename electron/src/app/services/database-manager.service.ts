import { existsSync, copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { ConfigManager } from '../config/app.config';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private configManager: ConfigManager;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize user-specific databases on first run
   */
  async initializeUserDatabases(): Promise<void> {
    try {
      console.log('🗄️  Initializing user databases...');
      
      // Ensure user data directory exists
      await this.ensureUserDataDirectory();
      
      // Initialize user history database (create fresh)
      await this.initializeUserHistoryDatabase();
      
      // Verify questions database is accessible
      await this.verifyQuestionsDatabase();
      
      console.log('✅ Database initialization completed');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure user data directory exists
   */
  private async ensureUserDataDirectory(): Promise<void> {
    const userDataDir = this.configManager.getUserDataDir();
    
    if (!existsSync(userDataDir)) {
      console.log(`📁 Creating user data directory: ${userDataDir}`);
      mkdirSync(userDataDir, { recursive: true });
    } else {
      console.log(`📁 User data directory exists: ${userDataDir}`);
    }
  }

  /**
   * Initialize user history database
   * Creates a fresh database for user's interview history
   */
  private async initializeUserHistoryDatabase(): Promise<void> {
    const userHistoryDbPath = this.configManager.getUserHistoryDbPath();
    
    if (!existsSync(userHistoryDbPath)) {
      console.log(`📊 Creating new user history database: ${userHistoryDbPath}`);
      
      // Ensure directory exists
      const dbDir = dirname(userHistoryDbPath);
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }
      
      // The database will be created automatically by TypeORM when first accessed
      // We just need to ensure the directory structure exists
    } else {
      console.log(`📊 User history database exists: ${userHistoryDbPath}`);
    }
  }

  /**
   * Verify questions database is accessible
   */
  private async verifyQuestionsDatabase(): Promise<void> {
    const questionsDbPath = this.configManager.getQuestionsDbPath();
    
    if (!existsSync(questionsDbPath)) {
      console.error(`❌ Questions database not found: ${questionsDbPath}`);
      throw new Error(`Questions database not found at: ${questionsDbPath}`);
    }
    
    console.log(`📚 Questions database verified: ${questionsDbPath}`);
  }

  /**
   * Get database configuration for services
   */
  getDatabaseConfig() {
    return {
      questionsDb: {
        path: this.configManager.getQuestionsDbPath(),
        type: 'sqlite' as const,
        readonly: true
      },
      userHistoryDb: {
        path: this.configManager.getUserHistoryDbPath(),
        type: 'sqlite' as const,
        readonly: false
      }
    };
  }

  /**
   * Check if this is first run (user history DB doesn't exist)
   */
  isFirstRun(): boolean {
    const userHistoryDbPath = this.configManager.getUserHistoryDbPath();
    return !existsSync(userHistoryDbPath);
  }

  /**
   * Backup user data (for safety)
   */
  async backupUserData(): Promise<string | null> {
    try {
      const userHistoryDbPath = this.configManager.getUserHistoryDbPath();
      
      if (!existsSync(userHistoryDbPath)) {
        console.log('No user data to backup');
        return null;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${userHistoryDbPath}.backup-${timestamp}`;
      
      copyFileSync(userHistoryDbPath, backupPath);
      console.log(`✅ User data backed up to: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      console.error('Failed to backup user data:', error);
      return null;
    }
  }

  /**
   * Get database paths for environment variables
   */
  getDatabasePaths() {
    return {
      QUESTIONS_DB_PATH: this.configManager.getQuestionsDbPath(),
      USER_HISTORY_DB_PATH: this.configManager.getUserHistoryDbPath(),
      USER_DATA_DIR: this.configManager.getUserDataDir()
    };
  }

  /**
   * Clean up temporary files and backups (maintenance)
   */
  async cleanup(keepBackups: number = 5): Promise<void> {
    try {
      const userDataDir = this.configManager.getUserDataDir();
      const { readdirSync, statSync, unlinkSync } = await import('fs');
      
      if (!existsSync(userDataDir)) return;
      
      const files = readdirSync(userDataDir);
      const backupFiles = files
        .filter(file => file.includes('.backup-'))
        .map(file => ({
          name: file,
          path: join(userDataDir, file),
          time: statSync(join(userDataDir, file)).mtime
        }))
        .sort((a, b) => b.time.getTime() - a.time.getTime());

      // Keep only the most recent backups
      if (backupFiles.length > keepBackups) {
        const filesToDelete = backupFiles.slice(keepBackups);
        
        for (const file of filesToDelete) {
          unlinkSync(file.path);
          console.log(`🗑️  Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}