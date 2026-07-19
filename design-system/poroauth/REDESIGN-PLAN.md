# PoroAuth UI/UX 重设计 · 分阶段执行计划

> **配套文件：** [`MASTER.md`](./MASTER.md) —— 设计系统事实源。
> **每个 session 开工前先读 MASTER.md，不要重新推导设计决策。**

## 总目标

把 PoroAuth 从「深色玻璃拟态」改造为参照 ISUX AI Hub 的**浅色柔和卡片风**，并保留深色主题作为可切换选项（默认浅色）。

**签名特征（做到这 5 条就对了）：**
1. 浅薰衣草灰底 (`--bg-app`) + **纯白无描边卡片** + 极柔和环境阴影
2. 大标题混合字重（`**PoroAuth** 通行名册`）
3. 胶囊分段控件（排序栏）
4. 圆形图标按钮（右上角工具区）
5. 卡片右上 ↗ 箭头（~~左上图标瓦片~~ P3 经用户决策删除，见 MASTER §4.1）

---

## 阶段总览

| # | 阶段 | 依赖 | 文件数 | 风险 | 状态 |
|---|------|------|--------|------|------|
| P0 | 设计系统定稿 | — | 2 | — | ✅ 完成 |
| P1 | **Token 层 + 主题基建** | P0 | 4 | 🔴 高（全局阻塞） | ✅ 完成 |
| P2 | 主界面外壳 | P1 | 1 | 🟡 中 | ✅ 完成 |
| P3 | 账号卡片网格 | P1 | 1 | 🟡 中 | ✅ 完成 |
| P4 | 首启 + 登录流 | P1 | 3 | 🟡 中 | ✅ 完成 |
| P5 | 账号管理弹窗 | P1 | 3 | 🟢 低 | ✅ |
| P6 | 设置 / 更新弹窗 | P1 | 2 | 🟡 中 | ✅ |
| P7 | 收尾走查 | P2–P6 | 全部 | 🟢 低 | ✅ |

**关键路径：P1 必须先做完并验收**，P2–P6 之后可并行/任意顺序（互不冲突，各改各的文件）。

**并行建议：** P2 与 P3 会同时碰主界面观感，建议 P2→P3 顺序做；P4/P5/P6 三组文件完全隔离，可任意穿插。

---

## P1 · Token 层 + 主题基建 🔴

> **这是唯一的阻塞阶段。P1 的 token 命名一旦定下，P2–P7 全部依赖它，中途改名成本极高。**

**目标**
建立双主题 token 层 + 主题切换基建，且**不破坏任何现有组件**。

**文件**（✅ 为 P1 实际落地情况）
- ✅ `src/renderer/src/assets/main.css` —— 重写为 token 层
- ✅ `src/renderer/src/assets/base.css` —— **整份删除**（实测全项目零 import，是死文件）
- ✅ `src/renderer/index.html` —— 加**外链**同步脚本（非内联，见下方 CSP 说明）
- ✅ `src/renderer/public/theme-init.js` —— 新建（原计划为 index.html 内联脚本，CSP 不允许）
- ✅ `src/renderer/src/composables/useTheme.ts` —— 新建
- ✅ `src/renderer/src/assets/fonts/` —— 新建，本地自托管 Plus Jakarta Sans（可变字体，2 个 woff2 子集）

**做什么**
1. 按 MASTER.md §2.1 / §2.2 落地全部语义 token（`:root` 浅色 + `:root[data-theme='dark']` 深色）
2. **必须同时保留 MASTER.md §2.3 的向后兼容别名** —— 否则 P4–P6 未改造的组件立刻崩色
3. `useTheme.ts`：`localStorage` 存 `poro-theme`，切换时写 `document.documentElement.dataset.theme`
4. `index.html` 内联脚本同步读 `localStorage` 并打 `data-theme`，避免启动闪白/闪黑
5. Plus Jakarta Sans 下载到本地 `assets/fonts/`，`@font-face` 引入，**删除 main.css 第 1 行的远程 Inter `@import`**（Electron 断网会回退）
6. App.vue 里 `NConfigProvider :theme` 绑定 `lightTheme`/`darkTheme` 跟随切换（仅改这一处绑定 + 两个 discrete api 的 theme，**其余 App.vue 留给 P2**）

**验收**（P1 已全部实测通过）
- [x] `npm run dev` 起得来，无控制台报错
- [x] 切换主题后整个应用（含 naive-ui 控件）跟着变
      ⚠️ 修正原验收方法：naive-ui 跟的是 `useTheme` 的 ref，**不是 DOM 属性**。
      手动戳 `data-theme` 只会变 CSS token，naive-ui 不动，这是预期行为（属性由 useTheme 单向写出）。
      正确验证：走 `useTheme.setTheme()` 或改 localStorage 后 reload。
      实测 naive-ui primary 按钮 浅色 `rgb(24,160,88)` / 深色 `rgb(99,226,183)`，跟随正常。
- [x] 重启应用后主题选择保持（localStorage `poro-theme`）
- [x] 启动瞬间无主题闪烁（实测 theme-init.js 24.1ms 执行完，main.css 26.9ms 才开始加载）
- [x] **9 个现存组件全部仍能正常显示**（未崩色；不好看属预期，交由 P2–P6）
- [x] 断网启动字体正常（本地自托管生效，产物零远程请求）

**边界（不要碰）**
- 不改任何组件的布局/结构 —— 那是 P2–P6 的事
- 不删向后兼容别名 —— 那是 P7 的事
- 不动 `src/main/`、`src/preload/`（主题走 localStorage，零 IPC）

**起手指令**
```
读 design-system/poroauth/MASTER.md 和 REDESIGN-PLAN.md，执行 P1（Token 层 + 主题基建）。
严格遵守 P1 的「边界」：只建 token 层和主题切换，不改任何组件的布局结构，
必须保留 §2.3 向后兼容别名。完成后按 P1 验收清单自查。
```

---

## P2 · 主界面外壳

**目标** App.vue 的标题栏 + Hero + 排序栏改造为参照图语言。

**文件** `src/renderer/src/App.vue`（仅 template + style，**业务逻辑一行不动**）

**做什么**
1. **Hero 标题**：`通行名册` → 混合字重 `**PoroAuth** 通行名册`，32px，`letter-spacing: -0.02em`
2. **排序栏 → 胶囊分段控件**（MASTER §4.2）：`添加时间` / `可用性`，激活态白胶囊 + `--shadow-sm`
3. **工具按钮 → 圆形图标按钮**（MASTER §4.3）移到右上角：
   - `🔗 路径管理` → Lucide `Link2` ⚠️ **删 emoji**
   - `⚙️ 坐标时序校正` → Lucide `Settings` ⚠️ **删 emoji**
   - ➕ 新增主题切换按钮 → Lucide `Moon`/`Sun`（接 P1 的 `useTheme`）
4. **清掉行内样式**：template 里大段 `style="..."` 全部提到 `<style scoped>` 用 token
5. 复审 `badgeFloat` 无限呼吸动画 —— MASTER §6 禁纯装饰动画，改为静态或仅 hover 触发
6. 标题栏所有可点元素确认 `-webkit-app-region: no-drag`

**验收**（P2 已全部实测通过）
- [x] 无 emoji 图标残留（全文件 grep `🔗|⚙️` 零命中）
- [x] 双主题下均正常，文字对比度 ≥4.5:1
      浅色最低 **5.62**（tag）/ 深色最低 **5.49**（tag）；胶囊激活 15.99 / 14.64
