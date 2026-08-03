import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

const en = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', 'locales', 'en.json'), 'utf8'));
const kh = JSON.parse(fs.readFileSync(path.join(SRC, 'i18n', 'locales', 'kh.json'), 'utf8'));

// 1) en <-> kh sync
const ek = Object.keys(en);
const kk = Object.keys(kh);
const missKh = ek.filter((k) => !(k in kh));
const missEn = kk.filter((k) => !(k in en));
console.log(`EN keys: ${ek.length} | KH keys: ${kk.length}`);
console.log(`Missing in KH: ${missKh.length}`, missKh);
console.log(`Missing in EN: ${missEn.length}`, missEn);

// 2) every $t('key') used in templates must exist
const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (f.endsWith('.vue')) files.push(p);
  }
}
walk(SRC);

const usedKeys = new Set();
const missing = new Set();
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const re = /\$t\(['"]([^'"]+)['"]\)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    usedKeys.add(m[1]);
    if (!(m[1] in en)) missing.add(`${m[1]}  (${file})`);
  }
}
console.log(`Distinct $t() keys used in templates: ${usedKeys.size}`);
console.log(`Used but MISSING from locale: ${missing.size}`);
missing.forEach((k) => console.log('  -', k));

// 3) any key in locale that is completely unused (informational)
const unused = Object.keys(en).filter((k) => !usedKeys.has(k) && !/^[0-9]/.test(k));
console.log(`Locale keys never referenced in templates: ${unused.length}`);
