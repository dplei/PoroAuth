<template>
  <div class="account-grid">
    <div class="account-card glass add-card" @click="$emit('add')">
      <div class="add-icon">+</div>
      <span>添加新账号</span>
    </div>

    <div
      v-for="acc in accounts"
      :key="acc.id"
      class="account-card glass"
      :class="{ banned: isBanned(acc) }"
      @click="!isBanned(acc) && $emit('select', acc)"
    >
      <div class="card-header">
        <span class="account-name">{{ acc.name }}</span>
        <div class="actions-group">
          <!-- Edit Button -->
          <button
            class="btn btn-icon btn-edit"
            title="修改备注"
            @click.stop="$emit('edit-name', acc)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </button>
          <!-- Ban Button -->
          <button
            class="btn btn-icon btn-ban"
            title="设置封禁/防误触期"
            @click.stop="$emit('set-ban', acc)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </button>
          <!-- Delete Button -->
          <button
            class="btn btn-icon btn-danger delete-btn"
            title="删除账号"
            @click.stop="$emit('delete', acc.id)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
              ></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="card-body">
        <span class="account-id">{{ acc.account }}</span>
      </div>
      <div class="card-footer">
        <div class="footer-row">
          <div :class="['status-indicator', { 'banned-indicator': isBanned(acc) }]"></div>
          <span class="status-text">{{ getStatusText(acc) }}</span>
        </div>
        <div class="footer-row login-info">
          <span class="login-text">上次登录：{{ getLoginTimeText(acc) }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')
interface Account {
  id: string
  name: string
  account: string
  bannedUntil?: number | null
  lastLoginTime?: number | null
  createdAt?: number
}

defineProps<{
  accounts: Array<Account>
}>()

defineEmits<{
  (e: 'select', account: Account): void
  (e: 'delete', id: string): void
  (e: 'add'): void
  (e: 'set-ban', account: Account): void
  (e: 'edit-name', account: Account): void
}>()

// Used to force re-render statuses if time passes
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 10000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const isBanned = (acc: Account): boolean => {
  if (!acc.bannedUntil) return false
  return acc.bannedUntil > now.value
}

const getStatusText = (acc: Account): string => {
  if (isBanned(acc)) {
    const d = new Date(acc.bannedUntil!)
    return `封禁至 ${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  return '就绪'
}

const getLoginTimeText = (acc: Account): string => {
  if (!acc.lastLoginTime) return '从未登录'
  return dayjs(acc.lastLoginTime).fromNow()
}
</script>

<style scoped>
.account-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0;
}

.account-card {
  padding: 1.25rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
  overflow: hidden;
}

.account-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.account-card:hover:not(.banned) {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.2);
}

.account-card:hover:not(.banned)::before {
  opacity: 1;
}

/* Banned Styles */
.banned {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(0, 0, 0, 0.4);
  cursor: not-allowed;
  filter: grayscale(0.6);
}

.banned-indicator {
  background-color: var(--danger-color) !important;
  box-shadow: 0 0 8px var(--danger-color) !important;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1;
}

.account-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.actions-group {
  display: flex;
  gap: 0.25rem;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 0.25rem;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-card:hover .btn-icon {
  opacity: 1;
  transform: scale(1);
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}

.btn-edit {
  color: #3b82f6;
}
.btn-edit:hover {
  background: rgba(59, 130, 246, 0.2);
}

.btn-ban {
  color: #fbbf24;
}
.btn-ban:hover {
  background: rgba(251, 191, 36, 0.2);
}

.delete-btn {
  color: var(--danger-color);
}
.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.card-body {
  z-index: 1;
}

.account-id {
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.card-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: auto;
  color: var(--text-secondary);
  z-index: 1;
}

.footer-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.login-info {
  font-size: 0.75rem;
  color: var(--text-tertiary, rgba(255, 255, 255, 0.6));
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 8px #10b981;
}

/* Add Card styles */
.add-card {
  border-style: dashed;
  border-width: 2px;
  background: transparent;
  justify-content: center;
  align-items: center;
  color: var(--text-secondary);
}

.add-card:hover {
  color: var(--text-primary);
  border-color: var(--accent-color);
}

.add-icon {
  font-size: 2rem;
  font-weight: 300;
  margin-bottom: 0.5rem;
}
</style>