- [~] 标题栏可拖动，按钮可点 —— **仅静态核查，未在真实 Electron 窗口实拖**
      （P2 的验证走 Vite dev server + 浏览器，而 `-webkit-app-region` 只在 Electron 生效）。
      风险低：drag 声明与改造前逐字一致（`.app-header` drag + `.window-controls` no-drag），
      P2 只把手写 svg 换成 Lucide 组件，未动 drag 容器结构。
      工具按钮在 `.app-main` 内，非 drag 区，无需 no-drag —— 顺手删了 update chip 上原有的冗余 no-drag。
      **建议下个 session 起 `pnpm run dev:admin` 时顺手拖一下确认。**
- [x] 窗口缩到 ~700px 宽不错位（实测 Hero 行含 update chip 仅需 **576px** 才换行，且有 `flex-wrap` 兜底）
- [x] template 内无行内 `style` 硬编码颜色（全文件 grep `style="|#hex|rgba?\(` 零命中）
- [x] typecheck 通过；lint 在 template/style 区零问题（script 区既有 error 属存量债，P2 不碰）

**边界** 不动 AccountGrid（P3）、不动任何弹窗、**不动 script 里的业务逻辑**（排序/登录/更新流程）
> P2 实际 script 改动仅两行且均为 template 支撑：加 lucide 图标 import、把 `useTheme()` 解构扩为 `{ naiveTheme, isDark, toggleTheme }`。排序/登录/更新逻辑一行未动。

**起手指令**
```
读 design-system/poroauth/MASTER.md 和 REDESIGN-PLAN.md，执行 P2（主界面外壳）。
只改 src/renderer/src/App.vue 的 template 与 style，业务逻辑不动。
重点：emoji 换 Lucide、排序栏改胶囊分段控件、行内样式提取到 scoped style。
```

---

## P3 · 账号卡片网格

**目标** 账号卡片改造为参照图的白卡片语言 —— **本次改造观感权重最大的一环**。

**文件** `src/renderer/src/components/AccountGrid.vue`

**做什么**
1. **卡片**（MASTER §4.1）：纯白无描边 + `--shadow-md`，16px 圆角，24px 内距
   → 移除 `.glass` 类、移除 `::before` 渐变遮罩、移除 `backdrop-filter`
   → ⚠️ 深色主题下补 `border: 1px solid var(--border-subtle)`，否则卡片糊成一片
2. ~~**图标瓦片**：左上 44×44 圆角方块，深底白字，显示账号名首字~~
   → **[P3 用户决策：删除]** 瓦片独占一整行导致整卡过挤，撤掉并把省下的一行摊成留白（块间距 8px → 16px）。
   MASTER §4.1 已同步改写，**后续 phase 不要加回来**。
3. **箭头**：右上小圆形 ↗（Lucide `ArrowUpRight`），暗示「点击登录」。瓦片撤走后与账号名同行右对齐，不额外占行。
4. **操作按钮**（编辑/封禁/删除）：当前 hover 才 `opacity:0` → `1`，纯 hover 依赖不可达 → 改为**常驻低透明度**或键盘可聚焦
5. **状态**：`就绪`/`封禁至...` 改用 chip（`--success-soft`/`--danger-soft` 底）
   ⚠️ **必读 MASTER §2.4**：浅色下 `--success` 压 `--success-soft` 仅 **3.58:1**、`--danger` 压 `--danger-soft` 仅 **4.41:1**，
   **都扛不住文字**。chip 文字必须用 `--text-primary`，主色只留给图标与描边。配方见 §2.4，P2 已在 update chip 上验证过。
6. **封禁态**：`filter: grayscale(0.6)` 在浅色下会发灰发脏 → 改用 `--danger-soft` 底 + 降透明度
7. hover：`translateY(-2px)` + `--shadow-lg`，250ms（MASTER §5）

**验收**（P3 实测情况）
- [x] 双主题下卡片层级清晰（深色下卡片与底色可区分）
      深色实测 `border-color` 落到 `#21262D`（`--border-subtle`）、`--shadow-md` 在位；浅色描边为 `transparent`（无描边）
- [x] 封禁态在浅色下不发脏，语义清晰 —— grayscale 已删，改 `--danger-soft` 底 + 反相 chip
- [x] 操作按钮不依赖 hover 才能发现，键盘可达
      实测静息 `opacity: 1`（原为 0）；三个按钮均为原生 `<button>`，Tab 可达，走全局 `:focus-visible` 焦点环
- [x] 无硬编码 hex（原 `#3b82f6` / `#fbbf24` / `#10b981` / 多处 `rgba()` 全部清零）
- [x] `prefers-reduced-motion` 下无位移动画（全局 reduce 块只压时长，位移照发生 → 已显式 `transform: none`）
- [x] 窗口 900/800/700/560 四档实测：3/2/2/1 列，无横向溢出、无卡内溢出，卡高恒 208px
- [x] typecheck + lint 通过
- [x] **双主题截图确认** —— 浅色：白卡柔和阴影成立，封禁卡淡粉不脏不艳；深色：卡片靠描边与底色可区分。
      hover 实测：普通卡抬升 2px + 阴影加深 + ↗ 填 `--accent`；封禁卡 `transform: none`、`cursor: not-allowed`、↗ 不变色。
      ⚠️ 但截图取自**隔离 harness**（只挂 AccountGrid + 假数据），非真实 Electron 窗口。
      仍建议下个 session 起 `pnpm run dev:admin` 时在真窗口里扫一眼（真实数据量、滚动、与 App.vue 外壳的间距关系）。

**边界** 不动 `script setup` 里的 `isBanned`/`getStatusText`/`getLoginTimeText` 逻辑与定时器
> P3 实际 script 改动仅两处且均为 template 支撑：加 lucide 图标 import、新增 `getInitial()`（瓦片字形，
> 展开码点数组取首位以免 `charAt` 劈开代理对）。`isBanned`/`getStatusText`/`getLoginTimeText` 与定时器一行未动。

**起手指令**
```
读 design-system/poroauth/MASTER.md 和 REDESIGN-PLAN.md，执行 P3（账号卡片网格）。
只改 src/renderer/src/components/AccountGrid.vue，script 逻辑不动。
重点：白卡无描边+柔和阴影、图标瓦片、状态 chip、封禁态浅色适配、操作按钮可达性。
```

---

## P4 · 首启 + 登录流

**目标** 用户最先看到、以及核心路径上的三个遮罩/弹窗。

**文件**
- `src/renderer/src/components/SetupOverlay.vue`（12 处硬编码色）
- `src/renderer/src/components/LoginOverlay.vue`（3 处）
- `src/renderer/src/components/AddAccountModal.vue`（440 行，12 处）

**做什么**
1. 三者全部按 MASTER §4.5 弹窗规格重做外壳
2. 硬编码色全部换 token
3. AddAccountModal 表单按 MASTER 输入框规格：可见 label（不许只用 placeholder 当标签）、错误提示贴近字段
4. LoginOverlay 进度态确认双主题可读

**验收**（P4 实测情况）
- [x] 三者双主题正常 —— 双主题各自截图确认，浅色白卡柔和阴影成立、深色靠 `--border-subtle` 描边与底色拉开
- [x] 无硬编码 hex —— 三个文件 grep `#hex|rgba?\(|hsla?\(|具名色|style="` **零命中**（仅剩注释里记录旧值）；
      `.glass` / `.btn` / `.btn-primary` / `.btn-icon` 兼容类残留**全部清零**（按 class token 精确核对，非正则粗匹配）
- [x] 表单有可见 label、焦点环可见 ——
      4 个 label 全部 `for` ↔ `id` 关联成功（**原来 label 连 `for` 都没有，input 也没 `id`**，等于只是排版上像 label）；
      焦点环实测 `outline: 2px solid var(--accent)` + 输入框描边转 accent
