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
        <!-- 智能粘贴：投递区。粘贴即解析成行，多行发货文本一次全进来 -->
        <div class="field">
          <label class="field__label" for="add-paste">智能识别 (支持粘贴多行发货文本)</label>
          <textarea
            id="add-paste"
            ref="firstInput"
            v-model="pasteText"
            class="paste-input"
            rows="2"
            placeholder="粘贴如: 账号----密码----大区...（支持多行，一行一个账号）"
            @paste="onPaste"
          ></textarea>
          <div class="paste-actions">
            <button
              type="button"
              class="ghost-btn ghost-btn--sm"
              :disabled="!pasteText.trim()"
              @click="parseFromTextarea"
            >
              <ScanLine :size="14" />
              解析文本
            </button>
            <button type="button" class="ghost-btn ghost-btn--sm" @click="addBlankRow">
              <Plus :size="14" />
              手动添加一行
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <p v-if="rows.length === 0" class="empty-hint">
          粘贴发货文本自动解析，或点「手动添加一行」逐条填写。解析出的每一行都可以就地修改。
        </p>

        <template v-else>
          <div class="rows__head">
            <label class="check">
              <input
                type="checkbox"
                :checked="allSelectableChecked"
                :indeterminate.prop="someSelected && !allSelectableChecked"
                :disabled="selectableCount === 0"
                @change="toggleAll(($event.target as HTMLInputElement).checked)"
              />
              <span>全选</span>
            </label>
            <span class="rows__count">已选 {{ selectedRows.length }} / {{ rows.length }}</span>
            <button
              type="button"
              class="link-btn"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              <Eye v-if="showPassword" :size="14" />
              <EyeOff v-else :size="14" />
              {{ showPassword ? '隐藏密码' : '显示密码' }}
            </button>
            <button type="button" class="link-btn" @click="rows = []">
              <Trash2 :size="14" />
              清空
            </button>
          </div>

          <ul class="rows">
            <li
              v-for="(row, idx) in rows"
              :key="row.key"
              class="row"
              :class="{ 'row--blocked': !!shownNotes[idx], 'row--error': !!row.error }"
            >
              <label class="check check--row">
                <input
                  v-model="row.selected"
                  type="checkbox"
                  :disabled="!!dupNotes[idx]"
                  :aria-label="`选择账号 ${row.account || idx + 1}`"
                />
              </label>

              <div class="row__fields">
                <div class="row__line">
                  <input
                    :ref="(el) => registerNameInput(el, idx)"
                    v-model="row.name"
                    class="text-input text-input--sm"
                    type="text"
                    placeholder="备注名称 (大区/等级等)"
                    aria-label="备注名称"
                  />
                  <button
                    type="button"
                    class="icon-btn"
                    :aria-label="`删除第 ${idx + 1} 行`"
                    @click="rows.splice(idx, 1)"
                  >
                    <X :size="14" />
                  </button>
                </div>
                <div class="row__line">
                  <input
                    v-model="row.account"
                    class="text-input text-input--sm text-input--mono"
                    type="text"
                    placeholder="账号"
                    aria-label="英雄联盟 / QQ账号"
                  />
                  <input
                    v-model="row.password"
                    class="text-input text-input--sm text-input--mono"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="密码"
                    aria-label="登录密码"
                  />
                </div>
                <p v-if="shownNotes[idx] || row.error" class="row__note">
                  <TriangleAlert :size="12" class="row__note-icon" />
                  {{ shownNotes[idx] || row.error }}
                </p>
              </div>
            </li>
          </ul>

          <p class="field__help">
            <ShieldCheck :size="13" class="field__help-icon" />
            采用硬件加密
          </p>
        </template>

        <!-- §2.4 配方：soft 底 + text-primary 文字 + 主色图标 -->
        <p v-if="error" class="error-msg" role="alert">
          <TriangleAlert :size="15" class="error-msg__icon" />
          {{ error }}
        </p>
        <p v-else-if="notice" class="notice-msg" role="status">
          <CheckCircle2 :size="15" class="notice-msg__icon" />
          {{ notice }}
        </p>

        <div class="modal__foot">
          <button type="button" class="ghost-btn" @click="$emit('close')">取消</button>
          <button
            type="submit"
            class="primary-btn"
            :disabled="isSubmitting || selectedRows.length === 0"
          >
            {{ isSubmitting ? '保存中...' : `安全保存 (${selectedRows.length})` }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Plus,
  ScanLine,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X
} from 'lucide-vue-next'
import { ref, watch, nextTick, computed } from 'vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', form: { name: string; account: string; pass: string }): void
}>()

