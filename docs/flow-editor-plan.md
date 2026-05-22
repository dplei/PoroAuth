# 登录流程配置方案 — 实现计划

## 总览

提供**基础模式**与**高级模式**两种登录流程配置方式，通过「系统设置」弹窗统一管理。

| 模式 | 入口 | 适用场景 |
|------|------|---------|
| 基础模式（默认） | ⚙️ 坐标时序校正 | 只需微调点击坐标和延迟参数，快速上手 |
| 高级模式 | ⚙️ 流程录制 | 完全自定义登录步骤序列，灵活应对 WeGame 改版 |

---

## UI 结构变更

### 当前状态

```
  工具栏: [🔗 路径管理]  [⚙️ 坐标时序校正]
```

- 「路径管理」→ `PathManagementModal`（驱动 DLL + WeGame 路径）
- 「坐标时序校正」→ `FlowConfigModal`（百分比坐标 + 延迟参数）

### 改造后

```
  工具栏: [⚙️ 系统设置]
```

一个按钮入口，打开统一的「系统设置」弹窗：

```
┌──────────────────────────────────────────────────────────┐
│  ⚙️ 系统设置                                             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ 路径绑定 ──────────────────────────────────────────┐ │
│  │  底层键鼠驱动   [✓ 已就绪]         [重新选择]       │ │
│  │  WeGame 路径    D:\WeGame\wegame.exe [重新选择]       │ │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ 登录模式 ──────────────────────────────────────────┐ │
│  │                                                      │ │
│  │   (●) 基础模式 — 坐标与时序微调                      │ │
│  │       适合大多数场景，仅调整点击坐标和延迟参数         │ │
│  │                                                      │ │
│  │   (○) 高级模式 — 流程自定义编排                      │ │
│  │       自由组装登录步骤，支持录制坐标、拖拽排序         │ │
│  │                                                      │ │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ 基础模式：坐标与时序校正 ─────────────────────────┐  │
│  │  (当模式=基础时展示，等同当前 FlowConfigModal)       │  │
│  │                                                      │  │
│  │  🖱️ 切换登录按钮坐标              [📍 录制]         │  │
│  │     X: [0.470]   Y: [0.510]                          │  │
│  │                                                      │  │
│  │  🖱️ 账号输入框坐标                [📍 录制]         │  │
│  │     X: [0.500]   Y: [0.610]                          │  │
│  │                                                      │  │
│  │  ⏱️ 时序参数                                        │  │
│  │     翻卡等待: [3000] ms    按键间隔: [100] ms        │  │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│                                   [取消]  [保存]          │
└──────────────────────────────────────────────────────────┘
```

当用户切换到**高级模式**时，下方区域变为**流程编辑器**：

```
┌──────────────────────────────────────────────────────────┐
│  ⚙️ 系统设置                                             │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ 路径绑定 ──────────────────────────────────────────┐ │
│  │  (同上，始终显示)                                     │ │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ 登录模式 ──────────────────────────────────────────┐ │
│  │   (○) 基础模式     (●) 高级模式                      │ │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ 高级模式：登录流程编排 ────────────── [恢复默认] ──┐ │
│  │                                                      │ │
│  │  ⠿ 1. 🖱️ 点击 "切换账号密码登录" X=0.470 Y=0.510  │ │
│  │       [📍 重新录制]  [✏️ 手动编辑]              [🗑️] │ │
│  │                                                      │ │
│  │  ⠿ 2. ⏱️ 等待  3000ms                          [🗑️] │ │
│  │                                                      │ │
│  │  ⠿ 3. 🖱️ 点击 "点击账号输入框"   X=0.500 Y=0.610  │ │
│  │       [📍 重新录制]  [✏️ 手动编辑]              [🗑️] │ │
│  │                                                      │ │
│  │  ⠿ 4. 🔄 全选并清除                            [🗑️] │ │
│  │  ⠿ 5. ⌨️ 输入账号                              [🗑️] │ │
│  │  ⠿ 6. ⏱️ 等待  200ms                           [🗑️] │ │
│  │  ⠿ 7. ⌨️ 按键  Tab                             [🗑️] │ │
│  │  ⠿ 8. ⏱️ 等待  200ms                           [🗑️] │ │
│  │  ⠿ 9. 🔄 全选并清除                            [🗑️] │ │
│  │  ⠿ 10. 🔑 输入密码                             [🗑️] │ │
│  │  ⠿ 11. ⏱️ 等待  200ms                          [🗑️] │ │
│  │  ⠿ 12. ⌨️ 按键  Enter                          [🗑️] │ │
│  │                                                      │ │
│  │  ┌─ 添加步骤 ──────────────────────────────────┐    │ │
│  │  │ [🖱️ 点击] [⌨️ 按键] [⏱️ 等待]               │    │ │
│  │  │ [🔄 全选清除] [⌨️ 输入账号] [🔑 输入密码]     │    │ │
│  │  └─────────────────────────────────────────────┘    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
│                                   [取消]  [保存]          │
└──────────────────────────────────────────────────────────┘
```

---

## 数据模型设计

### 配置结构（ConfigManager）

```typescript
interface AppConfig {
  ddDriverDllPath: string | null
  wegameExePath: string | null

  /** 登录模式: 'basic' = 基础坐标模式, 'advanced' = 高级流程编排 */
  loginMode: 'basic' | 'advanced'

  /** 基础模式下的坐标与时序配置（现有 flowConfig） */
  flowConfig: Record<string, number> | null

  /** 高级模式下的自定义登录流程 */
  loginFlow: LoginFlow | null
}
```