- [x] 首启流程（未绑定驱动/WeGame）走一遍正常 —— **仅隔离 harness 实测**，见下方 ⚠️
- [x] 双主题对比度全绿：SetupOverlay 10 项、LoginOverlay 6 项、AddAccountModal 16 项，两个主题 `failing: []`
- [x] 窄宽实测 700 / 620 / 560 三档：三者均无横向溢出、无卡内溢出、无子元素越界
- [x] typecheck 通过；lint 在 template/style 区零问题
      （AddAccountModal `<script>` 区 4 个 error 是**存量债**，已用 `git show HEAD:` 比对确认改动前就在，按 P2/P3 口径不碰；
      warning 由 9 条降到 3 条）

> ⚠️ **同 P3：截图与实测取自隔离 harness**（假 48px 标题栏 + 桩掉 `window.api`），非真实 Electron 窗口。
> 真窗口里仍需确认：`-webkit-app-region` 是否真的让开了标题栏（`top: 48px` 只在 Electron 里才有意义）、
> 以及真实 IPC 下的绑定流程。**建议下个 session 起 `pnpm run dev:admin` 时顺手扫一眼。**

**边界** 不动 IPC 调用与登录流程逻辑
> P4 实际 script 改动：SetupOverlay / LoginOverlay 仅加 lucide import 并去掉 `NButton` import；
> AddAccountModal 的 `<script setup>` **除加一行 lucide import 外逐字未动** ——
> 智能粘贴正则、`selectParsed`、`submit` 的 IPC 调用与 `watch` 全部原样。
> 实测验证：粘贴两行发货文本 → 正确解析出 2 条（含 Riot ID `艾欧尼亚巅峰#123` 与账号纯数字化）；
> 点击填入 → 三个字段正确回填、粘贴框清空；提交 → 走通 `window.api.addAccount` 并渲染 error 态。

**起手指令**
```
读 design-system/poroauth/MASTER.md 和 REDESIGN-PLAN.md，执行 P4（首启+登录流）。
改 SetupOverlay.vue / LoginOverlay.vue / AddAccountModal.vue 三个文件的样式与结构，
IPC 调用和流程逻辑不动。硬编码色全部换 token。
```

---

## P5 · 账号管理弹窗

**目标** 三个轻量弹窗对齐新风格（naive-ui 占比高，P1 后大部分自动跟随）。

**文件**
- `src/renderer/src/components/EditNameModal.vue`（52 行，0 处硬编码 —— 最快）
- `src/renderer/src/components/BanAccountModal.vue`（185 行，2 处）
- `src/renderer/src/components/PathManagementModal.vue`（109 行，2 处）

**做什么** 弹窗外壳统一 MASTER §4.5；naive-ui 控件按需覆盖 `theme-overrides` 对齐圆角/主色；少量硬编码换 token。

**验收**（P5 已全部实测通过，隔离 harness 双主题截图 —— 见下方 ⚠️）
- [x] 三者双主题正常，圆角/主色与新系统一致
      实测 primary 双主题均落 `--accent` 靛蓝（浅 `#4f46e5` / 深 `#818cf8`），**非 naive 默认绿**；
      NModal 外壳圆角 20px（`--radius-xl`）、输入/按钮 8px（`--radius-sm`）。
- [x] `NDatePicker`（BanAccountModal）双主题下可读 —— 深色面板正常、选中态走靛蓝 primary。
- [x] 无 emoji 图标：🛡️→`ShieldBan`、🔗→`Link2`、✓/✗→`Check`/`X`（NTag `#icon` 槽）、`&times;`→`X`。
- [x] 遮罩不盖 48px 标题栏：手写遮罩（Ban）scoped `top:48px`；naive 遮罩（Edit/Path）靠全局
      `.n-modal-mask/.n-modal-body-wrapper{top:48px}` 兜住（teleport 到 body，scoped 够不到）。

**边界** 不动业务逻辑
> P5 实际 script 改动：三个文件均只加 import（naive `NConfigProvider` + lucide 图标 + `useTheme`），
> 并各解构 `{ naiveTheme, naiveThemeOverrides }`。业务逻辑（`submit`/`clearBan`/`watch`/emit）一行未动。
> BanAccountModal 提交按钮由「`保存中...`↔`确认设置`」文字互换改为 naive `:loading`（纯显示，isSubmitting 逻辑不变）。

**起手指令**
```
读 design-system/poroauth/MASTER.md 和 REDESIGN-PLAN.md，执行 P5（账号管理弹窗）。
改 EditNameModal.vue / BanAccountModal.vue / PathManagementModal.vue。
naive-ui 控件用 theme-overrides 对齐圆角与主色，业务逻辑不动。
```

---

## P6 · 设置 / 更新弹窗

**目标** 两个最重的手写 CSS 弹窗。

**文件**
- `src/renderer/src/components/FlowConfigModal.vue`（330 行，14 处硬编码，仅 3 处用变量 —— **最脏**）
- `src/renderer/src/components/UpdateModal.vue`（340 行，19 处硬编码 —— **硬编码最多**）

**做什么** 全量 token 化 + 外壳对齐 MASTER §4.5。FlowConfigModal 的坐标捕获交互复杂，**改样式时务必不碰捕获逻辑**。

**验收**（P6 实测情况）
- [x] 双主题正常 —— 静态核查：全部走 §2.4 已验证 token 组合，外壳复用 P5 已验证范式
      （FlowConfig 同 EditNameModal 的 `<n-config-provider abstract>`+NModal；Update 同 BanAccountModal 手写遮罩）。
      ⚠️ 未在真实 Electron 窗口截图 —— 见下方
- [x] 无硬编码 hex —— 两文件 grep CSS 属性值 `#hex|rgba?\(|hsla?\(` **零命中**（仅注释里留对比度记录）；
      `.glass` 类已从 UpdateModal 移除，`.btn`/`.btn-primary` 已就地 token 化
- [~] 坐标捕获功能实测可用 —— **只静态核查**：`startRecording`/`stopRecording`/`onCoordinateCaptured`/
      `handleSubmit`/`watch`/`onBeforeUnmount` 与 HEAD 逐字一致（`git diff` 证脚本仅加 import + `useTheme` 解构）。
      真实采集走 IPC + F6 全局热键，须真窗口（`dev:admin`）才能跑，**留待下个 session**
- [x] 更新进度条双主题可读 —— 轨道 `--bg-inset`、填充 `--accent`（压 `--bg-elevated` 6.29/5.80 ✅），
      `transition: width` 属功能反馈保留；stats 文字 `--text-secondary` 压 `--bg-elevated` 7.56/5.62 ✅
- [x] typecheck 通过；lint template/style 区零问题
      （两文件 `<script>` 区共 9 个 error 是**存量债**：`git diff` 证均落在改动前既有的 capture 函数 / 显示辅助函数 /
      `defineProps` 上，按 P4/P5 口径不碰。warning 已全部 `--fix` 清零）

**边界** 不动坐标捕获、不动更新下载/安装逻辑
> P6 实际 script 改动：FlowConfigModal 仅加 lucide + `NConfigProvider` import、`useTheme` 解构；
> UpdateModal 仅在既有 lucide import 上加 `Sparkles, X`。捕获逻辑与 `formatBytes`/`formatReleaseNotes` 一行未动。

### P6 实施中的回写（已改文档 + 已改代码）

