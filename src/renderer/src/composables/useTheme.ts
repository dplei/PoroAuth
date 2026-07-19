import { computed, nextTick, ref } from 'vue'
import type { ComputedRef } from 'vue'
import { darkTheme, lightTheme } from 'naive-ui'
import type { GlobalTheme, GlobalThemeOverrides } from 'naive-ui'

export type Theme = 'light' | 'dark'

export interface UseThemeReturn {
  theme: ComputedRef<Theme>
  isDark: ComputedRef<boolean>
  /** 传给 NConfigProvider :theme 以及 createDiscreteApi 的 configProviderProps */
  naiveTheme: ComputedRef<GlobalTheme>
  /** 传给弹窗内 NConfigProvider :theme-overrides，把 naive-ui 控件的圆角/主色对齐设计系统 */
  naiveThemeOverrides: ComputedRef<GlobalThemeOverrides>
  setTheme: (next: Theme) => void
  /** 传入原生 click 事件即可从光标处圆形揭示；不传则瞬时切换 */
  toggleTheme: (event?: MouseEvent) => void
}

/** 与 src/renderer/public/theme-init.js 中的常量保持一致，改一处必须改两处。 */
const STORAGE_KEY = 'poro-theme'
const DEFAULT_THEME: Theme = 'light'
/** 圆形揭示时长。与 main.css 的 ::view-transition 规则同属一套效果，改这里不用改 CSS。 */
const REVEAL_DURATION = 400

/**
 * naive-ui 弹窗控件的 theme-overrides（圆角 + 主色对齐 MASTER 设计系统）。
 *
 * ⚠️ 这里的十六进制是 MASTER §2.1 `--accent` 系列的**副本**，不能写成 `var(--accent)`：
 * naive-ui 的 theme-overrides 只接受字面色值，喂 CSS 变量会让其内部调色算法
 * （hover / pressed / suppl 的派生）解析失败 —— 见 REDESIGN-PLAN 的 P4 回写。
 * 因此这是唯一被允许的 accent 硬编码点，**改 MASTER §2.1 的 accent 必须同步改这里**。
 *
 * 圆角：控件走 --radius-sm(8) / --radius-md(6)，弹窗外壳（NModal preset=card → NCard）走 --radius-xl(20)。
 */
const lightOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    primaryColor: '#4f46e5',
    primaryColorHover: '#4338ca',
    primaryColorPressed: '#3730a3',
    primaryColorSuppl: '#4338ca'
  },
  Card: { borderRadius: '20px' }
}

const darkOverrides: GlobalThemeOverrides = {
  common: {
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    primaryColor: '#818cf8',
    primaryColorHover: '#a5b4fc',
    primaryColorPressed: '#6366f1',
    primaryColorSuppl: '#a5b4fc'
  },
  Card: { borderRadius: '20px' }
}

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'dark' || value === 'light' ? value : null
  } catch {
    // localStorage 在某些环境下可能不可用，退回默认主题而不是崩掉
    return null
  }
}

function releaseTransitions(): void {
  delete document.documentElement.dataset.themeSwitching
}

/**
 * 把主题落到 DOM。
 *
 * 元素级 transition 是给 hover 写的（实测 68 个元素、150ms 与 250ms 两档）。放任它们参与
 * 主题翻转，同一次切换会分三批到达：无过渡的文字 0ms 到位、一批表面 150ms 才追上、
 * 另一批 250ms 才追上 —— 这正是「有延迟、顿挫感」的来源。故先禁过渡 → 落新色 →
 * 强制同步重算（让新色在「无过渡」状态下提交）→ 再放开；放开时颜色已是终值、不再变化，
 * 不会反过来触发一轮过渡。
 *
 * @param hold true 时不放开过渡，交由调用方在揭示动画结束后放开。
 *   View Transition 期间浏览器挂起渲染，只在回调结束、恢复渲染时才比对新旧样式；
 *   若在回调里同步放开，比对时过渡已重新可用，照样会触发（实测 38 条）。故 VT 路径必须 hold。
 */
function applyDom(next: Theme, hold = false): void {
  const root = document.documentElement
  root.dataset.themeSwitching = ''
  root.dataset.theme = next
  void root.offsetWidth
  if (!hold) releaseTransitions()

  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // 存不下就只在本次会话生效
  }
}

// 模块级单例，任何组件调用 useTheme() 拿到的都是同一份状态
const theme = ref<Theme>(readStored() ?? DEFAULT_THEME)

// theme-init.js 正常时这一步是幂等的；脚本未生效时由它兜底补上
document.documentElement.dataset.theme = theme.value

const themeRef = computed<Theme>(() => theme.value)
const isDark = computed(() => theme.value === 'dark')
const naiveTheme = computed<GlobalTheme>(() => (theme.value === 'dark' ? darkTheme : lightTheme))
const naiveThemeOverrides = computed<GlobalThemeOverrides>(() =>
  theme.value === 'dark' ? darkOverrides : lightOverrides
)

function setTheme(next: Theme): void {
  theme.value = next
  applyDom(next)
}

/**
 * 从光标处圆形扩散揭示新主题。实现照搬 antfu.me（antfu/antfu.me · src/logics/index.ts）。
 *
 * 关键点：
 *  - `fill: 'forwards'` 必须保留：否则动画结束时 clip-path 回弹到全显，会闪一下；
 *  - 「转暗动 old(root)、转亮动 new(root)」的配对必须与 main.css 里的 z-index 规则一致，
 *    两处对不上就会看到揭示方向反了；
 *  - 半径取到最远角（hypot），否则窗口角落会残留一块没被揭示到。
 */
function toggleTheme(event?: MouseEvent): void {
  const next: Theme = theme.value === 'dark' ? 'light' : 'dark'
  const supported = typeof document.startViewTransition === 'function'
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // 不支持 / 用户要求减少动效 / 非鼠标触发（拿不到坐标）→ 直接切。
  // 这条路径依然是原子的（apply 里已抑制过渡），只是没有揭示动画。
  if (!supported || reduceMotion || !event) {
    setTheme(next)
    return
  }

  const x = event.clientX
  const y = event.clientY
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )

  const transition = document.startViewTransition(async () => {
    theme.value = next
    applyDom(next, true) // hold：过渡要压到揭示动画结束，理由见 applyDom 注释
    await nextTick()
  })

  transition.ready
    .then(() => {
      const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`]
      document.documentElement.animate(
        {
          // isDark 此刻已是切换后的新状态：转暗时 old 层反向收缩，转亮时 new 层正向扩张
          clipPath: isDark.value ? [...clipPath].reverse() : clipPath
        },
        {
          duration: REVEAL_DURATION,
          easing: 'ease-out',
          fill: 'forwards',
          pseudoElement: isDark.value
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)'
        }
      )
    })
    .catch(() => {
      // 揭示没能开始（如被下一次切换打断）。主题已切好，放开过渡即可。
    })

  // 成功、被跳过、报错都要走到这里：否则 data-theme-switching 残留，hover 反馈会永久失效
  transition.finished.finally(releaseTransitions)
}

export function useTheme(): UseThemeReturn {
  return { theme: themeRef, isDark, naiveTheme, naiveThemeOverrides, setTheme, toggleTheme }
}
