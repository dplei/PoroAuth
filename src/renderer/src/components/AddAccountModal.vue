<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
      <header class="modal__head">
        <h3 id="add-modal-title" class="modal__title">添加新账号</h3>
        <button type="button" class="close-btn" title="关闭" @click="$emit('close')">
          <X :size="18" />
        </button>
      </header>

      <form class="modal__body" @submit.prevent="submit">
        <!-- 智能粘贴 -->
        <div class="field">
          <label class="field__label" for="add-paste">智能识别 (支持粘贴发货文本)</label>
          <textarea
            id="add-paste"
            v-model="pasteText"
            class="paste-input"
            rows="2"
            placeholder="粘贴如: 账号----密码----大区..."
          ></textarea>
        </div>

        <div v-if="parsedAccounts.length > 0" class="parsed-list">
          <p class="parsed-list__hint">点击选择要填入的账号：</p>
          <!-- 原为 div + @click：键盘不可达。改 button 白捡可达与语义（同 P3 的 .add-card） -->
          <button
            v-for="(opt, idx) in parsedAccounts"
            :key="idx"
            type="button"
            class="parsed-item"
            @click="selectParsed(opt)"
          >
            <span class="parsed-item__main">
              <span class="parsed-item__acc">{{ opt.account }}</span>
              <span class="parsed-item__name">{{ opt.name }}</span>
            </span>
            <span v-if="opt.meta" class="parsed-item__meta">{{ opt.meta }}</span>
          </button>
        </div>

        <div class="divider"></div>

        <div class="field">
          <label class="field__label" for="add-name">备注名称 (大区/等级等)</label>
          <input
            id="add-name"
            ref="firstInput"
            v-model="form.name"
            class="text-input"
            type="text"
            required
            placeholder="请输入标识名称"
          />
        </div>

        <div class="field">
          <label class="field__label" for="add-account">英雄联盟 / QQ账号</label>
          <input
            id="add-account"
            v-model="form.account"
            class="text-input"
            type="text"
            required
            placeholder="请输入账号"
          />
        </div>

        <div class="field">
          <label class="field__label" for="add-password">登录密码</label>
          <div class="password-wrapper">
            <input
              id="add-password"
              v-model="form.password"
              class="text-input"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="请输入密码"
              aria-describedby="add-password-help"
            />
            <button
              type="button"
              class="eye-btn"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <Eye v-if="showPassword" :size="17" />
              <EyeOff v-else :size="17" />
            </button>
          </div>
          <p id="add-password-help" class="field__help">
            <ShieldCheck :size="13" class="field__help-icon" />
            采用硬件加密
          </p>
        </div>

        <!-- §2.4 配方：soft 底 + text-primary 文字 + 主色图标。
             原为 --danger 裸字，浅色下压白底 4.83:1 尚可，但压 --danger-soft 只有 4.41:1。 -->
        <p v-if="error" class="error-msg" role="alert">
          <TriangleAlert :size="15" class="error-msg__icon" />
          {{ error }}
        </p>

        <div class="modal__foot">
          <button type="button" class="ghost-btn" @click="$emit('close')">取消</button>
          <button type="submit" class="primary-btn" :disabled="isSubmitting">
            {{ isSubmitting ? '保存中...' : '安全保存' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Eye, EyeOff, ShieldCheck, TriangleAlert, X } from 'lucide-vue-next'
import { ref, reactive, watch, nextTick, computed } from 'vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', form: { name: string; account: string; pass: string }): void
}>()

const firstInput = ref<HTMLInputElement | null>(null)
const isSubmitting = ref(false)
const error = ref('')
const showPassword = ref(false)

