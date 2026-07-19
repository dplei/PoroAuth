# PoroAuth 设计系统 · MASTER

> **读法：** 构建某个页面/组件前，先看 `design-system/poroauth/pages/[name].md`。
> 存在则其规则**覆盖**本文件；不存在则严格遵循以下规则。
>
> **本文件是跨 session 的唯一事实源。** 任何 UI 决策以此为准，不要重新推导。

**项目：** PoroAuth (WeGame Edition) · Electron 39 + Vue 3.5 + naive-ui 2.44
**生成：** 2026-07-16 · 基于 ui-ux-pro-max v2.11.0 检索，并按本项目实际约束裁剪
**品类：** Productivity Tool (desktop utility)
**设计拨盘：** Variance 3/10 (Centered/Minimal) | Motion 4/10 (Standard) | Density 5/10 (Standard)
**视觉参照：** ISUX AI Hub —— 浅色底 + 纯白无边框卡片 + 柔和环境阴影 + 大标题混合字重 + 胶囊分段控件

---

## 0. 项目实际约束（覆盖检索默认值）

这些约束推翻了通用检索结果里的部分建议，**以本节为准**：

| 约束 | 事实 | 因此 |
|------|------|------|
| 窗口 | `BrowserWindow` 900×670，`frame: false`，可缩放 | **不做移动端断点**。375/768 断点无意义。只需保证 ≥900 正常、缩到 ~700 不错位 |
| 标题栏 | 自绘，`-webkit-app-region: drag` | 所有可点元素必须 `no-drag`，否则点不动 |
| 图标库 | `lucide-vue-next` 已是依赖 | 图标一律用 Lucide 组件。**禁止 emoji 当图标**（现存 🔗 ⚙️ 必须替换） |
| 动画库 | 无 GSAP，不引入 | 检索给的 GSAP 片段**不采用**，用 CSS `transition`，时长/缓动照抄其参数 |
| 字号基准 | 桌面工具，非网页 | body **14px**（非检索默认 16px），最小 12px。这是有意偏离，对标 Linear/VS Code 桌面密度 |
| 标题尺度 | 900px 窗口 | Hero **32px**。检索给的 `clamp(3rem,10vw,12rem)` 是 landing page 尺度，**不采用** |
| 页面模式 | 工具应用，非落地页 | 检索的 "Minimal Single Column / CTA 策略 / 转化率" 章节**整章不适用**，已删除 |

---

## 1. 主题策略

**双主题：浅色 + 深色，默认浅色。** 用户选择持久化。

- 浅色 = 参照图还原，主打
- 深色 = **GitHub Dark 冷中性灰**（游戏工具夜间使用场景真实存在）
  P2 用户决策：原方案「保留项目现有深色资产」的 slate-900 蓝调被否，改走行业标杆中性灰，彩色只留给 accent
- 切换入口：**内容区 Hero 行右上角**圆形图标按钮（月亮/太阳），与路径管理 / 坐标校正同组
  P2 修正：原写「标题栏右上角」，但标题栏右上已是最小化/关闭，且 §4.3 要求三个工具按钮成组，故统一放 Hero 行
- naive-ui 的 `NConfigProvider :theme` 必须跟随切换（`lightTheme` / `darkTheme`），否则弹窗内控件会和外壳打架

---

## 2. Token 层（P1 建立，后续所有 phase 只消费不新增）

### 2.1 语义 token

