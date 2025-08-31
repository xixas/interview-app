import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Interview App v2 tests...');
  
  try {
    // Build the Electron app for testing
    console.log('📦 Building Electron app...');
    await execAsync('npm run nxe:build:backend', { cwd: process.cwd() });
    
    // Ensure database is available
    console.log('🗄️ Checking database availability...');
    // Add any database setup if needed
    
    // Start API and Evaluator services if needed for integration tests
    if (process.env.START_SERVICES === 'true') {
      console.log('🔧 Starting backend services...');
      await execAsync('npm run serve:api &', { cwd: process.cwd() });
      await execAsync('npm run serve:evaluator &', { cwd: process.cwd() });
      
      // Wait for services to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;