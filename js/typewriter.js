// js/typewriter.js
// テキスト/HTML を、1文字ずつ描画するタイプライター演出

/**
 * タイプライター表示（テキスト版）
 * - `textContent` を使うので、HTML が途中で壊れたり XSS になる経路を避けられる
 * @param {HTMLElement} container
 * @param {string} text
 * @param {object} options
 * @param {number} [options.interval=20]
 * @param {HTMLElement} [options.skipButton]
 * @param {HTMLElement} [options.scrollContainer]
 * @param {() => void} [options.onComplete]
 */
export function startTypewriterText(container, text, options = {}) {
  const {
    interval = 20,
    skipButton,
    scrollContainer = container?.parentElement,
    onComplete
  } = options;

  if (!container) return;

  let index = 0;
  let cancelled = false;
  let timerId = null;

  const str = String(text ?? '');
  const length = str.length;
  container.textContent = '';

  function doScroll() {
    if (!scrollContainer) return;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
  }

  function finish() {
    container.textContent = str;
    doScroll();
    if (skipButton) skipButton.disabled = true;
    if (typeof onComplete === 'function') onComplete();
  }

  function step() {
    if (cancelled) return;
    index += 1;
    container.textContent = str.slice(0, index);
    doScroll();

    if (index < length) {
      timerId = window.setTimeout(step, interval);
    } else {
      if (skipButton) skipButton.disabled = true;
      if (typeof onComplete === 'function') onComplete();
    }
  }

  if (skipButton) {
    skipButton.disabled = false;
    skipButton.onclick = (event) => {
      event.preventDefault();
      cancelled = true;
      if (timerId != null) window.clearTimeout(timerId);
      finish();
    };
  }

  timerId = window.setTimeout(step, interval);
}

/**
 * タイプライター表示を開始する
 * @param {HTMLElement} container - 描画先要素（innerHTML を上書き）
 * @param {string} html - 最終的に表示したい HTML 文字列（既にサニタイズ済み想定）
 * @param {object} options
 * @param {number} [options.interval=20] - 1 文字あたりの遅延(ms)
 * @param {HTMLElement} [options.skipButton] - スキップボタン
 * @param {HTMLElement} [options.scrollContainer] - 自動スクロール対象。未指定なら container の親要素
 * @param {() => void} [options.onComplete] - 完了時コールバック
 */
export function startTypewriter(container, html, options = {}) {
    const {
      interval = 20,
      skipButton,
      scrollContainer = container.parentElement,
      onComplete
    } = options;
  
    if (!container) return;
  
    let index = 0;
    let cancelled = false;
    let timerId = null;
  
    const length = html.length;
    container.innerHTML = '';
  
    function doScroll() {
      if (!scrollContainer) return;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  
    function step() {
      if (cancelled) return;
      index += 1;
      container.innerHTML = html.slice(0, index);
      doScroll();
  
      if (index < length) {
        timerId = window.setTimeout(step, interval);
      } else {
        if (skipButton) {
          skipButton.disabled = true;
        }
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    }
  
    // スキップボタンの挙動
    if (skipButton) {
      skipButton.disabled = false;
      skipButton.onclick = (event) => {
        event.preventDefault();
        cancelled = true;
        if (timerId != null) {
          window.clearTimeout(timerId);
        }
        container.innerHTML = html;
        doScroll();
        skipButton.disabled = true;
        if (typeof onComplete === 'function') {
          onComplete();
        }
      };
    }
  
    // 開始
    timerId = window.setTimeout(step, interval);
  }