```css
:root {
  /* 表面 */
  --bg-app:            #F4F4F8;  /* 页面底：浅薰衣草灰 */
  --bg-surface:        #FFFFFF;  /* 卡片：纯白，无边框 */
  --bg-surface-hover:  #FFFFFF;
  --bg-inset:          #E9E9EF;  /* 胶囊控件轨道、代码块底 */
  --bg-elevated:       #FFFFFF;  /* 弹窗 */

  /* 文字 */
  --text-primary:      #1E1B4B;  /* 深靛黑 */
  --text-secondary:    #4B5563;  /* P1 实测修正：原 #6B7280 压 --bg-app 仅 4.41:1，不达 §7 */
  --text-tertiary:     #9CA3AF;  /* ⚠️ 仅装饰/占位。实测压 --bg-app 2.31:1、压 --bg-surface 2.54:1，不得承载正文 */

  /* 描边（浅色下极克制，卡片不用） */
  --border-subtle:     #E5E7EB;
  --border-strong:     #D1D5DB;

  /* 品牌 */
  --accent:            #4F46E5;  /* P1 实测修正：原 #6366F1 白字压它仅 4.47:1、压 --bg-app 仅 4.07:1 */
  --accent-hover:      #4338CA;  /* 随 --accent 顺移一档（indigo-700） */
  --accent-fg:         #FFFFFF;
  --accent-soft:       #EEF2FF;  /* 靛蓝浅底 */

  /* 弹窗遮罩底。P4 新增：§4.5 原把这个值写死在组件里，与 §6「组件内不写死 hex」直接冲突，
     且 P4/P5/P6 共 8 个弹窗都要用它 → 提为 token。这是 P2 换深色底色之后第二次动 token 层。 */
  --scrim:             rgba(15, 23, 42, 0.4);

  /* 状态 */
  --success:           #059669;
  --success-soft:      #ECFDF5;
  --warning:           #D97706;
  --warning-soft:      #FFFBEB;
  --danger:            #DC2626;
  --danger-soft:       #FEF2F2;

  /* 阴影：参照图的灵魂——极柔和环境阴影，不是硬投影 */
  --shadow-sm:  0 1px 2px rgba(16,24,40,0.04);
  --shadow-md:  0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.06);
  --shadow-lg:  0 2px 4px rgba(16,24,40,0.04), 0 12px 28px rgba(16,24,40,0.10);
  --shadow-xl:  0 8px 16px rgba(16,24,40,0.06), 0 24px 48px rgba(16,24,40,0.14);
}

/* 底色 = GitHub Dark (Primer) 冷中性灰。P2 用户决策：原 slate-900 (#0F172A) 蓝调过重被否。 */
:root[data-theme='dark'] {
  --bg-app:            #0D1117;  /* canvas.default */
  --bg-surface:        #161B22;  /* canvas.subtle */
  --bg-surface-hover:  #21262D;
  --bg-inset:          #010409;  /* canvas.inset */
  --bg-elevated:       #161B22;  /* canvas.overlay */

  --text-primary:      #E6EDF3;  /* fg.default */
  --text-secondary:    #8B949E;  /* fg.muted */
  --text-tertiary:     #6E7681;  /* fg.subtle。⚠️ 仍仅装饰/占位：压 --bg-surface 3.76:1 */

  --border-subtle:     #21262D;  /* border.muted */
  --border-strong:     #30363D;  /* border.default */

  --accent:            #818CF8;  /* 深色下提亮。压 GitHub Dark 底实测 6.37:1 */
  --accent-hover:      #A5B4FC;
  --accent-fg:         #0F172A;
  --accent-soft:       rgba(99,102,241,0.15);

  /* 浅色那版 slate 0.4 压在 #0D1117 上几乎看不出遮罩 → 深色改走 canvas.inset 并加浓 */
  --scrim:             rgba(1, 4, 9, 0.6);

  --success:           #34D399;
  --success-soft:      rgba(16,185,129,0.15);
  --warning:           #FBBF24;
  --warning-soft:      rgba(251,191,36,0.15);
  --danger:            #F87171;
  --danger-soft:       rgba(239,68,68,0.15);

  /* 深色下阴影几乎不可见 → 靠表面提亮做层级，阴影仅用于弹窗 */
  --shadow-sm:  none;
  --shadow-md:  0 2px 8px rgba(0,0,0,0.24);
  --shadow-lg:  0 8px 24px rgba(0,0,0,0.32);
  --shadow-xl:  0 16px 48px rgba(0,0,0,0.44);
}
```

