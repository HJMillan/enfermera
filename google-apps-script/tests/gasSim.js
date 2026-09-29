// Simulador mínimo de Apps Script (hojas en memoria) para probar Code.gs en Node.
import fs from 'node:fs';
import vm from 'node:vm';

function makeSheet(name) {
  const s = {
    name, data: [], formats: {}, maxRows: 1000, maxCols: 26, deleted: [],
    getLastRow() { return s.data.length; },
    getLastColumn() { return s.data.reduce((m, r) => Math.max(m, r.length), 0); },
    getMaxRows() { return s.maxRows; },
    getMaxColumns() { return s.maxCols; },
    insertColumnsAfter(_, n) { s.maxCols += n; },
    insertRowsAfter(_, n) { s.maxRows += n; },
    setFrozenRows() {},
    deleteRow(r) { s.data.splice(r - 1, 1); },
    getRange(row, col, nr = 1, nc = 1) {
      if (row + nr - 1 > s.maxRows) throw new Error('range fuera de maxRows');
      const rng = {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const r = s.data[row - 1 + i] || [];
            const line = [];
            for (let j = 0; j < nc; j++) line.push(r[col - 1 + j] === undefined ? '' : r[col - 1 + j]);
            out.push(line);
          }
          return out;
        },
        getDisplayValues() { return rng.getValues().map((r) => r.map((v) => String(v))); },
        getValue() { return rng.getValues()[0][0]; },
        setValues(vals) {
          for (let i = 0; i < vals.length; i++) {
            while (s.data.length < row + i) s.data.push([]);
            const r = s.data[row - 1 + i];
            for (let j = 0; j < vals[i].length; j++) r[col - 1 + j] = vals[i][j];
          }
          return rng;
        },
        setValue(v) { return rng.setValues([[v]]); },
        setNumberFormat() { return rng; },
        setNumberFormats() { return rng; },
        setFontWeight() { return rng; },
        setBackground() { return rng; },
      };
      return rng;
    },
  };
  return s;
}

const sheets = {};
const mails = [];
const cacheStore = {};
let props = {};
const ss = {
  getSheetByName: (n) => sheets[n] || null,
  insertSheet: (n) => (sheets[n] = makeSheet(n)),
  getName: () => 'test',
};
const pad = (n) => String(n).padStart(2, '0');
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, flush() {}, getUi: () => ({ alert() {} }) },
  ContentService: {
    MimeType: { JSON: 'json', JAVASCRIPT: 'js' },
    createTextOutput: (t) => ({ t, setMimeType() { return this; }, getContent() { return t; } }),
  },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null }) },
  LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
  CacheService: { getScriptCache: () => ({ get: (k) => cacheStore[k] || null, put: (k, v) => { cacheStore[k] = v; }, remove: (k) => { delete cacheStore[k]; } }) },
  MailApp: { sendEmail: (m) => mails.push(m) },
  Utilities: {
    formatDate: (d, tz, f) => f
      .replace('yyyy', d.getFullYear()).replace('MM', pad(d.getMonth() + 1)).replace('dd', pad(d.getDate()))
      .replace('HH', pad(d.getHours())).replace('mm', pad(d.getMinutes())),
    newBlob: (c, t, n) => ({ c, t, n }),
    base64EncodeWebSafe: (b) => Buffer.from(String(b)).toString('base64'),
    computeDigest: (_, s) => s,
    DigestAlgorithm: { MD5: 'md5' },
  },
  ScriptApp: {},
  console,
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../Code.gs', import.meta.url), 'utf8'), ctx);

const post = (obj) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) } }).getContent());
const get = (p) => JSON.parse(ctx.doGet({ parameter: p }).getContent());

export { ctx, sheets, mails, post, get, makeSheet };
export const setProps = (p) => { props = p; };
