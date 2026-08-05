# 系统设置页规范

> **适用范围：** `SystemSettingsModal` 及其“环境与路径 / 登录流程”两个设置面板。
> **优先级：** 本文件覆盖 `../MASTER.md` 中与系统设置页直接冲突的通用规格；未明确覆盖的部分继续严格遵循 MASTER。

## 1. 页面定位

系统设置是桌面工具中的复杂编辑器，不是普通确认弹窗。它统一承载运行环境和登录流程配置，但必须通过任务域导航避免纵向堆叠。

- 一级导航：`环境与路径`、`登录流程`。
- “基础模式 / 高级模式”是登录流程的执行方式，放在“登录流程”内部使用胶囊分段控件。
- 主题切换仍是 Hero 工具区的高频快捷操作，不进入系统设置。

## 2. 外壳规格

本页覆盖 MASTER §4.5 的通用 `max-width: 500px`：

```css
.system-settings-modal {
  width: min(820px, calc(100vw - 40px));
  max-height: calc(100vh - 88px); /* 48px 自绘标题栏 + 上下各 20px */
}
```

- 继续使用 `NModal preset="card"`，`bordered="false"`。
- 使用 `<n-config-provider abstract :theme="naiveTheme" :theme-overrides="naiveThemeOverrides">`。
- 遮罩继续消费 `main.css` 已有的 `.n-modal-mask/.n-modal-body-wrapper` 规则，让出 48px 自绘标题栏。
- 圆角 `--radius-xl`、背景 `--bg-elevated`、阴影 `--shadow-xl`、内距 `--space-xl`。
- 浅色描边透明；深色补 `1px solid var(--border-subtle)`，两主题盒模型保持一致。
- Header、一级导航和 Footer 固定；仅中间内容区滚动。
- 约 700px 窗口宽度下不得横向滚动。高级步骤行允许摘要换行，行尾操作保持可见。

## 3. 主题与 token

- 不新增页面私有颜色 token，不在组件内写 hex / rgba。
- 表面、文字、状态、间距、圆角和动效只消费 MASTER §2 已有语义 token。
- `--text-tertiary` 只用于占位或纯装饰，不承载说明正文。
- 状态 soft 底上的文字使用 `--text-primary`，状态主色只用于图标和描边。
- naive-ui 控件必须消费 `useTheme.naiveThemeOverrides`，不得回退到默认绿色 primary。
- 主题仍由 `useTheme.ts` + `localStorage('poro-theme')` 管理，不写入 `AppConfig`。

## 4. 导航规格

### 4.1 一级 Tab

- 使用 `NTabs type="line"` 或等价的可访问 Tab 实现，不使用第二组胶囊，避免与模式切换混淆。
- Tab 标签字号 `--text-sm`、字重 600；激活色使用 `--accent`。
- 必须具备正确的 tablist/tab/tabpanel 语义、方向键切换与可见焦点环。
- 切换 Tab 不丢弃草稿，也不触发保存。

### 4.2 执行模式

- 使用 MASTER §4.2 的胶囊分段控件。
- 两项等宽：`基础模式`、`高级模式`。
- 切换只修改 `loginMode` 草稿；另一模式的数据保留。

## 5. 内容规格

### 5.1 环境与路径

- 每项仅展示：名称、状态、路径、操作。
- 使用 `--bg-inset` 的设置行，不在弹窗内部叠加带阴影卡片。
- 长路径单行省略，悬停或聚焦时可获取完整路径。
- 已加载、未配置、待重启分别使用清晰文本；不能只靠颜色区分。
- 驱动已加载后更换路径时展示“重启后生效”，不得伪装成已热重载。

### 5.2 基础流程

- 复用现有坐标录制能力和字段语义。
- 坐标 X/Y 同行，标签始终可见；范围提示使用 `--text-secondary`。
- 录制状态沿用 warning-soft 配方；文字使用 `--text-primary`。
- 录制错误使用应用内 message/inline feedback，不调用浏览器 `alert()`。

### 5.3 高级流程

- 默认行只显示动作摘要；同一时间最多展开一行编辑器。
- 列顺序稳定：拖拽句柄、序号、动作图标、摘要、行尾操作。
- 列表项使用 `--bg-inset` + `--radius-md`，不使用卡片抬升效果。
- 拖拽之外必须提供键盘可用的上移/下移操作。
- “添加步骤”使用一个主入口打开动作菜单，不平铺多个同权按钮。
- 删除与恢复默认需确认；恢复默认只修改草稿，保存后才生效。

## 6. Lucide 图标映射

| 语义 | 图标 |
|------|------|
| 系统设置 | `Settings` |
| 环境与路径 | `FolderCog` |
| 登录流程 | `Workflow` |
| 已就绪 | `CircleCheck` |
| 需重启 | `RotateCw` |
| 点击动作 | `MousePointer2` |
| 等待动作 | `Timer` |
| 键盘动作 | `Keyboard` |
| 拖拽 | `GripVertical` |
| 编辑 | `Pencil` |
| 删除 | `Trash2` |
| 添加 | `Plus` |
| 恢复默认 | `RotateCcw` |

禁止用 emoji、字符图标或手写 SVG 替代上述图标。纯图标按钮必须有 `aria-label` 和 tooltip。

## 7. 状态、动效与可访问性

- 保存中禁用重复提交，并使用按钮 loading 状态。
- 保存失败保留草稿，自动切换到首个错误所在 Tab，并将焦点移到错误摘要或字段。
- 关闭/取消且有修改时确认放弃；无修改时直接关闭。
- 切换 Tab、切换模式或关闭时若正在录制，先可靠停止全局 F6 捕获并清理当前监听。
- hover/focus 反馈 150～250ms，使用 `--ease`；不动画 width/height。
- 遵循 `prefers-reduced-motion`，不新增无限装饰动画。
- 所有文字对比度至少 4.5:1，图标和边界至少 3:1。

## 8. 验收矩阵

- 浅色 / 深色：环境完整、环境缺失、驱动更换待重启。
- 基础 / 高级：默认、脏草稿、校验失败、保存中、保存成功、保存失败。
- 录制：启动失败、F6 成功采集、手动取消、切 Tab/关窗自动清理。
- 窗口：900×670 和约 700px 宽，无横向滚动，Footer 始终可达。
- 键盘：Tab、Shift+Tab、方向键切换 Tab、步骤上移/下移、Esc 关闭确认。
- 真 Electron 窗口：遮罩让出标题栏，窗口可拖动，最小化/关闭可点击。
