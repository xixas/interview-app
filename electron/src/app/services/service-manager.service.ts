import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { ConfigManager } from '../config/app.config';
import { PortManager } from './port-manager.service';
import { DatabaseManager } from './database-manager.service';
import { app } from 'electron';

export interface ServiceStatus {
  name: string;
  running: boolean;
  port?: number;
  pid?: number;
  startTime?: Date;
  error?: string;
}

export class ServiceManager {
  private static instance: ServiceManager;
  private configManager: ConfigManager;
  private portManager: PortManager;
  private databaseManager: DatabaseManager;
  private services: Map<string, ChildProcess> = new Map();
  private serviceStatus: Map<string, ServiceStatus> = new Map();
  private handlersSetup: boolean = false;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
    this.portManager = PortManager.getInstance();
    this.databaseManager = DatabaseManager.getInstance();
    
    this.initializeServiceStatus();
    this.setupProcessHandlers();
  }

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  private initializeServiceStatus(): void {
    this.serviceStatus.set('api', {
      name: 'API Service',
      running: false
    });
    
    this.serviceStatus.set('evaluator', {
      name: 'Evaluator Service',
      running: false
    });
  }

  private setupProcessHandlers(): void {
    // Only setup handlers once to prevent multiple registrations
    if (this.handlersSetup) {
      return;
    }
    
    this.handlersSetup = true;
    
    // Cleanup services when Electron app is closing
    app.on('before-quit', () => {
      console.log('🛑 Stopping all services...');
      this.stopAllServices();
    });

    app.on('window-all-closed', () => {
      this.stopAllServices();
    });

    // Handle process termination
    process.on('SIGTERM', () => this.stopAllServices());
    process.on('SIGINT', () => this.stopAllServices());
  }

  /**
   * Initialize and start all services
   */
  async initializeServices(): Promise<void> {
    try {
      console.log('🚀 Initializing services...');
      
      // Step 1: Initialize databases
      await this.databaseManager.initializeUserDatabases();
      
      // Step 2: Allocate ports
      await this.portManager.allocatePorts();
      
      // Step 3: Start services (only in packaged mode)
      const isDevelopment = 'ELECTRON_IS_DEV' in process.env ? 
        parseInt(process.env.ELECTRON_IS_DEV, 10) === 1 : 
        !app.isPackaged;
      
      if (!isDevelopment) {
        try {
          await this.startAllServices();
          
          // Step 4: Wait for services to be ready (with timeout)
          const servicesReady = await Promise.race([
            this.portManager.waitForServices(),
            new Promise(resolve => setTimeout(() => resolve(false), 20000)) // 20 second timeout
          ]);
          
          if (!servicesReady) {
            console.warn('⚠️ Services not ready within timeout, continuing anyway');
          } else {
            console.log('✅ All services are ready');
          }
        } catch (serviceError) {
          console.warn('⚠️ Service startup encountered issues:', serviceError);
          console.log('📱 App will continue with limited functionality');
        }
      } else {
        console.log('🏃 Development mode: Using external services on ports 3000 and 3001');
      }
      
      console.log('✅ Service initialization completed');
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      
      // Don't throw the error - let the app continue with degraded functionality
      console.warn('⚠️ App will continue with limited functionality');
    }
  }

  /**
   * Start all required services
   */
  private async startAllServices(): Promise<void> {
    const promises = [
      this.startApiService(),
      this.startEvaluatorService()
    ];

    await Promise.all(promises);
  }

  /**
   * Start API service
   */
  private async startApiService(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const apiPort = this.portManager.getAllocatedPorts()?.api;
        if (!apiPort) {
          throw new Error('API port not allocated');
        }

        console.log(`🚀 Starting API service on port ${apiPort}...`);

        const env = {
          ...process.env,
          ...this.configManager.getEnvironmentVariables(),
          ...this.databaseManager.getDatabasePaths(),
          API_PORT: apiPort.toString(),
          PORT: apiPort.toString(),
          ELECTRON_RUN_AS_NODE: '1'
        };

        const nodeExecutable = this.getNodeExecutable();
        const apiServicePath = this.getApiServicePath();
        const workingDir = this.getApiWorkingDirectory();

        console.log(`🔧 API Service spawn details:
          Node: ${nodeExecutable}
          Script: ${apiServicePath}
          CWD: ${workingDir}
          Port: ${apiPort}`);

        const apiProcess = spawn(nodeExecutable, [apiServicePath], {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: workingDir
        });

        this.services.set('api', apiProcess);
        
        this.serviceStatus.set('api', {
          name: 'API Service',
          running: true,
          port: apiPort,
          pid: apiProcess.pid,
          startTime: new Date()
        });

        apiProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          if (output.includes('🚀 Application is running on')) {
            console.log(`✅ API service started successfully on port ${apiPort}`);
            resolve();
          }
          // Log API service output with prefix
          console.log(`[API] ${output.trim()}`);
        });

        apiProcess.stderr?.on('data', (data) => {
          console.error(`[API ERROR] ${data.toString().trim()}`);
        });

        apiProcess.on('error', (error) => {
          console.error('API service error:', error);
          this.serviceStatus.set('api', {
            name: 'API Service',
            running: false,
            error: error.message
          });
          reject(error);
        });

        apiProcess.on('exit', (code, signal) => {
          console.log(`API service exited with code ${code}, signal ${signal}`);
          this.serviceStatus.set('api', {
            name: 'API Service',
            running: false,
            error: `Process exited with code ${code}`
          });
        });

        // Timeout after 15 seconds
        setTimeout(() => {
          const status = this.serviceStatus.get('api');
          if (!status?.running) {
            console.warn('⚠️ API service startup timeout - continuing without API');
            this.serviceStatus.set('api', {
              name: 'API Service',
              running: false,
              error: 'Startup timeout'
            });
            // Don't reject - just resolve to continue app startup
            resolve();
          }
        }, 15000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start Evaluator service
   */
  private async startEvaluatorService(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const evaluatorPort = this.portManager.getAllocatedPorts()?.evaluator;
        if (!evaluatorPort) {
          throw new Error('Evaluator port not allocated');
        }

        console.log(`🚀 Starting Evaluator service on port ${evaluatorPort}...`);

        const env = {
          ...process.env,
          ...this.configManager.getEnvironmentVariables(),
          EVALUATOR_PORT: evaluatorPort.toString(),
          PORT: evaluatorPort.toString(),
          ELECTRON_RUN_AS_NODE: '1'
        };

        const nodeExecutable = this.getNodeExecutable();
        const evaluatorServicePath = this.getEvaluatorServicePath();
        const workingDir = this.getEvaluatorWorkingDirectory();

        console.log(`🔧 Evaluator Service spawn details:
          Node: ${nodeExecutable}
          Script: ${evaluatorServicePath}
          CWD: ${workingDir}
          Port: ${evaluatorPort}`);

        const evaluatorProcess = spawn(nodeExecutable, [evaluatorServicePath], {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: workingDir
        });

        this.services.set('evaluator', evaluatorProcess);
        
        this.serviceStatus.set('evaluator', {
          name: 'Evaluator Service',
          running: true,
          port: evaluatorPort,
          pid: evaluatorProcess.pid,
          startTime: new Date()
        });

        evaluatorProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          if (output.includes('🚀 Application is running on')) {
            console.log(`✅ Evaluator service started successfully on port ${evaluatorPort}`);
            resolve();
          }
          console.log(`[EVALUATOR] ${output.trim()}`);
        });

        evaluatorProcess.stderr?.on('data', (data) => {
          console.error(`[EVALUATOR ERROR] ${data.toString().trim()}`);
        });

        evaluatorProcess.on('error', (error) => {
          console.error('Evaluator service error:', error);
          this.serviceStatus.set('evaluator', {
            name: 'Evaluator Service',
            running: false,
            error: error.message
          });
          reject(error);
        });

        evaluatorProcess.on('exit', (code, signal) => {
          console.log(`Evaluator service exited with code ${code}, signal ${signal}`);
          this.serviceStatus.set('evaluator', {
            name: 'Evaluator Service',
            running: false,
            error: `Process exited with code ${code}`
          });
        });

        // Timeout after 15 seconds
        setTimeout(() => {
          const status = this.serviceStatus.get('evaluator');
          if (!status?.running) {
            console.warn('⚠️ Evaluator service startup timeout - continuing without evaluator');
            this.serviceStatus.set('evaluator', {
              name: 'Evaluator Service',
              running: false,
              error: 'Startup timeout'
            });
            // Don't reject - just resolve to continue app startup
            resolve();
          }
        }, 15000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop all services
   */
  async stopAllServices(): Promise<void> {
    console.log('🛑 Stopping all services...');
    
    const stopPromises: Promise<void>[] = [];
    
    for (const [serviceName, process] of this.services.entries()) {
      if (process && !process.killed) {
        stopPromises.push(this.stopService(serviceName, process));
      }
    }

    await Promise.all(stopPromises);
    this.services.clear();
    
    console.log('✅ All services stopped');
  }

  private async stopService(name: string, process: ChildProcess): Promise<void> {
    return new Promise((resolve) => {
      if (process.killed) {
        resolve();
        return;
      }

      console.log(`🛑 Stopping ${name} service (PID: ${process.pid})...`);
      
      const timeout = setTimeout(() => {
        console.log(`⚠️  Force killing ${name} service...`);
        process.kill('SIGKILL');
        resolve();
      }, 5000);

      process.on('exit', () => {
        clearTimeout(timeout);
        console.log(`✅ ${name} service stopped`);
        this.serviceStatus.set(name, {
          name: this.serviceStatus.get(name)?.name || name,
          running: false
        });
        resolve();
      });

      // Try graceful shutdown first
      process.kill('SIGTERM');
    });
  }

  /**
   * Get service status
   */
  getServiceStatus(): Map<string, ServiceStatus> {
    return new Map(this.serviceStatus);
  }

  /**
   * Check if all services are running
   */
  areAllServicesRunning(): boolean {
    for (const status of this.serviceStatus.values()) {
      if (!status.running) {
        return false;
      }
    }
    return true;
  }

  // Private helper methods for getting service paths
  private getApiServicePath(): string {
    const isDevelopment = 'ELECTRON_IS_DEV' in process.env ? 
      parseInt(process.env.ELECTRON_IS_DEV, 10) === 1 : 
      !app.isPackaged;
    
    if (!isDevelopment) {
      // Check if running from AppImage
      if (process.env.APPIMAGE || process.env.APPDIR) {
        return join(process.resourcesPath, 'app', 'dist', 'api', 'main.js');
      }
      return join(process.resourcesPath, 'app', 'dist', 'api', 'main.js');
    } else {
      return join(process.cwd(), 'dist', 'api', 'main.js');
    }
  }

  private getEvaluatorServicePath(): string {
    const isDevelopment = 'ELECTRON_IS_DEV' in process.env ? 
      parseInt(process.env.ELECTRON_IS_DEV, 10) === 1 : 
      !app.isPackaged;
    
    if (!isDevelopment) {
      // Check if running from AppImage
      if (process.env.APPIMAGE || process.env.APPDIR) {
        return join(process.resourcesPath, 'app', 'dist', 'evaluator', 'main.js');
      }
      return join(process.resourcesPath, 'app', 'dist', 'evaluator', 'main.js');
    } else {
      return join(process.cwd(), 'dist', 'evaluator', 'main.js');
    }
  }

  private getApiWorkingDirectory(): string {
    const isDevelopment = 'ELECTRON_IS_DEV' in process.env ? 
      parseInt(process.env.ELECTRON_IS_DEV, 10) === 1 : 
      !app.isPackaged;
    
    if (!isDevelopment) {
      // Check if running from AppImage
      if (process.env.APPIMAGE || process.env.APPDIR) {
        return join(process.resourcesPath, 'app');
      }
      return join(process.resourcesPath, 'app');
    } else {
      return process.cwd();
    }
  }

  private getEvaluatorWorkingDirectory(): string {
    const isDevelopment = 'ELECTRON_IS_DEV' in process.env ? 
      parseInt(process.env.ELECTRON_IS_DEV, 10) === 1 : 
      !app.isPackaged;
    
    if (!isDevelopment) {
      // Check if running from AppImage
      if (process.env.APPIMAGE || process.env.APPDIR) {
        return join(process.resourcesPath, 'app');
      }
      return join(process.resourcesPath, 'app');
    } else {
      return process.cwd();
    }
  }

  /**
   * Get Node.js executable path for spawning services
   * Use Electron's own executable with ELECTRON_RUN_AS_NODE=1 for maximum compatibility
   */
  private getNodeExecutable(): string {
    const isDevelopment = 'ELECTRON_IS_DEV' in process.env ?
      parseInt(process.env.ELECTRON_IS_DEV, 10) === 1 :
      !app.isPackaged;

    if (!isDevelopment) {
      // In production/AppImage, use Electron's own executable
      // This ensures 100% compatibility with bundled native modules
      console.log('🔧 Using Electron executable as Node.js runtime:', process.execPath);
      return process.execPath;
    } else {
      // In development, use system Node.js
      return 'node';
    }
  }
}