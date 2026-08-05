# 登录流程配置方案 — 实现计划

## 总览

提供**基础模式**与**高级模式**两种登录流程配置方式，通过「系统设置」弹窗统一管理。

| 模式 | 入口 | 适用场景 |
|------|------|---------|
| 基础模式（默认） | 系统设置 → 登录流程 → 基础模式 | 只需微调点击坐标和延迟参数，快速上手 |
| 高级模式 | 系统设置 → 登录流程 → 高级模式 | 完全自定义登录步骤序列，灵活应对 WeGame 改版 |

---

## 2.0 代码基线核验

本计划已按当前 `package.json` 版本 **2.0.1** 的代码重新核验。以下是旧计划与现状的真实对应关系：

| 当前文件 / 能力 | 2.0 现状 | 对后续计划的影响 |
|-----------------|----------|------------------|
| `src/main/services/ConfigManager.ts` | 存在；配置仅有 `ddDriverDllPath`、`wegameExePath`、`flowConfig`，通过 `set()` 单字段立即写盘 | 增加配置版本、`loginMode`、`loginFlow` 和整份更新能力；加载时统一补默认值 |
| `src/main/services/LoginFlowAction.ts` | 存在；当前只有硬编码基础流程，通过 `CONFIG` 合并默认坐标及时序 | 保留基础执行路径并拆出高级执行器；`TYPE_DELAY_MS` 当前未传给 `typeString()`，重构时一并接通 |
| `src/main/services/FlowRecorderService.ts` | 已完成 F6 全局热键、相对坐标计算和事件广播 | **复用，不重写**；只调整 renderer/preload 的监听清理方式 |
| `src/main/services/DDDriverService.ts` | `tryLoadDriver(customPath?)` 支持传入路径，但驱动一旦初始化会直接返回，不支持会话内热重载 | 已加载状态下更换 DLL 只能校验文件并保存，UI 必须提示“重启后生效” |
| `src/main/index.ts` | 现有 IPC 均直接注册在入口文件；路径选择会立即持久化，驱动选择还会立即加载 | 新增设置快照/草稿保存 IPC；保留首启流程使用的旧即时绑定 API，避免破坏 `SetupOverlay` |
| `src/preload/index.ts` / `index.d.ts` | 已暴露路径、基础参数、登录和录制 API，但部分参数使用 `any`，录制清理使用 `removeAllListeners` | 增加共享类型和精确返回值；录制订阅改为返回单个 unsubscribe，避免误删其他监听 |
| `src/renderer/src/App.vue` | 仍分别管理 `PathManagementModal` 与 `FlowConfigModal`，路径状态保存在 App 层 | 改为单个 `SystemSettingsModal`；保存后用设置结果刷新 App 的运行状态 |
| `PathManagementModal.vue` | 已完成 2.0 token 化、Lucide 化和 naive-ui 主题接入 | 提取为无弹窗外壳的 `EnvironmentSettingsPanel`，保留现有状态行视觉语言 |
| `FlowConfigModal.vue` | 已完成 2.0 token 化；组件内部同时负责读取、录制、保存和弹窗外壳 | 提取为受控 `BasicFlowEditor`；读取/保存移到设置外壳，录制生命周期抽为 composable |
| `SetupOverlay.vue` | 继续调用 `selectAndLoadDriver()` / `selectWegameExe()` 完成首次绑定 | 本期默认不改；新设置 API 与旧首启 API 并存，后续再决定是否统一 |
| `useTheme.ts` / `assets/main.css` | 双主题、View Transition、naive overrides、弹窗遮罩和全局焦点环均已落地 | 直接复用，不另建主题系统；新页面不得新增硬编码颜色或重复主题状态 |
| `tsconfig.node.json` / `tsconfig.web.json` / `electron.vite.config.ts` | 当前均未包含或声明 `src/shared` | 若建立共享设置类型，必须同步 include 与 `@shared` alias，否则旧计划会直接编译失败 |

此外，当前项目没有自动化测试脚本；本计划的验证以 `typecheck`、`build`、纯函数校验用例和真实 Electron 交互矩阵为主，不假定已有测试基础设施。

---

## UI 结构变更

### 设计结论

