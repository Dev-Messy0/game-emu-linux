const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
let mainWindow;
const storePath = () => path.join(app.getPath('userData'), 'library.json');

function readLibrary() {
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath(), 'utf8'));
    return Array.isArray(parsed.games) ? parsed : { games: [] };
  } catch {
    return { games: [] };
  }
}

function saveLibrary(data) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), JSON.stringify(data, null, 2));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 680,
    backgroundColor: '#080d18',
    title: 'GML',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('library:get', () => readLibrary());
  ipcMain.handle('game:add', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choisir le lanceur du jeu',
      properties: ['openFile'],
      filters: [{ name: 'Programmes Windows', extensions: ['exe'] }, { name: 'Tous les fichiers', extensions: ['*'] }]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const exePath = result.filePaths[0];
    const name = path.basename(exePath, path.extname(exePath)).replace(/[._-]+/g, ' ').trim();
    const library = readLibrary();
    const existing = library.games.find((game) => game.exePath === exePath);
    if (existing) return existing;
    const game = { id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, name, exePath, addedAt: Date.now(), favorite: false, lastPlayed: null };
    library.games.unshift(game);
    saveLibrary(library);
    return game;
  });
  ipcMain.handle('game:toggle-favorite', (_event, id) => {
    const library = readLibrary();
    const game = library.games.find((entry) => entry.id === id);
    if (!game) return library;
    game.favorite = !game.favorite;
    saveLibrary(library);
    return library;
  });
  ipcMain.handle('game:remove', (_event, id) => {
    const library = readLibrary();
    library.games = library.games.filter((entry) => entry.id !== id);
    saveLibrary(library);
    return library;
  });
  ipcMain.handle('game:play', async (_event, id) => {
    const library = readLibrary();
    const game = library.games.find((entry) => entry.id === id);
    if (!game || !fs.existsSync(game.exePath)) throw new Error('Le fichier du jeu est introuvable. Ajoute-le de nouveau depuis son emplacement actuel.');
    try {
      await execFileAsync('wine', ['--version']);
    } catch {
      throw new Error('Wine est introuvable. Installe Wine sur Kali, puis réessaie.');
    }
    const child = spawn('wine', [game.exePath], { cwd: path.dirname(game.exePath), detached: true, stdio: 'ignore' });
    child.once('error', (error) => mainWindow?.webContents.send('game:launch-error', error.message));
    child.unref();
    game.lastPlayed = Date.now();
    saveLibrary(library);
    setTimeout(() => app.quit(), 250);
    return true;
  });
  ipcMain.handle('system:wine-version', async () => {
    try {
      const { stdout } = await execFileAsync('wine', ['--version']);
      return { available: true, version: stdout.trim() };
    } catch {
      return { available: false, version: null };
    }
  });
  ipcMain.handle('system:open-path', (_event, target) => shell.openPath(target));
  ipcMain.handle('system:library-path', () => path.dirname(storePath()));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