### FlowStep 类型系统（高级模式）

```typescript
type FlowStep =
  | { type: 'click';            relX: number; relY: number; label?: string }
  | { type: 'selectAllAndClear' }
  | { type: 'typeAccount' }
  | { type: 'typePassword' }
  | { type: 'pressKey';         key: 'tab' | 'enter' }
  | { type: 'delay';            ms: number }

type LoginFlow = FlowStep[]
```

### 默认流程

```typescript
const DEFAULT_FLOW: LoginFlow = [
  { type: 'click',            relX: 0.47, relY: 0.51, label: '切换账号密码登录' },
  { type: 'delay',            ms: 3000 },
  { type: 'click',            relX: 0.50, relY: 0.61, label: '点击账号输入框' },
  { type: 'selectAllAndClear' },
  { type: 'typeAccount' },
  { type: 'delay',            ms: 200 },
  { type: 'pressKey',         key: 'tab' },
  { type: 'delay',            ms: 200 },
  { type: 'selectAllAndClear' },
  { type: 'typePassword' },
  { type: 'delay',            ms: 200 },
  { type: 'pressKey',         key: 'enter' }
]
```

### 执行逻辑分支

```typescript
// LoginFlowAction.executeLogin()
if (loginMode === 'basic') {
  // 使用 flowConfig 中的坐标参数，走现有硬编码逻辑（仅坐标/延迟可配）
} else {
  // 遍历 loginFlow 数组，数据驱动执行
  for (const step of loginFlow) { ... }
}
```

---

## 文件改动清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/main/services/FlowTypes.ts` | FlowStep / LoginFlow 类型定义 + DEFAULT_FLOW |
| `src/renderer/src/components/SystemSettingsModal.vue` | **系统设置弹窗**：整合路径绑定 + 模式切换 + 基础/高级面板 |

### 修改文件

| 文件 | 改动内容 |
|------|---------| 
| `src/main/services/LoginFlowAction.ts` | 根据 loginMode 分支执行，高级模式遍历 LoginFlow |
| `src/main/services/ConfigManager.ts` | AppConfig 增加 `loginMode` + `loginFlow` 字段 |
| `src/main/index.ts` | 新增 loginMode / loginFlow 相关 IPC handlers |
| `src/preload/index.ts` | 暴露新 API |
| `src/preload/index.d.ts` | 类型声明 |
| `src/renderer/src/App.vue` | 两个按钮合并为一个「⚙️ 系统设置」，移除旧弹窗引用 |

### 可移除文件（合并进 SystemSettingsModal）

| 文件 | 说明 |
|------|------|
| `src/renderer/src/components/PathManagementModal.vue` | 路径管理内容合并到系统设置中 |
| `src/renderer/src/components/FlowConfigModal.vue` | 基础模式面板合并到系统设置中 |

> 也可选择保留为子组件，在 SystemSettingsModal 中引入复用。

### 已完成文件（POC 阶段）

| 文件 | 状态 |
|------|------|
| `src/main/services/FlowRecorderService.ts` | ✅ 已实现 — GetCursorPos + globalShortcut 录制 |

---

## 动作类型清单（高级模式）

| 类型 | 图标 | 参数 | 说明 |
|------|------|------|------|
| `click` | 🖱️ | relX, relY, label? | 移到坐标并点击 |
| `delay` | ⏱️ | ms | 等待 N 毫秒 |
| `selectAllAndClear` | 🔄 | 无 | Ctrl+A → Backspace |
| `typeAccount` | ⌨️ | 无 | 注入账号明文 |
| `typePassword` | 🔑 | 无 | 注入密码明文 |
| `pressKey` | ⌨️ | key (tab/enter) | 敲击指定按键 |

---

## 向后兼容策略

| 场景 | 处理 |
|------|------|
| 无 `loginMode` 配置 | 默认 `'basic'`，行为与现有版本一致 |
| 已有 `flowConfig` | 基础模式直接使用，高级模式可从中迁移坐标到 DEFAULT_FLOW |
| 切换到高级模式但无 `loginFlow` | 使用 DEFAULT_FLOW（含默认坐标），或基于当前 flowConfig 生成 |
| 从高级切回基础 | loginFlow 保留不删除，仅切换执行路径 |

---

## 实施阶段

### ~~Phase 1: POC — 录制坐标验证~~ ✅ 已完成
- ✅ FlowRecorderService（GetCursorPos + globalShortcut）
- ✅ IPC 通道 + 前端录制按钮 
- ✅ 坐标采集与百分比反算已验证通过

### Phase 2: 系统设置弹窗 + 模式切换
- 新建 `SystemSettingsModal.vue`
- 合并路径管理 + 模式切换 Radio
- 基础模式面板（迁移现有 FlowConfigModal 内容）
- ConfigManager 增加 `loginMode` 字段
- App.vue 两个按钮合并为一个

### Phase 3: 高级模式 — 流程编辑器 UI
- 在 SystemSettingsModal 中实现高级模式面板
- 步骤列表渲染 + 拖拽排序
- 添加/删除步骤 + 内联参数编辑
- 录制坐标集成（点击步骤的「📍 录制」按钮）

### Phase 4: 数据模型 + 执行引擎
- 定义 FlowTypes
- LoginFlowAction 重构为双路径执行
- ConfigManager 增加 `loginFlow` 字段
- IPC 层更新

### Phase 5: 收尾
- 向后兼容迁移逻辑
- 旧组件清理
- 端到端测试
