<script setup lang="ts">
import { createDiscreteApi, darkTheme, dateZhCN, NButton, NConfigProvider, zhCN } from 'naive-ui'
import { computed, h, onMounted, ref } from 'vue'
import AccountGrid from './components/AccountGrid.vue'
import AddAccountModal from './components/AddAccountModal.vue'
import BanAccountModal from './components/BanAccountModal.vue'
import EditNameModal from './components/EditNameModal.vue'
import FlowConfigModal from './components/FlowConfigModal.vue'
import LoginOverlay from './components/LoginOverlay.vue'
import PathManagementModal from './components/PathManagementModal.vue'
import SetupOverlay from './components/SetupOverlay.vue'
import UpdateModal from './components/UpdateModal.vue'

interface Account {
  id: string
  name: string
  account: string
  bannedUntil?: number | null
  lastLoginTime?: number | null
  createdAt?: number
}

type SortMode = 'addTime' | 'availability'
type SortDirection = 'asc' | 'desc'

// NaiveUI Discrete API — 用于在模板外触发 message / dialog
const { message, dialog } = createDiscreteApi(['message', 'dialog'], {
  configProviderProps: { theme: darkTheme, locale: zhCN, dateLocale: dateZhCN }
})

// ── 账号列表 ────────────────────────────────────────────────
const accounts = ref<Account[]>([])
const sortMode = ref<SortMode>('addTime')
const sortDirection = ref<SortDirection>('asc')

const loadAccounts = async () => {
  accounts.value = await window.api.getAccounts()
}

const sortedAccounts = computed(() => {
  const now = Date.now()
  const isBanned = (acc: Account) => !!acc.bannedUntil && acc.bannedUntil > now
  const direction = sortDirection.value === 'asc' ? 1 : -1

  return accounts.value
    .map((account, index) => ({ account, index }))
    .sort((a, b) => {
      if (sortMode.value === 'availability') {
        return (
          ((isBanned(a.account) ? 1 : 0) - (isBanned(b.account) ? 1 : 0)) * direction
        )
      }

      const timeDifference =
        a.account.createdAt != null && b.account.createdAt != null
          ? a.account.createdAt - b.account.createdAt
          : a.index - b.index
      return timeDifference * direction
    })
    .map(({ account }) => account)
})

const handleSort = (mode: SortMode): void => {
  if (sortMode.value === mode) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortMode.value = mode
  sortDirection.value = 'asc'
}

// ── 弹窗状态 ────────────────────────────────────────────────
const showAddModal = ref(false)
const showBanModal = ref(false)
const showConfigModal = ref(false)
const showPathModal = ref(false)
const showEditNameModal = ref(false)
const targetAccountForBan = ref<Account | null>(null)
const editableAccountDetails = ref<Pick<Account, 'id' | 'name'> | null>(null)

// ── 环境检测 ────────────────────────────────────────────────
const driverLoaded = ref(true)
const wegameExePath = ref<string | null>(null)

// ── 登录流程 ────────────────────────────────────────────────
const isLoggingIn = ref(false)
const loginProgress = ref('')
const loginError = ref('')
const targetAccountForLogin = ref<Account | null>(null)
const animationWaitTime = ref(30)
const isWaitingAnimation = ref(false)
let animationTimer: any = null

// ── 自动更新 ────────────────────────────────────────────────
const hasUpdate = ref(false)
const showUpdateModal = ref(false)
const updateInfo = ref<any>(null)
const updateStatus = ref<'available' | 'downloading' | 'downloaded' | 'error' | null>(null)
const updateProgress = ref<any>(null)
const updateErrorMessage = ref('')

onMounted(async () => {
  loadAccounts()

  window.api.onLoginProgress((msg) => {
    loginProgress.value = msg
  })

  driverLoaded.value = await window.api.getDriverStatus()
  wegameExePath.value = await window.api.getWegamePath()

  window.api.onUpdateAvailable((info) => {
    updateInfo.value = info
    hasUpdate.value = true
    updateStatus.value = 'available'
  })
  window.api.onUpdateProgress((prog) => {
    updateProgress.value = prog
  })
  window.api.onUpdateDownloaded(() => {
    updateStatus.value = 'downloaded'
  })
  window.api.onUpdateError((err) => {
    updateStatus.value = 'error'
    updateErrorMessage.value = err
  })
})

