/* BotKit AI — Embeddable Chat Widget
 * Usage: <script src="https://your-domain.com/widget.js" data-url="https://your-domain.com/widget"></script>
 */
;(function () {
  var script = document.currentScript
  var WIDGET_URL =
    (script && script.getAttribute('data-url')) || window.location.origin + '/widget'

  // ── Styles ──────────────────────────────────────────────────────────────────
  var css = document.createElement('style')
  css.textContent = [
    '#_bk_btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;',
    'background:#2563EB;color:#fff;border:none;cursor:pointer;',
    'box-shadow:0 4px 16px rgba(37,99,235,0.45);z-index:2147483646;',
    'font-size:22px;transition:transform .2s,background .2s;display:flex;align-items:center;justify-content:center;}',
    '#_bk_btn:hover{transform:scale(1.08);background:#1D4ED8;}',
    '#_bk_frame{position:fixed;bottom:92px;right:24px;width:370px;height:560px;',
    'border:none;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,0.2);',
    'z-index:2147483645;transform-origin:bottom right;',
    'transition:opacity .2s,transform .2s;}',
    '#_bk_frame.bk-hidden{opacity:0;pointer-events:none;transform:scale(0.92);}',
    '@media(max-width:440px){#_bk_frame{right:0;bottom:80px;width:100vw;height:75vh;border-radius:16px 16px 0 0;}',
    '#_bk_btn{bottom:16px;right:16px;}}',
  ].join('')
  document.head.appendChild(css)

  // ── Button ──────────────────────────────────────────────────────────────────
  var btn = document.createElement('button')
  btn.id = '_bk_btn'
  btn.title = 'Chat with us'
  btn.innerHTML = '&#x1F4AC;'
  document.body.appendChild(btn)

  // ── iFrame ──────────────────────────────────────────────────────────────────
  var frame = document.createElement('iframe')
  frame.id = '_bk_frame'
  frame.src = WIDGET_URL
  frame.className = 'bk-hidden'
  frame.allow = 'microphone'
  document.body.appendChild(frame)

  // ── Toggle ──────────────────────────────────────────────────────────────────
  var open = false
  btn.addEventListener('click', function () {
    open = !open
    frame.className = open ? '' : 'bk-hidden'
    btn.innerHTML = open ? '&#x2715;' : '&#x1F4AC;'
  })
})()