### 2.2 尺度 token

```css
:root {
  /* 间距 (Density 5/10) */
  --space-xs: 4px;   --space-sm: 8px;   --space-md: 16px;
  --space-lg: 24px;  --space-xl: 32px;  --space-2xl: 48px;

  /* 圆角：参照图偏大圆角 */
  --radius-sm: 8px;   --radius-md: 12px;
  --radius-lg: 16px;  --radius-xl: 20px;  --radius-full: 9999px;

  /* 字号（桌面密度） */
  --text-display: 32px;  /* Hero，混合字重 */
  --text-h2:      20px;
  --text-h3:      16px;
  --text-body:    14px;
  --text-sm:      13px;
  --text-xs:      12px;  /* 下限，不得更小 */

  /* 动效 (Motion 4/10 Standard) */
  --ease:         cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration:      250ms;
}
```

### 2.3 向后兼容别名（P1 必须保留！）

现存 9 个组件仍在引用旧变量名。P1 建 token 层时**必须**同时保留下列别名，否则 P4–P6 未改造的组件会当场崩色：

```css
:root {
  --surface-color:  var(--bg-surface);
  --surface-hover:  var(--bg-surface-hover);
  --border-color:   var(--border-subtle);
  --accent-color:   var(--accent);
  --danger-color:   var(--danger);
  --warning-color:  var(--warning);  /* P1 补：SetupOverlay.vue:97 在用，原清单漏了 */
  --bg-gradient:    var(--bg-app);   /* 渐变退化为纯色 */
}
```
> ~~别名在 P7 收尾时统一清除。~~ **[P7 已完成]** 别名块与 `.glass`/`.btn`/`.btn-primary`/`.btn-danger`
> 兼容工具类已从 main.css 整段删除（删前 grep 全 `src` 证零消费方）。本小节仅作历史留存，现无对应代码。
>
> **P1 实测的实际消费方**（P7 清理时按此核对）：
> `--accent-color` ×13、`--danger-color` ×9、`--border-color` ×4、`--warning-color` ×1（组件内）；
> `--surface-color` / `--surface-hover` / `--bg-gradient` 仅被 `main.css` 自己的 `.glass` / `.btn` / `body` 消费。
> 注：`--text-primary` / `--text-secondary` / `--text-tertiary` 新旧同名，不属别名，不用清。

---

### 2.4 对比度实测矩阵（P2 建立 · 浏览器真实渲染实测，非手算）

> **这是事实源，不要重新推导，更不要手算。** P2 曾手算 `--danger`/`--danger-soft` 得 6.10:1，
> 实测只有 **4.41:1** —— 手算 sRGB 线性化极易出错，一律以本表为准。

**🔴 头号陷阱：浅色下三组状态 `*-soft` 底全部扛不住同族主色文字。**
只有 accent 组能过。深色下（GitHub Dark）四组全部达标。

