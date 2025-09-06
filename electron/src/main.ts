import SquirrelEvents from './app/events/squirrel.events';
import ElectronEvents from './app/events/electron.events';
import UpdateEvents from './app/events/update.events';
import { app, BrowserWindow } from 'electron';
import App from './app/app';

export default class Main {
  static initialize() {
    if (SquirrelEvents.handleEvents()) {
      // squirrel event handled (except first run event) and app will exit in 1000ms, so don't do anything else
      app.quit();
    }
  }

  static bootstrapApp() {
    App.main(app, BrowserWindow);
  }

  static bootstrapAppEvents() {
    ElectronEvents.bootstrapElectronEvents();

    // initialize auto updater service
    if (!App.isDevelopmentMode()) {
      // UpdateEvents.initAutoUpdateService();
    }
  }
}

// Prevent recursive Electron initialization when spawned as a service
// Check if this process was spawned to run API or Evaluator services
const isSpawnedService = process.argv.includes('dist/api/main.js') || 
                        process.argv.includes('dist/evaluator/main.js') ||
                        process.argv.some(arg => arg.includes('api/main.js')) ||
                        process.argv.some(arg => arg.includes('evaluator/main.js'));

if (isSpawnedService) {
  console.log('🚫 Detected service spawn - exiting to prevent recursive initialization');
  console.log('📋 Process arguments:', process.argv);
  process.exit(1);
}

// handle setup events as quickly as possible
Main.initialize();

// bootstrap app
Main.bootstrapApp();
Main.bootstrapAppEvents();
