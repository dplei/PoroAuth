<script setup lang="ts">
import { Cpu, ExternalLink, Gamepad2, TriangleAlert } from 'lucide-vue-next'

defineProps<{
  driverLoaded: boolean
  wegameExePath: string | null
}>()

defineEmits<{
  (e: 'link-driver'): void
  (e: 'link-wegame'): void
}>()
</script>

<template>
  <div v-if="!driverLoaded || !wegameExePath" class="setup-overlay">
    <div class="setup-card">
      <header class="setup-card__head">
        <span class="setup-card__badge" aria-hidden="true">
          <TriangleAlert :size="20" />
        </span>
        <div class="setup-card__heading">
          <h2 class="setup-card__title">环境未完全就绪</h2>
          <p class="setup-card__subtitle">完成下列绑定后即可开始使用</p>
        </div>
      </header>

      <!-- MASTER §2.4 配方：soft 底 + 主色描边，文字必须 text-primary
           （浅色下 --warning 压 --warning-soft 仅 3.07:1，连图标都只是勉强过线） -->
      <p class="notice">
        <strong>注意：</strong>本程序主要针对 <strong>网吧版 WeGame</strong>
        进行深度适配定位。标准版或旧版由于结构不同可能遇挫。请务必保证启动后的首屏为原生态二维码扫码界面！
      </p>

      <!-- 驱动缺失 -->
      <section v-if="!driverLoaded" class="setup-item">
        <h3 class="setup-item__title">
          <Cpu :size="16" class="setup-item__icon" />
          底层键鼠驱动
        </h3>
        <p class="setup-item__desc">
          系统未检测到底层键鼠驱动 (dd63330.dll)，无法进行物理级注入拦截。
        </p>
        <div class="setup-item__actions">
          <button class="primary-btn" @click="$emit('link-driver')">绑定驱动 DLL</button>
          <a
            class="ghost-btn"
            href="https://github.com/ddxoft/master"
            target="_blank"
            rel="noreferrer"
          >
            <!-- GitHub 是品牌标识，非 emoji 图标，故保留内联 svg（Lucide 已移除品牌图标集） -->
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true">
              <path
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
              />
            </svg>
            前往 GitHub 获取
            <ExternalLink :size="13" class="ghost-btn__cue" />
          </a>
        </div>
      </section>

      <!-- WeGame 未关联 -->
      <section v-if="!wegameExePath" class="setup-item">
        <h3 class="setup-item__title">
          <Gamepad2 :size="16" class="setup-item__icon" />
          WeGame 执行程序
        </h3>
        <p class="setup-item__desc">
          未关联 WeGame 执行程序，PoroAuth 无法拦截和代办客户端的唤起清洗动作。
        </p>
        <div class="setup-item__actions">
          <button class="primary-btn" @click="$emit('link-wegame')">绑定 wegame.exe</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* ── 首启门 ──
   不用 --scrim：背后是空账号列表，透出来只是噪音。首启是一个「页」而非浮在内容上的弹窗，
   故走不透明 --bg-app，卡片沿用应用本身的卡片语言。
   top: 48px 让出自绘标题栏 —— 遮罩自身没有 -webkit-app-region: drag，
   盖住标题栏会导致首启时窗口拖不动、也点不到最小化/关闭。 */
.setup-overlay {
  position: fixed;
  top: 48px;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--bg-app);
  overflow-y: auto;
}

/* MASTER §4.5 弹窗规格 */
.setup-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  width: 100%;
  max-width: 500px;
  padding: var(--space-xl);
  background: var(--bg-elevated);
  border: 1px solid transparent;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
}

/* 深色下卡片与底色亮度接近，靠描边拉开层级（同 AccountGrid 的处理） */
:root[data-theme='dark'] .setup-card {
  border-color: var(--border-subtle);
}

.setup-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.setup-card__badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--warning-soft);
  border-radius: var(--radius-full);
  color: var(--warning);
}

.setup-card__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

/* 原为 --danger-color 红标题：这是「未就绪」不是「出错」，且红字压白底不达标 */
.setup-card__title {
  color: var(--text-primary);
  font-size: var(--text-h2);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.setup-card__subtitle {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

/* 原为 #fbbf24 字压 rgba(234,179,8,0.1) 底 → 浅色下必崩。
   §2.4 正解：文字走 --text-primary（15.42 浅 / 11.93 深），主色只留给描边。 */
.notice {
  padding: var(--space-md);
  background: var(--warning-soft);
  border-left: 4px solid var(--warning);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.notice strong {
  font-weight: 700;
}

.setup-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--bg-inset);
  border-radius: var(--radius-md);
}

.setup-item__title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  color: var(--text-primary);
  font-size: var(--text-h3);
  font-weight: 600;
}

.setup-item__icon {
  flex: none;
  color: var(--text-secondary);
}

.setup-item__desc {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  line-height: 1.6;
}

.setup-item__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

/* ── 按钮 ──
   原为 naive-ui type="primary"：默认绿 #18a058，白字仅 3.38:1，且与 --accent 靛蓝调性不符。
   theme-overrides 只吃字面色值（喂 var() 会让 naive-ui 内部调色算法解析失败），
   等于要在 JS 里再抄一份 hex → 改走原生按钮，全程 token。 */
.primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm) var(--space-md);
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  color: var(--accent-fg); /* 不可继承 --text-primary：浅色下深字压靛蓝仅 3.3:1 */
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--duration-fast) var(--ease);
}

.primary-btn:hover {
  background: var(--accent-hover);
}

/* 原为硬编码 #2b3137 底 + white 字（GitHub 品牌深灰），深色主题下与底色糊在一起 */
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease),
    border-color var(--duration-fast) var(--ease);
}

.ghost-btn:hover {
  background: var(--bg-surface-hover);
  border-color: var(--accent);
}

.ghost-btn__cue {
  flex: none;
  color: var(--text-secondary);
}
</style>
