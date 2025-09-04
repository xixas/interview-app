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
        await this.startAllServices();
        
        // Step 4: Wait for services to be ready
        const servicesReady = await this.portManager.waitForServices();
        
        if (!servicesReady) {
          throw new Error('Services failed to start properly');
        }
      } else {
        console.log('🏃 Development mode: Using external services on ports 3000 and 3001');
      }
      
      console.log('✅ All services initialized and ready');
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      const isDevelopment = 'ELECTRON_IS_DEV' in process.env ? 
        parseInt(process.env.ELECTRON_IS_DEV, 10) === 1 : 
        !app.isPackaged;
      if (!isDevelopment) {
        await this.stopAllServices();
      }
      throw error;
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
          PORT: apiPort.toString()
        };

        const apiProcess = spawn('node', [this.getApiServicePath()], {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: this.getApiWorkingDirectory()
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
          if (!this.serviceStatus.get('api')?.running) {
            reject(new Error('API service startup timeout'));
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
          PORT: evaluatorPort.toString()
        };

        const evaluatorProcess = spawn('node', [this.getEvaluatorServicePath()], {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: this.getEvaluatorWorkingDirectory()
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
          if (!this.serviceStatus.get('evaluator')?.running) {
            reject(new Error('Evaluator service startup timeout'));
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
      return join(process.resourcesPath, 'app');
    } else {
      return process.cwd();
    }
  }
}