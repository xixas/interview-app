import * as net from 'net';
import { ConfigManager } from '../config/app.config';

export interface PortAllocation {
  api: number;
  evaluator: number;
  ui: number;
}

export class PortManager {
  private static instance: PortManager;
  private configManager: ConfigManager;
  private allocatedPorts: PortAllocation | null = null;

  private constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  /**
   * Check if a port is available
   */
  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Find the first available port from a list
   */
  private async findAvailablePort(preferred: number, fallbacks: number[]): Promise<number> {
    // Check preferred port first
    if (await this.isPortAvailable(preferred)) {
      return preferred;
    }

    // Check fallback ports
    for (const port of fallbacks) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }

    // If all predefined ports are taken, find a random available port
    return this.findRandomAvailablePort(preferred + 100);
  }

  /**
   * Find a random available port starting from a base port
   */
  private async findRandomAvailablePort(startPort: number = 8000): Promise<number> {
    let port = startPort;
    while (port < 65535) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
      port++;
    }
    throw new Error('No available ports found');
  }

  /**
   * Allocate all required ports
   */
  async allocatePorts(): Promise<PortAllocation> {
    if (this.allocatedPorts) {
      return this.allocatedPorts;
    }

    // First check if development services are available
    const developmentServicesAvailable = await this.checkDevelopmentServices();
    
    if (developmentServicesAvailable) {
      console.log('🏃 Development mode: Using existing services on ports 3000 and 3001');
      
      this.allocatedPorts = {
        api: 3000,
        evaluator: 3001,
        ui: 3002 // Still need a UI port for dev server
      };

      // Update config manager with development ports
      this.configManager.setApiPort(3000);
      this.configManager.setEvaluatorPort(3001);
      this.configManager.setUiPort(3002);

      console.log('🚀 Using development services:', this.allocatedPorts);
      return this.allocatedPorts;
    }

    const config = this.configManager.getConfig();
    
    try {
      console.log('🔍 Scanning for available ports...');
      
      // Allocate API port
      const apiPort = await this.findAvailablePort(
        config.ports.api.preferred,
        config.ports.api.fallbacks
      );
      console.log(`✅ API port allocated: ${apiPort}`);

      // Allocate Evaluator port
      const evaluatorPort = await this.findAvailablePort(
        config.ports.evaluator.preferred,
        config.ports.evaluator.fallbacks
      );
      console.log(`✅ Evaluator port allocated: ${evaluatorPort}`);

      // Allocate UI port (only needed in development)
      const uiPort = await this.findAvailablePort(
        config.ports.ui.preferred,
        config.ports.ui.fallbacks
      );
      console.log(`✅ UI port allocated: ${uiPort}`);

      // Update config manager with allocated ports
      this.configManager.setApiPort(apiPort);
      this.configManager.setEvaluatorPort(evaluatorPort);
      this.configManager.setUiPort(uiPort);

      this.allocatedPorts = {
        api: apiPort,
        evaluator: evaluatorPort,
        ui: uiPort
      };

      console.log('🚀 Port allocation completed:', this.allocatedPorts);
      return this.allocatedPorts;

    } catch (error) {
      console.error('❌ Failed to allocate ports:', error);
      throw new Error(`Port allocation failed: ${error.message}`);
    }
  }

  /**
   * Get allocated ports (must call allocatePorts first)
   */
  getAllocatedPorts(): PortAllocation | null {
    return this.allocatedPorts;
  }

  /**
   * Reset port allocation (for testing)
   */
  reset(): void {
    this.allocatedPorts = null;
  }

  /**
   * Check if all services are responsive on their allocated ports
   */
  async validateServices(): Promise<boolean> {
    if (!this.allocatedPorts) {
      return false;
    }

    try {
      // Check API service
      const apiHealthy = await this.checkServiceHealth(
        `http://localhost:${this.allocatedPorts.api}/api/health`
      );
      
      // Check Evaluator service
      const evaluatorHealthy = await this.checkServiceHealth(
        `http://localhost:${this.allocatedPorts.evaluator}/api/evaluator/health`
      );

      console.log(`Services health check - API: ${apiHealthy ? '✅' : '❌'}, Evaluator: ${evaluatorHealthy ? '✅' : '❌'}`);
      
      return apiHealthy && evaluatorHealthy;
    } catch (error) {
      console.error('Service validation failed:', error);
      return false;
    }
  }

  /**
   * Check if development services are available
   */
  async checkDevelopmentServices(): Promise<boolean> {
    try {
      const apiHealthy = await this.checkServiceHealth('http://localhost:3000/api/health');
      const evaluatorHealthy = await this.checkServiceHealth('http://localhost:3001/api/evaluator/health');
      
      return apiHealthy && evaluatorHealthy;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a service is healthy
   */
  private async checkServiceHealth(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for services to be ready
   */
  async waitForServices(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.validateServices()) {
        console.log('✅ All services are ready');
        return true;
      }
      
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.error('❌ Services failed to start within timeout');
    return false;
  }
}