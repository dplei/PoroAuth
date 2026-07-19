# PoroAuth Logo

**已选定：`v3-02-ledger`（备忘录 / 名册）** —— 呼应"通行名册"，石墨底 + 青色描边符号。
设计哲学见 [PHILOSOPHY.md](./PHILOSOPHY.md)。候选全览见 `contact-sheet-v3.png`。

## 两套形态，各司其职

| 用途 | 形态 | 原因 |
|------|------|------|
| **标题栏**（22px） | **内联 SVG**，写在 `App.vue` 的 `.app-logo` | 只有内联 SVG 能吃 `currentColor` → 跟随主题。`<img src="*.svg">` 做不到 |
| **应用图标** | PNG / ICO / ICNS 位图 | 系统任务栏、桌面、安装包不认 CSS 变量 |

标题栏 SVG 走 `color: var(--accent)`：浅色 `#4F46E5`（压底 5.73:1）、深色 `#818CF8`（压底 **6.34:1** 实测）。
它**不带 squircle 底板** —— 位图版的深色底板压在浅色标题栏上是一块突兀的深色方块。

## 位图产物

母版 3072px 超采样，每档独立 LANCZOS 降采样。

> **图标没有 SVG / Figma 源 —— `gen_v3.py` 就是唯一的源。**
> 它是确定性的：同一份代码重跑，产物 bit 级一致（已实测 MD5 不变）。要改图标就改脚本再重跑，
> 不要直接 P 图，否则源与产物立刻失同步。
>
> ```bash
> python design-system/poroauth/logo/gen_v3.py     # 重出 6 个候选（本目录）
> python design-system/poroauth/logo/apply_icon.py # 把选中的 ledger() 落地为全套应用图标
> ```
> 依赖 Pillow。两个脚本都用相对自身位置定位仓库根，可任意 clone 位置运行。

| 文件 | 尺寸 | 消费方 |
|------|------|--------|
| `build/icon.png` | 512 | electron-builder 源图 |
| `build/icon.ico` | 16/24/32/48/64/128/256 | Windows |
| `build/icon.icns` | 1024 | macOS |
| `resources/icon.png` | 512 | `src/main/index.ts` 的 `BrowserWindow` icon |

> `src/renderer/src/assets/icon.png` **已删除** —— 改内联 SVG 后全项目零引用。

## 改动时注意

SVG 与位图是**两份独立的几何**，改了一个必须同步另一个，否则标题栏和任务栏会长得不一样。
SVG 的 24 格几何：`rect x=5 y=3 w=14 h=18 rx=3` + 三行 `M9 9h6M9 13h6M9 17h3`，`stroke-width=2`。

## ⚠️ 本目录删除前必读（P7）

计划在合并时删掉整个 `design-system/`。但本目录里有两样**不是过程文档**的东西，
随手删掉会造成实际损失，P7 执行时必须先迁移：

1. **`gen_v3.py` + `apply_icon.py` 是产品资产的唯一源**（见上）。
   删掉 = 图标永久失去可编辑性。→ 迁到 `build/icons/` 或 `scripts/`，不要随 design-system 蒸发。
2. **上一节「SVG 与位图必须同步」是运行时约束**，约束的是 `App.vue`，不是设计过程。
   → 迁为 `App.vue` 中 `.app-logo` 处的代码注释。

其余（`PHILOSOPHY.md`、未选中的 5 个候选、`contact-sheet-v3.png`）是纯过程产物，随目录删除即可。
