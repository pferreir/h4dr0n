import { app, BrowserWindow, Menu } from 'electron';
import env from './env';

var mainWindow;

app.on('ready', function () {
    var mainWindow = new BrowserWindow({
        width: 700,
        height: 600
    });

    mainWindow.loadURL('file://' + __dirname + '/app.html');

    if (env.name !== 'production') {
        mainWindow.openDevTools();
    }
});

app.on('window-all-closed', function () {
    app.quit();
});
