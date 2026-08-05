import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getAccounts: () => Promise<Array<{ id: string, name: string, account: string, bannedUntil?: number | null, lastLoginTime?: number | null, createdAt?: number }>>
      addAccount: (name: string, acc: string, pass: string) => Promise<{ success: boolean, id?: string, error?: string }>
      addAccounts: (items: Array<{ name: string, account: string, pass: string }>) => Promise<{ success: boolean, error?: string, results: Array<{ account: string, success: boolean, id?: string, error?: string }> }>
      deleteAccount: (id: string) => Promise<{ success: boolean }>
      updateAccountName: (id: string, newName: string) => Promise<{ success: boolean, error?: string }>
      updateLastLoginTime: (id: string, timestamp: number | null) => Promise<{ success: boolean, error?: string }>
      setBanTime: (id: string, timestamp: number | null) => Promise<{ success: boolean, error?: string }>
      getDriverStatus: () => Promise<boolean>
      selectAndLoadDriver: () => Promise<{ success: boolean, error?: string }>
      getWegamePath: () => Promise<string | null>
      selectWegameExe: () => Promise<{ success: boolean, error?: string, path?: string }>
      checkWegameRunning: () => Promise<boolean>
      killAndStartWegame: () => Promise<{ success: boolean, error?: string }>
      cancelStartWegame: () => Promise<void>
      getFlowConfig: () => Promise<Record<string, number>>
      saveFlowConfig: (conf: Record<string, number>) => Promise<{ success: boolean }>
      startLogin: (id: string) => Promise<{ success: boolean, error?: string }>
      onLoginProgress: (callback: (msg: string) => void) => void

      // --- Flow Recorder API (POC) ---
      startCoordinateCapture: () => Promise<{ success: boolean; error?: string }>
      stopCoordinateCapture: () => Promise<{ success: boolean }>
      onCoordinateCaptured: (callback: (data: { relX: number; relY: number; absX: number; absY: number } | null) => void) => void
      offCoordinateCaptured: () => void

      minimizeWindow: () => void
      closeWindow: () => void

      // --- Auto Update API ---
      checkUpdate: () => Promise<void>
      startDownloadUpdate: () => Promise<void>
      quitAndInstallUpdate: () => Promise<void>
      onUpdateAvailable: (callback: (info: any) => void) => void
      onUpdateProgress: (callback: (progress: any) => void) => void
      onUpdateDownloaded: (callback: () => void) => void
      onUpdateError: (callback: (error: string) => void) => void
    }
  }
}