- **[P6] FlowConfigModal 外壳复用 P5 范式**：`<n-config-provider abstract :theme :theme-overrides>` 包 NModal，
  primary/圆角随 `useTheme.naiveThemeOverrides` 对齐靛蓝；遮罩 `top:48px`+`--scrim` 由 P5 建的全局
  `.n-modal-mask` 规则兜住，本组件无需再写。
- **[P6] emoji 全清**：🖱️→`MousePointer2`、⏱️→`Timer`、📍/⏹→`Crosshair`/`Square`（NButton `#icon` 槽）、
  ✅→`Check`、🎉→`Sparkles`、UpdateModal 关闭键手写 SVG→`X`。
- **[P6] 三处 soft 底文字撞 §2.4「主色扛不住文字」，全部改 `--text-primary`**（主色只留图标/描边/字重）：
  - recording-banner 的 `<strong>`：原拟 `--warning`（压 `--warning-soft` 仅 **3.07:1**）→ `--text-primary` + `font-weight:700`；
  - capture-result 标题/条目：原 `#10b981`/`#6ee7b7`（success 压 success-soft **3.58:1**）→ `--text-primary`，✅ 图标留 `--success`；
  - UpdateModal error 段 `<p>`/`<code>`：原 `--danger`/`#fca5a5`（danger 压 danger-soft **4.41:1**）→ `--text-primary` / `--text-secondary`（后者 6.91/5.36 ✅）。
- **[P6] UpdateModal 安装键放弃硬编码绿 `#10b981`，统一走 `.btn-primary` 靛蓝**。
  下载/下载中/安装三态同为主操作，用同一 accent 主按钮语义更清；「已就绪」的肯定感已由上方大号绿 `CheckCircle` 图标承载。
- **[P6] 删两个带硬编码色的无限装饰动画**（§6）：recording-banner 的 `bannerPulse`（warning rgba 辉光）整删；
  UpdateModal success 的 `drop-shadow` 绿辉光删。**保留** recording-dot 的 `dotBlink`（REC 状态指示，功能性，色改 `--danger`）
  与 progress-bar 的 `transition:width`（进度即数据，功能反馈）。
- **[P6] ⚠️ 同 P3/P4/P5：未在真实 Electron 窗口验证。** 本 phase 连隔离 harness 截图都没做
  （改动纯 token + 复用已验证范式，风险低于前几期）。真窗口须确认：`top:48px` 让开标题栏、
  坐标 F6 采集全链路、更新下载进度实时刷新。**建议下个 session 起 `dev:admin` 时一并扫。**

**起手指令**
```
读 design-system/poroauth/MASTER.md 和 REDESIGN-PLAN.md，执行 P6（设置/更新弹窗）。
改 FlowConfigModal.vue / UpdateModal.vue，全量 token 化。
⚠️ 坐标捕获逻辑与更新下载逻辑一行不动，只改样式与结构。
```

---

## P7 · 收尾走查

**目标** 清债 + 全量质检。

**做什么**
1. **删除 P1 的向后兼容别名**（`--surface-color` 等），全项目搜残留引用并改为新 token
2. 全项目搜硬编码 hex/rgba，清零
3. 按 MASTER §7 清单逐条走查**双主题**
4. 对比度实测（浅色/深色各测）
5. `prefers-reduced-motion` 全局兜底
6. **删除死代码 `src/renderer/src/components/Versions.vue`**（已确认全项目零引用）
7. `npm run typecheck` + `npm run lint` 通过
8. 双主题各截图存档
9. **🔴 删除 `design-system/` 之前，先迁移 `logo/` 里两样非过程文档的东西**（详见 `logo/README.md` 末节）：
   - `gen_v3.py` + `apply_icon.py` —— **应用图标的唯一源**（无 SVG / 无 Figma，图标是代码生成的）。
     随目录删掉 = 图标永久失去可编辑性。迁到 `build/icons/` 或 `scripts/`。
   - 「标题栏内联 SVG 与位图是两份独立几何，改一个必须同步另一个」—— 这是约束 `App.vue` 的**运行时约束**，
     迁为 `.app-logo` 处的代码注释。
   其余（`PHILOSOPHY.md`、未选中候选、contact sheet）是纯过程产物，可随目录删除。

**验收**（P7 实测情况）
- [x] 无向后兼容别名残留 —— main.css 的别名块（`--surface-color`/`--surface-hover`/`--border-color`/
      `--accent-color`/`--danger-color`/`--warning-color`/`--bg-gradient`）连同 `.glass`/`.btn`/`.btn-primary`/
      `.btn-danger` 兼容工具类**整段删除**。删前 grep 全 `src` 证零消费方（组件里的 `*-btn` 全是各自 scoped 类，
      `class="btn"` 只出现在 UpdateModal 自己的 scoped `.btn`）；删后 grep 仅剩 SetupOverlay 一条注释提及旧名。
- [x] 全项目零硬编码颜色 —— grep `src/renderer/**/*.vue` 的 `#hex|rgba?\(|hsla?\(` 命中**全部落在注释**里
      （「原为…」的历史记录）；CSS 属性值零命中。main.css 里的 hex 是 token 定义源，非组件硬编码。
- [~] MASTER §7 清单：静态项全绿 —— 无 emoji 图标（残留的 `→`/`↗` 均在注释，`✧` 是 AddAccountModal
      解析逻辑里的文本分隔符非图标且属未动逻辑）；`:focus-visible` 焦点环（main.css 全局）、
      `prefers-reduced-motion` 兜底（main.css 全局媒体查询）均在位；`no-drag`/窄宽/hover 时长各 phase 已验。
      ⚠️ **双主题截图确认仍欠**：无真实 Electron 窗口（须 admin `dev:admin`），且 P7 零视觉改动
      （只删死代码 + 零消费的死 CSS）→ 视觉态与 P6 收尾**逐字等同**，无新面需截。
- [x] 删死代码 `Versions.vue` —— 删前 grep 全 `src` 零引用，已删。
- [x] typecheck 通过（exit 0）；lint **未新增问题** —— 全项目 98 error / 1950 warning 全是存量债：
      error = `any`/返回类型/未用变量（散落各组件 `<script>`，前几期已定「存量债不碰」口径）；
      warning 绝大多数是 `Delete ␍`（CRLF，autocrlf 检出的环境性问题，每个文件都有，非本次引入，
      全项目 `--fix` 会动百来个无关文件 → 不做）。P7 只删文件/死 CSS，净 error 不增反减。
- [~] 图标生成脚本迁出 `design-system/` —— **本次不触发**：迁移是「删除 `design-system/` 之前」的前置动作，
      而 `design-system/` 是每 session 必读的事实源、**不删**，故 `gen_v3.py`/`apply_icon.py` 原地保留即可。
      真要删 `design-system/` 时再按本节 step 9 迁移。

> **P7 收尾状态**：清债 + 静态质检完成。唯一遗留 = **真实 Electron 窗口的双主题截图 / 交互实测**
> （全程用隔离 harness，须 admin `dev:admin` 才能补），与坐标 F6 采集、更新下载全链路一并留待真窗口扫查。

---

## 跨 session 协作约定

1. **开工先读 MASTER.md** —— 设计决策不重新推导
2. **对比度查 MASTER §2.4 的实测矩阵，不要手算** —— P2 手算 `--danger`/`--danger-soft` 得 6.10:1，
   实测只有 **4.41:1**。sRGB 线性化手算极易出错。表里没有的组合，用浏览器构造探针实测后**回填进 §2.4**
3. **只做当前 phase** —— 严守「边界」，看到别的 phase 的问题就记到下方「发现记录」，不要顺手改
3. **收工更新状态表** —— 把上面总览表的 ⬜ 改成 ✅
4. **样式改造不碰业务逻辑** —— 这是所有 phase 的铁律
5. **偏离 MASTER 必须回写** —— 若实施中发现 MASTER 某条不可行，先改 MASTER 再改代码，并在下方记录原因