// Intelligent Paste Logic
const pasteText = ref('')
const parsedAccounts = computed(() => {
  const lines = pasteText.value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const options: Array<{ account: string; password: string; name: string; meta: string }> = []

  for (const line of lines) {
    // 提前清洗掉那些工作室自带的前缀词（如 账号信息：、密码:、大区： 等）
    const cleanLine = line.replace(/(账号信息|账号|密码|游戏密码|大区|等级|角色|游戏名)[:：]?\s*/g, '')

    // 采用宽泛的正则切片，支持多种乱七八糟的卖号文本间隔格式 (包括横杠、等号、竖线、逗号、空格)
    // 注意：如果是类似 Yasuo#123，不要把 # 给切断掉
    const parts = cleanLine.split(/[-=｜|,\s]+/).filter(Boolean)

    // 如果起码能提炼出账号和密码两个单元
    if (parts.length >= 2) {
      // 在原文本中嗅探是否有 Riot 规范的类似 艾欧尼亚巅峰#123 这种格式的角色 ID
      const riotIdMatch = cleanLine.match(/([^\s|=-]+#[A-Za-z0-9]+)/)

      let candidateName = '未命名账号'
      if (riotIdMatch) {
         candidateName = riotIdMatch[1]
      } else if (parts.length > 2) {
         candidateName = parts[2]
      }

      // 保险起见，强制剔除账号残留的一切非数字字符 (如标点符号等)
      const safeAccount = parts[0].replace(/[^\d]/g, '')

      options.push({
        account: safeAccount,
        password: parts[1],
        name: candidateName,
        meta: parts.slice(3).join(' ✧ ')
      })
    }
  }
  return options
})

const selectParsed = (opt: any) => {
  form.account = opt.account
  form.password = opt.password
  form.name = opt.name
  pasteText.value = '' // Click -> clear
}

const form = reactive({
  name: '',
  account: '',
  password: ''
})

watch(
  () => props.show,
  (val) => {
    if (val) {
      form.name = ''
      form.account = ''
      form.password = ''
      pasteText.value = ''
      error.value = ''
      showPassword.value = false
      isSubmitting.value = false
      nextTick(() => {
        firstInput.value?.focus()
      })
    }
  }
)

const submit = async () => {
  if (!form.name || !form.account || !form.password) return
  isSubmitting.value = true
  try {
    const res = await window.api.addAccount(form.name, form.account, form.password)
    if (res.success) {
      emit('submit', { name: form.name, account: form.account, pass: form.password })
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
/* top: 48px 让出自绘标题栏（遮罩自身无 -webkit-app-region: drag，盖住就拖不动窗口了） */
.modal-overlay {
  position: fixed;
  top: 48px;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--scrim);
  backdrop-filter: blur(4px);
  animation: fadeIn var(--duration-fast) var(--ease);
}

/* MASTER §4.5 弹窗规格。原为 .glass + 写死的 rgba(30,41,59,0.8) 深蓝底。 */
.modal {
  width: 100%;
  max-width: 500px;
  max-height: 100%;
  padding: var(--space-xl);
  background: var(--bg-elevated);
  border: 1px solid transparent;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow-y: auto;
  animation: slideUp var(--duration) var(--ease);
}

:root[data-theme='dark'] .modal {
  border-color: var(--border-subtle);
}

.modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.modal__title {
  color: var(--text-primary);
  font-size: var(--text-h2);
  font-weight: 700;
  letter-spacing: -0.01em;
}

/* 原为 &times; 字符 + 不存在的 .btn-icon 类（main.css 里从来没定义过） */
.close-btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: var(--radius-full);
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

.modal__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.divider {
  height: 1px;
  background: var(--border-subtle);
}

/* ── 表单 ── */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 500;
}

/* 焦点环交给全局 *:focus-visible（outline 2px var(--accent)），此处只补描边变色。
   原为写死的 box-shadow: 0 0 0 2px rgba(99,102,241,0.2)。 */
.text-input,
.paste-input {
  width: 100%;
  padding: 10px var(--space-md);
  background: var(--bg-inset);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--text-body);
  transition: border-color var(--duration-fast) var(--ease);
}

.text-input:focus,
.paste-input:focus {
  border-color: var(--accent);
}

.text-input::placeholder,
.paste-input::placeholder {
  color: var(--text-tertiary); /* MASTER §2.1：tertiary 仅装饰/占位，此处正是占位 */
}

/* 虚线 + accent 底：暗示这是「往里丢东西」的投递区，与下方常规字段区分 */
.paste-input {
  background: var(--accent-soft);
  border: 1px dashed var(--accent);
  resize: vertical;
  font-size: var(--text-sm);
}

.paste-input:focus {
  border-style: solid;
}

.parsed-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

/* 原为 #10b981 绿字，且是个没有 for 的空 label */
.parsed-list__hint {
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.parsed-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-inset);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.parsed-item:hover {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.parsed-item__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.parsed-item__acc {
  color: var(--text-primary);
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
  font-size: var(--text-sm);
  font-weight: 600;
}

/* --accent 压 --accent-soft 实测 5.62 浅 / 5.49 深 —— 唯一能承载文字的 soft 组合（§2.4） */
.parsed-item__name {
  flex: none;
  padding: 2px 6px;
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: 600;
}

.parsed-item__meta {
  color: var(--text-secondary);
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-wrapper .text-input {
  padding-right: 40px;
}

/* 原带 tabindex="-1"：键盘用户永远够不到「显示密码」。改为可聚焦 + aria-pressed 播报状态 */
.eye-btn {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease);
}

.eye-btn:hover {
  color: var(--text-primary);
}

/* 原为 #10b981 绿字 + 行内 style="font-size: 0.7rem"（11.2px，破 §2.2 的 12px 下限） */
.field__help {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.field__help-icon {
  flex: none;
  color: var(--success);
}

.error-msg {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  background: var(--danger-soft);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--text-sm);
  line-height: 1.5;
}

.error-msg__icon {
  flex: none;
  color: var(--danger);
}

.modal__foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

/* ── 按钮 ──
   原走 main.css 的 .btn / .btn-primary 兼容类，那两个类 P7 会随别名一并清理 → 就地 token 化。 */
.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.primary-btn {
  background: var(--accent);
  border: none;
  color: var(--accent-fg); /* 不可继承 --text-primary：浅色下深字压靛蓝仅 3.3:1 */
}

.primary-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ghost-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  color: var(--text-primary);
  font-weight: 500;
}

.ghost-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent);
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
