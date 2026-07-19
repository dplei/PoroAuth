<script setup lang="ts">
import { NModal, NButton, NSpace, NTag, NConfigProvider } from 'naive-ui'
import { Check, Link2, X } from 'lucide-vue-next'
import { useTheme } from '../composables/useTheme'

const { naiveTheme, naiveThemeOverrides } = useTheme()

defineProps<{
  show: boolean
  driverLoaded: boolean
  wegameExePath: string | null
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'relink-driver'): void
  (e: 'relink-wegame'): void
}>()
</script>

<template>
  <!-- abstract：只提供主题上下文，不额外产出 DOM 包裹；theme-overrides 见 useTheme.naiveThemeOverrides -->
  <n-config-provider abstract :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
    <n-modal
      :show="show"
      preset="card"
      style="width: 500px"
      :bordered="false"
      @update:show="
        (val) => {
          if (!val) $emit('close')
        }
      "
    >
      <template #header>
        <span class="modal-title"><Link2 :size="18" /> 路径管理</span>
      </template>

      <!-- 驱动路径 -->
      <div class="path-item">
        <div class="path-item-header">
          <span class="path-label">底层键鼠驱动</span>
          <n-tag :type="driverLoaded ? 'success' : 'error'" size="small" :bordered="false" round>
            {{ driverLoaded ? '已就绪' : '未绑定' }}
            <template #icon>
              <Check v-if="driverLoaded" :size="13" />
              <X v-else :size="13" />
            </template>
          </n-tag>
        </div>
        <div class="path-value">
          <span v-if="driverLoaded" class="path-text">dd63330.dll · 已加载</span>
          <span v-else class="path-text muted">未绑定驱动</span>
        </div>
        <n-button size="small" class="path-action" @click="$emit('relink-driver')">
          重新选择驱动 DLL
        </n-button>
      </div>

      <!-- WeGame 路径 -->
      <div class="path-item path-item--gap">
        <div class="path-item-header">
          <span class="path-label">WeGame 可执行程序</span>
          <n-tag :type="wegameExePath ? 'success' : 'error'" size="small" :bordered="false" round>
            {{ wegameExePath ? '已关联' : '未关联' }}
            <template #icon>
              <Check v-if="wegameExePath" :size="13" />
              <X v-else :size="13" />
            </template>
          </n-tag>
        </div>
        <div class="path-value">
          <span v-if="wegameExePath" class="path-text" :title="wegameExePath">{{
            wegameExePath
          }}</span>
          <span v-else class="path-text muted">未关联 wegame.exe</span>
        </div>
        <n-button size="small" class="path-action" @click="$emit('relink-wegame')">
          重新选择 wegame.exe
        </n-button>
      </div>

      <template #footer>
        <n-space justify="end">
          <n-button @click="$emit('close')">关闭</n-button>
        </n-space>
      </template>
    </n-modal>
  </n-config-provider>
</template>

<style scoped>
.modal-title {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-h3);
  font-weight: 600;
}

.path-item {
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-inset);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.path-item--gap {
  margin-top: var(--space-md);
}

.path-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.path-label {
  font-size: var(--text-sm);
  font-weight: 600;
}

.path-value {
  min-height: 1.4rem;
}

.path-text {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  display: block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 100%;
  font-family: 'Consolas', monospace;
}

/* 空状态：靠斜体表达「未设置」，不再用 opacity（会把对比度压到不可读） */
.path-text.muted {
  font-style: italic;
}

.path-action {
  margin-top: var(--space-xs);
}
</style>
