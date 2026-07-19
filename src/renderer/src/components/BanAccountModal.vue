<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <!-- abstract：只提供主题上下文，不额外产出 DOM 包裹；theme-overrides 见 useTheme.naiveThemeOverrides -->
      <n-config-provider abstract :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
        <div class="modal-header">
          <h3 class="modal-title"><ShieldBan :size="18" /> 设置防封隔离期</h3>
          <button type="button" class="close-btn" aria-label="关闭" @click="$emit('close')">
            <X :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <p class="desc-text">
            当前操作账号：<strong>{{ account?.name }}</strong
            ><br />
            设置后，账号在这个时间点解除之前，将会在大厅呈现被锁定无法选中的防误触状态。
          </p>

          <div class="form-group">
            <label class="form-label">预定解封时间点：</label>
            <n-date-picker
              v-model:value="banUntilTime"
              type="datetime"
              clearable
              placeholder="请选择解封的确切日期与时间"
              style="width: 100%"
            />
          </div>

          <div v-if="error" class="error-msg">{{ error }}</div>

          <div class="modal-footer">
            <n-button type="error" ghost class="clear-btn" @click="clearBan">清除封禁</n-button>
            <n-button @click="$emit('close')">取消</n-button>
            <n-button
              type="primary"
              :loading="isSubmitting"
              :disabled="isSubmitting"
              @click="submit"
            >
              确认设置
            </n-button>
          </div>
        </div>
      </n-config-provider>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { NDatePicker, NButton, NConfigProvider } from 'naive-ui'
import { ShieldBan, X } from 'lucide-vue-next'
import { useTheme } from '../composables/useTheme'

const { naiveTheme, naiveThemeOverrides } = useTheme()

const props = defineProps<{
  show: boolean
  account: any | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit'): void
}>()

const banUntilTime = ref<number | null>(null)
const isSubmitting = ref(false)
const error = ref('')

watch(
  () => props.show,
  (val) => {
    if (val) {
      banUntilTime.value = props.account?.bannedUntil || null
      error.value = ''
      isSubmitting.value = false
    }
  }
)

const clearBan = async () => {
  if (!props.account) return
  isSubmitting.value = true
  try {
    const res = await window.api.setBanTime(props.account.id, null)
    if (res.success) {
      emit('submit')
      emit('close')
    } else {
      error.value = res.error || '清除失败'
    }
  } catch (err: any) {
    error.value = err.message
  } finally {
    isSubmitting.value = false
  }
}

const submit = async () => {
  if (!props.account) return
  isSubmitting.value = true
  try {
    const res = await window.api.setBanTime(props.account.id, banUntilTime.value)
    if (res.success) {
      emit('submit')
      emit('close')
    } else {
      error.value = res.error || '保存失败'
    }
  } catch (err: any) {
    error.value = err.message
  } finally {
    isSubmitting.value = false
  }
}
</script>

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
  width: 90%;
  max-width: 400px;
  background: var(--bg-elevated);
  border: 1px solid transparent; /* 浅色占位；深色补描边拉开层级（§4.5） */
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-xl);
  animation: slideUp var(--duration) cubic-bezier(0.16, 1, 0.3, 1);
}

:root[data-theme='dark'] .modal-content {
  border-color: var(--border-subtle);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.modal-title {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--text-h3);
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
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

.desc-text {
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--text-secondary);
}

.desc-text strong {
  color: var(--accent);
  font-weight: 600;
}

.form-group {
  margin-top: var(--space-lg);
}

.form-label {
  display: block;
  margin-bottom: var(--space-sm);
  font-size: var(--text-body);
  color: var(--text-primary);
}

.error-msg {
  color: var(--danger);
  font-size: var(--text-sm);
  margin-top: var(--space-md);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

.clear-btn {
  margin-right: auto;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
</style>
