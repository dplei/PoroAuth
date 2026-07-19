<script setup lang="ts">
import { NButton, NConfigProvider, NGrid, NGridItem, NInputNumber, NModal, NTag } from 'naive-ui'
import { Check, Crosshair, MousePointer2, Square, Timer } from 'lucide-vue-next'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useTheme } from '../composables/useTheme'

const { naiveTheme, naiveThemeOverrides } = useTheme()

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'submit'): void }>()

const form = ref<Record<string, number>>({})

// --- POC: 录制坐标 ---
const isRecording = ref(false)
const recordingTarget = ref<'switch' | 'account' | null>(null)
const capturedCoords = ref<Array<{ relX: number; relY: number; absX: number; absY: number }>>([])

watch(
  () => props.show,
  async (newVal) => {
    if (newVal) {
      form.value = await window.api.getFlowConfig()
      capturedCoords.value = []
    } else {
      // 关闭弹窗时确保停止录制
      stopRecording()
    }
  }
)

const startRecording = async (target: 'switch' | 'account') => {
  recordingTarget.value = target
  capturedCoords.value = []

  // 注册坐标捕获监听
  window.api.onCoordinateCaptured((data) => {
    if (!data) return
    capturedCoords.value.push(data)
    // 自动填入对应字段
    if (recordingTarget.value === 'switch') {
      form.value.SWITCH_TO_PWD_LOGIN_X = data.relX
      form.value.SWITCH_TO_PWD_LOGIN_Y = data.relY
    } else if (recordingTarget.value === 'account') {
      form.value.ACCOUNT_INPUT_X = data.relX
      form.value.ACCOUNT_INPUT_Y = data.relY
    }
    // 采集一次后自动停止
    stopRecording()
  })

  const res = await window.api.startCoordinateCapture()
  if (res.success) {
    isRecording.value = true
  } else {
    window.api.offCoordinateCaptured()
    recordingTarget.value = null
    alert('录制启动失败: ' + res.error)
  }
}

const stopRecording = async () => {
  if (isRecording.value) {
    await window.api.stopCoordinateCapture()
    window.api.offCoordinateCaptured()
    isRecording.value = false
    recordingTarget.value = null
  }
}

onBeforeUnmount(() => {
  stopRecording()
})

const handleSubmit = async () => {
  await window.api.saveFlowConfig({
    SWITCH_TO_PWD_LOGIN_X: Number(form.value.SWITCH_TO_PWD_LOGIN_X),
    SWITCH_TO_PWD_LOGIN_Y: Number(form.value.SWITCH_TO_PWD_LOGIN_Y),
    ACCOUNT_INPUT_X: Number(form.value.ACCOUNT_INPUT_X),
    ACCOUNT_INPUT_Y: Number(form.value.ACCOUNT_INPUT_Y),
    SWITCH_DELAY_MS: Number(form.value.SWITCH_DELAY_MS),
    TYPE_DELAY_MS: Number(form.value.TYPE_DELAY_MS)
  })
  emit('submit')
  emit('close')
}
</script>

