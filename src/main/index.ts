import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { exec, spawn } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    title: 'PoroAuth',
    frame: false,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Single instance lock — quit immediately if another instance is already running
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.exit(0)
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

import { accountManager } from './services/AccountManager'
import { ddDriver } from './services/DDDriverService'
import { loginFlowAction } from './services/LoginFlowAction'
import { configManager } from './services/ConfigManager'
import { wegameCoordinator } from './services/WegameCoordinator'
import { updateService } from './services/UpdateService'
import { flowRecorderService } from './services/FlowRecorderService'

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Init DD Driver
  try {
    ddDriver.tryLoadDriver()
  } catch (err: any) {
    console.warn('[DDDriver] Driver Auto-Init Warning:', err.message)
  }

  // --- API Handlers ---

  ipcMain.handle('get-driver-status', () => {
    return ddDriver.isLoaded
  })

  ipcMain.handle('select-and-load-driver', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '请选择核心驱动文件 (dd63330.dll)',
      filters: [{ name: 'DLL Files', extensions: ['dll'] }],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) {
      return { success: false, error: '用户取消了选择' }
    }

    const selectedPath = filePaths[0]

    try {
      configManager.set('ddDriverDllPath', selectedPath)
      ddDriver.tryLoadDriver()
      return { success: true }
    } catch (e: any) {
      // Revert if broken?
      // configManager.set('ddDriverDllPath', null);
      return { success: false, error: e.message || '加载驱动失败' }
    }
  })

  ipcMain.handle('get-accounts', () => {
    return accountManager.getAccountsSummary()
  })

  ipcMain.handle('add-account', (_, name: string, account: string, pass: string) => {
    try {
      const id = accountManager.addAccount(name, account, pass)
      return { success: true, id }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle(
    'add-accounts',
    (_, items: Array<{ name: string; account: string; pass: string }>) => {
      try {
        return { success: true, results: accountManager.addAccounts(items || []) }
      } catch (e: any) {
        return { success: false, error: e.message, results: [] }
      }
    }
  )

  ipcMain.handle('delete-account', (_, id: string) => {
    accountManager.deleteAccount(id)
    return { success: true }
  })

  ipcMain.handle('update-ban-time', (_, id: string, timestamp: number | null) => {
    try {
      accountManager.updateBanTime(id, timestamp)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('update-account-name', (_, id: string, newName: string) => {
    try {
      accountManager.updateAccountName(id, newName)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('update-last-login-time', (_, id: string, timestamp: number | null) => {
    try {
      accountManager.updateLastLoginTime(id, timestamp)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('start-login', async (event, id: string) => {
    try {
      const target = accountManager.getRawAccount(id)
      await loginFlowAction.executeLogin(target.account, target.password, (msg) => {
        // Broadcast progress back to renderer
        event.sender.send('login-progress', msg)
      })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
  // --- WeGame Controller API ---
  ipcMain.handle('get-wegame-path', () => {
    return configManager.get('wegameExePath')
  })

  ipcMain.handle('select-wegame-exe', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '请选择 WeGame 客户端 (wegame.exe)',
      filters: [{ name: 'Executable Files', extensions: ['exe'] }],
      properties: ['openFile']
    })

    if (canceled || filePaths.length === 0) {
      return { success: false, error: '用户取消了选择' }
    }

    const selectedPath = filePaths[0]
    configManager.set('wegameExePath', selectedPath)
    return { success: true, path: selectedPath }
  })

  ipcMain.handle('check-wegame-running', async () => {
    return new Promise((resolve) => {
      exec('tasklist /FI "IMAGENAME eq wegame.exe"', (error, stdout) => {
        if (error) {
          resolve(false)
          return
        }
        resolve(stdout.toLowerCase().includes('wegame.exe'))
      })
    })
  })

  let cancelStartFlag = false

  ipcMain.handle('cancel-start-wegame', () => {
    cancelStartFlag = true
  })

  ipcMain.handle('kill-and-start-wegame', async () => {
    cancelStartFlag = false
    return new Promise((resolve) => {
      // 1. Kill WeGame
      exec('taskkill /F /IM wegame.exe', async () => {
        // 等待进程真正销毁
        await new Promise((r) => setTimeout(r, 1000))

        const exePath = configManager.get('wegameExePath')
        if (!exePath) {
          resolve({ success: false, error: '未登记 WeGame 路径' })
          return
        }

        // 2. Start WeGame (无头游离态，防止依赖本主进程存活)
        const child = spawn(exePath, [], {
          detached: true,
          stdio: 'ignore'
        })
        child.unref()

        // 3. 轮询等待窗口挂出，最高等待 30 秒
        const startTime = Date.now()
        const matchTimeout = 30000

        const pollTimer = setInterval(async () => {
          if (cancelStartFlag) {
            clearInterval(pollTimer)
            resolve({ success: false, error: '用户主动取消了等待' })
            return
          }

          if (wegameCoordinator.isWindowReady()) {
            clearInterval(pollTimer)
            // 窗口刚刚被系统探测到，立即移交前端处理开场动画倒计时
            resolve({ success: true })
          } else if (Date.now() - startTime > matchTimeout) {
            clearInterval(pollTimer)
            resolve({ success: false, error: 'WeGame 启动超时 (30秒)，请重试。' })
          }
        }, 500)
      })
    })
  })

  ipcMain.handle('get-flow-config', () => {
    return loginFlowAction.CONFIG
  })

  ipcMain.handle('save-flow-config', (_, newConfig: Record<string, number>) => {
    configManager.set('flowConfig', newConfig)
    return { success: true }
  })

  // --- Flow Recorder API (POC) ---
  ipcMain.handle('start-coordinate-capture', () => {
    return flowRecorderService.startCapture()
  })

  ipcMain.handle('stop-coordinate-capture', () => {
    flowRecorderService.stopCapture()
    return { success: true }
  })

  // Window frame controls
  ipcMain.on('window-minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  ipcMain.on('window-close', () => {
    BrowserWindow.getFocusedWindow()?.close()
  })

  // ---/API Handlers ---

  // --- Auto Update Handlers ---
  ipcMain.handle('app-check-update', async () => {
    try {
      await updateService.checkUpdate()
      return { success: true }
    } catch (e: any) {
      console.error('[UpdateError]', e)
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('app-start-download-update', () => {
    updateService.downloadUpdate()
  })

  ipcMain.handle('app-quit-and-install-update', () => {
    updateService.quitAndInstall()
  })

  // Start initial check a few seconds after startup
  setTimeout(() => {
    updateService.checkUpdate().catch((err) => {
      console.warn('Silent startup update check failed:', err)
    })
  }, 3000)

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
