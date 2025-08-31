import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for Interview App v2 tests...');
  
  try {
    // Kill any background services if they were started
    if (process.env.START_SERVICES === 'true') {
      console.log('🛑 Stopping backend services...');
      try {
        await execAsync('pkill -f "serve:api"');
        await execAsync('pkill -f "serve:evaluator"');
      } catch (error) {
        // Services might not be running, that's okay
        console.log('ℹ️ No services to stop');
      }
    }
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - teardown errors shouldn't fail the tests
  }
}

export default globalTeardown;