## 发现记录

> 各 session 把「本 phase 不该改、但发现了的问题」记这里。

- **[P0]** `Versions.vue` 全项目零引用 → 死代码，P7 删除
- **[P0]** `main.css` 远程 `@import` Google Fonts（Inter）→ Electron 断网会字体回退，P1 改本地自托管
  - **[P1 修正]** 比"断网回退"更严重：`index.html` 的 CSP 是 `style-src 'self' 'unsafe-inline'`，
    **一直在拦截 `fonts.googleapis.com`，远程 Inter 从未加载成功过**，应用始终在用系统字体兜底。
    本地自托管是这个项目第一次让自定义字体真正生效。
- **[P0]** ~~`base.css` 与 `main.css` 各自定义了一套 `body` 与 `box-sizing`，规则重复打架 → P1 合并~~
  - **[P1 修正] 此记录不成立**：`base.css` **全项目零 `import`**（`main.ts` 只引 `main.css`），从未参与构建，
    不存在"规则打架"。已整份删除，无需合并。
- **[P0]** `base.css` 整份是 electron-vite 模板残留 → **[P1] 已整份删除** ✅

### P1 实施中的 MASTER 回写（已改文档 + 已改代码）

- **[P1]** `--text-secondary` `#6B7280` → **`#4B5563`**
  实测压 `--bg-app` 仅 **4.41:1**，不达 MASTER §7 的 4.5:1。修正后 6.89:1。
- **[P1]** `--accent` `#6366F1` → **`#4F46E5`**，`--accent-hover` `#4F46E5` → **`#4338CA`**
  `--accent` 同时承担按钮底与前景色两个角色，浅色下两处都不达标：
  白字压它 **4.47:1**、它压 `--bg-app` **4.07:1**。修正后 6.29 / 5.73。
  深色的 `#818CF8` 实测 5.98 / 5.45 已达标，**未改**（原作者只验算了深色）。
- **[P1]** `--text-tertiary` `#9CA3AF` 双主题均不足以承载正文
  实测浅色压 `--bg-surface` **2.54:1**、深色 **3.42:1**。已在 MASTER §2.1 标注**仅装饰/占位**。
- **[P1]** `--warning-color` 是 §2.3 别名清单的**漏网之鱼**
  `SetupOverlay.vue:97` 在引用它，但**旧 `main.css` 也从未定义过它** —— 是既有的隐性坏值
  （`var()` 解析失败 → `border-left-color` 回落 `currentColor`）。已补进别名层，等于顺手修好。
- **[P1]** 防闪烁脚本**不能内联**：CSP 为 `script-src 'self'`，内联脚本会被拦截；
  `type="module"` 会被 defer 到首屏之后。故改为 `public/theme-init.js` 外链同步脚本。
  已实测构建产物：Vite 保留相对路径 `./theme-init.js` 并复制到 `index.html` 同级，`file://` 下可用。

### P2 实施中的 MASTER 回写（已改文档 + 已改代码）

- **[P2] 🔴 深色底色整体换血：slate-900 → GitHub Dark（Primer）冷中性灰**
  **用户决策**：原深色 `--bg-app: #0F172A` 蓝调过重被否，要求走行业标杆。已选 GitHub Dark。
  改动 `main.css` 深色段 + MASTER §1 / §2.1。**这是 P1 之后唯一一次动 token 层**，`--accent` 及全部状态色未动。
  新值：`--bg-app #0D1117` / `--bg-surface #161B22` / `--bg-inset #010409` /
  `--text-primary #E6EDF3` / `--text-secondary #8B949E` / `--text-tertiary #6E7681` /
  `--border-subtle #21262D` / `--border-strong #30363D`（描边由 rgba 改实色，合成后与旧值几乎等值，无损）。
  ⚠️ **副作用：P1 记录的深色对比度实测值全部作废**，P3–P6 请按新底色复测，不要沿用旧数字。
  已复算的：`--accent` 压 `--bg-app` **6.37:1**、`--text-secondary` 压 `--bg-app` **6.18:1**、
  `--text-tertiary` 压 `--bg-surface` 由 3.42 → **3.76:1**（**仍不达标，"仅装饰/占位"的结论不变**）。
- **[P2]** 主题切换按钮位置：MASTER §1 原写「标题栏右上角」→ 改为**内容区 Hero 行右上角**，与路径管理 / 坐标校正成组。
  理由：标题栏右上已是最小化/关闭，且 §4.3 要求三个工具按钮成组。已回写 §1。
- **[P2] 🔴 新增 MASTER §2.4「对比度实测矩阵」—— P3–P6 开工必读，别再手算。**
  起因：P2 手算 `--danger`/`--danger-soft` 得 6.10:1，**实测只有 4.41:1**（手算 sRGB 线性化极易出错）。
  遂用浏览器真实渲染把所有常用 token 组合实测了一遍，结论沉淀进 MASTER §2.4。
  **头号坑**：浅色下三组状态 soft 底**全部**扛不住同族主色文字 ——
  `--success`/`--success-soft` **3.58**、`--danger`/`--danger-soft` **4.41**、`--warning`/`--warning-soft` **3.07**；
  只有 `--accent`/`--accent-soft`（5.62）能过。深色下四组全部达标。
  **正解**：soft 底上的文字一律用 `--text-primary`（15.18/14.61/15.42 浅），主色只承载图标与描边。
  **P3 做状态 chip、P4 做 SetupOverlay 的 warning 条、P6 做进度/错误态时都会撞上这条**，配方见 §2.4。
- **[P2]** `.win-btn` 关闭键 hover 原为硬编码 `#e81123` + 白字（违反 §6）。
  改 `--danger-soft` 底 + `--danger` 字：浅色 **4.41:1** / 深色 **5.95:1**。
  ⚠️ 浅色 4.41 < 4.5，**但它是图标（非文字），适用 3:1 标准，达标**。若将来这里要放文字，必须改 `--text-primary`。
  放弃 Windows 经典红底白字：深色 `--danger #F87171` 配白字仅 2.6:1，无法达标。
- **[P2]** 移除两个无限装饰动画 `badgeFloat` / `arrowBounce`（§6 禁），改为 hover 触发 `--shadow-md`。

### P3 实施中的回写（已改文档 + 已改代码）

- **[P3]** 封禁态放弃「**降透明度**」（原 P3 做什么 §6 的字面要求），只保留 `--danger-soft` 底。
  理由：`opacity` 作用于整卡会等比压掉**所有**文字对比度，正好砸掉 P3 自己要过的 4.5:1 —— 
  手段与验收互相打架。改为**语义由底色 + chip 承载，不靠降饱和/降透明**：
  `--danger-soft` 底 + 反相 chip + 取消 hover 抬升 + `cursor: not-allowed`。实测封禁卡全部文字达标（见 §2.4）。
- **[P3]** 封禁卡上的 chip 必须**反相**：chip 原配方是 `--danger-soft` 底，而封禁卡底已经是 `--danger-soft`，
  同底色会让 chip 整个糊进卡里。故封禁 chip 改 `--bg-surface` 底 + `--danger` 描边（实测 4.83 浅 / 6.25 深，非文字达标）。