// ── 更新操作 ────────────────────────────────────────────────
const handleStartDownloadUpdate = () => {
  updateStatus.value = 'downloading'
  window.api.startDownloadUpdate()
}

const handleInstallUpdate = () => {
  window.api.quitAndInstallUpdate()
}

// ── 路径绑定 ────────────────────────────────────────────────
const handleLinkDriver = async () => {
  const res = await window.api.selectAndLoadDriver()
  if (res.success) {
    driverLoaded.value = true
  } else {
    message.error('绑定失败: ' + res.error)
  }
}

const handleLinkWegame = async () => {
  const res = await window.api.selectWegameExe()
  if (res.success) {
    wegameExePath.value = res.path!
  } else {
    message.error('绑定失败: ' + res.error)
  }
}

const handleRelinkDriver = async () => {
  const res = await window.api.selectAndLoadDriver()
  if (res.success) {
    driverLoaded.value = true
  } else {
    message.error('重新绑定失败: ' + res.error)
  }
}

const handleRelinkWegame = async () => {
  const res = await window.api.selectWegameExe()
  if (res.success) {
    wegameExePath.value = res.path!
  } else {
    message.error('重新绑定失败: ' + res.error)
  }
}

// ── 账号操作 ────────────────────────────────────────────────
const handleAddAccount = () => {
  showAddModal.value = true
}

const handleAccountSubmit = () => {
  loadAccounts()
}

const handleSetBan = (acc: Account) => {
  targetAccountForBan.value = acc
  showBanModal.value = true
}

const handleEditName = (acc: Account) => {
  editableAccountDetails.value = { id: acc.id, name: acc.name }
  showEditNameModal.value = true
}

const submitEditName = async (newName: string) => {
  if (!editableAccountDetails.value) return
  const res = await window.api.updateAccountName(editableAccountDetails.value.id, newName)
  if (res.success) loadAccounts()
}

const handleDeleteAccount = async (id: string) => {
  const confirmed = await new Promise<boolean>((resolve) => {
    dialog.warning({
      title: '删除确认',
      content: '确认删除该账号？此操作不可恢复。',
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false)
    })
  })
  if (!confirmed) return
  const res = await window.api.deleteAccount(id)
  if (res.success) loadAccounts()
}

// ── 登录流程 ────────────────────────────────────────────────
const proceedToInject = async () => {
  if (animationTimer) {
    clearTimeout(animationTimer)
    animationTimer = null
  }
  isWaitingAnimation.value = false
  if (!targetAccountForLogin.value) return

  loginProgress.value = '准备物理注入流程...'
  try {
    const res = await window.api.startLogin(targetAccountForLogin.value.id)
    if (!res.success) {
      loginError.value = res.error || '登录流程触发失败'
    } else {
      loginProgress.value = '登录流程触发完毕，请在游戏中检查。'
      // 更新上次登录时间
      if (targetAccountForLogin.value) {
        const now = Date.now()
        await window.api.updateLastLoginTime(targetAccountForLogin.value.id, now)
        const accountIndex = accounts.value.findIndex(
          (a) => a.id === targetAccountForLogin.value?.id
        )
        if (accountIndex !== -1) {
          accounts.value[accountIndex].lastLoginTime = now
        }
      }
    }
  } catch (err: any) {
    loginError.value = err.message
  } finally {
    setTimeout(() => {
      isLoggingIn.value = false
      targetAccountForLogin.value = null
    }, 2000)
  }
}

