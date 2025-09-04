import { BrowserWindow, shell, screen, Menu } from 'electron';
import { rendererAppName, rendererAppPort } from './constants';
import { environment } from '../environments/environment';
import { join } from 'path';
import { format } from 'url';
import { IPCHandlers } from './api/ipc-handlers';
import { ServiceManager } from './services/service-manager.service';
import { ConfigManager } from './config/app.config';

export default class App {
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  static mainWindow: Electron.BrowserWindow;
  static application: Electron.App;
  static BrowserWindow;
  static ipcHandlers: IPCHandlers;
  static serviceManager: ServiceManager;
  static configManager: ConfigManager;

  public static isDevelopmentMode() {
    const isEnvironmentSet: boolean = 'ELECTRON_IS_DEV' in process.env;
    const getFromEnvironment: boolean =
      parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;

    return isEnvironmentSet ? getFromEnvironment : !environment.production;
  }

  private static onWindowAllClosed() {
    // Cleanup services and IPC handlers
    if (App.serviceManager) {
      App.serviceManager.stopAllServices();
    }
    
    if (App.ipcHandlers) {
      App.ipcHandlers.cleanup();
      App.ipcHandlers = null;
    }
    
    if (process.platform !== 'darwin') {
      App.application.quit();
    }
  }

  private static onClose() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    App.mainWindow = null;
  }

  private static onRedirect(event: any, url: string) {
    if (url !== App.mainWindow.webContents.getURL()) {
      // this is a normal external redirect, open it in a new browser window
      event.preventDefault();
      shell.openExternal(url);
    }
  }

  private static async onReady() {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    if (rendererAppName) {
      try {
        // Initialize configuration and service managers
        App.configManager = ConfigManager.getInstance();
        App.serviceManager = ServiceManager.getInstance();
        
        // Initialize services (databases, ports, start backend services)
        await App.serviceManager.initializeServices();
        
        // Create and show the main window
        App.initMainWindow();
        App.loadMainWindow();
        App.setupApplicationMenu();
        
        // Initialize IPC handlers only once
        if (!App.ipcHandlers) {
          App.ipcHandlers = new IPCHandlers();
        }
        
        console.log('✅ Application ready');
      } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        
        // Show error dialog to user
        const { dialog } = await import('electron');
        dialog.showErrorBox('Startup Error', 
          `Failed to start the application: ${error.message}\n\nThis may be due to port conflicts or missing dependencies.`
        );
        
        // Quit the application
        App.application.quit();
      }
    }
  }

  private static onActivate() {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (App.mainWindow === null) {
      App.initMainWindow();
      App.loadMainWindow();
      App.setupApplicationMenu();
      // Don't reinitialize IPC handlers - they should only be created once
    }
  }

  private static initMainWindow() {
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    const width = Math.min(1280, workAreaSize.width || 1280);
    const height = Math.min(720, workAreaSize.height || 720);

    // Create the browser window.
    App.mainWindow = new BrowserWindow({
      width: width,
      height: height,
      show: false,
      webPreferences: {
        contextIsolation: true,
        backgroundThrottling: false,
        preload: join(__dirname, 'main.preload.js'),
      },
    });
    // Don't set menu to null, we'll create a custom one
    App.mainWindow.center();

    // if main window is ready to show, close the splash window and show the main window
    App.mainWindow.once('ready-to-show', () => {
      App.mainWindow.show();
    });

    // handle all external redirects in a new browser window
    // App.mainWindow.webContents.on('will-navigate', App.onRedirect);
    // App.mainWindow.webContents.on('new-window', (event, url, frameName, disposition, options) => {
    //     App.onRedirect(event, url);
    // });

    // Emitted when the window is closed.
    App.mainWindow.on('closed', () => {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      App.mainWindow = null;
    });
  }

  private static loadMainWindow() {
    // load the index.html of the app.
    if (!App.application.isPackaged) {
      // In development, use the UI dev server port (3002)
      App.mainWindow.loadURL(`http://localhost:3002`);
    } else {
      // In packaged app, load from local files
      App.mainWindow.loadURL(
        format({
          pathname: join(__dirname, '..', rendererAppName, 'index.html'),
          protocol: 'file:',
          slashes: true,
        })
      );
    }
  }

  private static setupApplicationMenu() {
    const template: any[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Export Results...',
            accelerator: 'CmdOrCtrl+E',
            click: () => {
              App.mainWindow.webContents.send('menu-export-results');
            }
          },
          {
            label: 'Import Questions...',
            accelerator: 'CmdOrCtrl+I',
            click: () => {
              App.mainWindow.webContents.send('menu-import-questions');
            }
          },
          { type: 'separator' },
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              App.mainWindow.webContents.send('menu-settings');
            }
          },
          { type: 'separator' },
          {
            role: 'quit'
          }
        ]
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectall' }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Interview',
        submenu: [
          {
            label: 'Start New Interview',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              App.mainWindow.webContents.send('menu-new-interview');
            }
          },
          {
            label: 'Go to Dashboard',
            accelerator: 'CmdOrCtrl+D',
            click: () => {
              App.mainWindow.webContents.send('menu-dashboard');
            }
          },
          {
            label: 'AI Evaluator',
            accelerator: 'CmdOrCtrl+A',
            click: () => {
              App.mainWindow.webContents.send('menu-evaluator');
            }
          }
        ]
      },
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' },
          { role: 'close' },
          {
            label: 'Always on Top',
            type: 'checkbox',
            click: (menuItem) => {
              App.mainWindow.setAlwaysOnTop(menuItem.checked);
            }
          }
        ]
      },
      {
        role: 'help',
        submenu: [
          {
            label: 'About Interview App',
            click: () => {
              App.mainWindow.webContents.send('menu-about');
            }
          },
          {
            label: 'Learn More',
            click: async () => {
              await shell.openExternal('https://github.com/your-repo/interview-app');
            }
          }
        ]
      }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
      template.unshift({
        label: App.application.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { 
            label: 'Services',
            submenu: []
          },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });

      // Window menu
      template[5].submenu = [
        { role: 'close' },
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ];
    }

    const menu = Menu.buildFromTemplate(template as any);
    Menu.setApplicationMenu(menu);
  }

  static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
    // we pass the Electron.App object and the
    // Electron.BrowserWindow into this function
    // so this class has no dependencies. This
    // makes the code easier to write tests for

    App.BrowserWindow = browserWindow;
    App.application = app;

    App.application.on('window-all-closed', App.onWindowAllClosed); // Quit when all windows are closed.
    App.application.on('ready', App.onReady); // App is ready to load data
    App.application.on('activate', App.onActivate); // App is activated
  }
}