- **[P3] 🔴 用户决策：删除 MASTER §4.1 的 44×44 图标瓦片**（原为 5 条签名特征之一，MASTER §4.1 与本文签名特征已同步改写）。
  起因：瓦片独占一整行，叠加状态 chip + 三个操作按钮后整卡过挤（用户原话「太紧凑了」）。
  处置：撤瓦片，↗ 提示改为与账号名同行右对齐（不额外占行），省下的一行**不还给卡高**（min-height 仍 208px），
  而是摊成留白 —— 块间距 `--space-sm`(8px) → `--space-md`(16px)，余量由 `.card-foot` 的 `margin-top: auto` 吸收。
  连带删除 `getInitial()`（瓦片字形专用，已成死代码）。
  ⚠️ 顺带记下瓦片规格里的一个坑：MASTER 原写瓦片可用 `#1E1B4B` —— **该值就是浅色 `--text-primary`，
  深色下翻成近白，白字压白底必崩**。将来任何「深底白字形」一律 `--accent` + `--accent-fg`，别写死 hex。
- **[P3]** 操作按钮静息态用 `--text-secondary` 而非「常驻低透明度」（原 P3 做什么 §4 给的另一个选项）。
  理由同上：`opacity` 会把对比度打成不可预测的中间值。语义色（accent/warning/danger）只在 hover/focus 上。
- **[P3]** 浅色卡片用 `border: 1px solid transparent` 占位，而非 MASTER §4.1 的 `border: none`。
  视觉等价（都看不见），但两个主题盒模型一致 —— 深色补描边时不会因多出 1px 而整格重排。

### P3 期外挂：主题切换圆形揭示（用户报 bug → 修复 + 加效果）

> **这是 P1 基建改动，不属 P3 文件边界，因用户在 P3 session 中直接报障而顺带处理。**
> 改动文件：`useTheme.ts`、`main.css`。规格已写入 **MASTER §5.1**，此处只记过程与坑。

**用户原话**：「切换主题的时候不丝滑，有延迟、顿挫感」。

**根因（systematic-debugging 取证，非猜测）**：与性能无关 ——
JS 同步耗时 **0.7ms**、整档样式重算 **3.7ms**、**零 long task**。
真正原因是**为 hover 写的 transition 混进了主题翻转**：实测 68 个元素带颜色类过渡、
150ms 与 250ms 两档，加上无过渡的文字 0ms 到位 → 同一次切换**分三批到达**。
翻转瞬间同步读数可直接看到：`.account-name` 已是终值 `rgb(30,27,75)`，
而带 250ms 过渡的 `.card-cue` 仍停在旧主题的 `rgb(1,4,9)`。

**处置**：翻转做成原子（抑制过渡）+ 动效交给 View Transition 圆形揭示（用户指定，
源头 antfu.me，用户已在 `dplei/play.me · useDark.ts` 落地过一份）。两者缺一不可 ——
只加揭示不抑制过渡，揭示出来的区域里元素仍在各自 crossfade，会糊。

**踩坑记录**：
1. 🔴 **VT 会吃掉同步的抑制放开**。抑制逻辑本身没问题（隔离测试：绕开 VT 直接切，
   `transition-property` 确为 `none`、**0 条过渡**）。但放进 `startViewTransition` 回调里，
   同步 `delete` 标记后仍触发 **38 条** —— VT 期间浏览器挂起渲染，只在回调结束、
   恢复渲染时才比对新旧样式，那时标记已被删掉。**修法**：hold 到 `transition.finished.finally` 再放开。
2. 🔴 **放开必须走 `finally`**：连点时后一次 VT 跳过前一次，`finished` 会 **reject**；
   漏放 → `data-theme-switching` 残留 → **全局 hover 反馈永久失效**。已实测连点 4 次无残留。
3. ⚠️ **鼠标位移会污染 transition 计数**（本 session 亲测被骗两次）。
   `computer hover/click` 会真的移动物理光标，途经的卡片各自触发 hover 过渡，混进计数里报出假的
   「38 / 14 / 60 条」。**识别信号**：计数里出现 `transform` —— 主题翻转不改 transform，
   只有 `:hover` 会。**正确做法**：用 `dispatchEvent(new MouseEvent('click', {clientX, clientY}))`
   合成事件（物理鼠标不动），并且**只统计抑制窗口内**触发的过渡（窗口外的是 hover，本就该动）。
   如此复测：两个方向均 **0 条**。
4. ℹ️ **连点 4 次只净翻 1 次**：`theme.value` 现在在 VT 异步回调里才更新，同一 tick 的多次点击读到的都是旧值。
   与参照实现（antfu / play.me）行为一致，且 VT 本就会跳过中间态，视作防抖，**不修**。

**验收**（全部实测）
- [x] 抑制窗口内元素级过渡 **0 条**（light→dark 与 dark→light 双向，合成事件、无鼠标干扰）
- [x] 揭示参数正确：转暗 `::view-transition-old(root)` 反向收缩、转亮 `::view-transition-new(root)` 正向扩张，
      400ms / `ease-out` / `fill: forwards`
- [x] 中途截图确认：圆形边界锐利，圈内圈外均为终值，无半渡 crossfade
- [x] 连点 4 次无标记残留；事后 hover 时长复原（卡 0.25s / icon-btn 0.15s）
- [x] typecheck + lint 通过

### P4 实施中的回写（已改文档 + 已改代码）

- **[P4] 🔴 用户决策：SetupOverlay / LoginOverlay 撤掉 naive-ui `NButton`，改原生 token 按钮。**
  原计划（见下方「留给后续 phase」）是用 `theme-overrides` 把 naive-ui 的绿 primary 对齐 `--accent`。
  **实施时发现此路在 P4 走不通**：`theme-overrides` 只吃**字面色值**，喂 `var(--accent)` 会让 naive-ui
  内部的调色算法（hover / pressed / `primaryColorSuppl`）解析失败；要么在 JS 里再抄一份 hex（**正违反 §6**，且多一个漂移源），
  要么 `getComputedStyle` 读 token —— 而后者要跟 `useTheme` 那个**异步 VT 回调**抢时序，脆。
  两个遮罩统共 5 个按钮，改原生更省。**P4 三个文件现已零 naive-ui、零 JS 硬编码色。**
  ⚠️ **theme-overrides 这笔债没消，只是移交 P5**（`BanAccountModal` 的 `NDatePicker` 真的需要 naive-ui），
  且 `App.vue` 里两个 discrete dialog（删除确认 / 进程干涉）的绿按钮**仍未对齐**，P5 一并处理。
- **[P4] 🔴 用户决策：三个遮罩一律 `top: 48px`，不再盖住自绘标题栏。**
  原先三者都是 `top: 0` + z-index 100~1000，而遮罩自身没有 `-webkit-app-region: drag` ——
  **首启未绑定驱动时窗口既拖不动、也点不到最小化/关闭，只能 Alt+F4**（等待动画期最长 30s+ 同理）。
  已回写 MASTER §4.5，P5/P6 的弹窗照此办理。
- **[P4] 新增 token `--scrim`**（MASTER §2.1 / §4.5）。这是 **P2 换深色底色之后第二次动 token 层**。
  理由：§4.5 原把 `rgba(15,23,42,0.4)` 写死在组件里，与 §6「组件内不写死 hex」直接冲突，
  且 P4/P5/P6 共 8 个弹窗都要用它。深色另给 `rgba(1,4,9,0.6)` —— 浅色那版压在 `#0D1117` 上几乎看不出遮罩。
- **[P4] SetupOverlay 不用 `--scrim`，改不透明 `--bg-app`。**
  它是**首启门**（一个「页」），不是浮在内容上的弹窗；背后只有空账号列表，透出来是噪音。
  不透明底 + 应用自身的卡片语言，正面回应用户「不够清爽」的反馈。
