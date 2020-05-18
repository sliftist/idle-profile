const { app, BrowserWindow } = require("electron");

(async () => {
    app.allowRendererProcessReuse = true;
    await app.whenReady();

    let win = new BrowserWindow({
        width: 500,
        height: 400,
        webPreferences: {
            nodeIntegration: true
        }
    });
    win.loadFile("./index.html");
    win.setMenu(null);

    //win.webContents.openDevTools();
})();