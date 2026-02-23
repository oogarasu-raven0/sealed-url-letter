// js/main.js
// アプリ全体の制御：モード切り替え、暗号化/復号、封筒アニメーション、タイプライター、キーワード演出

import {
    encryptLetter,
    decryptLetter,
    encodeEncryptedPayload,
    decodeEncryptedPayload
  } from './crypto.js';
  import { startTypewriter } from './typewriter.js';
  import { decorateKeywords } from './effects.js';
  
  /**
   * 現在の URL から data クエリを取得
   */
  function getEncryptedDataParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('data');
  }
  
  /**
   * GitHub Pages 上でも動作しやすいようにベース URL を組み立てる
   * 例: https://user.github.io/repo/ + index.html を除去
   */
  function getBaseUrl() {
    const { origin, pathname } = window.location;
    const cleanPath = pathname.replace(/index\.html?$/i, '');
    return origin + cleanPath;
  }
  
  /**
   * URL 長の情報を生成
   */
  function formatUrlLengthInfo(url) {
    const len = url.length;
    return `URL 長: ${len.toLocaleString('ja-JP')} 文字`;
  }
  
  /**
   * ナビゲーション（作成 / 閲覧）タブを切り替え
   */
  function setupNavigation(createSection, viewSection, navCreate, navView) {
    function setMode(mode) {
      if (mode === 'create') {
        createSection.classList.add('panel--active');
        viewSection.classList.remove('panel--active');
        navCreate.classList.add('nav-button--active');
        navView.classList.remove('nav-button--active');
      } else {
        createSection.classList.remove('panel--active');
        viewSection.classList.add('panel--active');
        navCreate.classList.remove('nav-button--active');
        navView.classList.add('nav-button--active');
      }
    }
  
    navCreate.addEventListener('click', () => setMode('create'));
    navView.addEventListener('click', () => setMode('view'));
  
    // data パラメータがある場合は閲覧タブを優先表示
    const hasData = !!getEncryptedDataParam();
    setMode(hasData ? 'view' : 'create');
  }
  
  /**
   * 作成フォームのセットアップ
   */
  function setupCreateMode() {
    const form = document.getElementById('createForm');
    const textArea = document.getElementById('letterText');
    const imageUrlsArea = document.getElementById('imageUrls');
    const themeSelect = document.getElementById('themeSelect');
    const passwordInput = document.getElementById('createPassword');
    const resultSection = document.getElementById('resultSection');
    const urlInput = document.getElementById('generatedUrl');
    const copyButton = document.getElementById('copyUrlButton');
    const urlLengthInfo = document.getElementById('urlLengthInfo');
    const urlLengthWarning = document.getElementById('urlLengthWarning');
    const errorElem = document.getElementById('createError');
  
    if (
      !form ||
      !textArea ||
      !passwordInput ||
      !resultSection ||
      !urlInput ||
      !copyButton ||
      !urlLengthInfo ||
      !urlLengthWarning
    ) {
      return;
    }
  
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorElem.textContent = '';
  
      const text = textArea.value.trim();
      const password = passwordInput.value;
      const theme = themeSelect.value || 'default';
  
      if (!text) {
        errorElem.textContent = '本文を入力してください。';
        return;
      }
      if (!password) {
        errorElem.textContent = 'パスワードを入力してください。';
        return;
      }
  
      // 複数行の画像 URL を配列に変換
      const images = [];
      if (imageUrlsArea.value.trim()) {
        imageUrlsArea.value
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .forEach((line) => images.push(line));
      }
  
      const payload = {
        text,
        images,
        theme,
        createdAt: new Date().toISOString()
      };
  
      let encrypted;
      try {
        encrypted = await encryptLetter(payload, password);
      } catch (e) {
        console.error(e);
        errorElem.textContent =
          '暗号化中にエラーが発生しました。別のブラウザを試すか、設定を確認してください。';
        return;
      }
  
      const packed = encodeEncryptedPayload(encrypted);
      const shareUrl = `${getBaseUrl()}?data=${encodeURIComponent(packed)}`;
  
      urlInput.value = shareUrl;
      resultSection.hidden = false;
  
      // URL 長の情報と警告
      const len = shareUrl.length;
      urlLengthInfo.textContent = formatUrlLengthInfo(shareUrl);
      const WARNING_THRESHOLD = 1800; // 一般的な 2000 文字制限より少し余裕を持たせる
      if (len > WARNING_THRESHOLD) {
        urlLengthWarning.hidden = false;
      } else {
        urlLengthWarning.hidden = true;
      }
    });
  
    copyButton.addEventListener('click', async () => {
      if (!navigator.clipboard) {
        urlInput.select();
        document.execCommand('copy');
        return;
      }
      if (!urlInput.value) return;
      try {
        await navigator.clipboard.writeText(urlInput.value);
        copyButton.textContent = 'コピーしました';
        window.setTimeout(() => {
          copyButton.textContent = 'コピー';
        }, 1500);
      } catch (e) {
        console.error(e);
      }
    });
  }
  
  /**
   * 閲覧モードのセットアップ
   */
  function setupViewMode() {
    const viewHint = document.getElementById('viewHint');
    const viewContainer = document.getElementById('viewContainer');
    const envelope = document.getElementById('envelope');
    const viewForm = document.getElementById('viewForm');
    const passwordInput = document.getElementById('viewPassword');
    const openButton = document.getElementById('openButton');
    const errorElem = document.getElementById('viewError');
    const letterViewer = document.getElementById('letterViewer');
    const typingStatus = document.getElementById('typingStatus');
    const skipButton = document.getElementById('skipTypingButton');
    const letterScrollContainer = document.getElementById('letterScrollContainer');
    const letterContent = document.getElementById('letterContent');
  
    const encryptedParam = getEncryptedDataParam();
    const hasData = !!encryptedParam;
  
    if (!viewHint || !viewContainer) return;
  
    if (!hasData) {
      viewHint.classList.remove('hidden');
      viewContainer.hidden = true;
      return;
    }
  
    viewHint.classList.add('hidden');
    viewContainer.hidden = false;
  
    if (
      !envelope ||
      !viewForm ||
      !passwordInput ||
      !openButton ||
      !errorElem ||
      !letterViewer ||
      !typingStatus ||
      !skipButton ||
      !letterScrollContainer ||
      !letterContent
    ) {
      return;
    }
  
    let decryptedOnce = false;
  
    viewForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorElem.textContent = '';
  
      const password = passwordInput.value;
      if (!password) {
        errorElem.textContent = 'パスワードを入力してください。';
        return;
      }
  
      openButton.disabled = true;
      openButton.textContent = '復号中...';
  
      let encryptedObj;
      try {
        const packed = decodeURIComponent(encryptedParam);
        encryptedObj = decodeEncryptedPayload(packed);
      } catch (e) {
        console.error(e);
        errorElem.textContent = 'データの形式が不正です。URL が壊れている可能性があります。';
        openButton.disabled = false;
        openButton.textContent = '開封する';
        return;
      }
  
      let decrypted;
      try {
        decrypted = await decryptLetter(encryptedObj, password);
      } catch (e) {
        console.warn(e);
        // パスワード誤り・その他の理由はまとめて判定する
        errorElem.textContent = 'パスワードまたはデータが不正です。';
        openButton.disabled = false;
        openButton.textContent = '再試行';
        return;
      }
  
      if (!decrypted || typeof decrypted.text !== 'string') {
        errorElem.textContent = '復号に成功しましたが、データが壊れています。';
        openButton.disabled = false;
        openButton.textContent = '再試行';
        return;
      }
  
      if (decryptedOnce) {
        // 二重実行を防止
        return;
      }
      decryptedOnce = true;
  
      // 封筒開封アニメーション
      envelope.classList.add('envelope--open');
  
      // 手紙テーマを適用
      const theme = decrypted.theme || 'default';
      letterViewer.classList.remove(
        'letter-theme--default',
        'letter-theme--sepia',
        'letter-theme--night'
      );
      letterViewer.classList.add(`letter-theme--${theme}`);
  
      // Markdown -> HTML -> サニタイズ
      let html = decrypted.text;
      if (window.marked && typeof window.marked.parse === 'function') {
        html = window.marked.parse(decrypted.text);
      }
      if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
        html = window.DOMPurify.sanitize(html, {
          ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'class'],
          ALLOWED_TAGS: false // デフォルト許可タグ
        });
      }
  
      // 画像URLの表示（Markdown本文とは別に追加）
      if (Array.isArray(decrypted.images) && decrypted.images.length > 0) {
        const imagesHtml = decrypted.images
          .map((src) => {
            const safeSrc = String(src);
            return `<div class="external-image"><img src="${safeSrc}" alt="添付画像" loading="lazy"></div>`;
          })
          .join('');
        html += imagesHtml;
      }
  
      // 手紙ビューをフェードイン
      letterViewer.classList.remove('letter-viewer--hidden');
      typingStatus.textContent = 'タイプ表示中...';
  
      // タイプライター開始
      startTypewriter(letterContent, html, {
        interval: 18,
        skipButton,
        scrollContainer: letterScrollContainer,
        onComplete: () => {
          typingStatus.textContent = '表示完了';
          // キーワード装飾（全文表示後に行う）
          decorateKeywords(letterContent);
        }
      });
  
      // パスワードフォームは以降のみ再試行ボタン扱いに変更
      openButton.textContent = '開封済み';
    });
  }
  
  /**
   * 初期化
   */
  function init() {
    const createSection = document.getElementById('createSection');
    const viewSection = document.getElementById('viewSection');
    const navCreate = document.getElementById('navCreate');
    const navView = document.getElementById('navView');
  
    if (!createSection || !viewSection || !navCreate || !navView) {
      return;
    }
  
    setupNavigation(createSection, viewSection, navCreate, navView);
    setupCreateMode();
    setupViewMode();
  }
  
  document.addEventListener('DOMContentLoaded', init);