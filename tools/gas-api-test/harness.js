/* Minimal stand-in for the Apps Script runtime + an in-memory content repository,
   so the API layer in gas/Code.js can be exercised locally. */
const fs = require('fs');
const vm = require('vm');

const repo = new Map();           // path -> utf8/base64 content
const props = new Map();
const cache = new Map();
const OWNER = 'owner@example.com';
const mails = [];

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const Utilities = {
  Charset: { UTF_8: 'UTF-8' },
  getUuid: uuid,
  sleep: () => {},
  base64Encode(data) {
    if (typeof data === 'string') return Buffer.from(data, 'utf8').toString('base64');
    return Buffer.from(data).toString('base64');
  },
  base64Decode: (s) => Array.from(Buffer.from(s, 'base64')),
  newBlob: (bytes) => ({ getDataAsString: () => Buffer.from(bytes).toString('utf8') }),
  formatDate(d, tz, fmt) {
    const p = (n) => String(n).padStart(2, '0');
    if (fmt === 'yyyy-MM-dd') return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
  }
};

function ghResponse(code, body, contentType) {
  return {
    getResponseCode: () => code,
    getContentText: () => body,
    getContent: () => Buffer.from(body),
    getBlob: () => ({ getBytes: () => Array.from(Buffer.from(body)), getContentType: () => contentType || 'image/jpeg' })
  };
}

const UrlFetchApp = {
  fetch(url, params) {
    params = params || {};
    const method = (params.method || 'get').toLowerCase();
    const m = url.match(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+\/contents\/([^?]*)/);
    if (m) {
      const path = decodeURIComponent(m[1].split('/').map(decodeURIComponent).join('/'));
      if (method === 'get') {
        if (repo.has(path)) return ghResponse(200, JSON.stringify({ sha: 'sha-' + path, content: repo.get(path) }));
        const children = [...repo.keys()].filter(k => k.startsWith(path + '/'));
        if (children.length) {
          return ghResponse(200, JSON.stringify(children.map(k => ({ type: 'file', name: k.slice(path.length + 1), path: k }))));
        }
        return ghResponse(404, '{"message":"Not Found"}');
      }
      if (method === 'put') {
        const payload = JSON.parse(params.payload);
        repo.set(path, payload.content);
        return ghResponse(200, JSON.stringify({ content: { path } }));
      }
      if (method === 'delete') {
        repo.delete(path);
        return ghResponse(200, '{}');
      }
    }
    if (/^https?:\/\//.test(url)) {
      // any other address is treated as a downloadable image
      if (url.includes('missing')) return ghResponse(404, 'nope');
      const ext = (url.split('?')[0].match(/\.([a-z0-9]{2,4})$/i) || [, 'jpg'])[1].toLowerCase();
      return ghResponse(200, 'FAKE-IMAGE-BYTES', 'image/' + (ext === 'jpg' ? 'jpeg' : ext));
    }
    throw new Error('unexpected fetch ' + url);
  }
};

const sandbox = {
  console,
  JSON, Math, Date, Number, String, Object, Array, Boolean, isFinite, parseInt, parseFloat, RegExp, Error,
  Utilities,
  UrlFetchApp,
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => (props.has(k) ? props.get(k) : null),
      setProperty: (k, v) => props.set(k, v),
      deleteProperty: (k) => props.delete(k),
      getProperties: () => Object.fromEntries(props)
    })
  },
  CacheService: {
    getScriptCache: () => ({
      get: (k) => (cache.has(k) ? cache.get(k) : null),
      put: (k, v) => cache.set(k, v),
      remove: (k) => cache.delete(k)
    })
  },
  Session: {
    getEffectiveUser: () => ({ getEmail: () => OWNER }),
    getScriptTimeZone: () => 'Asia/Ho_Chi_Minh'
  },
  ScriptApp: { getService: () => ({ getUrl: () => 'https://script.example/exec' }) },
  MailApp: { sendEmail: (o) => mails.push(o), getRemainingDailyQuota: () => 100 },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
  ContentService: {
    MimeType: { JSON: 'json' },
    createTextOutput: (t) => ({ setMimeType: () => ({ body: t, json: JSON.parse(t) }) })
  },
  HtmlService: { createTemplateFromFile: () => { throw new Error('not used'); } },
  SpreadsheetApp: { openById: () => { throw new Error('sheet not available in harness'); } }
};

vm.createContext(sandbox);
const codePath = process.env.CODE_PATH || require('path').join(__dirname, '..', '..', 'gas', 'Code.js');
vm.runInContext(fs.readFileSync(codePath, 'utf8'), sandbox, { filename: 'Code.js' });

module.exports = { sandbox, repo, props, cache, OWNER, Utilities };