| 前景 / 背景 | 浅色 | 深色 | 结论 |
|---|---|---|---|
| `--success` / `--success-soft` | **3.58** ❌ | 7.91 ✅ | 浅色仅够图标 |
| `--danger` / `--danger-soft` | **4.41** ❌ | 5.95 ✅ | 浅色仅够图标 |
| `--warning` / `--warning-soft` | **3.07** ❌ | 8.44 ✅ | 浅色仅够图标（最差） |
| `--accent` / `--accent-soft` | 5.62 ✅ | 5.49 ✅ | 双主题可承载文字 |
| `--text-primary` / `--success-soft` | 15.18 ✅ | 12.87 ✅ | **soft 底上写文字的正解** |
| `--text-primary` / `--danger-soft` | 14.61 ✅ | 13.94 ✅ | **soft 底上写文字的正解** |
| `--text-primary` / `--warning-soft` | 15.42 ✅ | 11.93 ✅ | **soft 底上写文字的正解** |
| `--text-secondary` / `--bg-surface` | 7.56 ✅ | 5.62 ✅ | |
| `--text-secondary` / `--bg-inset` | 6.25 ✅ | 6.68 ✅ | |
| `--text-tertiary` / `--bg-surface` | **2.54** ❌ | **3.77** ❌ | 双主题均不得承载正文 |
| `--accent-fg` / `--accent` | 6.29 ✅ | 5.98 ✅ | 主按钮安全；P3 亦用于 hover 态的 ↗ 提示 |
| `--text-primary` / `--bg-surface` | 15.99 ✅ | 14.64 ✅ | P3 补：卡片标题 / 反相 chip 文字 |
| `--text-secondary` / `--danger-soft` | 6.91 ✅ | 5.36 ✅ | P3 补：封禁卡上的次级文字 |
| `--danger` / `--bg-surface` | 4.83 ✅ | 6.25 ✅ | P3 补：反相 chip 的描边与图标 |
| `--text-primary` / `--bg-inset` | 13.22 ✅ | 17.38 ✅ | P4 补：输入框 / 内嵌区正文 |
| `--text-primary` / `--accent-soft` | 14.30 ✅ | 12.49 ✅ | P4 补：智能粘贴区正文 |
| `--accent` / `--bg-elevated` | 6.29 ✅ | **5.80** ✅ | P4 补：弹窗内的进度文字 |
| `--success` / `--bg-elevated` | **3.77** ⚠️ | 9.00 ✅ | P4 补：**浅色仅够图标**，不得承载文字 |

