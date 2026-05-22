import koffi from 'koffi'
import { globalShortcut, BrowserWindow } from 'electron'
import { wegameCoordinator } from './WegameCoordinator'

export interface CapturedCoordinate {
  /** 相对于 WeGame 窗口的百分比坐标 (0~1) */
  relX: number
  relY: number
  /** 屏幕绝对像素坐标 */
  absX: number
  absY: number
}

export class FlowRecorderService {
  private GetCursorPos: any = null
  private isCapturing = false

  private static readonly CAPTURE_KEY = 'F6'

  constructor() {
    this.initWin32()
  }

  private initWin32() {
    try {
      const user32 = koffi.load('user32.dll')

      // 定义 POINT 结构体（koffi 需要全局注册）
      void koffi.struct('POINT', {
        x: 'long',
        y: 'long'
      })

      this.GetCursorPos = user32.func('bool GetCursorPos(_Out_ POINT *pos)')
    } catch (e: any) {
      console.error('[FlowRecorder] Win32 API init failed:', e.message)
    }
  }

  /**
   * 获取当前鼠标的屏幕绝对坐标
   */
  public getCursorPosition(): { x: number; y: number } | null {
    if (!this.GetCursorPos) return null
    const pos = { x: 0, y: 0 }
    const ok = this.GetCursorPos(pos)
    if (!ok) return null
    return pos
  }

  /**
   * 采集当前鼠标位置，并反算相对于 WeGame 窗口的百分比坐标
   */
  public captureRelativePosition(): CapturedCoordinate | null {
    const pos = this.getCursorPosition()
    if (!pos) {
      console.warn('[FlowRecorder] GetCursorPos failed')
      return null
    }

    try {
      const bounds = wegameCoordinator.getWeGameBounds()
      return {
        relX: Math.round(((pos.x - bounds.left) / bounds.width) * 1000) / 1000,
        relY: Math.round(((pos.y - bounds.top) / bounds.height) * 1000) / 1000,
        absX: pos.x,
        absY: pos.y
      }
    } catch (e: any) {
      console.warn('[FlowRecorder] Cannot get WeGame bounds:', e.message)
      return null
    }
  }

  /**
   * 开启坐标采集模式 — 注册全局快捷键 F6
   * 按下 F6 时自动采集坐标并推送到渲染进程
   */
  public startCapture(): { success: boolean; error?: string } {
    if (this.isCapturing) {
      return { success: false, error: '已在录制状态中' }
    }

    if (!this.GetCursorPos) {
      return { success: false, error: 'Win32 API 未初始化，无法录制' }
    }

    // 预检 WeGame 窗口是否已打开
    if (!wegameCoordinator.isWindowReady()) {
      return { success: false, error: '未检测到 WeGame 窗口，请先启动 WeGame 并进入登录页面' }
    }

    try {
      const registered = globalShortcut.register(FlowRecorderService.CAPTURE_KEY, () => {
        const result = this.captureRelativePosition()

        if (result) {
          console.log(`[FlowRecorder] Captured: rel(${result.relX}, ${result.relY}) abs(${result.absX}, ${result.absY})`)
        } else {
          console.warn('[FlowRecorder] Capture failed - WeGame window may have been closed')
        }

        // 推送到所有渲染窗口（result 为 null 时前端可做提示）
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('coordinate-captured', result)
        }
      })

      if (!registered) {
        return { success: false, error: `快捷键 ${FlowRecorderService.CAPTURE_KEY} 注册失败，可能被其他程序占用` }
      }

      this.isCapturing = true
      console.log(`[FlowRecorder] Recording started - press ${FlowRecorderService.CAPTURE_KEY} to capture`)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  /**
   * 停止坐标采集模式 — 注销全局快捷键
   */
  public stopCapture(): void {
    if (this.isCapturing) {
      globalShortcut.unregister(FlowRecorderService.CAPTURE_KEY)
      this.isCapturing = false
      console.log('[FlowRecorder] Recording stopped')
    }
  }

  public get capturing(): boolean {
    return this.isCapturing
  }
}

export const flowRecorderService = new FlowRecorderService()