const handleSelectAccount = async (acc: Account) => {
  if (isLoggingIn.value) return

  targetAccountForLogin.value = acc
  isLoggingIn.value = true
  loginError.value = ''
  loginProgress.value = '正在检测大厅状态...'

  await new Promise((r) => setTimeout(r, 100))

  const isRunning = await window.api.checkWegameRunning()
  if (isRunning) {
    const userChoice = await new Promise<'kill' | 'direct' | 'cancel'>((resolve) => {
      const d = dialog.create({
        title: '进程干涉检测',
        content:
          'WeGame 正在运行！为了保证物理通信顺利防串号，需要先为您掐断当前大厅并抹除状态重启。\n\n是否授权强制退出？或选择直接注入当前窗口。',
        closable: false,
        closeOnEsc: false,
        maskClosable: false,
        action: () => [
          h(NButton, {
            onClick: () => { d.destroy(); resolve('cancel') },
            style: { marginRight: '8px' }
          }, { default: () => '取消' }),
          h(NButton, {
            onClick: () => { d.destroy(); resolve('direct') },
            type: 'warning',
            style: { marginRight: '8px' }
          }, { default: () => '直接注入' }),
          h(NButton, {
            onClick: () => { d.destroy(); resolve('kill') },
            type: 'primary'
          }, { default: () => '授权强制退出' })
        ]
      })
    })

    if (userChoice === 'cancel') {
      isLoggingIn.value = false
      targetAccountForLogin.value = null
      return
    }

    if (userChoice === 'direct') {
      loginProgress.value = '准备物理注入流程...'
      proceedToInject()
      return
    }

    // userChoice === 'kill' — 走原有 kill + restart 流程
  }

  loginProgress.value = isRunning ? '正在掐断并重启 WeGame...' : '即将唤起 WeGame 客户端...'

  try {
    const ksRes = await window.api.killAndStartWegame()
    if (!ksRes.success) throw new Error(ksRes.error)

    isWaitingAnimation.value = true
    animationWaitTime.value = 30

    const tick = () => {
      if (!isWaitingAnimation.value) return
      if (animationWaitTime.value <= 0) {
        proceedToInject()
        return
      }
      loginProgress.value = `等待大厅启动动画结束... (${animationWaitTime.value}s)`
      animationWaitTime.value--
      animationTimer = setTimeout(tick, 1000)
    }
    tick()
  } catch (err: any) {
    loginError.value = err.message
    setTimeout(() => {
      isLoggingIn.value = false
      targetAccountForLogin.value = null
    }, 2000)
  }
}

const handleCancelWait = () => {
  if (animationTimer) {
    clearTimeout(animationTimer)
    animationTimer = null
  }
  isWaitingAnimation.value = false
  window.api.cancelStartWegame()
}