> **⚠️ P4 新增陷阱：深色的 `*-soft` 是半透明的，比值随「垫在下面的是什么」而变，不是定值。**
> 浅色的 soft 全是实色（`#FFFBEB` 等），落到哪都一样；深色却是 `rgba(...,0.15)` ——
> 合成结果取决于背后那层。同一组 token 在 `--bg-app`(#0D1117) 上和在 `--bg-elevated`(#161B22) 上能差 1 个多点：
>
> | 组合（深色） | 垫 `--bg-app` | 垫 `--bg-elevated` |
> |---|---|---|
> | `--text-primary` / `--warning-soft` | 11.93 | **10.59** |
> | `--warning` / `--warning-soft` | 8.44 | **7.50** |
> | `--accent` / `--accent-soft` | 5.49 | **6.13** |
> | `--danger` / `--danger-soft` | 5.95 | **5.39** |
>
> 本表上半部分的深色数字测于 `--bg-app`。**弹窗里（垫 `--bg-elevated`）请用这张小表**，
> 或就地复测 —— 别把「在主界面测过了」当成「在弹窗里也成立」。四组在两种垫底下均达标，故 P4 未因此改设计。

**做状态 chip 的正确配方**（P2 已在 update chip 上验证）：
```css
.chip {
  background: var(--success-soft);   /* 底：soft */
  border: 1px solid var(--success);  /* 描边：主色（非文字，3:1 即可） */
  color: var(--text-primary);        /* 文字：必须 text-primary，不能用 --success */
}
.chip__icon { color: var(--success); } /* 图标：主色 OK（非文字） */
```
> 判定标准：**文字 4.5:1，图标/描边等非文字 3:1**（WCAG 1.4.3 / 1.4.11）。
> 浅色 `--warning` 压 `--warning-soft` 只有 3.07，**连图标都只是勉强过线**，别再压深底色。

---

## 3. 字体

**Plus Jakarta Sans**（标题 + 正文同族）

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
```

⚠️ **离线风险**：Electron 应用断网时 Google Fonts 拉不到，会回退。现有 `main.css` 已在用远程 Inter，同样有此问题。
**决策：P1 将字体文件下载到 `src/renderer/src/assets/fonts/` 本地自托管**，`@font-face` 引入，彻底去掉远程依赖。回退栈：
```css
font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
```

---

## 4. 组件规格（源自参照图）

### 4.1 卡片 —— 本次改造的核心签名

```css
.card {
  background: var(--bg-surface);
  border: none;                    /* ← 关键：参照图卡片无描边 */
  border-radius: var(--radius-lg); /* 16px */
  padding: var(--space-lg);        /* 24px */
  box-shadow: var(--shadow-md);
  transition: box-shadow var(--duration) var(--ease),
              transform var(--duration) var(--ease);
  cursor: pointer;
}
.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```
> 深色主题下 `border: none` 会糊成一片 → 深色下补 `border: 1px solid var(--border-subtle)`。

**卡片内部结构：**
- 左上：标题 `--text-h3` / 600
- 右上：小号圆形 ↗（承载主操作暗示）
- 其下：描述 `--text-sm` / `--text-secondary`，最多 2 行
- 底部：次级信息与操作，`margin-top: auto` 钉底（同行卡片底边自然对齐）

> **🔴 P3 用户决策：删除原「左上 44×44 图标瓦片」。**
> 原规格照搬参照图，但本项目卡片还要承载状态 chip + 三个操作按钮，瓦片独占一整行后整卡过挤。
> 用户要求撤掉瓦片、把省下的一行摊成留白。**后续 phase 不要再把瓦片加回来。**
> 另记：原规格写瓦片可用深底 `#1E1B4B` —— 该值即浅色 `--text-primary`，**深色下会翻成近白，白字压白底必崩**。
> 将来若有别处要做「深底白字形」，一律用 `--accent` + `--accent-fg`（实测 6.29 浅 / 5.98 深），不要写死 `#1E1B4B`。

### 4.2 胶囊分段控件（参照图"应用/实践" → 本项目排序栏）

```css
.segmented { background: var(--bg-inset); border-radius: var(--radius-full); padding: 4px; }
.segmented__item { border-radius: var(--radius-full); padding: 8px 20px; font-weight: 600; }
.segmented__item--active { background: var(--bg-surface); box-shadow: var(--shadow-sm); }
```

### 4.3 圆形图标按钮（参照图右上角）

36×36，`--radius-full`，透明底，hover 填 `--bg-inset`。承载：路径管理、坐标时序校正、主题切换。

### 4.4 Hero 标题（混合字重）

参照图 "**ISUX** AI Hub" = 800 + 300 两段字重拼接。
本项目：`<strong>PoroAuth</strong> 通行名册`，`--text-display` / `letter-spacing: -0.02em`。

### 4.5 弹窗

```css
.modal-overlay { background: var(--scrim); backdrop-filter: blur(4px); }
.modal {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  box-shadow: var(--shadow-xl);
  max-width: 500px;
}
```
> **P4 修正：** 遮罩底原写死 `rgba(15,23,42,0.4)`，与 §6 冲突且深色下几乎看不出来 → 已提为 `--scrim`（§2.1）。
>
> **定位：** 遮罩一律 `top: 48px`，**不要盖住 48px 自绘标题栏**。
> 遮罩自身没有 `-webkit-app-region: drag`，盖上去会让整个弹窗期窗口既拖不动、也点不到最小化/关闭。
> P4 用户决策，三个遮罩已统一；P5/P6 照此办理。
>
> **深色补描边：** `--bg-elevated` 与 `--bg-app` 亮度接近，深色下弹窗会糊进底色 →
> 补 `border: 1px solid var(--border-subtle)`（浅色用 `transparent` 占位，保持两主题盒模型一致，同 §4.1）。

---

## 5. 动效

Hover 微交互 · Standard 档 · **250ms** · `cubic-bezier(0.4,0,0.2,1)`

```css
transition: transform 250ms var(--ease), box-shadow 250ms var(--ease);
/* hover: translateY(-2px) + shadow-lg */
```

- ✅ 必须配对：hover 进入与离开用同一组属性反向过渡
- ❌ 不要动画 `width`/`height`，只动 `transform`/`opacity`/`box-shadow`
- ❌ 不做纯装饰动画（现有 `badgeFloat` 无限呼吸动画需复审）
- ✅ 必须响应 `prefers-reduced-motion: reduce`

### 5.1 主题切换 —— 圆形扩散揭示（P3 期用户决策，实现见 `useTheme.ts` + `main.css`）

**动效由 View Transition 统一承担，元素级 transition 必须让路。** 这是一条铁律，理由如下：

`transition` 是给 **hover** 写的，**不该参与主题翻转**。全项目实测 68 个元素带颜色类过渡、
分 150ms 与 250ms 两档，若放任它们参与翻转，同一次切换会**分三批到达**
（无过渡的文字 0ms、一批 150ms、一批 250ms）→ 即用户报的「不丝滑、有延迟、顿挫感」。
实测：JS 同步耗时仅 **0.7ms**、整档样式重算 **3.7ms**、零 long task —— **卡顿与性能无关，纯粹是过渡在打架**。

规格：
- 翻转本身必须**原子**：`useTheme.applyDom()` 换色一瞬打上 `data-theme-switching`，
  由 `main.css` 的 `:root[data-theme-switching] * { transition: none !important }` 禁掉全部过渡
- 动效走 `document.startViewTransition` + `clip-path` 圆形从**光标处**扩散，400ms `ease-out`
- 半径 = `hypot(max(x, innerW-x), max(y, innerH-y))`（取到最远角，否则角落残留未揭示）
- 转暗动 `::view-transition-old(root)`（反向收缩），转亮动 `::view-transition-new(root)`（正向扩张）；
  **此配对与 `main.css` 的 z-index 规则必须一致，对不上揭示方向就反了**
- 不支持 VT / `prefers-reduced-motion` / 无鼠标坐标 → 回落为瞬时切换（仍是原子的）

> ⚠️ **VT 路径必须 hold 住抑制标记直到揭示结束**（`transition.finished.finally` 放开）。
> View Transition 期间浏览器挂起渲染，只在回调结束、恢复渲染时才比对新旧样式 ——
> 在回调里同步放开，比对时过渡已重新可用，照样会触发（实测 38 条）。
> 放开必须走 `finally`：VT 被连点打断时 `finished` 会 reject，漏放则标记残留、**hover 反馈永久失效**。

---

## 6. 反模式（禁止）

- ❌ **Emoji 当图标** —— 用 Lucide SVG（现存 🔗 ⚙️ 必须替换）
- ❌ 可点元素缺 `cursor: pointer`
- ❌ 文字对比度低于 4.5:1
- ❌ 瞬时状态切换（必须 150–300ms 过渡）
- ❌ 焦点态不可见（`:focus-visible` 必须有可见环）
- ❌ AI 味紫粉渐变
- ❌ 组件内写死 hex（一律走 token）
- ❌ 深色下直接套用浅色阴影（看不见，且脏）

---

## 7. 交付前检查清单

每个 phase 收尾都要过：

- [ ] 无 emoji 图标，图标全部来自 Lucide
- [ ] 所有可点元素有 `cursor: pointer`
- [ ] hover 过渡 150–300ms
- [ ] **浅色**下文字对比度 ≥ 4.5:1
- [ ] **深色**下文字对比度 ≥ 4.5:1
- [ ] `:focus-visible` 焦点环可见（键盘可导航）
- [ ] `prefers-reduced-motion` 已响应
- [ ] 标题栏可点元素带 `-webkit-app-region: no-drag`
- [ ] 窗口缩至 ~700px 宽不错位、无横向滚动
- [ ] 组件内无新增硬编码颜色
- [ ] 双主题各自截图确认
