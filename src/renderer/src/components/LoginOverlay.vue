<script setup lang="ts">
import { LoaderCircle, TriangleAlert } from 'lucide-vue-next'

defineProps<{
  show: boolean
  progress: string
  error: string
  isWaitingAnimation: boolean
}>()

defineEmits<{
  (e: 'proceed'): void
  (e: 'extend'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div v-if="show" class="login-overlay">
    <div class="login-card">
      <LoaderCircle :size="36" :stroke-width="2.5" class="spinner" aria-hidden="true" />

      <div class="login-card__heading">
        <h3 class="login-card__title">自动注入中</h3>
        <p class="progress-text" role="status">{{ progress }}</p>
      </div>

      <!-- §2.4 配方：soft 底 + text-primary 文字 + 主色图标。
           原为 --danger 字压 --danger-soft 底 —— 浅色实测仅 4.41:1，不达标。 -->
      <p v-if="error" class="error-text" role="alert">
        <TriangleAlert :size="15" class="error-text__icon" />
        {{ error }}
      </p>

      <div v-if="isWaitingAnimation && !error" class="login-card__actions">
        <button class="primary-btn" @click="$emit('proceed')">画面已就绪，立即注入！</button>
        <button class="ghost-btn" @click="$emit('extend')">延长 30s</button>
      </div>

      <button
        v-if="progress.includes('WeGame') && !error && !isWaitingAnimation"
        class="ghost-btn"
        @click="$emit('cancel')"
      >
        取消唤起
      </button>
    </div>
  </div>
</template>

<style scoped>
/* top: 48px 让出自绘标题栏 —— 遮罩没有 -webkit-app-region: drag，
   盖住标题栏会让整个等待期（最长 30s+）窗口既拖不动也关不掉。 */
.login-overlay {
  position: fixed;
  top: 48px;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--scrim);
  backdrop-filter: blur(4px);
}

/* MASTER §4.5 弹窗规格 */
.login-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
  max-width: 420px;
  padding: var(--space-xl);
  background: var(--bg-elevated);
  border: 1px solid transparent;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  text-align: center;
}

:root[data-theme='dark'] .login-card {
  border-color: var(--border-subtle);
}

/* 原为手搓 border 转圈（4px solid rgba(255,255,255,0.1)）——
   白色描边在浅色主题下整圈隐形，只剩一根 accent 弧线。改用 Lucide 现成缺口圆环。
   注：这是状态指示（功能性），非 §6 所禁的纯装饰动画。 */
.spinner {
  flex: none;
  color: var(--accent);
  animation: spin 1s linear infinite;
}

.login-card__heading {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  width: 100%;
}

.login-card__title {
  color: var(--text-primary);
  font-size: var(--text-h3);
  font-weight: 700;
}

.progress-text {
  color: var(--accent);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.5;
}

.error-text {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--danger-soft);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--text-sm);
  line-height: 1.5;
  text-align: left;
}

.error-text__icon {
  flex: none;
  color: var(--danger);
}

.login-card__actions {
  display: flex;
  gap: var(--space-sm);
  width: 100%;
  margin-top: var(--space-sm);
}

/* 原为 naive-ui NButton + 一堆行内 style（flex/border-radius/font-weight）。
   见 SetupOverlay 同段注释：naive-ui 默认绿 primary 无法在不写死 hex 的前提下对齐 --accent。 */
.primary-btn {
  display: inline-flex;
  flex: 2;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--accent-fg);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease);
}

.primary-btn:hover {
  background: var(--accent-hover);
}

.ghost-btn {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.ghost-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent);
}

/* 「取消唤起」是独生子，不在 flex 行里，别让 flex: 1 把它拉满 */
.login-card > .ghost-btn {
  flex: none;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