参考 [CC Switch 的设置页](https://github.com/farion1231/cc-switch/blob/main/docs/user-manual/zh/1-getting-started/1.5-settings.md)，采用“**单一设置入口 + 按任务域分 Tab**”的方向，但不照搬其较多的 Tab 数量。PoroAuth 当前只有两个稳定任务域，因此一级导航只保留：

1. **环境与路径**：驱动 DLL、WeGame 路径及就绪状态。
2. **登录流程**：运行模式、坐标时序和高级流程编排。

基础/高级是同一个登录流程的**执行模式**，不是两个独立设置域，因此在“登录流程”Tab 内使用分段选择器，不再作为一级 Tab。

### 方案比较

| 方案 | 优点 | 局限 | 结论 |
|------|------|------|------|
| 顶部横向 Tab | 轻量、直观，适合 2～4 个稳定分类 | 分类过多时横向空间不足 | **本期采用** |
| 左侧设置导航 | 扩展性强，适合 5 个以上分类和较长标题 | 对当前两类设置偏重，占用 900px 主窗口的横向空间 | 作为未来扩展方案 |
| 折叠面板 / Accordion | 实现简单，可在同页快速浏览 | 高级流程很长，仍会形成纵向堆叠；折叠状态增加认知负担 | 不采用 |
| 继续保留两个独立弹窗 | 每个弹窗内容单一 | 入口分散，未来设置继续增加时工具栏会膨胀 | 不采用 |

当一级分类增长到 5 个以上时，可将 `SystemSettingsModal` 的顶部 Tab 换成左侧导航；各设置面板保持独立组件，迁移时无需重写内容。

### 设计系统约束

后续主题、组件与交互不在本计划中另起一套规范，优先级固定为：

1. [`design-system/poroauth/pages/system-settings.md`](../design-system/poroauth/pages/system-settings.md)（系统设置页专属覆盖）
2. [`design-system/poroauth/MASTER.md`](../design-system/poroauth/MASTER.md)（全局事实源）
3. 当前 2.0 已落地的 `useTheme.ts`、`main.css` 和 naive-ui `theme-overrides`

本页面不新增颜色 token，不把主题写入 `AppConfig`，不使用 emoji 或手写 SVG。所有图标使用 `lucide-vue-next`，所有颜色、间距、圆角、阴影和动效只消费现有语义 token。

### 当前状态

```
工具栏: [路径管理 / Link2]  [坐标时序校正 / Settings]  [主题 / Moon 或 Sun]
```

- 「路径管理」→ `PathManagementModal`（驱动 DLL + WeGame 路径）
- 「坐标时序校正」→ `FlowConfigModal`（百分比坐标 + 延迟参数）

### 改造后入口

```
工具栏: [系统设置 / Settings]  [主题 / Moon 或 Sun]
```

主题切换仍保留为高频快捷操作，不塞入设置页；原来的路径和坐标入口合并为“系统设置”。

### 系统设置外壳

```text
┌────────────────────────────────────────────────────────────────────┐
│  系统设置 / Settings                                      [关闭 / X]│
│  配置运行环境与账号登录流程                                      │
├────────────────────────────────────────────────────────────────────┤
│  [ 环境与路径 ]   [ 登录流程 ]                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│                     当前 Tab 的独立内容区                          │
│                     内容区内部滚动                                 │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  ● 有未保存的更改                           [取消]  [保存设置]     │
└────────────────────────────────────────────────────────────────────┘
```

- 基于现有 900 × 670 主窗口，系统设置页按页面级规范覆盖通用 500px 弹窗宽度：`width: min(820px, calc(100vw - 40px))`，`max-height: calc(100vh - 88px)`。
- 使用 `NModal preset="card"` + `NConfigProvider abstract`；一级导航使用可访问的 `NTabs type="line"`，执行模式才使用 MASTER §4.2 的胶囊分段控件。
- 标题、Tab 和底部操作区固定，只有中间内容区滚动，避免高级流程较长时保存按钮离开视野。
- 记住用户最近访问的 Tab；首次打开默认进入“登录流程”（更常用），环境未就绪时改为进入“环境与路径”。
- 切换 Tab 或执行模式不丢弃草稿；仅在关闭或取消且存在修改时，提示是否放弃。

### Tab 1：环境与路径

```text
┌─ 运行环境 ───────────────────────────────────────────────────────┐
│  底层键鼠驱动                                                    │
│  [已就绪 / CircleCheck]  D:\...\dd.dll              [重新选择]   │
│                                                                  │
│  WeGame 可执行程序                                               │
│  [已绑定 / CircleCheck]  D:\WeGame\wegame.exe       [重新选择]   │
└──────────────────────────────────────────────────────────────────┘
```

- 用两行设置项替代多层卡片，每行只保留“名称、状态、路径、操作”。
- 长路径单行省略，悬停显示完整值；错误状态在本行展示原因和修复动作。
- 路径选择先写入弹窗草稿，点击“保存设置”后再持久化，保证“取消”语义真实有效。
- 驱动尚未加载时，保存前调用 `tryLoadDriver(stagedPath)`，成功后才写盘；驱动已加载且路径发生变化时，因 2.0 服务不支持热重载，只做文件校验并明确显示“重启后生效”。
- 保留 `SetupOverlay` 使用的 `selectAndLoadDriver` / `selectWegameExe` 即时绑定 API；系统设置新增 picker + save API，避免首启流程被连带改坏。

### Tab 2：登录流程

```text
┌──────────────────────────────────────────────────────────────────┐
│  执行模式                     [ 基础模式 | 高级模式 ]            │
│  基础模式适合常规校正；高级模式可完全编排登录步骤。               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  模式对应的编辑器内容                                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

模式选择器下方只渲染当前模式的编辑器，避免同时展示两套配置。

#### 基础模式

```text
切换登录按钮                         [录制坐标]
X [0.470]     Y [0.510]

账号输入框                           [录制坐标]
X [0.500]     Y [0.610]

时序
翻卡等待 [3000] ms     按键间隔 [100] ms
```

- 保留当前 `FlowConfigModal` 能力，但去掉独立弹窗外壳和重复卡片边框。
- 坐标 X/Y 在桌面宽度允许时同行展示；录制状态就地替换按钮，不额外插入大块提示。
- 当前录制失败使用浏览器 `alert()`；改造后统一改为应用内 message 或字段内反馈，并确保切 Tab、切模式和关窗都会停止 F6 捕获。

#### 高级模式

```text
登录流程                                        [恢复默认]

[GripVertical]  1  点击 · 切换账号密码登录  X 0.470 Y 0.510  [编辑] [删除]
[GripVertical]  2  等待                    3000 ms            [编辑] [删除]
[GripVertical]  3  点击 · 账号输入框        X 0.500 Y 0.610  [编辑] [删除]
[GripVertical]  4  全选并清除                                  [删除]
   ...

[添加步骤 / Plus]
```

- 步骤默认使用紧凑单行摘要；仅正在编辑的步骤展开参数，避免 12 个步骤全部展开造成信息噪声。
- 拖拽句柄、序号和动作类型形成稳定的左侧视觉列；编辑和删除为行尾次级操作。
- “添加步骤”打开小型动作菜单，不在页面底部常驻六个同权按钮。
- “恢复默认”和删除属于破坏性操作，执行前确认；恢复默认只改草稿，仍需保存才生效。

### 保存与状态规则

- 弹窗打开时创建一份 `SettingsDraft`，两个 Tab 共用；“保存设置”一次提交路径、模式、基础参数和高级流程。
- renderer 做即时提示，main 在写盘前再次做权威校验：路径可访问、坐标范围为 `0～1`、等待和输入间隔在允许范围内、动作类型/按键在白名单内，高级流程包含账号与密码注入动作。
- 保存成功后返回新的设置快照、驱动运行态和 `driverRestartRequired`；App 据此刷新状态。保存失败时保留草稿并定位到首个错误所在 Tab。
- 模式切换只修改 `loginMode`，另一模式的数据继续保留，切回时可恢复原编辑结果。

---

## 数据模型设计

### 配置结构（ConfigManager）

```typescript
type LoginMode = 'basic' | 'advanced'

interface BasicFlowConfig {
  // 保留 2.0 已落盘的键名，避免无必要的数据迁移
  SWITCH_TO_PWD_LOGIN_X: number
  SWITCH_TO_PWD_LOGIN_Y: number
  ACCOUNT_INPUT_X: number
  ACCOUNT_INPUT_Y: number
  SWITCH_DELAY_MS: number
  TYPE_DELAY_MS: number
}

interface AppConfig {
  schemaVersion: 2
  ddDriverDllPath: string | null
  wegameExePath: string | null
  loginMode: LoginMode
  flowConfig: BasicFlowConfig
  loginFlow: LoginFlow
}

interface SettingsSnapshot {
  settings: AppConfig
  runtime: {
    driverLoaded: boolean
  }
}

interface SaveSettingsResult {
  success: boolean
  snapshot?: SettingsSnapshot
  driverRestartRequired?: boolean
  fieldErrors?: Record<string, string>
  error?: string
}
```

- `ConfigManager.loadConfig()` 将旧文件规范化为完整 `AppConfig`；缺少字段时补默认值，不再让 renderer 处理 `null` 和半成品对象。
- `ConfigManager.update(nextConfig)` 在 main 侧校验后一次写盘；任一校验或驱动首次加载失败都不更新当前配置。
- 主题不进入此结构，继续由 `useTheme.ts` 的 `poro-theme` localStorage 单独管理。

### FlowStep 类型系统（高级模式）

```typescript
interface FlowStepBase {
  /** Vue 排序与编辑使用的稳定键；执行器忽略 */
  id: string
}

type FlowStep =
  | (FlowStepBase & { type: 'click'; relX: number; relY: number; label?: string })
  | (FlowStepBase & { type: 'selectAllAndClear' })
  | (FlowStepBase & { type: 'typeAccount'; intervalMs: number })
  | (FlowStepBase & { type: 'typePassword'; intervalMs: number })
  | (FlowStepBase & { type: 'pressKey'; key: 'tab' | 'enter' })
  | (FlowStepBase & { type: 'delay'; ms: number })

interface LoginFlow {
  version: 1
  steps: FlowStep[]
}
```

高级流程只保存“注入账号/密码”的动作引用，不保存真实凭据；执行时仍由 `AccountManager` 解密当前账号并临时传入执行器。

### 默认流程

```typescript
function createDefaultFlow(basic: BasicFlowConfig): LoginFlow {
  return {
    version: 1,
    steps: [
      { id: 'switch-login', type: 'click', relX: basic.SWITCH_TO_PWD_LOGIN_X, relY: basic.SWITCH_TO_PWD_LOGIN_Y, label: '切换账号密码登录' },
      { id: 'switch-wait', type: 'delay', ms: basic.SWITCH_DELAY_MS },
      { id: 'focus-account', type: 'click', relX: basic.ACCOUNT_INPUT_X, relY: basic.ACCOUNT_INPUT_Y, label: '点击账号输入框' },
      { id: 'clear-account', type: 'selectAllAndClear' },
      { id: 'type-account', type: 'typeAccount', intervalMs: basic.TYPE_DELAY_MS },
      { id: 'account-wait', type: 'delay', ms: 200 },
      { id: 'focus-password', type: 'pressKey', key: 'tab' },
      { id: 'password-wait', type: 'delay', ms: 200 },
      { id: 'clear-password', type: 'selectAllAndClear' },
      { id: 'type-password', type: 'typePassword', intervalMs: basic.TYPE_DELAY_MS },
      { id: 'submit-wait', type: 'delay', ms: 200 },
      { id: 'submit', type: 'pressKey', key: 'enter' }
    ]
  }
}
```

首次从旧配置生成高级流程时，使用已保存的 `flowConfig` 坐标与时序，不用固定坐标覆盖用户 2.0 之前的校正结果。

### 执行逻辑分支

```typescript
// LoginFlowAction.executeLogin()
if (loginMode === 'basic') {
  await executeBasicFlow(account, password, flowConfig)
} else {
  validateLoginFlow(loginFlow)
  await executeAdvancedFlow(account, password, loginFlow.steps)
}
```

- 基础执行器显式把 `TYPE_DELAY_MS` 传给两次 `ddDriver.typeString()`，修正 2.0 中该设置展示但实际未被消费的问题。
- 高级执行器使用穷尽 `switch` 处理动作；renderer 输入不可信，执行前必须再次调用 main 侧校验。

---

## 文件改动清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `src/shared/settings.ts` | 主进程、preload、renderer 共用的 AppConfig、BasicFlowConfig、LoginFlow、快照和校验类型 |
| `src/renderer/src/components/settings/SystemSettingsModal.vue` | 设置弹窗外壳：Tab、草稿、统一校验、保存和脏状态提示 |
| `src/renderer/src/components/settings/EnvironmentSettingsPanel.vue` | “环境与路径”Tab 内容 |
| `src/renderer/src/components/settings/LoginFlowSettingsPanel.vue` | “登录流程”Tab 内容与基础/高级模式切换 |
| `src/renderer/src/components/settings/BasicFlowEditor.vue` | 从现有坐标时序弹窗中提取的基础模式编辑器 |
| `src/renderer/src/components/settings/AdvancedFlowEditor.vue` | 高级步骤列表、排序、增删和单行展开编辑 |
| `src/renderer/src/composables/useCoordinateRecorder.ts` | 封装 F6 录制状态、单监听退订和卸载/切页清理，供基础与高级编辑器复用 |
| `design-system/poroauth/pages/system-settings.md` | **已新增**：系统设置页面级 UI/UX 事实源，覆盖通用弹窗宽度 |

### 修改文件

| 文件 | 改动内容 |
|------|---------|
| `tsconfig.node.json` | `include` 增加 `src/shared/**/*`，声明 `@shared/*` 路径 |
| `tsconfig.web.json` | `include` 增加 `src/shared/**/*`，声明 `@shared/*` 路径 |
| `electron.vite.config.ts` | main/preload/renderer 统一增加 `@shared` alias，保证构建期解析一致 |
| `src/main/services/LoginFlowAction.ts` | 拆分基础/高级执行器；接通 `TYPE_DELAY_MS`；执行高级流程前权威校验 |
| `src/main/services/ConfigManager.ts` | 改用共享 AppConfig；增加规范化迁移、完整快照与一次写盘的 `update()` |
| `src/main/index.ts` | 增加设置读取/保存、纯路径 picker 和校验 IPC；保留首启即时绑定 handler |
| `src/preload/index.ts` | 暴露 typed settings API；坐标事件订阅返回独立 unsubscribe |
| `src/preload/index.d.ts` | 从 `@shared/settings` 引入类型，移除本功能相关 `any` |
| `src/renderer/src/App.vue` | 两个入口合并为 `Settings`；挂载全局 `naiveThemeOverrides`；保存后刷新环境状态 |
| `design-system/poroauth/MASTER.md` | **已修改**：加入系统设置页面级规范索引，不改既有 token |

### 重构后移除文件

| 文件 | 说明 |
|------|------|
| `src/renderer/src/components/PathManagementModal.vue` | 内容迁移到 `EnvironmentSettingsPanel.vue`，不保留第二层弹窗 |
| `src/renderer/src/components/FlowConfigModal.vue` | 内容迁移到 `BasicFlowEditor.vue`，不保留第二层弹窗 |

> 不把所有模板直接合并进 `SystemSettingsModal.vue`。外壳只负责导航和保存，各 Tab 保持独立组件，避免形成新的巨型设置组件。

### 明确无需修改

| 文件 | 原因 |
|------|------|
| `src/main/services/FlowRecorderService.ts` | 2.0 的 F6 捕获、坐标换算和广播已经完整；问题在 renderer 监听生命周期 |
| `src/main/services/DDDriverService.ts` | 复用现有 `tryLoadDriver(customPath?)`；已加载时由设置保存结果提示重启，不尝试危险热卸载 |
| `src/renderer/src/components/SetupOverlay.vue` | 继续使用旧即时绑定 API，避免本功能扩大到首启流程 |
| `src/renderer/src/composables/useTheme.ts` | 已提供双主题、View Transition 和 naive overrides；新页面直接消费 |
| `src/renderer/src/assets/main.css` | 已有 token、48px NModal 遮罩、焦点环和 reduced-motion 兜底；页面差异放 scoped CSS |

### 已完成文件（POC 阶段）

| 文件 | 状态 |
|------|------|
| `src/main/services/FlowRecorderService.ts` | 已实现 — GetCursorPos + globalShortcut 录制 |

---

## 动作类型清单（高级模式）

| 类型 | 图标 | 参数 | 说明 |
|------|------|------|------|
| `click` | `MousePointer2` | relX, relY, label? | 移到坐标并点击 |
| `delay` | `Timer` | ms | 等待 N 毫秒 |
| `selectAllAndClear` | `Eraser` | 无 | Ctrl+A → Backspace |
| `typeAccount` | `UserRound` | intervalMs | 注入账号明文 |
| `typePassword` | `KeyRound` | intervalMs | 注入密码明文 |
| `pressKey` | `Keyboard` | key (tab/enter) | 敲击指定按键 |

---

## 向后兼容策略

| 场景 | 处理 |
|------|------|
| 无 `schemaVersion` / `loginMode` | 识别为 2.0 旧配置，补 `schemaVersion: 2` 与 `loginMode: 'basic'` |
| 已有部分 `flowConfig` | 与 `DEFAULT_BASIC_FLOW_CONFIG` 合并，保留用户已校正字段 |
| 无 `loginFlow` | 由合并后的 `flowConfig` 生成 v1 默认流程，不使用固定坐标覆盖用户结果 |
| 从高级切回基础 | `loginFlow` 保留不删除，仅切换执行路径 |
| 未知未来 schema / flow version | 拒绝覆盖并返回可读错误，避免旧版本无损读取后再破坏性写回 |
| 旧即时路径 API | 暂时保留给 `SetupOverlay`；系统设置使用新草稿 API |

---

## 实施阶段

### Phase 1: POC — 录制坐标验证（已完成）

- FlowRecorderService（GetCursorPos + globalShortcut）
- IPC 通道 + 前端录制按钮
- 坐标采集与百分比反算已验证通过

### Phase 2: 共享模型 + 设置事务 API

- 新建 `src/shared/settings.ts`，并先补齐三个构建配置对 `src/shared` / `@shared` 的支持
- 为 2.0 旧 settings.json 建立 normalize/migration，生成完整的 schema v2 配置
- ConfigManager 增加 snapshot / update，一次校验、一次写盘
- 新增 `get-settings`、`pick-driver-dll`、`pick-wegame-exe`、`save-settings` IPC
- 保留 `selectAndLoadDriver` / `selectWegameExe` 给 `SetupOverlay`
- preload 使用共享类型，并把坐标订阅改为独立 unsubscribe
- 为 main 侧配置与 LoginFlow 建立纯函数校验；先保证非法 renderer 数据不能落盘

### Phase 3: 系统设置外壳 + 环境/基础模式

- 按页面级设计规范建立 `SystemSettingsModal`：NModal、line tabs、固定 Header/Footer、内容区滚动
- 建立统一 `SettingsDraft`、脏状态、关闭确认、保存 loading、错误 Tab 定位
- 将 `PathManagementModal` 提取为 `EnvironmentSettingsPanel`
- 将 `FlowConfigModal` 提取为受控 `BasicFlowEditor`
- 新建 `useCoordinateRecorder`，复用现有 F6 API并可靠清理单个监听
- 登录流程内使用 MASTER 胶囊分段控件切换基础/高级模式
- App.vue 合并两个入口，并把 `naiveThemeOverrides` 同时传给根 NConfigProvider 与 discrete API
- 900×670、约 700px、浅色和深色四种组合下完成静态与键盘验收

### Phase 4: 高级流程编辑器 + 执行引擎

- 在 `AdvancedFlowEditor` 中实现紧凑步骤列表、单行展开编辑与动作菜单
- 实现拖拽排序，同时提供键盘可用的上移/下移操作
- 点击步骤通过 `useCoordinateRecorder` 复用录制能力
- 恢复默认和删除只修改草稿，破坏性操作确认后仍需保存
- LoginFlowAction 拆为基础/高级执行器，使用穷尽 switch 执行动作
- 基础执行器接通 `TYPE_DELAY_MS`；高级账号/密码动作消费各自 `intervalMs`
- 执行前再次权威校验，流程中不持久化真实账号或密码

### Phase 5: 收尾

- 删除已完成提取的 `PathManagementModal.vue` / `FlowConfigModal.vue` 及 App 旧状态/handler
- 覆盖旧配置迁移、未知版本拒绝、非法步骤、写盘失败和驱动待重启场景
- 执行 `npm run typecheck`、`npm run build`；lint 以“不新增问题”为基线记录存量债
- 按 `design-system/poroauth/pages/system-settings.md` 与 MASTER §7 完整走查
- 真实 Electron 管理员窗口验证：标题栏可拖动、遮罩让位、F6 捕获、首次驱动加载与重启提示
- 基础/高级登录各跑一遍端到端流程，确认账号密码只在执行期解密使用
- 浅色/深色截图存档；对比度测试前禁用 transition/animation，焦点测试先确保文档真实获得焦点