interface DraftRow {
  key: number
  name: string
  account: string
  password: string
  selected: boolean
  error: string
}

const firstInput = ref<HTMLTextAreaElement | null>(null)
const isSubmitting = ref(false)
const error = ref('')
const notice = ref('')
const showPassword = ref(false)
const pasteText = ref('')
const rows = ref<DraftRow[]>([])
// 名册里已有的账号，开窗时拉一次，用于把重复条目提前置灰（不必等提交才被后端打回）
const existingAccounts = ref<Set<string>>(new Set())

let keySeed = 0
const nameInputs = new Map<number, HTMLInputElement>()
const registerNameInput = (el: unknown, idx: number): void => {
  if (el instanceof HTMLInputElement) nameInputs.set(idx, el)
  else nameInputs.delete(idx)
}

// ── 解析：正则与原「智能粘贴」逐字一致，只是产出多行而非单条 ──
const parseLines = (text: string): DraftRow[] => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const options: DraftRow[] = []

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
        key: keySeed++,
        name: candidateName,
        account: safeAccount,
        password: parts[1],
        selected: true,
        error: ''
      })
    }
  }
  return options
}

const appendParsed = (text: string): number => {
  const parsed = parseLines(text)
  if (parsed.length === 0) return 0
  rows.value.push(...parsed)
  error.value = ''
  notice.value = `已解析 ${parsed.length} 条，确认无误后保存`
  return parsed.length
}

// 粘贴走这条路：解析成功就吞掉这次粘贴并清空投递区；解析不出来则放行，让用户看见原文再手动改
const onPaste = (e: ClipboardEvent): void => {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!text.trim()) return
  const parsed = parseLines(text)
  if (parsed.length === 0) return
  e.preventDefault()
  rows.value.push(...parsed)
  pasteText.value = ''
  error.value = ''
  notice.value = `已解析 ${parsed.length} 条，确认无误后保存`
}

const parseFromTextarea = (): void => {
  const n = appendParsed(pasteText.value)
  if (n === 0) {
    error.value = '没能从文本里解析出账号，请检查格式或手动添加一行'
    notice.value = ''
    return
  }
  pasteText.value = ''
}

const addBlankRow = (): void => {
  rows.value.push({
    key: keySeed++,
    name: '',
    account: '',
    password: '',
    selected: true,
    error: ''
  })
  error.value = ''
  const idx = rows.value.length - 1
  nextTick(() => nameInputs.get(idx)?.focus())
}

// 以下三个数组均与 rows 同下标
// 重复：硬拦，勾选框直接禁用（名册里已有的，或本批更靠前的行已占用）
const dupNotes = computed(() =>
  rows.value.map((row, idx) => {
    const account = row.account.trim()
    if (!account) return ''
    if (existingAccounts.value.has(account)) return `账号 ${account} 已在名册中`
    const firstIdx = rows.value.findIndex((r) => r.account.trim() === account)
    return firstIdx !== -1 && firstIdx < idx ? `与第 ${firstIdx + 1} 行重复` : ''
  })
)

const missNotes = computed(() =>
  rows.value.map((row) => {
    if (!row.account.trim()) return '账号不能为空'
    if (!row.name.trim()) return '备注名不能为空'
    if (!row.password) return '密码不能为空'
    return ''
  })
)

// 提交闸门：重复或缺字段都不放行
const blockNotes = computed(() => rows.value.map((_, i) => dupNotes.value[i] || missNotes.value[i]))

// 展示用：刚点出来的空行别一上来就标红，缺字段的提示等这行动过再出
const shownNotes = computed(() =>
  rows.value.map((row, i) => {
    if (dupNotes.value[i]) return dupNotes.value[i]
    const touched = !!(row.name || row.account || row.password)
    return touched ? missNotes.value[i] : ''
  })
)

const selectedRows = computed(() => rows.value.filter((r, i) => r.selected && !blockNotes.value[i]))
const selectableCount = computed(() => blockNotes.value.filter((n) => !n).length)
const someSelected = computed(() => selectedRows.value.length > 0)
const allSelectableChecked = computed(
  () => selectableCount.value > 0 && selectedRows.value.length === selectableCount.value
)

