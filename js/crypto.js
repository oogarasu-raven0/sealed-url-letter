// js/crypto.js
// Web Crypto API を用いた AES-GCM + PBKDF2 ベースの暗号化ユーティリティ
// - パスワードから PBKDF2 で鍵を導出
// - ランダム salt / iv 生成
// - Base64URL 形式でシリアライズ

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 256; // bits
const AES_ALGO = 'AES-GCM';

/**
 * ブラウザが必要な機能をサポートしているか確認
 */
export function isCryptoAvailable() {
  return (
    typeof window !== 'undefined' &&
    window.crypto != null &&
    window.crypto.subtle != null
  );
}

/**
 * 指定バイト長のランダム値を生成
 */
function getRandomBytes(length) {
  const arr = new Uint8Array(length);
  window.crypto.getRandomValues(arr);
  return arr.buffer;
}

/**
 * ArrayBuffer -> Base64URL
 */
function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  let base64 = window.btoa(binary);
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return base64;
}

/**
 * Base64URL -> ArrayBuffer
 */
function base64UrlToArrayBuffer(base64url) {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  const binary = window.atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

/**
 * パスワードから AES-GCM 鍵を PBKDF2 により導出
 */
async function deriveKeyFromPassword(password, saltBuffer) {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: AES_ALGO,
      length: KEY_LENGTH
    },
    false,
    ['encrypt', 'decrypt']
  );

  return aesKey;
}

/**
 * JSONオブジェクトを暗号化する
 * @param {object} data - 暗号化するオブジェクト
 * @param {string} password - パスワード
 * @returns {Promise<{salt: string, iv: string, ciphertext: string}>}
 */
export async function encryptLetter(data, password) {
  if (!isCryptoAvailable()) {
    throw new Error('このブラウザは必要な暗号APIをサポートしていません。');
  }
  const encoder = new TextEncoder();
  const plaintextJson = JSON.stringify(data);
  const plaintextBytes = encoder.encode(plaintextJson);

  const saltBuffer = getRandomBytes(16);
  const ivBuffer = getRandomBytes(12); // AES-GCM 推奨 96bit

  const key = await deriveKeyFromPassword(password, saltBuffer);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: AES_ALGO,
      iv: ivBuffer
    },
    key,
    plaintextBytes
  );

  return {
    salt: arrayBufferToBase64Url(saltBuffer),
    iv: arrayBufferToBase64Url(ivBuffer),
    ciphertext: arrayBufferToBase64Url(ciphertextBuffer)
  };
}

/**
 * 暗号化されたデータを復号する
 * @param {{salt: string, iv: string, ciphertext: string}} encrypted
 * @param {string} password
 * @returns {Promise<object>} 復号された JSON オブジェクト
 */
export async function decryptLetter(encrypted, password) {
  if (!isCryptoAvailable()) {
    throw new Error('このブラウザは必要な暗号APIをサポートしていません。');
  }
  const saltBuffer = base64UrlToArrayBuffer(encrypted.salt);
  const ivBuffer = base64UrlToArrayBuffer(encrypted.iv);
  const ciphertextBuffer = base64UrlToArrayBuffer(encrypted.ciphertext);

  const key = await deriveKeyFromPassword(password, saltBuffer);

  let plaintextBuffer;
  try {
    plaintextBuffer = await window.crypto.subtle.decrypt(
      {
        name: AES_ALGO,
        iv: ivBuffer
      },
      key,
      ciphertextBuffer
    );
  } catch (e) {
    // パスワード誤り・データ破損などの詳細は隠し、汎用メッセージに任せる
    throw new Error('DecryptFailed');
  }

  const decoder = new TextDecoder();
  const plaintextJson = decoder.decode(plaintextBuffer);
  try {
    return JSON.parse(plaintextJson);
  } catch (e) {
    throw new Error('InvalidPlaintext');
  }
}

/**
 * {salt, iv, ciphertext} を JSON → UTF-8 → Base64URL にまとめて変換
 * URL の data パラメータとして安全に埋め込めるようにする
 */
export function encodeEncryptedPayload(encryptedObject) {
  const encoder = new TextEncoder();
  const json = JSON.stringify(encryptedObject);
  const bytes = encoder.encode(json);
  return arrayBufferToBase64Url(bytes.buffer);
}

/**
 * Base64URL から {salt, iv, ciphertext} を復元
 */
export function decodeEncryptedPayload(payloadString) {
  const buffer = base64UrlToArrayBuffer(payloadString);
  const decoder = new TextDecoder();
  const json = decoder.decode(buffer);
  const obj = JSON.parse(json);
  if (
    !obj ||
    typeof obj.salt !== 'string' ||
    typeof obj.iv !== 'string' ||
    typeof obj.ciphertext !== 'string'
  ) {
    throw new Error('InvalidEncryptedPayload');
  }
  return obj;
}