<template>
  <!-- abstract：只提供主题上下文，不额外产出 DOM 包裹；theme-overrides 见 useTheme.naiveThemeOverrides -->
  <n-config-provider abstract :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">
    <NModal
      :show="show"
      preset="card"
      style="width: 560px"
      :bordered="false"
      @update:show="(v) => !v && emit('close')"
    >
      <template #header>
        <span class="modal-title">坐标与时序调整</span>
      </template>
      <template #header-extra>
        <span class="modal-subtitle">手动输入或使用录制功能校正坐标</span>
      </template>

      <!-- 录制状态提示 -->
      <div v-if="isRecording" class="recording-banner">
        <div class="recording-dot"></div>
        <span>
          录制中 — 请将鼠标移到
          <strong>{{
            recordingTarget === 'switch' ? '「账号密码登录」按钮' : '账号输入框'
          }}</strong>
          上方，然后按
          <NTag size="small" type="warning" :bordered="false" style="vertical-align: middle"
            >F6</NTag
          >
          采集坐标
        </span>
        <NButton
          size="tiny"
          quaternary
          type="error"
          style="margin-left: auto"
          @click="stopRecording"
        >
          取消
        </NButton>
      </div>

      <NGrid :cols="2" :x-gap="16" :y-gap="12">
        <NGridItem :span="2">
          <div class="field-group-header">
            <MousePointer2 :size="15" class="fgh-icon" />
            <span>切换登录按钮坐标</span>
            <NButton
              class="fgh-btn"
              size="tiny"
              :type="recordingTarget === 'switch' ? 'warning' : 'primary'"
              :disabled="isRecording && recordingTarget !== 'switch'"
              @click="recordingTarget === 'switch' ? stopRecording() : startRecording('switch')"
            >
              <template #icon>
                <Square v-if="recordingTarget === 'switch'" :size="13" />
                <Crosshair v-else :size="13" />
              </template>
              {{ recordingTarget === 'switch' ? '停止' : '录制' }}
            </NButton>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="field-label">X (0~1)</div>
          <NInputNumber
            v-model:value="form.SWITCH_TO_PWD_LOGIN_X"
            :step="0.01"
            :precision="3"
            :min="0"
            :max="1"
            size="small"
            style="width: 100%"
            :disabled="isRecording"
          />
        </NGridItem>
        <NGridItem>
          <div class="field-label">Y (0~1)</div>
          <NInputNumber
            v-model:value="form.SWITCH_TO_PWD_LOGIN_Y"
            :step="0.01"
            :precision="3"
            :min="0"
            :max="1"
            size="small"
            style="width: 100%"
            :disabled="isRecording"
          />
        </NGridItem>

        <NGridItem :span="2">
          <div class="field-group-header">
            <MousePointer2 :size="15" class="fgh-icon" />
            <span>账号输入框坐标</span>
            <NButton
              class="fgh-btn"
              size="tiny"
              :type="recordingTarget === 'account' ? 'warning' : 'primary'"
              :disabled="isRecording && recordingTarget !== 'account'"
              @click="recordingTarget === 'account' ? stopRecording() : startRecording('account')"
            >
              <template #icon>
                <Square v-if="recordingTarget === 'account'" :size="13" />
                <Crosshair v-else :size="13" />
              </template>
              {{ recordingTarget === 'account' ? '停止' : '录制' }}
            </NButton>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="field-label">X (0~1)</div>
          <NInputNumber
            v-model:value="form.ACCOUNT_INPUT_X"
            :step="0.01"
            :precision="3"
            :min="0"
            :max="1"
            size="small"
            style="width: 100%"
            :disabled="isRecording"
          />
        </NGridItem>
        <NGridItem>
          <div class="field-label">Y (0~1)</div>
          <NInputNumber
            v-model:value="form.ACCOUNT_INPUT_Y"
            :step="0.01"
            :precision="3"
            :min="0"
            :max="1"
            size="small"
            style="width: 100%"
            :disabled="isRecording"
          />
        </NGridItem>

        <NGridItem :span="2" style="margin-top: var(--space-sm)">
          <div class="field-group-header">
            <Timer :size="15" class="fgh-icon" />
            <span>时序参数</span>
          </div>
        </NGridItem>
        <NGridItem>
          <div class="field-label">翻卡等待时长 (ms)</div>
          <NInputNumber
            v-model:value="form.SWITCH_DELAY_MS"
            :step="100"
            :min="0"
            size="small"
            style="width: 100%"
          />
        </NGridItem>
        <NGridItem>
          <div class="field-label">按键注入间隔 (ms)</div>
          <NInputNumber
            v-model:value="form.TYPE_DELAY_MS"
            :step="10"
            :min="0"
            size="small"
            style="width: 100%"
          />
        </NGridItem>
      </NGrid>

      <!-- 最近采集结果 -->
      <div v-if="capturedCoords.length > 0" class="capture-result">
        <div class="capture-result-title">最近采集结果</div>
        <div v-for="(c, i) in capturedCoords" :key="i" class="capture-result-item">
          <Check :size="13" class="cr-icon" />
          <span
            >相对坐标: ({{ c.relX }}, {{ c.relY }}) · 绝对坐标: ({{ c.absX }}, {{ c.absY }})</span
          >
        </div>
      </div>

      <template #footer>
        <div class="modal-actions">
          <NButton size="small" @click="emit('close')">取消</NButton>
          <NButton size="small" type="primary" :disabled="isRecording" @click="handleSubmit"
            >保存</NButton
          >
        </div>
      </template>
    </NModal>
  </n-config-provider>
</template>

<style scoped>
.modal-title {
  font-size: var(--text-h3);
  font-weight: 600;
  color: var(--text-primary);
}

.modal-subtitle {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.field-group-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid var(--border-subtle);
}

.fgh-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.fgh-btn {
  margin-left: var(--space-sm);
}

.field-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
}

/* --- Recording Banner --- */
.recording-banner {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  margin-bottom: var(--space-md);
  background: var(--warning-soft);
  border: 1px solid var(--warning);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  /* soft 底扛不住 --warning 文字（浅色 3.07:1，MASTER §2.4）→ 文字走 --text-primary */
  color: var(--text-primary);
}

.recording-banner strong {
  /* soft 底上文字一律 --text-primary（--warning 压 --warning-soft 仅 3.07:1）；强调靠字重 */
  color: var(--text-primary);
  font-weight: 700;
}

.recording-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--danger);
  flex-shrink: 0;
  animation: dotBlink 1s ease-in-out infinite;
}

@keyframes dotBlink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

/* --- Capture Result --- */
.capture-result {
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--success-soft);
  border: 1px solid var(--success);
  border-radius: var(--radius-sm);
}

.capture-result-title {
  font-size: var(--text-sm);
  font-weight: 600;
  /* soft 底扛不住 --success 文字（浅色 3.58:1）→ 文字走 --text-primary，主色只留图标 */
  color: var(--text-primary);
  margin-bottom: var(--space-xs);
}

.capture-result-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-xs);
  color: var(--text-primary);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.cr-icon {
  color: var(--success);
  flex-shrink: 0;
}
</style>