- **[P4] 🔴 新增 MASTER §2.4 陷阱：深色 `*-soft` 是半透明的，比值随垫底而变，不是定值。**
  浅色 soft 全是实色，落哪都一样；深色是 `rgba(...,0.15)`，合成结果取决于背后那层。
  实测同一组 token 垫 `--bg-app` 与垫 `--bg-elevated` 能差 1 个多点
  （`--text-primary`/`--warning-soft` **11.93 → 10.59**；`--accent`/`--accent-soft` **5.49 → 6.13**）。
  §2.4 上半张表的深色数字测于 `--bg-app`，**弹窗里不能直接引用**。四组在两种垫底下均达标，故未因此改设计。
- **[P4] 顺手修掉的既有缺陷**（均属「样式与结构」范畴，未碰逻辑）：
  - `AddAccountModal` 4 个 `<label>` **全都没有 `for`**、input 也没 `id` —— 只是排版上像 label，读屏读不出关联。已补。
  - 「显示密码」眼睛按钮原带 `tabindex="-1"`，**键盘用户永远够不到**。已改为可聚焦 + `aria-label` + `aria-pressed`。
  - `.parsed-item` 原是 `div` + `@click`，键盘不可达 → 改 `<button type="button">`（同 P3 的 `.add-card`）。
  - 关闭键原是 `&times;` 字符 + `class="btn btn-icon"`，而 **`.btn-icon` 这个类 main.css 里从来没定义过**。
  - 「采用硬件加密」原带行内 `style="font-size: 0.7rem"` = **11.2px，破了 §2.2 的 12px 下限**。已改 `--text-xs`。
  - `LoginOverlay` 的转圈原是手搓 border（`4px solid rgba(255,255,255,0.1)` + 一条 accent 弧）——
    **白色描边在浅色主题下整圈隐形**，只剩一根弧线在转。已换 Lucide `LoaderCircle`。

### P5 实施中的回写（已改文档 + 已改代码）

- **[P5] 🔴 theme-overrides 的落地方式：`useTheme` 出 `naiveThemeOverrides`（唯一 accent 硬编码点）+ 弹窗内 `<n-config-provider abstract>`。**
  P4 把「theme-overrides 只吃字面色值、喂 `var()` 必崩」这笔债移交 P5，本 phase 解法：
  - 在 `useTheme.ts` 新增 `naiveThemeOverrides` computed，按 `theme` 在两份**字面 hex** 覆盖间切换
    （`common.primaryColor/Hover/Pressed/Suppl` = MASTER §2.1 `--accent` 系列副本；`common.borderRadius` 8px、
    `Card.borderRadius` 20px）。这是**全项目唯一被允许的 accent 硬编码**，已就地注释「改 MASTER §2.1 必须同步这里」。
    单一事实源，杜绝 P4 担心的「多一个漂移源」。
  - 三个弹窗各自 `import { useTheme }` 取 `{ naiveTheme, naiveThemeOverrides }`，用 `<n-config-provider abstract>`
    包住 naive 控件。`abstract` 关键：naive 的 NConfigProvider 默认会渲染一个 `<div class="n-config-provider">`
    包裹层（源码 `render(){ return !this.abstract ? h(tag,...) : slot }`），不加 `abstract` 会给 NModal 外面多一个空 div、
    给 Ban 的手写遮罩内部多一层无用 div。加 `abstract` → 只提供 provide/inject 主题上下文，零 DOM。
  - `Card.borderRadius:20px` 能作用到 NModal 外壳：`preset="card"` 内部渲染的就是 `NCard`（BodyWrapper.mjs 实证），
    Card 覆盖经 provider 合并后套到它头上；控件（NInput/NButton/NDatePicker）走 `common.borderRadius:8px`。
- **[P5] 🔴 naive 遮罩 `top:48px` 走全局 main.css（teleport 到 body，scoped 够不到）。**
  §4.5 要求「遮罩一律 top:48px」。Ban 是手写遮罩，scoped 里直接 `top:48px` 即可；但 Edit/Path 用 NModal，
  其 `.n-modal-mask` / `.n-modal-body-wrapper`（源码实证：两者皆 `position:fixed; inset:0`）被 teleport 到 body，
  组件 scoped 样式触达不到。故在 `main.css` 全局补一条 `.n-modal-mask,.n-modal-body-wrapper{top:48px!important}`
  + `.n-modal-mask` 换 `--scrim` 底 + `blur(4px)`。**这是继 P4 `--scrim` 之后第二次因弹窗需要动 main.css。**
  副作用（正向）：`App.vue` 两个 discrete dialog 用的是同一套 `.n-modal-*` 类，其遮罩**顺带也不再盖标题栏了**。
- **[P5] BanAccountModal 重做外壳 = 纯 token 化，非换范式。** 它本就是手写遮罩（不是 NModal），P5 只把
  硬编码 `rgba(0,0,0,.5)` 遮罩 / `rgba(30,41,59,.9)` 深玻璃底 / `.glass` / `.btn` 系列换成 §4.5 token
  （`--scrim` / `--bg-elevated` / `--radius-xl` / `--shadow-xl` / `--space-xl` + 深色 `--border-subtle` 描边），
  三个 `.btn` 页脚按钮改 naive `NButton`（与另两个弹窗一致，随 theme-overrides 走靛蓝/error）。
- **[P5] PathManagementModal 的 `.path-text.muted` 撤 `opacity:0.45`，改纯斜体。** 原 opacity 会把
  「未绑定/未关联」占位文字对比度压到不可读（浅色实测远低于 4.5）；`--text-secondary`（本就是 path-text 的色）
  压 `--bg-inset` 有 6.25 浅 / 6.68 深，空状态语义交给 `font-style: italic` 表达即可。

### ⚠️ 自动化测量的四个陷阱（P1/P2/P3/P4 各踩一个，后续 phase 务必注意）

P1 记录 CSS transition 陷阱，P2 踩到第二个，P3 踩到第三个。**叠加会产出完全虚假的"崩色"报告**：

1. **CSS transition**（P1 已记）：切 `data-theme` 后必须等过渡跑完再测。
   P2 实测：切换后立即测，`.icon-btn` 报 **2.80:1 FAIL**、胶囊非激活报 **2.54:1 FAIL**；
   等 150ms 过渡跑完后真值是 **6.89:1 / 6.25:1 PASS** —— 全是假警报。
2. **Vue 异步更新**（P2 新增）：`el.click()` 后**同步**读 DOM 读到的是**旧值**（Vue 更新在 nextTick）。
   P2 实测：连点排序胶囊后立刻断言，得到"点击完全无反应"的假象；分成两次工具调用（天然间隔）后一切正常。
   **正确做法**：`click()` 与断言分开成两次 `javascript_exec` 调用，不要在同一段脚本里同步断言。
3. **🔴 面板不绘制时，transition 会永久冻结在起始值**（P3 新增，比陷阱 1 恶劣得多）。
   陷阱 1 靠"等过渡跑完"能解；**这个等多久都不会解** —— 浏览器面板不合成时，transition 根本不推进。
   P3 实测：切深色后，带 `transition: color` 的 `<button>` 的 computed `color` **永远**停在浅色值
   （`--text-secondary` 变量已是 `#8b949e`，但 `color` 仍是 `#4b5563`），报 3 个假 FAIL（2.29 / 2.18 / 2.50）；
   同一张卡里没有 transition 的 `<span>` 却是正确的 5.62 PASS。`border-color` 同理冻结在 `transparent`，
   一度误判"深色卡片没描边"。
   **识别信号**：`screenshot` 连续 30s 超时 = 面板没在绘制 = 所有 transition 数据不可信。
   ⚠️ 该故障是**间歇性**的：P3 同一 session 内先是截图全超时（数据被污染），后又自行恢复、截图正常。
   所以「上次能截图」不代表这次数据干净 —— 别靠运气，直接用下面的做法。
   **自检**：同一个 token 组合在两个元素上给出矛盾的两个值，必是本陷阱，不是设计问题。
   **正确做法**：测量前先注入 `* { transition: none !important; animation: none !important }` 再读，
   一步到位拿静息值，顺带也免疫陷阱 1。P3 后半程即用此法，深色一次读全对，零假警报。