// ── 窗口控制 ────────────────────────────────────────────────
const handleMinimize = () => window.api.minimizeWindow()
const handleClose = () => window.api.closeWindow()
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN" :theme="darkTheme">
    <!-- 标题栏 -->
    <header class="app-header">
      <div class="app-title" style="padding-left: 1.5rem">
        <img
          src="./assets/icon.png"
          alt="logo"
          style="
            width: 22px;
            height: 22px;
            border-radius: 4px;
            box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
          "
        />
        PoroAuth <span class="tag">WeGame Edition</span>
      </div>
      <div class="window-controls">
        <button class="win-btn" @click="handleMinimize">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button class="win-btn close-btn-win" @click="handleClose">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>

    <main class="app-main">
      <div class="content-wrapper">
        <div class="section-title">
          <div
            style="
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-bottom: 0.5rem;
            "
          >
            <div style="display: flex; align-items: center; gap: 0.75rem">
              <h2 style="margin-bottom: 0">通行名册</h2>
              <button
                v-if="hasUpdate"
                class="update-badge"
                title="有新版本可用，点击查看！"
                @click="showUpdateModal = true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="update-arrow-icon"
                >
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
                有可用更新
              </button>
            </div>
            <div style="display: flex; gap: 0.5rem">
              <button
                class="btn"
                style="
                  padding: 0.3rem 0.6rem;
                  font-size: 0.8rem;
                  background: rgba(255, 255, 255, 0.08);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 6px;
                  cursor: pointer;
                "
                @click="showPathModal = true"
              >
                🔗 路径管理
              </button>
              <button
                class="btn"
                style="
                  padding: 0.3rem 0.6rem;
                  font-size: 0.8rem;
                  background: rgba(255, 255, 255, 0.08);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 6px;
                  cursor: pointer;
                "
                @click="showConfigModal = true"
              >
                ⚙️ 坐标时序校正
              </button>
            </div>
          </div>
          <p>AES-256 本地加密直连，请确保 WeGame 与底层驱动已激活</p>
        </div>

        <div class="sort-bar">
          <div class="sort-group">
            <button
              class="sort-btn"
              :class="{ active: sortMode === 'addTime' }"
              :title="`按添加时间${sortMode === 'addTime' && sortDirection === 'desc' ? '降序' : '升序'}排列`"
              @click="handleSort('addTime')"
            >
              添加时间
              <span v-if="sortMode === 'addTime'" class="sort-direction" aria-hidden="true">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </button>
            <button
              class="sort-btn"
              :class="{ active: sortMode === 'availability' }"
              :title="`按可用性${sortMode === 'availability' && sortDirection === 'desc' ? '降序' : '升序'}排列`"
              @click="handleSort('availability')"
            >
              可用性
              <span v-if="sortMode === 'availability'" class="sort-direction" aria-hidden="true">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </button>
          </div>
        </div>

        <AccountGrid
          :accounts="sortedAccounts"
          @add="handleAddAccount"
          @select="handleSelectAccount"
          @delete="handleDeleteAccount"
          @set-ban="handleSetBan"
          @edit-name="handleEditName"
        />
      </div>

      <!-- 添加账号 -->
      <AddAccountModal
        :show="showAddModal"
        @close="showAddModal = false"
        @submit="handleAccountSubmit"
      />

      <!-- 封禁设置 -->
      <BanAccountModal
        :show="showBanModal"
        :account="targetAccountForBan"
        @close="showBanModal = false"
        @submit="handleAccountSubmit"
      />

      <!-- 修改备注名 -->
      <EditNameModal
        :show="showEditNameModal"
        :account="editableAccountDetails"
        @close="showEditNameModal = false"
        @submit="submitEditName"
      />

      <!-- 路径管理 -->
      <PathManagementModal
        :show="showPathModal"
        :driver-loaded="driverLoaded"
        :wegame-exe-path="wegameExePath"
        @close="showPathModal = false"
        @relink-driver="handleRelinkDriver"
        @relink-wegame="handleRelinkWegame"
      />

      <!-- 参数调优 -->
      <FlowConfigModal :show="showConfigModal" @close="showConfigModal = false" />

      <!-- 版本更新 -->
      <UpdateModal
        :show="showUpdateModal"
        :status="updateStatus"
        :update-info="updateInfo"
        :progress="updateProgress"
        :error-message="updateErrorMessage"
        @close="showUpdateModal = false"
        @download="handleStartDownloadUpdate"
        @install="handleInstallUpdate"
      />

      <!-- 环境初始化遮罩 -->
      <SetupOverlay
        :driver-loaded="driverLoaded"
        :wegame-exe-path="wegameExePath"
        @link-driver="handleLinkDriver"
        @link-wegame="handleLinkWegame"
      />

      <!-- 登录流程遮罩 -->
      <LoginOverlay
        :show="isLoggingIn"
        :progress="loginProgress"
        :error="loginError"
        :is-waiting-animation="isWaitingAnimation"
        @proceed="proceedToInject"
        @extend="animationWaitTime += 30"
        @cancel="handleCancelWait"
      />
    </main>
  </n-config-provider>
</template>

<style scoped>
.app-header {
  height: 48px;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(8px);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
}

.window-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.win-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  width: 48px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.win-btn svg {
  width: 14px;
  height: 14px;
}

.win-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.win-btn.close-btn-win:hover {
  background: #e81123;
  color: white;
}

.update-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.18rem 0.6rem 0.18rem 0.45rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 9999px;
  color: #10b981;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: all 0.2s ease;
  animation: badgeFloat 3s ease-in-out infinite;
  background-clip: padding-box;
  -webkit-app-region: no-drag;
}

.update-badge:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.6);
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
  transform: scale(1.05);
}

.update-arrow-icon {
  animation: arrowBounce 1.5s ease-in-out infinite;
}

@keyframes arrowBounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

@keyframes badgeFloat {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(16, 185, 129, 0.15);
  }
  50% {
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.35);
  }
}

.app-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: rgba(99, 102, 241, 0.2);
  color: var(--accent-color);
  border-radius: 4px;
  font-weight: 700;
}

.app-main {
  margin-top: 48px;
  height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 2rem;
}

.content-wrapper {
  max-width: 1000px;
  margin: 0 auto;
}

.section-title {
  margin-bottom: 2rem;
}

.section-title h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.section-title p {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.sort-group {
  display: flex;
  border-radius: 6px;
  overflow: hidden;
}

.sort-btn {
  padding: 0.3rem 0.65rem;
  font-size: 0.78rem;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.sort-direction {
  display: inline-block;
  width: 0.8rem;
  margin-left: 0.15rem;
  font-weight: 700;
}

.sort-btn + .sort-btn {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.sort-btn.active {
  background: rgba(99, 102, 241, 0.25);
  color: var(--accent-color);
}

.sort-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
</style>
