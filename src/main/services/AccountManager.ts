import fs from 'fs'
import path from 'path'
import { app, safeStorage } from 'electron'
import crypto from 'crypto'

export interface AccountData {
  id: string // UUID
  name: string // 备注名称（大号、小号）
  account: string // QQ号
  passwordEncrypted: string // 使用 safeStorage 或 aes 加密后的 base64
  bannedUntil?: number | null // 封禁解封时间戳 (ms)，若为空则未被封禁
  lastLoginTime?: number | null // 上次登录时间戳 (ms)
  createdAt?: number // 账号添加时间戳 (ms)
}

export class AccountManager {
  private dataPath: string
  private memoryCache: AccountData[] | null = null
  // Fallback key just in case safeStorage is not available (e.g. Linux without libsecret)
  private fallbackKey: Buffer

  constructor() {
    this.dataPath = path.join(app.getPath('userData'), 'accounts.dat')
    // Generate a consistent hardware-bound key fallback if needed, but here we just use an app-specific string
    // hashed to 32 bytes for AES-256
    const machineId = 'backup-login-helper-we-game-2026'
    this.fallbackKey = crypto.scryptSync(machineId, 'salt', 32)
  }

  private encrypt(text: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(text).toString('base64')
    }
    // Fallback to AES-256-GCM
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.fallbackKey, iv)
    let encrypted = cipher.update(text, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    const authTag = cipher.getAuthTag().toString('base64')
    return `fallback:${iv.toString('base64')}:${authTag}:${encrypted}`
  }

  private decrypt(encryptedData: string): string {
    if (encryptedData.startsWith('fallback:')) {
      const parts = encryptedData.split(':')
      if (parts.length !== 4) return ''
      const iv = Buffer.from(parts[1], 'base64')
      const authTag = Buffer.from(parts[2], 'base64')
      const text = parts[3]
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.fallbackKey, iv)
      decipher.setAuthTag(authTag)
      let decrypted = decipher.update(text, 'base64', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    }

    // Default safeStorage
    try {
      return safeStorage.decryptString(Buffer.from(encryptedData, 'base64'))
    } catch (e) {
      console.error('解密失败，可能是跨机器移动了数据或加密版本变更', e)
      return ''
    }
  }

  // Load accounts from disk
  public loadAccounts(): AccountData[] {
    if (this.memoryCache) return this.memoryCache

    if (!fs.existsSync(this.dataPath)) {
      this.memoryCache = []
      return this.memoryCache
    }

    try {
      const raw = fs.readFileSync(this.dataPath, 'utf-8')
      this.memoryCache = JSON.parse(raw) as AccountData[]
    } catch (e) {
      console.error('加载账号文件失败', e)
      this.memoryCache = []
    }
    return this.memoryCache
  }

  // Save current cache to disk
  private save() {
    if (!this.memoryCache) return
    fs.writeFileSync(this.dataPath, JSON.stringify(this.memoryCache), 'utf-8')
  }

  public getAccountsSummary() {
    const list = this.loadAccounts()
    // 隐藏密码返回给前台
    return list.map((item) => ({
      id: item.id,
      name: item.name,
      account: item.account,
      bannedUntil: item.bannedUntil,
      lastLoginTime: item.lastLoginTime,
      createdAt: item.createdAt
    }))
  }

  public getRawAccount(id: string) {
    const arr = this.loadAccounts()
    const target = arr.find((a) => a.id === id)
    if (!target) throw new Error('账号未找到')

    return {
      account: target.account,
      password: this.decrypt(target.passwordEncrypted)
    }
  }

  public addAccount(name: string, account: string, pass: string) {
    const arr = this.loadAccounts()
    if (arr.some((a) => a.account === account)) {
      throw new Error(`账号 ${account} 已存在`)
    }
    const newData: AccountData = {
      id: crypto.randomUUID(),
      name,
      account,
      passwordEncrypted: this.encrypt(pass),
      createdAt: Date.now()
    }
    arr.push(newData)
    this.save()
    return newData.id
  }

  // 批量添加：整批只写一次盘，逐条返回结果（单条失败不影响其余条目）
  public addAccounts(items: Array<{ name: string; account: string; pass: string }>) {
    const arr = this.loadAccounts()
    const results: Array<{ account: string; success: boolean; id?: string; error?: string }> = []
    let dirty = false

    for (const item of items) {
      const name = (item.name || '').trim()
      const account = (item.account || '').trim()
      const pass = item.pass || ''

      if (!name || !account || !pass) {
        results.push({ account, success: false, error: '备注名/账号/密码不能为空' })
        continue
      }
      // arr 就是 memoryCache 本体，本批已 push 进去的条目也会被这里查到 → 批内重复一并拦掉
      if (arr.some((a) => a.account === account)) {
        results.push({ account, success: false, error: `账号 ${account} 已存在` })
        continue
      }

      const newData: AccountData = {
        id: crypto.randomUUID(),
        name,
        account,
        passwordEncrypted: this.encrypt(pass),
        createdAt: Date.now()
      }
      arr.push(newData)
      dirty = true
      results.push({ account, success: true, id: newData.id })
    }

    if (dirty) this.save()
    return results
  }

  public deleteAccount(id: string) {
    const arr = this.loadAccounts()
    this.memoryCache = arr.filter((a) => a.id !== id)
    this.save()
  }

  public updateBanTime(id: string, timestamp: number | null) {
    const arr = this.loadAccounts()
    const target = arr.find((a) => a.id === id)
    if (!target) throw new Error('账号未找到')

    target.bannedUntil = timestamp
    this.save()
  }
  public updateAccountName(id: string, newName: string) {
    const arr = this.loadAccounts()
    const target = arr.find((a) => a.id === id)
    if (!target) throw new Error('账号未找到')

    target.name = newName
    this.save()
  }

  public updateLastLoginTime(id: string, timestamp: number | null) {
    const arr = this.loadAccounts()
    const target = arr.find((a) => a.id === id)
    if (!target) throw new Error('账号未找到')

    target.lastLoginTime = timestamp
    this.save()
  }
}

export const accountManager = new AccountManager()
