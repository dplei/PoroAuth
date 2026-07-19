<template>
  <div class="account-grid">
    <button class="add-card" @click="$emit('add')">
      <Plus :size="28" :stroke-width="1.5" />
      <span>添加新账号</span>
    </button>

    <div
      v-for="acc in accounts"
      :key="acc.id"
      class="account-card"
      :class="{ 'account-card--banned': isBanned(acc) }"
      @click="!isBanned(acc) && $emit('select', acc)"
    >
      <div class="card-head">
        <div class="card-head__ident">
          <h3 class="account-name" :title="acc.name">{{ acc.name }}</h3>
          <span class="account-id" :title="acc.account">{{ acc.account }}</span>
        </div>
        <span class="card-cue" aria-hidden="true">
          <ArrowUpRight :size="16" />
        </span>
      </div>

      <!-- MASTER §2.4 配方：soft 底 + 主色描边 + text-primary 文字，主色只碰图标 -->
      <span class="status-chip" :class="{ 'status-chip--banned': isBanned(acc) }">
        <ShieldBan v-if="isBanned(acc)" :size="12" class="status-chip__icon" />
        <CircleCheck v-else :size="12" class="status-chip__icon" />
        {{ getStatusText(acc) }}
      </span>

      <div class="card-foot">
        <span class="login-text">上次登录：{{ getLoginTimeText(acc) }}</span>
        <div class="card-actions">
          <button
            class="action-btn action-btn--edit"
            title="修改备注"
            @click.stop="$emit('edit-name', acc)"
          >
            <Pencil :size="15" />
          </button>
          <button
            class="action-btn action-btn--ban"
            title="设置封禁/防误触期"
            @click.stop="$emit('set-ban', acc)"
          >
            <ShieldBan :size="15" />
          </button>
          <button
            class="action-btn action-btn--delete"
            title="删除账号"
            @click.stop="$emit('delete', acc.id)"
          >
            <Trash2 :size="15" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowUpRight, CircleCheck, Pencil, Plus, ShieldBan, Trash2 } from 'lucide-vue-next'
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
  gap: var(--space-lg);
  padding: var(--space-md) 0;
}

/* ── 卡片 · MASTER §4.1 ──
   浅色下无描边，深色下补 --border-subtle，否则卡片糊进底色。
   浅色用 transparent 描边占位而非 border: none —— 两个主题盒模型一致，
   切主题时不会因描边挤占 1px 而整格重排。 */
.account-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  /* 瓦片撤走后省下的一行不还给高度，而是摊成呼吸感：块间距 8px → 16px */
  gap: var(--space-md);
  min-height: 208px;
  padding: var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition:
    transform var(--duration) var(--ease),
    box-shadow var(--duration) var(--ease),
    border-color var(--duration) var(--ease);
}

:root[data-theme='dark'] .account-card {
  border-color: var(--border-subtle);
}

.account-card:hover:not(.account-card--banned) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* 深色下 --shadow-lg 几乎不可见 → 靠描边提亮补 hover 反馈 */
:root[data-theme='dark'] .account-card:hover:not(.account-card--banned) {
  border-color: var(--border-strong);
}

/* ── 封禁态 ──
   原 filter: grayscale(0.6) 在浅色下发灰发脏，且把文字对比度一起拖垮。
   改走 --danger-soft 底：文字仍是 --text-primary（实测 14.61 浅 / 13.94 深），
   语义由底色 + chip 承载，不靠降饱和。 */
.account-card--banned {
  background: var(--danger-soft);
  cursor: not-allowed;
}

/* 名称 + 账号占左，↗ 顶右对齐。
   用户决策：原 MASTER §4.1 的 44×44 图标瓦片已撤（见 REDESIGN-PLAN P3 回写）。 */
.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  width: 100%;
}

/* min-width: 0 是省略号的前提：flex 子项默认 min-width: auto，不肯收缩到内容以下 */
.card-head__ident {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  min-width: 0;
}

/* 右上 ↗：点击登录的暗示。整卡可点，故是装饰而非按钮 */
.card-cue {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 32px;
  height: 32px;
  background: var(--bg-inset);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  transition:
    background var(--duration) var(--ease),
    color var(--duration) var(--ease);
}

.account-card:hover:not(.account-card--banned) .card-cue {
  background: var(--accent);
  color: var(--accent-fg);
}

.account-name {
  max-width: 100%;
  color: var(--text-primary);
  font-size: var(--text-h3);
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-id {
  max-width: 100%;
  padding: 2px var(--space-sm);
  background: var(--bg-inset);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 状态 chip · MASTER §2.4 配方 ──
   浅色下 --success 压 --success-soft 仅 3.58:1、--danger 压 --danger-soft 仅 4.41:1，
   两者都扛不住文字 → 文字一律 --text-primary，主色只留给图标与描边（非文字，3:1 即可）。 */
.status-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  max-width: 100%;
  padding: 2px var(--space-sm) 2px 6px;
  background: var(--success-soft);
  border: 1px solid var(--success);
  border-radius: var(--radius-full);
  color: var(--text-primary);
  font-size: var(--text-xs);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip__icon {
  flex: none;
  color: var(--success);
}

/* 封禁卡底已是 --danger-soft，chip 再用 soft 底会糊在一起 → 反相为 --bg-surface */
.status-chip--banned {
  background: var(--bg-surface);
  border-color: var(--danger);
}

.status-chip--banned .status-chip__icon {
  color: var(--danger);
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  width: 100%;
  margin-top: auto;
}

/* 原为 --text-tertiary，浅色 2.54:1 / 深色 3.76:1，双主题均不达标 */
.login-text {
  color: var(--text-secondary);
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 操作按钮 ──
   原为 opacity: 0，只有 hover 才现形 —— 触屏与键盘用户永远发现不了。
   改为常驻，静息态走 --text-secondary（压 --bg-surface 7.56 浅 / 5.62 深），
   语义色留到 hover/focus 再上。 */
.card-actions {
  display: flex;
  flex: none;
  gap: var(--space-xs);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.action-btn--edit:hover,
.action-btn--edit:focus-visible {
  background: var(--accent-soft);
  color: var(--accent);
}

.action-btn--ban:hover,
.action-btn--ban:focus-visible {
  background: var(--warning-soft);
  color: var(--warning);
}

.action-btn--delete:hover,
.action-btn--delete:focus-visible {
  background: var(--danger-soft);
  color: var(--danger);
}

/* ── 添加卡 ──
   用 button 而非 div：白捡键盘可达与语义 */
.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  min-height: 208px;
  padding: var(--space-lg);
  background: transparent;
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
  font-family: inherit;
  font-size: var(--text-body);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--duration) var(--ease),
    border-color var(--duration) var(--ease),
    color var(--duration) var(--ease);
}

.add-card:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

/* 全局 reduce 块只把时长压到 0.01ms，位移照样发生（只是瞬时）→ 显式取消 */
@media (prefers-reduced-motion: reduce) {
  .account-card:hover:not(.account-card--banned) {
    transform: none;
  }
}
</style>
