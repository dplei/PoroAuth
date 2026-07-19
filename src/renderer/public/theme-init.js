/**
 * 在 CSS 生效前定主题，避免启动瞬间闪白/闪黑。
 *
 * 必须是 head 里的同步外链脚本：
 *  - CSP 为 script-src 'self'，内联脚本会被拦截；
 *  - type="module" 会被 defer，跑在首次绘制之后，起不到防闪烁作用。
 *
 * 常量与 src/renderer/src/composables/useTheme.ts 保持一致，改一处必须改两处。
 */
;(function () {
  try {
    var stored = localStorage.getItem('poro-theme')
    document.documentElement.dataset.theme = stored === 'dark' ? 'dark' : 'light'
  } catch {
    document.documentElement.dataset.theme = 'light'
  }
})()