const toggleAll = (checked: boolean): void => {
  rows.value.forEach((row, idx) => {
    if (!blockNotes.value[idx]) row.selected = checked
  })
}

watch(
  () => props.show,
  async (val): Promise<void> => {
    if (!val) return
    rows.value = []
    pasteText.value = ''
    error.value = ''
    notice.value = ''
    showPassword.value = false
    isSubmitting.value = false
    nameInputs.clear()
    nextTick(() => firstInput.value?.focus())
    try {
      const list = await window.api.getAccounts()
      existingAccounts.value = new Set(list.map((a) => a.account))
    } catch {
      existingAccounts.value = new Set()
    }
  }
)

const submit = async (): Promise<void> => {
  const picked = selectedRows.value
  if (picked.length === 0) return

  isSubmitting.value = true
  error.value = ''
  notice.value = ''
  try {
    const res = await window.api.addAccounts(
      picked.map((r) => ({ name: r.name.trim(), account: r.account.trim(), pass: r.password }))
    )
    if (!res.success) {
      error.value = res.error || '保存失败'
      return
    }

    const failed = new Set<number>()
    res.results.forEach((item, i) => {
      const row = picked[i]
      if (!row) return
      if (item.success) {
        existingAccounts.value.add(row.account.trim())
      } else {
        row.error = item.error || '保存失败'
        row.selected = false
        failed.add(row.key)
      }
    })

    const okCount = res.results.filter((r) => r.success).length
    // 成功的行从列表里撤走，失败的留在原位并带上后端给的原因
    rows.value = rows.value.filter((r) => !picked.includes(r) || failed.has(r.key))

    if (okCount > 0) emit('submit', { name: '', account: '', pass: '' })

    if (failed.size === 0) {
      emit('close')
    } else {
      error.value = `成功 ${okCount} 条，失败 ${failed.size} 条，失败项已留在列表中`
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

.text-input--sm {
  min-width: 0;
  padding: 6px 10px;
  font-size: var(--text-sm);
}

.text-input--mono {
  font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace;
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

.paste-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: 2px;
}

.empty-hint {
  padding: var(--space-md);
  background: var(--bg-inset);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  line-height: 1.6;
}

/* ── 待添加行 ── */
.rows__head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.rows__count {
  margin-right: auto;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
}

.check input {
  width: 15px;
  height: 15px;
  accent-color: var(--accent);
  cursor: pointer;
}

.check input:disabled {
  cursor: not-allowed;
}

.check--row {
  padding-top: 7px; /* 与首行输入框垂直居中对齐 */
}

.link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-family: inherit;
  font-size: var(--text-xs);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease);
}

.link-btn:hover {
  color: var(--accent);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  max-height: 240px;
  padding-right: 2px;
  overflow-y: auto;
  list-style: none;
}

.row {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: var(--bg-inset);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  transition: border-color var(--duration-fast) var(--ease);
}

.row:focus-within {
  border-color: var(--accent);
}

/* 不可提交的行（重复/缺字段）：底走 danger-soft，文字仍是 text-primary（§2.4） */
.row--blocked,
.row--error {
  background: var(--danger-soft);
  border-color: var(--danger);
}

.row__fields {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.row__line {
  display: flex;
  gap: 6px;
}

.row__line .text-input {
  flex: 1;
}

.row__note {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-primary);
  font-size: var(--text-xs);
}

.row__note-icon {
  flex: none;
  color: var(--danger);
}

.icon-btn {
  display: inline-flex;
  flex: none;
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

.icon-btn:hover {
  background: var(--bg-surface);
  color: var(--danger);
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

.error-msg,
.notice-msg {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--text-sm);
  line-height: 1.5;
}

.error-msg {
  background: var(--danger-soft);
}

.error-msg__icon {
  flex: none;
  color: var(--danger);
}

.notice-msg {
  background: var(--accent-soft);
}

.notice-msg__icon {
  flex: none;
  color: var(--accent);
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
  gap: var(--space-xs);
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

.ghost-btn:hover:not(:disabled) {
  background: var(--bg-surface-hover);
  border-color: var(--accent);
}

.ghost-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ghost-btn--sm {
  padding: 5px 10px;
  font-size: var(--text-xs);
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

@media (prefers-reduced-motion: reduce) {
  .modal-overlay,
  .modal {
    animation: none;
  }
}
</style>
