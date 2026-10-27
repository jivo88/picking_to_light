// Aplicativo de desktop do Simulador PTL: abre o simulador unificado (arquivo único, sem internet) em uma janela.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function criarJanela() {
  const win = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    title: 'Simulador PTL',
    backgroundColor: '#11161f',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.maximize();
  win.loadFile(path.join(__dirname, 'app', 'simulador.html'));
  // links externos (se houver) abrem no navegador, não dentro do app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  // F11 = tela cheia, F12 = ferramentas de desenvolvedor, Ctrl+R = recarregar
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') win.setFullScreen(!win.isFullScreen());
    if (input.key === 'F12') win.webContents.toggleDevTools();
    if (input.control && input.key.toLowerCase() === 'r') win.reload();
  });
}

Menu.setApplicationMenu(null);
app.whenReady().then(criarJanela);
app.on('window-all-closed', () => app.quit());
