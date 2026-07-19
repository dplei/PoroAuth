<script setup lang="ts">
import { CheckCircle, Sparkles, X } from 'lucide-vue-next'
const props = defineProps<{
  show: boolean
  status: 'available' | 'downloading' | 'downloaded' | 'error' | null
  updateInfo: any
  progress: any
  errorMessage: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'download'): void
  (e: 'install'): void
}>()

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatReleaseNotes = (notes: any) => {
  if (!notes) return '修复已知问题，优化体验。'
  if (typeof notes === 'string') return notes
  // If it's an array for some reason
  if (Array.isArray(notes)) {
    return notes.map((n) => n.note || n).join('\n')
  }
  return JSON.stringify(notes)
}
</script>

<template>
  <div v-if="show" class="modal-overlay" @click.self="status !== 'downloading' && emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3><Sparkles :size="20" class="title-icon" /> 发现新版本</h3>
        <button
          v-if="status !== 'downloading'"
          type="button"
          class="close-btn"
          aria-label="关闭"
          @click="emit('close')"
        >
          <X :size="20" />
        </button>
      </div>

      <div class="modal-body">
        <template v-if="updateInfo">
          <div class="version-tag">版本 v{{ updateInfo.version }}</div>

          <div v-if="status === 'available'" class="release-notes">
            <pre>{{ formatReleaseNotes(updateInfo.releaseNotes) }}</pre>
          </div>

          <div v-if="status === 'downloading' && progress" class="download-progress">
            <div class="progress-bar-container">
              <div class="progress-bar-fill" :style="{ width: progress.percent + '%' }"></div>
            </div>
            <div class="progress-stats">
              <span>{{ progress.percent.toFixed(1) }}%</span>
              <span
                >{{ formatBytes(progress.transferred) }} / {{ formatBytes(progress.total) }}</span
              >
              <span>{{ formatBytes(progress.bytesPerSecond) }}/s</span>
            </div>
          </div>

          <div v-if="status === 'downloaded'" class="success-message">
            <div class="check-circle-wrapper">
              <CheckCircle :size="52" stroke-width="1.5" class="check-icon" />
            </div>
            <p>更新包已准备就绪，重启立享新功能！</p>
          </div>

          <div v-if="status === 'error'" class="error-message">
            <p>更新过程中发生错误：</p>
            <code>{{ errorMessage }}</code>
          </div>
        </template>
      </div>

      <div class="modal-footer">
        <button
          v-if="status === 'available' || status === 'error'"
          type="button"
          class="btn"
          @click="emit('close')"
        >
          稍后再说
        </button>

        <button
          v-if="status === 'available' || status === 'error'"
          type="button"
          class="btn btn-primary"
          @click="emit('download')"
        >
          立刻下载更新
        </button>

        <button v-if="status === 'downloading'" type="button" class="btn btn-primary" disabled>
          正在下载中...
        </button>

        <button
          v-if="status === 'downloaded'"
          type="button"
          class="btn btn-primary"
          @click="emit('install')"
        >
          立即重启并安装
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 48px; /* 不盖 48px 自绘标题栏（MASTER §4.5），否则弹窗期窗口拖不动、点不到最小化/关闭 */
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--scrim);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn var(--duration-fast) var(--ease);
}

.modal-content {
  background: var(--bg-elevated);
  border: 1px solid transparent; /* 浅色占位；深色补描边拉开层级（§4.5） */
  width: 460px;
  max-width: 90vw;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  animation: slideUp var(--duration) cubic-bezier(0.16, 1, 0.3, 1);
}

:root[data-theme='dark'] .modal-content {
  border-color: var(--border-subtle);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-header {
  padding: var(--space-lg) var(--space-xl);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-primary);
  font-size: var(--text-h2);
  font-weight: 700;
}

.title-icon {
  color: var(--accent);
  flex-shrink: 0;
}

.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    color var(--duration-fast) var(--ease);
}

.close-btn:hover {
  background: var(--bg-inset);
  color: var(--text-primary);
}

.modal-body {
  padding: var(--space-lg);
}

.version-tag {
  display: inline-block;
  background: var(--accent-soft);
  color: var(--accent); /* accent 压 accent-soft 5.62/5.49 ✅（MASTER §2.4） */
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: 600;
  margin-bottom: var(--space-md);
}

.release-notes {
  background: var(--bg-inset);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  padding: var(--space-md);
  max-height: 200px;
  overflow-y: auto;
}

.release-notes pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: var(--text-body);
  color: var(--text-secondary); /* 压 --bg-inset 6.25/6.68 ✅ */
  line-height: 1.6;
}

.download-progress {
  padding: var(--space-md) 0;
}

.progress-bar-container {
  height: 8px;
  background: var(--bg-inset);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--space-sm);
}

/* 进度宽度即数据本身，transition width 属功能反馈（非 §5 装饰动画），保留 */
.progress-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius-full);
  transition: width 0.2s ease-out;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.success-message {
  text-align: center;
  padding: var(--space-lg) 0;
}

.check-circle-wrapper {
  display: inline-flex;
  margin-bottom: var(--space-md);
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.check-icon {
  color: var(--success); /* 图标（非文字），--success 达标（MASTER §2.4） */
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.4);
  }
  80% {
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.success-message p {
  color: var(--text-primary);
  font-weight: 500;
  font-size: var(--text-h3);
}

.error-message {
  background: var(--danger-soft);
  border: 1px solid transparent;
  border-left: 4px solid var(--danger);
  border-radius: var(--radius-sm);
  padding: var(--space-md);
  margin-top: var(--space-md);
}

.error-message p {
  margin: 0 0 var(--space-sm) 0;
  /* soft 底扛不住 --danger 文字（浅色 4.41:1）→ 文字走 --text-primary（MASTER §2.4） */
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: 700;
}

.error-message code {
  color: var(--text-secondary); /* 压 --danger-soft 6.91/5.36 ✅ */
  font-size: var(--text-sm);
  word-break: break-all;
}

.modal-footer {
  padding: var(--space-lg) var(--space-xl);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
}

.btn {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  font-family: inherit;
  font-size: var(--text-body);
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease),
    filter var(--duration-fast) var(--ease);
  background: var(--bg-inset);
  color: var(--text-primary);
}

.btn:hover:not(:disabled) {
  background: var(--bg-surface-hover);
  border-color: var(--border-subtle);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent);
  border-color: transparent;
  color: var(--accent-fg); /* 不继承 --text-primary：浅色下深字压靛蓝仅 3.3:1 */
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: transparent;
}
</style>
