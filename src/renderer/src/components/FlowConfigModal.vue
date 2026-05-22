<script setup lang="ts">
import { NButton, NGrid, NGridItem, NInputNumber, NModal, NTag } from 'naive-ui'
import { onBeforeUnmount, ref, watch } from 'vue'

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
  <NModal
    :show="show"
    @update:show="(v) => !v && emit('close')"
    preset="card"
    style="width: 560px"
    :bordered="false"
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
        <NTag size="small" type="warning" :bordered="false" style="vertical-align: middle">F6</NTag>
        采集坐标
      </span>
      <NButton size="tiny" quaternary type="error" @click="stopRecording" style="margin-left: auto">
        取消
      </NButton>
    </div>

    <NGrid :cols="2" :x-gap="16" :y-gap="12">
      <NGridItem :span="2">
        <div class="field-group-header">
          🖱️ 切换登录按钮坐标
          <NButton
            size="tiny"
            :type="recordingTarget === 'switch' ? 'warning' : 'primary'"
            :disabled="isRecording && recordingTarget !== 'switch'"
            @click="recordingTarget === 'switch' ? stopRecording() : startRecording('switch')"
            style="margin-left: 8px"
          >
            {{ recordingTarget === 'switch' ? '⏹ 停止' : '📍 录制' }}
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
          🖱️ 账号输入框坐标
          <NButton
            size="tiny"
            :type="recordingTarget === 'account' ? 'warning' : 'primary'"
            :disabled="isRecording && recordingTarget !== 'account'"
            @click="recordingTarget === 'account' ? stopRecording() : startRecording('account')"
            style="margin-left: 8px"
          >
            {{ recordingTarget === 'account' ? '⏹ 停止' : '📍 录制' }}
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

      <NGridItem :span="2" style="margin-top: 8px">
        <div class="field-group-header">⏱️ 时序参数</div>
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
        ✅ 相对坐标: ({{ c.relX }}, {{ c.relY }}) · 绝对坐标: ({{ c.absX }}, {{ c.absY }})
      </div>
    </div>

    <template #footer>
      <div class="modal-actions">
        <NButton size="small" @click="emit('close')">取消</NButton>
        <NButton size="small" type="primary" :disabled="isRecording" @click="handleSubmit">保存</NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.modal-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.modal-subtitle {
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
}

.field-group-header {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary, #e2e8f0);
  display: flex;
  align-items: center;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.field-label {
  font-size: 0.78rem;
  color: var(--text-secondary, #94a3b8);
  margin-bottom: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* --- Recording Banner --- */
.recording-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  background: rgba(250, 204, 21, 0.08);
  border: 1px solid rgba(250, 204, 21, 0.25);
  border-radius: 8px;
  font-size: 0.82rem;
  color: #fbbf24;
  animation: bannerPulse 2s ease-in-out infinite;
}

.recording-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
  animation: dotBlink 1s ease-in-out infinite;
}

@keyframes dotBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes bannerPulse {
  0%, 100% { box-shadow: 0 0 4px rgba(250, 204, 21, 0.1); }
  50% { box-shadow: 0 0 12px rgba(250, 204, 21, 0.2); }
}

/* --- Capture Result --- */
.capture-result {
  margin-top: 16px;
  padding: 10px 14px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 8px;
}

.capture-result-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: #10b981;
  margin-bottom: 6px;
}

.capture-result-item {
  font-size: 0.76rem;
  color: #6ee7b7;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
</style>
