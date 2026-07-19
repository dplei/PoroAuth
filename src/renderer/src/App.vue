<script setup lang="ts">
import { ArrowDown, ArrowUp, Link2, Minus, Moon, Settings, Sun, X } from 'lucide-vue-next'
import { createDiscreteApi, dateZhCN, NButton, NConfigProvider, zhCN } from 'naive-ui'
import { computed, h, onMounted, ref } from 'vue'
import { useTheme } from './composables/useTheme'
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

const { naiveTheme, isDark, toggleTheme } = useTheme()

// NaiveUI Discrete API — 用于在模板外触发 message / dialog
// configProviderProps 传 computed 而非字面量，否则弹窗内控件不会跟随主题切换
const configProviderProps = computed(() => ({
  theme: naiveTheme.value,
  locale: zhCN,
  dateLocale: dateZhCN
}))

const { message, dialog } = createDiscreteApi(['message', 'dialog'], {
  configProviderProps
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
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN" :theme="naiveTheme">
    <!-- 标题栏 -->
    <header class="app-header">
      <div class="app-title">
        <!-- 内联而非 <img>：currentColor 才能跟随主题；位图版仅用于应用图标 -->
        <svg
          class="app-logo"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="5" y="3" width="14" height="18" rx="3" />
          <path d="M9 9h6M9 13h6M9 17h3" />
        </svg>
        PoroAuth <span class="tag">WeGame Edition</span>
      </div>
      <div class="window-controls">
        <button class="win-btn" title="最小化" @click="handleMinimize">
          <Minus :size="14" />
        </button>
        <button class="win-btn win-btn--close" title="关闭" @click="handleClose">
          <X :size="14" />
        </button>
      </div>
    </header>

    <main class="app-main">
      <div class="content-wrapper">
        <div class="page-head">
          <div class="page-head__row">
            <div class="page-head__title">
              <h2 class="hero"><strong>PoroAuth</strong> 通行名册</h2>
              <button
                v-if="hasUpdate"
                class="update-badge"
                title="有新版本可用，点击查看！"
                @click="showUpdateModal = true"
              >
                <ArrowUp :size="13" class="update-badge__icon" />
                有可用更新
              </button>
            </div>
            <div class="tool-bar">
              <button class="icon-btn" title="路径管理" @click="showPathModal = true">
                <Link2 :size="18" />
              </button>
              <button class="icon-btn" title="坐标时序校正" @click="showConfigModal = true">
                <Settings :size="18" />
              </button>
              <button
                class="icon-btn"
                :title="isDark ? '切换到浅色主题' : '切换到深色主题'"
                @click="toggleTheme"
              >
                <Sun v-if="isDark" :size="18" />
                <Moon v-else :size="18" />
              </button>
            </div>
          </div>
          <p class="page-head__desc">AES-256 本地加密直连，请确保 WeGame 与底层驱动已激活</p>
        </div>

        <div class="sort-bar">
          <div class="segmented">
            <button
              class="segmented__item"
              :class="{ 'segmented__item--active': sortMode === 'addTime' }"
              :title="`按添加时间${sortMode === 'addTime' && sortDirection === 'desc' ? '降序' : '升序'}排列`"
              @click="handleSort('addTime')"
            >
              添加时间
              <template v-if="sortMode === 'addTime'">
                <ArrowUp v-if="sortDirection === 'asc'" :size="14" class="segmented__arrow" />
                <ArrowDown v-else :size="14" class="segmented__arrow" />
              </template>
            </button>
            <button
              class="segmented__item"
              :class="{ 'segmented__item--active': sortMode === 'availability' }"
              :title="`按可用性${sortMode === 'availability' && sortDirection === 'desc' ? '降序' : '升序'}排列`"
              @click="handleSort('availability')"
            >
              可用性
              <template v-if="sortMode === 'availability'">
                <ArrowUp v-if="sortDirection === 'asc'" :size="14" class="segmented__arrow" />
                <ArrowDown v-else :size="14" class="segmented__arrow" />
              </template>
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
/* ── 标题栏 ── */
.app-header {
  height: 48px;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-app);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
}

.app-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-left: var(--space-lg);
  font-size: var(--text-body);
  font-weight: 600;
  color: var(--text-primary);
}

.app-logo {
  width: 22px;
  height: 22px;
  flex: none;
  color: var(--accent);
}

.tag {
  padding: 2px var(--space-sm);
  background: var(--accent-soft);
  border-radius: var(--radius-full);
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: 700;
}

.window-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.win-btn {
  width: 48px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.win-btn:hover {
  background: var(--bg-inset);
  color: var(--text-primary);
}

.win-btn--close:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

/* ── 主体 ── */
.app-main {
  margin-top: 48px;
  height: calc(100vh - 48px);
  overflow-y: auto;
  padding: var(--space-xl);
}

.content-wrapper {
  max-width: 1000px;
  margin: 0 auto;
}

/* ── Hero ── */
.page-head {
  margin-bottom: var(--space-lg);
}

.page-head__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  flex-wrap: wrap;
  margin-bottom: var(--space-sm);
}

.page-head__title {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.hero {
  font-size: var(--text-display);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--text-primary);
}

.hero strong {
  font-weight: 800;
}

.page-head__desc {
  color: var(--text-secondary);
  font-size: var(--text-body);
}

/* ── 更新提示 chip ──
   MASTER §6 禁纯装饰动画：原 badgeFloat / arrowBounce 无限循环已移除，
   仅保留 hover 反馈。--success 压 --success-soft 仅 3.58:1，
   故文字走 --text-primary，--success 只承载图标与描边（非文字，3:1 即可）。 */
.update-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 3px var(--space-sm) 3px 6px;
  background: var(--success-soft);
  border: 1px solid var(--success);
  border-radius: var(--radius-full);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: box-shadow var(--duration) var(--ease);
}

.update-badge:hover {
  box-shadow: var(--shadow-md);
}

.update-badge__icon {
  color: var(--success);
}

/* ── 圆形图标按钮 · MASTER §4.3 ── */
.tool-bar {
  display: flex;
  gap: var(--space-xs);
}

.icon-btn {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.icon-btn:hover {
  background: var(--bg-inset);
  color: var(--text-primary);
}

/* ── 胶囊分段控件 · MASTER §4.2 ── */
.sort-bar {
  margin-bottom: var(--space-md);
}

.segmented {
  display: inline-flex;
  gap: var(--space-xs);
  padding: 4px;
  background: var(--bg-inset);
  border-radius: var(--radius-full);
}

.segmented__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-lg);
  background: transparent;
  border: none;
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease),
    box-shadow var(--duration-fast) var(--ease);
}

.segmented__item:hover:not(.segmented__item--active) {
  color: var(--text-primary);
}

.segmented__item--active {
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  color: var(--text-primary);
}

/* 深色下 --shadow-sm 为 none 且 --bg-surface 与 --bg-inset 亮度接近，
   激活胶囊会糊进轨道 → 补一圈 inset 描边（不用 border，避免撑尺寸位移）。 */
:root[data-theme='dark'] .segmented__item--active {
  box-shadow: inset 0 0 0 1px var(--border-strong);
}

.segmented__arrow {
  flex: none;
}
</style>
