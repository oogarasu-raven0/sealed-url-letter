// js/effects.js
// 特定キーワードをハイライトし、hover/click でインタラクティブな演出を行う

const DEFAULT_KEYWORDS = ['ありがとう', 'さよなら', '秘密'];

/**
 * 正規表現用に文字列をエスケープ
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * コンテナ内のテキストノードを走査し、キーワードを含む部分を span でラップする
 * @param {HTMLElement} container
 * @param {string[]} [keywords]
 */
export function decorateKeywords(container, keywords = DEFAULT_KEYWORDS) {
  if (!container || !keywords.length) return;

  const pattern = keywords.map(escapeRegExp).join('|');
  const regex = new RegExp(pattern, 'g');

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        if (!regex.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        // 正規表現をもう一度使うので index をリセット
        regex.lastIndex = 0;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let current;
  while ((current = walker.nextNode())) {
    textNodes.push(current);
  }

  textNodes.forEach((node) => {
    const originalText = node.nodeValue;
    if (!originalText) return;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    regex.lastIndex = 0;
    while ((match = regex.exec(originalText)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;

      if (matchIndex > lastIndex) {
        frag.appendChild(
          document.createTextNode(originalText.slice(lastIndex, matchIndex))
        );
      }

      const span = document.createElement('span');
      span.textContent = matchText;
      span.className = 'keyword-highlight';
      span.dataset.keyword = matchText;

      span.addEventListener('click', () => {
        span.classList.toggle('keyword-highlight--active');
      });

      frag.appendChild(span);
      lastIndex = matchIndex + matchText.length;
    }

    if (lastIndex < originalText.length) {
      frag.appendChild(document.createTextNode(originalText.slice(lastIndex)));
    }

    if (node.parentNode) {
      node.parentNode.replaceChild(frag, node);
    }
  });
}