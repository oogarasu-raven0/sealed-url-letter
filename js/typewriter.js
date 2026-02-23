// js/typewriter.js
// Markdown から生成された HTML を、1文字ずつ描画するタイプライター演出

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