const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // Keeping it simple for now as per plan
        },
    });

    // Remove the menu bar for a kiosk-like feel
    mainWindow.setMenuBarVisibility(false);

    // Load the app
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../out/index.html')}`;

    mainWindow.loadURL(startUrl);

    // Open the DevTools in development mode
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