4. **🔴 文档没有焦点时，`:focus` / `:focus-visible` 一律不匹配 → 报「焦点环丢失」的假警报**（P4 新增）。
   P4 实测：`inp.focus()` 之后 `document.activeElement === inp` 为 **true**，
   但 `inp.matches(':focus')` 是 **false**、`outline-style` 读出来是 **none** —— 看起来就像全局焦点环没生效。
   根因：`document.hasFocus()` 为 false 时（面板在后台 / 从未真实点过），CSS 的 `:focus` 就不匹配，
   **`activeElement` 与 `:focus` 是两件事，别拿前者当后者的证据**。
   **识别信号**：`activeElement` 指着目标元素，`matches(':focus')` 却是 false。
   **正确做法**：先用 `computer` 真点一下页面把焦点给到文档（`document.hasFocus()` 转 true），
   再用真实 `Tab` 键走位、然后读 `outline`。P4 如此复测：`outline: 2px solid var(--accent)` 正常，
   Tab×3 能走到眼睛按钮。
   ℹ️ 另记：`outline-width` 读出 **1.71429px** 而非 2px 是**面板缩放**所致（非 bug），`resize_window` 到 700 也不生效
   （面板最小约 980 CSS px，dpr 2）。**窄宽回流要测就别指望 `resize_window`** ——
   直接给遮罩加 `width: Npx !important; right: auto !important` 压箱体，等价且可靠。

### 留给后续 phase（P1 未碰）

> **以下数据来自 P1 收尾时的主界面实测**（注入假账号数据掀开 SetupOverlay，渲染出 4 张卡片含封禁态）。
> 🔴 **[P2 起] 其中的「深色」数字全部作废** —— P2 已把深色底色换成 GitHub Dark（见上方回写），请按新底色复测。
> **浅色数字仍然有效**（浅色 token 自 P1 起未动）。
> ⚠️ **测量方法警告**：见上方「自动化测量的两个陷阱」，transition 与 Vue nextTick 都会产出假的"崩色"报告。

- ~~**[P2]** `App.vue` 排序栏 `.sort-btn` 激活态：浅色 **4.22:1** / 深色 **4.48:1**，均不达标。~~
  → **[P2 已解决]** 改胶囊后激活态走 `--bg-surface` + `--text-primary`，实测 **15.99 / 14.64**。
- ~~**[P2]** `App.vue` 的 `WeGame Edition` 标签：浅色仅 **2.84:1**，底色是行内硬编码深色（`rgb(20,20,48)`）。~~
  → **[P2 已解决]** 改 `--accent-soft` 底 + `--accent` 字，实测 **5.62 / 5.49**。
- ~~**[P2]** `.sort-direction`（↑↓ 排序方向指示器）继承了 `.sort-btn` 的配色，同样 4.22 / 4.48 不达标。~~
  → **[P2 已解决]** ↑↓ 字符换 Lucide `ArrowUp`/`ArrowDown`，随激活态胶囊走 `--text-primary`。
- ~~**[P3]** `AccountGrid.vue:291` `.login-text` 用 `var(--text-tertiary)` **承载文字** → 浅色 2.54 / 深色 3.76 均不达标。~~
  → **[P3 已解决]** 改 `--text-secondary`，实测 **7.56 浅 / 5.62 深**。
- ~~**[P3]** **封禁卡片是对比度重灾区**（`filter: grayscale(0.6)` 与低对比文字叠加）：`.login-text` 浅色跌到 **1.22:1**、
  `.status-text` **2.45:1**、`.account-id` **2.78:1**。~~
  → **[P3 已解决]** grayscale 整个删除，改 `--danger-soft` 底。复测：`.account-name` **14.61 浅 / 13.94 深**、
  `.login-text` **6.91 / 5.36**、`.account-id` **6.25 / 6.68**、chip 文字 **15.99 / 14.64**，全部达标。
- ~~**[P3]** `.account-card` 的 `transition: all 0.3s` 违反 MASTER §5。副作用：主题切换时整卡颜色渐变，且污染自动化对比度测量。~~
  → **[P3 已解决]** 收窄为 `transform` / `box-shadow` / `border-color`。
  ⚠️ 但**污染测量的根因不是它** —— 见上方陷阱 3，任何 `transition: color` 在不绘制的面板里都会冻结。
- **[P7]** `.account-card` 是 `<div>` + `@click`，**键盘无法触发登录**（Tab 只能到卡内三个操作按钮）。
  P3 未动：加 `tabindex` + `keydown` 属于新增交互行为，超出「只改样式、script 逻辑不动」的边界。
  P7 做全局 a11y 走查时统一处理（`.add-card` 已在 P3 顺手从 `<div>` 改成 `<button>`，天然可达）。
- ~~**[P4/P5]** naive-ui 默认 primary 绿（浅色 `#18a058` / 深色 `#63e2b7`）与 `--accent` 靛蓝调性不符，
  且白字压 `#18a058` 仅 **3.38:1**（实测 SetupOverlay 的「绑定 wegame.exe」按钮）→ 需 `theme-overrides` 对齐。~~
  → **[P4 部分解决]** P4 的两个遮罩已撤掉 `NButton` 改原生 token 按钮（实测 6.29 浅 / 5.98 深），**其文件内此债已清**。
  **但 `theme-overrides` 本身仍未做，移交 P5**：`BanAccountModal` 的 `NDatePicker` 需要 naive-ui，
  且 **`App.vue` 里两个 discrete dialog（删除确认 / 进程干涉）的绿按钮至今未对齐** —— 别忘了这两个。
  ⚠️ P5 动手前先读上方 P4 回写：`theme-overrides` 只吃字面色值，喂 `var()` 会让 naive-ui 内部调色算法解析失败。
  → **[P5 部分解决]** `theme-overrides` 基建已建好（`useTheme.naiveThemeOverrides`，见 P5 回写），三个弹窗内的 naive 控件
  已全部对齐靛蓝 + 圆角。**但 `App.vue` 的两个 discrete dialog 绿按钮仍未对齐** —— 本次用户明确只圈了三个弹窗文件，
  未动 `App.vue`。收尾很小：`App.vue` 的 `configProviderProps` 加 `themeOverrides: naiveThemeOverrides.value`、
  模板 `<n-config-provider>` 加 `:theme-overrides="naiveThemeOverrides"` 即可（消费同一份 override，零漂移）。
  ⚠️ 若改为在 `App.vue` 全局挂 override，三个弹窗内那几个 `<n-config-provider abstract>` 就变冗余（可留可删，merge 幂等）。
  **留给 P6 或一次独立的 App.vue 小改。**
- ~~**[P4]** SetupOverlay 首启页观感（用户已反馈"不够清爽"）—— 它仍穿着为深色玻璃拟态写的旧样式站在浅色底上，
  属 P1 预期中间态，P4 统一重做。~~
  → **[P4 已解决]** 整页重做：不透明 `--bg-app` 底 + §4.5 卡片 + `--warning-soft` 提示条 + `--bg-inset` 分区，
  正文改左对齐（原来整卡 `align-items: center`，居中的正文正是「不清爽」的元凶之一）。
