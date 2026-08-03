// Step 1: scan .vue templates for hardcoded strings, assign keys (reuse existing),
// and write mapping.json + report.txt for review.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');
const OUT_MAP = path.join(__dirname, 'i18n_map.json');
const OUT_REPORT = path.join(__dirname, 'i18n_report.txt');

// Load existing locales (en values -> keys)
const en = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', 'locales', 'en.json'), 'utf8'));
const valueToKey = new Map();
for (const [k, v] of Object.entries(en)) {
  if (!valueToKey.has(v)) valueToKey.set(v, k);
}

// Strings that must NOT be translated (brand names / symbols / fragments)
const SKIP = new Set([
  'Chong Choul',
  'CHONG CHOUL',
  'Chong',
  'Choul',
  '&times;',
  '&nbsp;',
  '&raquo;',
  '&hearts;',
  '&lt;',
  '&gt;',
  '&amp;',
  '/day',
  '?',
  '•',
  '»',
  '© 2026 Chong Choul. All rights reserved.',
]);

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (f.endsWith('.vue')) out.push(p);
  }
  return out;
}

const files = walk(SRC);

function extractTemplate(content) {
  const m = content.match(/<template>([\s\S]*)<\/template>/);
  return m ? m[1] : '';
}

function toKey(str) {
  let s = str
    .replace(/[^A-Za-z0-9 ]/g, ' ') // keep letters/digits/spaces
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return null;
  const parts = s.split(' ');
  const camel = parts.map((p, i) =>
    i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  ).join('');
  return camel || null;
}

// Collect unique strings with locations
const strings = new Map(); // text -> { count, files:Set }
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const tpl = extractTemplate(content);
  if (!tpl) continue;
  const re = />([^<>{}]*[A-Za-z][^<>{}]*)</g;
  let m;
  while ((m = re.exec(tpl)) !== null) {
    const raw = m[1].trim();
    if (!raw || raw.length < 2) continue;
    if (/\{\{/.test(raw)) continue;
    if (/\$\s*t\s*\(|\bt\s*\(/.test(raw)) continue;
    if (!strings.has(raw)) strings.set(raw, { count: 0, files: new Set() });
    strings.get(raw).count++;
    strings.get(raw).files.add(path.relative(SRC, file));
  }
}

// Assign keys
const usedKeys = new Set(Object.keys(en));
const mapping = {}; // key -> english text
const report = [];
let reusedCount = 0;
let newCount = 0;
let skippedCount = 0;

for (const [text, info] of strings) {
  if (SKIP.has(text)) {
    skippedCount++;
    continue;
  }
  const existing = valueToKey.get(text);
  if (existing && !mapping[existing]) {
    mapping[existing] = text;
    reusedCount++;
    report.push(`${existing}\tREUSE\t${info.count}\t${text}\t${[...info.files].join('|')}`);
    continue;
  }
  let base = toKey(text);
  if (!base) {
    skippedCount++;
    continue;
  }
  let key = base;
  let n = 2;
  while (usedKeys.has(key)) {
    key = `${base}${n++}`;
  }
  usedKeys.add(key);
  mapping[key] = text;
  newCount++;
  report.push(`${key}\tNEW\t${info.count}\t${text}\t${[...info.files].join('|')}`);
}

fs.writeFileSync(OUT_MAP, JSON.stringify(mapping, null, 2));
fs.writeFileSync(OUT_REPORT, report.join('\n'));
console.log(`Total unique: ${strings.size} | reused: ${reusedCount} | new keys: ${newCount} | skipped: ${skippedCount}`);
console.log(`Mapping -> ${OUT_MAP}`);
console.log(`Report  -> ${OUT_REPORT}`);
