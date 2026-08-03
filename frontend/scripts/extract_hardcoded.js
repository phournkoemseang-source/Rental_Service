// Extract hardcoded template text nodes that are NOT wrapped in t()/$t()
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'src');

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

const texts = new Map(); // text -> { count, files:Set }

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const tpl = extractTemplate(content);
  if (!tpl) continue;
  // Match >text< where text contains a letter but no {{, no tag, no t( / $t(
  const re = />([^<>{]*[A-Za-z][^<>{]*)</g;
  let m;
  while ((m = re.exec(tpl)) !== null) {
    const raw = m[1].trim();
    if (!raw) continue;
    if (/\{\{/.test(raw)) continue; // has interpolation
    if (/\$\s*t\s*\(|\bt\s*\(/.test(raw)) continue; // already translated
    if (raw.length < 2) continue;
    const key = raw;
    if (!texts.has(key)) texts.set(key, { count: 0, files: new Set() });
    texts.get(key).count++;
    texts.get(key).files.add(path.relative(SRC, file));
  }
}

const sorted = [...texts.entries()].sort((a, b) => b[1].count - a[1].count);
console.log('UNIQUE STRINGS:', sorted.length);
console.log('---');
for (const [text, info] of sorted) {
  console.log(`${info.count}\t${text}\t${[...info.files].slice(0, 3).join(' | ')}`);
}
